import { createCipheriv, createHash, constants, publicEncrypt, randomBytes } from "crypto";
import { zipSync, strToU8 } from "fflate";
import forge from "node-forge";
import { Crypto } from "@peculiar/webcrypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { setNodeDependencies } from "xml-core";
import * as xpath from "xpath";
import { Application, Parse, SignedXml } from "xadesjs";
import type { Firma } from "./typy";
import { emailPoprawny, nipPoprawny } from "./walidacja";
import { kodUrzeduPoprawny } from "./urzedy";
import { CERTYFIKAT_MF_TEST } from "./jpk-klucz-test";

const BRAMKA = "https://test-e-dokumenty.mf.gov.pl";

export type WynikJpk = {
  numerReferencyjny: string;
  kod: number;
  opis: string;
  upo: string;
};

let przygotowane = false;

function przygotujXml() {
  if (przygotowane) return;
  setNodeDependencies({ DOMParser, XMLSerializer, xpath });
  Application.setEngine("NodeJS", new Crypto());
  przygotowane = true;
}

export function bladPrzedWysylka(firma: Firma, rok: number, miesiac: number): string {
  if (!nipPoprawny(firma.nip)) return "Wpisz poprawny NIP w danych firmy. Do testu wstaw 1111111111.";
  if (!emailPoprawny(firma.email)) return "Wpisz e-mail w danych firmy. Bramka go wymaga.";
  if (!firma.nazwa.trim()) return "Wpisz nazwę w danych firmy.";
  if (!kodUrzeduPoprawny(firma.kodUrzedu)) {
    return "Wpisz kod urzędu skarbowego. Dla adresu na Podgórzu to 1210. Spółka z o.o. w Krakowie często ma 1207.";
  }
  if (rok < 2026 || miesiac < 1 || miesiac > 12) return "Ten wzór JPK dotyczy miesięcy od 2026 roku.";
  if (firma.rodzaj === "nierejestrowana" && firma.dataUrodzenia.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(firma.dataUrodzenia.trim())) {
    return "Data urodzenia ma format RRRR-MM-DD.";
  }
  return "";
}

function bajty(tekst: string): Buffer {
  return Buffer.from(tekst, "utf8");
}

function certyfikatTestowy(nip: string): { prywatny: ArrayBuffer; certyfikat: string } {
  const klucze = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = klucze.publicKey;
  cert.serialNumber = "01";
  const od = new Date();
  const dok = new Date(od.getTime() + 365 * 24 * 3600 * 1000);
  cert.validity.notBefore = od;
  cert.validity.notAfter = dok;
  const atrybuty = [
    { name: "countryName", value: "PL" },
    { name: "organizationName", value: "Ksiegowosc CPP" },
    { name: "commonName", value: "Ksiegowosc CPP" },
    { name: "serialNumber", value: `TINPL-${nip}` },
    { type: "2.5.4.97", value: `VATPL-${nip}` },
  ];
  cert.setSubject(atrybuty);
  cert.setIssuer(atrybuty);
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    { name: "keyUsage", digitalSignature: true, nonRepudiation: true },
  ]);
  cert.sign(klucze.privateKey, forge.md.sha256.create());
  const certyfikat = forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());
  const pkcs8 = forge.asn1.toDer(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(klucze.privateKey))).getBytes();
  const buf = new Uint8Array(pkcs8.length);
  for (let i = 0; i < pkcs8.length; i++) buf[i] = pkcs8.charCodeAt(i);
  return { prywatny: buf.buffer, certyfikat };
}

async function podpisz(initXml: string, nip: string): Promise<string> {
  przygotujXml();
  const { prywatny, certyfikat } = certyfikatTestowy(nip);
  const silnik = Application.crypto.subtle;
  const klucz = await silnik.importKey(
    "pkcs8",
    prywatny,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const dokument = Parse(initXml);
  const podpis = new SignedXml();
  await podpis.Sign(
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as Algorithm,
    klucz,
    dokument,
    {
      references: [{ id: "r-id-1", uri: "", hash: "SHA-256", transforms: ["enveloped", "exc-c14n"] }],
      signingCertificate: { certificate: certyfikat, digestAlgorithm: "SHA-1" },
      x509: [certyfikat],
    },
  );
  return podpis.toString();
}

function initXml(xml: Buffer, nazwa: string, aes: Buffer, klucz: string, iv: string, sha: string, md5: string): string {
  const system = /kodSystemowy="([^"]+)"/.exec(xml.toString("utf8"))?.[1] ?? "JPK_V7M (3)";
  const schemy = /wersjaSchemy="([^"]+)"/.exec(xml.toString("utf8"))?.[1] ?? "1-0E";
  return `<?xml version="1.0" encoding="UTF-8"?><InitUpload xmlns="http://e-dokumenty.mf.gov.pl"><DocumentType>JPK</DocumentType><Version>01.02.01.20160617</Version><EncryptionKey algorithm="RSA" mode="ECB" padding="PKCS#1" encoding="Base64">${klucz}</EncryptionKey><DocumentList><Document><FormCode systemCode="${system}" schemaVersion="${schemy}">JPK_VAT</FormCode><FileName>${nazwa}</FileName><ContentLength>${xml.length}</ContentLength><HashValue algorithm="SHA-256" encoding="Base64">${sha}</HashValue><FileSignatureList filesNumber="1"><Packaging><SplitZip type="split" mode="zip"/></Packaging><Encryption><AES size="256" block="16" mode="CBC" padding="PKCS#7"><IV bytes="16" encoding="Base64">${iv}</IV></AES></Encryption><FileSignature><OrdinalNumber>1</OrdinalNumber><FileName>${nazwa}.zip.aes</FileName><ContentLength>${aes.length}</ContentLength><HashValue algorithm="MD5" encoding="Base64">${md5}</HashValue></FileSignature></FileSignatureList></Document></DocumentList></InitUpload>`;
}

