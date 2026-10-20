import type { Faktura, Firma, StawkaVat } from "./typy";
import { koszykiFaktury, kwotyPozycji, stawkaPozycji } from "./podatki";

const NS = "http://crd.gov.pl/wzor/2025/06/25/13775/";

function x(wartosc: string): string {
  return wartosc
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function kwota(n: number): string {
  return n.toFixed(2);
}

function kodStawkiFa(stawka: StawkaVat): string {
  if (stawka === "zw") return "zw";
  if (stawka === "ue") return "np II";
  if (stawka === 0) return "0 KR";
  return String(stawka);
}

export function rodzajKsef(faktura: Faktura, wszystkie: Faktura[]): string {
  if (faktura.typ === "zaliczkowa") return "ZAL";
  if (faktura.typ === "koncowa") return faktura.podstawy.length ? "ROZ" : "VAT";
  if (faktura.typ === "korekta") {
    const pierwotna = wszystkie.find((f) => f.id === faktura.koryguje);
    if (pierwotna?.typ === "zaliczkowa") return "KOR_ZAL";
    if (pierwotna?.typ === "koncowa" && pierwotna.podstawy.length) return "KOR_ROZ";
    return "KOR";
  }
  return "VAT";
}

export function fakturaFa3(faktura: Faktura, firma: Firma, nipSprzedawcy: string, wszystkie: Faktura[]): string {
  const aktywny = faktura.platnikVat;
  const wiersze = faktura.pozycje
    .map((p, i) => {
      const stawka = stawkaPozycji(p, aktywny || p.stawka === "ue");
      const netto = kwotyPozycji(p, aktywny || p.stawka === "ue").netto;
      return `<FaWiersz><NrWierszaFa>${i + 1}</NrWierszaFa><P_7>${x(p.nazwa)}</P_7><P_8A>szt.</P_8A><P_8B>${kwota(Math.abs(p.ilosc) || 1)}</P_8B><P_9A>${kwota(p.cenaNetto)}</P_9A><P_11>${kwota(netto)}</P_11><P_12>${kodStawkiFa(stawka)}</P_12></FaWiersz>`;
    })
    .join("");
  const koszyk = koszykiFaktury(faktura);
  const stawka = [
    koszyk.n23 ? `<P_13_1>${kwota(koszyk.n23)}</P_13_1><P_14_1>${kwota(koszyk.v23)}</P_14_1>` : "",
    koszyk.n8 ? `<P_13_2>${kwota(koszyk.n8)}</P_13_2><P_14_2>${kwota(koszyk.v8)}</P_14_2>` : "",
    koszyk.n5 ? `<P_13_3>${kwota(koszyk.n5)}</P_13_3><P_14_3>${kwota(koszyk.v5)}</P_14_3>` : "",
    koszyk.n0 ? `<P_13_6_1>${kwota(koszyk.n0)}</P_13_6_1>` : "",
    koszyk.nzw ? `<P_13_7>${kwota(koszyk.nzw)}</P_13_7>` : "",
    koszyk.nue ? `<P_13_9>${kwota(koszyk.nue)}</P_13_9>` : "",
  ].join("");

  const zwolnienie = koszyk.nzw
    ? `<P_19>1</P_19><P_19A>${x(firma.podstawaZwolnienia)}</P_19A>`
    : "<P_19N>1</P_19N>";

  const korekta = faktura.typ === "korekta"
    ? blokKorekty(faktura, wszystkie)
    : "";

  const nipNabywcy = faktura.nabywca.nip.replace(/\D/g, "");
  const idNabywcy = nipNabywcy.length === 10 ? `<NIP>${nipNabywcy}</NIP>` : "<BrakID>1</BrakID>";
  const telefon = firma.telefon.replace(/\s/g, "").slice(0, 16);
  const teraz = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="${NS}">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>3</WariantFormularza>
    <DataWytworzeniaFa>${teraz}</DataWytworzeniaFa>
    <SystemInfo>Ksiegowosc CPP</SystemInfo>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne><NIP>${nipSprzedawcy}</NIP><Nazwa>${x(firma.nazwa)}</Nazwa></DaneIdentyfikacyjne>
    <Adres><KodKraju>PL</KodKraju><AdresL1>${x(firma.ulica)}</AdresL1><AdresL2>${x(`${firma.kod} ${firma.miasto}`)}</AdresL2></Adres>
    <DaneKontaktowe><Email>${x(firma.email)}</Email><Telefon>${x(telefon)}</Telefon></DaneKontaktowe>
  </Podmiot1>
  <Podmiot2>
    <DaneIdentyfikacyjne>${idNabywcy}<Nazwa>${x(faktura.nabywca.nazwa)}</Nazwa></DaneIdentyfikacyjne>
    <Adres><KodKraju>PL</KodKraju><AdresL1>${x(faktura.nabywca.ulica || "brak")}</AdresL1><AdresL2>${x(`${faktura.nabywca.kod} ${faktura.nabywca.miasto}`.trim())}</AdresL2></Adres>
    ${kontaktNabywcy(faktura)}
    <JST>2</JST>
    <GV>2</GV>
  </Podmiot2>
  <Fa>
    <KodWaluty>PLN</KodWaluty>
    <P_1>${faktura.dataWystawienia}</P_1>
    <P_2>${x(faktura.numer)}</P_2>
    <P_6>${faktura.dataSprzedazy}</P_6>
    ${stawka}
    <P_15>${kwota(faktura.brutto)}</P_15>
    <Adnotacje>
      <P_16>2</P_16>
      <P_17>2</P_17>
      <P_18>2</P_18>
      <P_18A>2</P_18A>
      <Zwolnienie>${zwolnienie}</Zwolnienie>
      <NoweSrodkiTransportu><P_22N>1</P_22N></NoweSrodkiTransportu>
      <P_23>2</P_23>
      <PMarzy><P_PMarzyN>1</P_PMarzyN></PMarzy>
    </Adnotacje>
    <RodzajFaktury>${rodzajKsef(faktura, wszystkie)}</RodzajFaktury>
    ${korekta}
    ${wiersze}
  </Fa>
</Faktura>`;
}

function kontaktNabywcy(faktura: Faktura): string {
  const email = faktura.nabywca.email.trim();
  const telefon = faktura.nabywca.telefon.replace(/\s/g, "").slice(0, 16);
  if (!email && !telefon) return "";
  return `<DaneKontaktowe>${email ? `<Email>${x(email)}</Email>` : ""}${telefon ? `<Telefon>${x(telefon)}</Telefon>` : ""}</DaneKontaktowe>`;
}

function blokKorekty(faktura: Faktura, wszystkie: Faktura[]): string {
  const pierwotna = wszystkie.find((f) => f.id === faktura.koryguje);
  if (!pierwotna) return "";
  const nr = pierwotna.ksefNumer
    ? `<NrKSeF>1</NrKSeF><NrKSeFFaKorygowanej>${x(pierwotna.ksefNumer)}</NrKSeFFaKorygowanej>`
    : "<NrKSeFN>1</NrKSeFN>";
  return `<PrzyczynaKorekty>${x(faktura.przyczynaKorekty || "korekta")}</PrzyczynaKorekty><DaneFaKorygowanej><DataWystFaKorygowanej>${pierwotna.dataWystawienia}</DataWystFaKorygowanej><NrFaKorygowanej>${x(pierwotna.numer)}</NrFaKorygowanej>${nr}</DaneFaKorygowanej>`;
}
