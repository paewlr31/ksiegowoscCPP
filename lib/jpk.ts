import type { Faktura, Firma, Koszt } from "./typy";
import { fakturyOkresu, koszykiFaktury, kosztyOkresu } from "./podatki";

const NS = "http://crd.gov.pl/wzor/2025/12/19/14090/";
const WZOR_KSEF =
  /^([1-9]((\d[1-9])|([1-9]\d))\d{7}|M\d{9}|[A-Z]{3}\d{7})-(20[2-9][0-9]|2[1-9][0-9]{2}|[3-9][0-9]{3})(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])-([0-9A-F]{6})-?([0-9A-F]{6})-([0-9A-F]{2})$/;

function x(wartosc: string): string {
  return wartosc
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function kwota(n: number): string {
  return n.toFixed(2);
}

function doZlotych(n: number): number {
  const znak = n < 0 ? -1 : 1;
  return znak * Math.round(Math.abs(n));
}

function krajINumer(identyfikator: string, kraj: string): { kod: string; numer: string } {
  const surowy = identyfikator.replace(/\s/g, "");
  if (/^[A-Za-z]{2}/.test(surowy)) return { kod: surowy.slice(0, 2).toUpperCase(), numer: surowy.slice(2) };
  return { kod: (kraj || "PL").toUpperCase(), numer: surowy };
}

function kodKraju(kod: string): string {
  const wartosc = kod.toUpperCase() === "GR" ? "EL" : kod.toUpperCase();
  return /^[A-Z]{2}$/.test(wartosc) && wartosc !== "GR" ? wartosc : "";
}

function telefon(wartosc: string): string {
  return wartosc.replace(/[^\d+]/g, "").slice(0, 16);
}

function podmiot(firma: Firma, nip: string): string {
  const email = firma.email.trim();
  const nr = telefon(firma.telefon);
  const kontakt = nr ? `<Telefon>${x(nr)}</Telefon>` : "";
  if (firma.rodzaj === "nierejestrowana" && /^\d{4}-\d{2}-\d{2}$/.test(firma.dataUrodzenia)) {
    const czesci = firma.nazwa.trim().split(/\s+/);
    const imie = czesci[0] || firma.nazwa.trim();
    const nazwisko = czesci.slice(1).join(" ") || imie;
    const etd = "http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/09/13/eD/DefinicjeTypy/";
    return `<OsobaFizyczna xmlns:etd="${etd}"><etd:NIP>${x(nip)}</etd:NIP><etd:ImiePierwsze>${x(imie)}</etd:ImiePierwsze><etd:Nazwisko>${x(nazwisko)}</etd:Nazwisko><etd:DataUrodzenia>${firma.dataUrodzenia}</etd:DataUrodzenia><Email>${x(email)}</Email>${kontakt}</OsobaFizyczna>`;
  }
  return `<OsobaNiefizyczna><NIP>${x(nip)}</NIP><PelnaNazwa>${x(firma.nazwa.trim())}</PelnaNazwa><Email>${x(email)}</Email>${kontakt}</OsobaNiefizyczna>`;
}

function znacznikSprzedazy(faktura: Faktura): string {
  const numer = faktura.ksefNumer.replace(/\s/g, "").toUpperCase();
  if (WZOR_KSEF.test(numer)) return `<NrKSeF>${x(numer)}</NrKSeF>`;
  if (!faktura.nabywca.nip.replace(/\D/g, "")) return "<BFK>1</BFK>";
  return "<OFF>1</OFF>";
}

export function jpkV7m(firma: Firma, faktury: Faktura[], koszty: Koszt[], rok: number, miesiac: number, cel: 1 | 2 = 1, powod = ""): string {
  const sprzedaż = fakturyOkresu(faktury, rok, miesiac).filter((f) => {
    const koszyk = koszykiFaktury(f);
    return f.vat !== 0 || f.platnikVat || koszyk.nue !== 0 || koszyk.npoza !== 0;
  });
  const kosztyMiesiaca = kosztyOkresu(koszty, rok, miesiac);
  const importy = kosztyMiesiaca.filter((k) => k.rodzaj !== "kraj" && k.vatNalezny !== 0);
  const zakupy = kosztyMiesiaca.filter((k) => k.rodzaj === "kraj" || k.vatNaliczony !== 0);

  const wierszeSprzedazy = [
    ...sprzedaż.map((f) => {
      const koszyk = koszykiFaktury(f);
      const surowy = f.nabywca.nip.replace(/\s/g, "").toUpperCase();
      const unijny = (koszyk.nue !== 0 || koszyk.npoza !== 0) && /^[A-Z]{2}/.test(surowy);
      const kod = unijny ? kodKraju(surowy.slice(0, 2)) : "";
      const nip = unijny ? surowy.slice(2) || "BRAK" : f.nabywca.nip.replace(/\D/g, "") || "BRAK";
      const dataSprzedazy = f.dataSprzedazy && f.dataSprzedazy !== f.dataWystawienia ? `<DataSprzedazy>${f.dataSprzedazy}</DataSprzedazy>` : "";
      const pola = [
        koszyk.nzw ? `<K_10>${kwota(koszyk.nzw)}</K_10>` : "",
        koszyk.npoza ? `<K_11>${kwota(koszyk.npoza)}</K_11>` : "",
        koszyk.nue ? `<K_12>${kwota(koszyk.nue)}</K_12>` : "",
        koszyk.n0 ? `<K_13>${kwota(koszyk.n0)}</K_13>` : "",
        koszyk.n5 ? `<K_15>${kwota(koszyk.n5)}</K_15><K_16>${kwota(koszyk.v5)}</K_16>` : "",
        koszyk.n8 ? `<K_17>${kwota(koszyk.n8)}</K_17><K_18>${kwota(koszyk.v8)}</K_18>` : "",
        koszyk.n23 || koszyk.v23 ? `<K_19>${kwota(koszyk.n23)}</K_19><K_20>${kwota(koszyk.v23)}</K_20>` : "",
      ].join("");
      return `<SprzedazWiersz><LpSprzedazy>0</LpSprzedazy>${kod ? `<KodKrajuNadaniaTIN>${kod}</KodKrajuNadaniaTIN>` : ""}<NrKontrahenta>${x(nip)}</NrKontrahenta><NazwaKontrahenta>${x(f.nabywca.nazwa)}</NazwaKontrahenta><DowodSprzedazy>${x(f.numer)}</DowodSprzedazy><DataWystawienia>${f.dataWystawienia}</DataWystawienia>${dataSprzedazy}${znacznikSprzedazy(f)}${pola}</SprzedazWiersz>`;
    }),
    ...importy.map((k) => {
      const { kod, numer } = krajINumer(k.identyfikator, k.kraj);
      const kraj = kodKraju(kod);
      const pola = k.rodzaj === "ue"
        ? `<K_29>${kwota(k.netto)}</K_29><K_30>${kwota(k.vatNalezny)}</K_30>`
        : `<K_27>${kwota(k.netto)}</K_27><K_28>${kwota(k.vatNalezny)}</K_28>`;
      return `<SprzedazWiersz><LpSprzedazy>0</LpSprzedazy>${kraj ? `<KodKrajuNadaniaTIN>${kraj}</KodKrajuNadaniaTIN>` : ""}<NrKontrahenta>${x(numer || "BRAK")}</NrKontrahenta><NazwaKontrahenta>${x(k.dostawca)}</NazwaKontrahenta><DowodSprzedazy>${x(k.numer)}</DowodSprzedazy><DataWystawienia>${k.data}</DataWystawienia><DI>1</DI>${pola}</SprzedazWiersz>`;
    }),
  ].map((wiersz, i) => wiersz.replace("<LpSprzedazy>0</LpSprzedazy>", `<LpSprzedazy>${i + 1}</LpSprzedazy>`));

  const wierszeZakupu = zakupy.map((k, i) => {
    const { kod, numer } = krajINumer(k.identyfikator, k.kraj);
    const kraj = kodKraju(kod);
    const znacznik = k.rodzaj === "kraj" ? "<OFF>1</OFF>" : "<DI>1</DI>";
    const kwoty = k.vatNaliczony !== 0 ? `<K_42>${kwota(k.netto)}</K_42><K_43>${kwota(k.vatNaliczony)}</K_43>` : "";
    return `<ZakupWiersz><LpZakupu>${i + 1}</LpZakupu>${kraj ? `<KodKrajuNadaniaTIN>${kraj}</KodKrajuNadaniaTIN>` : ""}<NrDostawcy>${x(numer || "BRAK")}</NrDostawcy><NazwaDostawcy>${x(k.dostawca)}</NazwaDostawcy><DowodZakupu>${x(k.numer)}</DowodZakupu><DataZakupu>${k.data}</DataZakupu><DataWplywu>${k.data}</DataWplywu>${znacznik}${kwoty}</ZakupWiersz>`;
  });

  const koszyki = sprzedaż.map(koszykiFaktury);
  const p10 = koszyki.reduce((s, k) => s + k.nzw, 0);
  const p11 = koszyki.reduce((s, k) => s + k.npoza, 0);
  const p12 = koszyki.reduce((s, k) => s + k.nue, 0);
  const p13 = koszyki.reduce((s, k) => s + k.n0, 0);
  const p15 = koszyki.reduce((s, k) => s + k.n5, 0);
  const p16 = koszyki.reduce((s, k) => s + k.v5, 0);
  const p17 = koszyki.reduce((s, k) => s + k.n8, 0);
  const p18 = koszyki.reduce((s, k) => s + k.v8, 0);
  const p19 = koszyki.reduce((s, k) => s + k.n23, 0);
  const p20 = koszyki.reduce((s, k) => s + k.v23, 0);
  const ue = kosztyMiesiaca.filter((k) => k.rodzaj === "ue");
  const poza = kosztyMiesiaca.filter((k) => k.rodzaj === "poza_ue");
  const p29 = ue.reduce((s, k) => s + k.netto, 0);
  const p30 = ue.reduce((s, k) => s + k.vatNalezny, 0);
  const p27 = poza.reduce((s, k) => s + k.netto, 0);
  const p28 = poza.reduce((s, k) => s + k.vatNalezny, 0);
  const p42 = zakupy.reduce((s, k) => s + (k.vatNaliczony !== 0 ? k.netto : 0), 0);
  const p43 = zakupy.reduce((s, k) => s + k.vatNaliczony, 0);
  const z10 = doZlotych(p10);
  const z11 = doZlotych(p11);
  const z12 = doZlotych(p12);
  const z13 = doZlotych(p13);
  const z15 = doZlotych(p15);
  const z16 = doZlotych(p16);
  const z17 = doZlotych(p17);
  const z18 = doZlotych(p18);
  const z19 = doZlotych(p19);
  const z20 = doZlotych(p20);
  const z27 = doZlotych(p27);
  const z28 = doZlotych(p28);
  const z29 = doZlotych(p29);
  const z30 = doZlotych(p30);
  const z42 = doZlotych(p42);
  const z43 = doZlotych(p43);
  const z37 = z10 + z11 + z13 + z15 + z17 + z19 + z27 + z29;
  const z38 = z16 + z18 + z20 + z28 + z30;
  const z48 = z43;
  const z51 = Math.max(0, z38 - z48);
  const z62 = Math.max(0, z48 - z38);
  const podatekNaleznyWiersze = p16 + p18 + p20 + p28 + p30;
  const nip = firma.nip.replace(/\D/g, "");
  const teraz = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const para = (a: number, b: number, nazwaA: string, nazwaB: string) =>
    a === 0 && b === 0 ? "" : `<${nazwaA}>${a}</${nazwaA}><${nazwaB}>${b}</${nazwaB}>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<JPK xmlns="${NS}">
  <Naglowek>
    <KodFormularza kodSystemowy="JPK_V7M (3)" wersjaSchemy="1-0E">JPK_VAT</KodFormularza>
    <WariantFormularza>3</WariantFormularza>
    <DataWytworzeniaJPK>${teraz}</DataWytworzeniaJPK>
    <NazwaSystemu>Ksiegowosc CPP</NazwaSystemu>
    <CelZlozenia poz="P_7">${cel}</CelZlozenia>
    <KodUrzedu>${x(firma.kodUrzedu.trim() || "0000")}</KodUrzedu>
    <Rok>${rok}</Rok>
    <Miesiac>${miesiac}</Miesiac>
  </Naglowek>
  <Podmiot1 rola="Podatnik">
    ${podmiot(firma, nip)}
  </Podmiot1>
  <Deklaracja>
    <Naglowek>
      <KodFormularzaDekl kodSystemowy="VAT-7 (23)" kodPodatku="VAT" rodzajZobowiazania="Z" wersjaSchemy="1-0E">VAT-7</KodFormularzaDekl>
      <WariantFormularzaDekl>23</WariantFormularzaDekl>
    </Naglowek>
    <PozycjeSzczegolowe>
      ${z10 ? `<P_10>${z10}</P_10>` : ""}
      ${z11 || z12 ? `<P_11>${z11}</P_11>${z12 ? `<P_12>${z12}</P_12>` : ""}` : ""}
      ${z13 ? `<P_13>${z13}</P_13>` : ""}
      ${para(z15, z16, "P_15", "P_16")}
      ${para(z17, z18, "P_17", "P_18")}
      ${para(z19, z20, "P_19", "P_20")}
      ${para(z27, z28, "P_27", "P_28")}
      ${para(z29, z30, "P_29", "P_30")}
      <P_37>${z37}</P_37>
      <P_38>${z38}</P_38>
      ${para(z42, z43, "P_42", "P_43")}
      ${z48 ? `<P_48>${z48}</P_48>` : ""}
      <P_51>${z51}</P_51>
      ${z62 ? `<P_62>${z62}</P_62>` : ""}
      ${cel === 2 ? `<P_ORDZU>${x(powod.trim() || "Korekta danych")}</P_ORDZU>` : ""}
    </PozycjeSzczegolowe>
    <Pouczenia>1</Pouczenia>
  </Deklaracja>
  <Ewidencja>
    ${wierszeSprzedazy.join("")}
    <SprzedazCtrl>
      <LiczbaWierszySprzedazy>${wierszeSprzedazy.length}</LiczbaWierszySprzedazy>
      <PodatekNalezny>${kwota(podatekNaleznyWiersze)}</PodatekNalezny>
    </SprzedazCtrl>
    ${wierszeZakupu.join("")}
    <ZakupCtrl>
      <LiczbaWierszyZakupow>${wierszeZakupu.length}</LiczbaWierszyZakupow>
      <PodatekNaliczony>${kwota(p43)}</PodatekNaliczony>
    </ZakupCtrl>
  </Ewidencja>
</JPK>`;
}