async function odpowiedz(res: Response): Promise<Record<string, unknown>> {
  const tekst = await res.text();
  if (!tekst) return {};
  try {
    return JSON.parse(tekst) as Record<string, unknown>;
  } catch {
    return { Message: tekst.slice(0, 500) };
  }
}

function pole(dane: Record<string, unknown>, ...nazwy: string[]): unknown {
  for (const nazwa of nazwy) {
    if (dane[nazwa] !== undefined) return dane[nazwa];
  }
  return undefined;
}

function komunikatBramki(dane: Record<string, unknown>, status: number): string {
  const kod = String(pole(dane, "Code", "code") ?? status);
  const wiadomosc = String(pole(dane, "Message", "message") ?? "Bramka odrzuciła plik.");
  const bledy = pole(dane, "Errors", "errors");
  const lista = Array.isArray(bledy) ? ` ${bledy.join(" ")}` : "";
  return `Bramka testowa: ${kod}. ${wiadomosc}${lista}`;
}

export async function statusJpk(numer: string): Promise<WynikJpk> {
  if (!/^[0-9a-fA-F]{10,64}$/.test(numer)) throw new Error("Nieprawidłowy numer referencyjny.");
  const res = await fetch(`${BRAMKA}/api/Storage/Status/${numer}`);
  const dane = await odpowiedz(res);
  if (!res.ok) throw new Error(komunikatBramki(dane, res.status));
  const kod = Number(pole(dane, "Code", "code") ?? 0);
  const opis = String(pole(dane, "Description", "description") ?? "");
  const szczegoly = String(pole(dane, "Details", "details") ?? "");
  const dopisek = kod >= 300 && szczegoly && !szczegoly.startsWith("<?xml") ? ` ${szczegoly}` : "";
  return {
    numerReferencyjny: numer,
    kod,
    opis: `${opis}${dopisek}`,
    upo: String(pole(dane, "Upo", "upo") ?? ""),
  };
}

export async function wyslijJpk(xmlTekst: string, nip: string, rok: number, miesiac: number): Promise<WynikJpk> {
  const xml = bajty(xmlTekst);
  const nazwa = `JPK_V7M_${rok}_${String(miesiac).padStart(2, "0")}.xml`;
  const zip = Buffer.from(zipSync({ [nazwa]: strToU8(xmlTekst) }));
  const kluczAes = randomBytes(32);
  const iv = randomBytes(16);
  const szyfr = createCipheriv("aes-256-cbc", kluczAes, iv);
  const aes = Buffer.concat([szyfr.update(zip), szyfr.final()]);
  const kluczRsa = publicEncrypt({ key: CERTYFIKAT_MF_TEST, padding: constants.RSA_PKCS1_PADDING }, kluczAes);
  if (kluczRsa.length !== 256) throw new Error("Certyfikat Ministerstwa ma inny rozmiar klucza niż 2048 bitów.");
  const sha = createHash("sha256").update(xml).digest("base64");
  const md5 = createHash("md5").update(aes).digest("base64");
  const metadane = initXml(xml, nazwa, aes, kluczRsa.toString("base64"), iv.toString("base64"), sha, md5);
  const podpisane = await podpisz(metadane, nip.replace(/\D/g, ""));

  const start = await fetch(`${BRAMKA}/api/Storage/InitUploadSigned?enableValidateQualifiedSignature=false`, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: podpisane,
  });
  const sesja = await odpowiedz(start);
  if (!start.ok) throw new Error(komunikatBramki(sesja, start.status));
  const numer = String(pole(sesja, "ReferenceNumber", "referenceNumber") ?? "");
  const pliki = (pole(sesja, "RequestToUploadFileList", "requestToUploadFileList") ?? []) as Record<string, unknown>[];
  const plik = pliki[0];
  if (!numer || !plik) throw new Error("Bramka nie zwróciła adresu do wgrania pliku.");

  const naglowki: Record<string, string> = {};
  const lista = (pole(plik, "HeaderList", "headerList") ?? []) as Record<string, unknown>[];
  for (const naglowek of lista) {
    const klucz = String(pole(naglowek, "Key", "key") ?? "");
    const wartosc = String(pole(naglowek, "Value", "value") ?? "");
    if (klucz) naglowki[klucz] = wartosc;
  }
  const wgranie = await fetch(String(pole(plik, "Url", "url")), {
    method: "PUT",
    headers: naglowki,
    body: aes,
  });
  if (!wgranie.ok) {
    const tresc = await wgranie.text();
    throw new Error(`Magazyn bramki nie przyjął pliku (HTTP ${wgranie.status}). ${tresc.slice(0, 180)}`);
  }

  const koniec = await fetch(`${BRAMKA}/api/Storage/FinishUpload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ReferenceNumber: numer,
      AzureBlobNameList: [String(pole(plik, "BlobName", "blobName"))],
    }),
  });
  const poKoncu = await odpowiedz(koniec);
  if (!koniec.ok) throw new Error(komunikatBramki(poKoncu, koniec.status));

  let wynik = await statusJpk(numer);
  for (let i = 0; i < 6 && wynik.kod > 0 && wynik.kod < 200; i++) {
    await new Promise((rozwiaz) => setTimeout(rozwiaz, 2000));
    wynik = await statusJpk(numer);
  }
  return wynik;
}
