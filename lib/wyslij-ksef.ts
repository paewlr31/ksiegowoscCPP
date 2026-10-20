import crypto from "crypto";
import type { Faktura, Firma } from "./typy";
import { fakturaFa3 } from "./fa3";
import { czytajKsef } from "./ksef-konfiguracja";

type Cert = { certificate: string; usage: string[] };

function pemZDer(b64: string): string {
  const czysty = b64.replace(/\s/g, "");
  const linie = czysty.match(/.{1,64}/g)?.join("\n") ?? czysty;
  return `-----BEGIN CERTIFICATE-----\n${linie}\n-----END CERTIFICATE-----`;
}

function szyfrujRsa(certB64: string, dane: Buffer): string {
  const zaszyfrowane = crypto.publicEncrypt(
    {
      key: pemZDer(certB64),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    dane,
  );
  return zaszyfrowane.toString("base64");
}

function sha256(bufor: Buffer): string {
  return crypto.createHash("sha256").update(bufor).digest("base64");
}

async function ksef<T>(api: string, sciezka: string, opcje: RequestInit = {}): Promise<T> {
  const odpowiedz = await fetch(`${api}${sciezka}`, {
    ...opcje,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opcje.headers ?? {}),
    },
  });
  const tekst = await odpowiedz.text();
  const dane = tekst ? JSON.parse(tekst) : {};
  if (!odpowiedz.ok) {
    throw new Error(dane.exception?.exceptionDetailList?.[0]?.exceptionDescription || tekst || odpowiedz.statusText);
  }
  return dane as T;
}

export async function zalogujKsef() {
  const konfiguracja = await czytajKsef();
  if (!konfiguracja.token) throw new Error("Brak tokena KSeF w klucze.hpp.");
  const certyfikaty = await ksef<Cert[]>(konfiguracja.api, "/security/public-key-certificates", { method: "GET" });
  const doTokena = certyfikaty.find((c) => c.usage?.includes("KsefTokenEncryption"));
  const doKlucza = certyfikaty.find((c) => c.usage?.includes("SymmetricKeyEncryption"));
  if (!doTokena || !doKlucza) throw new Error("KSeF nie oddał certyfikatów do szyfrowania.");

  const wyzwanie = await ksef<{ challenge: string; timestampMs: number }>(konfiguracja.api, "/auth/challenge", {
    method: "POST",
    body: "{}",
  });
  const tokenZCzasem = Buffer.from(`${konfiguracja.token}|${wyzwanie.timestampMs}`, "utf8");
  const start = await ksef<{ referenceNumber: string; authenticationToken: { token: string } }>(
    konfiguracja.api,
    "/auth/ksef-token",
    {
      method: "POST",
      body: JSON.stringify({
        challenge: wyzwanie.challenge,
        contextIdentifier: { type: "Nip", value: konfiguracja.nip },
        encryptedToken: szyfrujRsa(doTokena.certificate, tokenZCzasem),
      }),
    },
  );

  let gotowe = false;
  for (let i = 0; i < 12; i++) {
    const status = await ksef<{ status: { code: number; description: string } }>(
      konfiguracja.api,
      `/auth/${start.referenceNumber}`,
      { headers: { Authorization: `Bearer ${start.authenticationToken.token}` } },
    );
    if (status.status.code === 200) {
      gotowe = true;
      break;
    }
    if (status.status.code >= 400) throw new Error(status.status.description);
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!gotowe) throw new Error("KSeF nie dokończył logowania.");

  const tokeny = await ksef<{ accessToken: { token: string } }>(konfiguracja.api, "/auth/token/redeem", {
    method: "POST",
    headers: { Authorization: `Bearer ${start.authenticationToken.token}` },
  });
  const access = tokeny.accessToken.token;
  return { api: konfiguracja.api, access, nip: konfiguracja.nip, certyfikatKlucza: doKlucza.certificate };
}

export async function wyslijDoKsef(faktura: Faktura, firma: Firma, wszystkie: Faktura[]) {
  if (faktura.typ === "proforma") throw new Error("Proforma nie idzie do KSeF.");
  const sesjaLogowania = await zalogujKsef();
  const konfiguracja = { nip: sesjaLogowania.nip };
  const access = sesjaLogowania.access;
  const doKlucza = { certificate: sesjaLogowania.certyfikatKlucza };

  const xml = fakturaFa3(faktura, faktura.sprzedawca ?? firma, konfiguracja.nip, wszystkie);
  const plain = Buffer.from(xml, "utf8");
  const klucz = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const szyfr = crypto.createCipheriv("aes-256-cbc", klucz, iv);
  const zaszyfrowana = Buffer.concat([szyfr.update(plain), szyfr.final()]);

  const sesja = await ksef<{ referenceNumber: string }>(sesjaLogowania.api, "/sessions/online", {
    method: "POST",
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({
      formCode: { systemCode: "FA (3)", schemaVersion: "1-0E", value: "FA" },
      encryption: {
        encryptedSymmetricKey: szyfrujRsa(doKlucza.certificate, klucz),
        initializationVector: iv.toString("base64"),
      },
    }),
  });

  const wysylka = await ksef<{ referenceNumber: string }>(
    sesjaLogowania.api,
    `/sessions/online/${sesja.referenceNumber}/invoices`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify({
        invoiceHash: sha256(plain),
        invoiceSize: plain.length,
        encryptedInvoiceHash: sha256(zaszyfrowana),
        encryptedInvoiceSize: zaszyfrowana.length,
        encryptedInvoiceContent: zaszyfrowana.toString("base64"),
        offlineMode: false,
      }),
    },
  );

  await ksef(sesjaLogowania.api, `/sessions/online/${sesja.referenceNumber}/close`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}` },
  });

  let numer = "";
  let opis = "przyjęta do przetwarzania";
  for (let i = 0; i < 12; i++) {
    const status = await ksef<{ status: { code: number; description: string }; ksefNumber?: string }>(
      sesjaLogowania.api,
      `/sessions/${sesja.referenceNumber}/invoices/${wysylka.referenceNumber}`,
      { headers: { Authorization: `Bearer ${access}` } },
    );
    opis = status.status.description;
    if (status.ksefNumber) numer = status.ksefNumber;
    if (status.status.code === 200 && numer) break;
    if (status.status.code >= 400) throw new Error(opis);
    await new Promise((r) => setTimeout(r, 1500));
  }

  return { numer, opis, nipKontekstu: konfiguracja.nip };
}
