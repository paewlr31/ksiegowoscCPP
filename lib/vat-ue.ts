import type { Faktura, Firma } from "./typy";
import { fakturyOkresu, koszykiFaktury } from "./podatki";

const NS = "http://crd.gov.pl/wzor/2021/01/12/10293/";

function x(wartosc: string): string {
  return wartosc.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function zlote(n: number): number {
  const znak = n < 0 ? -1 : 1;
  return znak * Math.round(Math.abs(n));
}

export type PozycjaVatUe = { kraj: string; numer: string; kwota: number };

export function pozycjeVatUe(faktury: Faktura[], rok: number, miesiac: number): PozycjaVatUe[] {
  const grupy = new Map<string, number>();
  for (const faktura of fakturyOkresu(faktury, rok, miesiac)) {
    const kwota = koszykiFaktury(faktura).nue;
    if (!kwota) continue;
    const numer = faktura.nabywca.nip.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(numer)) continue;
    grupy.set(numer, (grupy.get(numer) ?? 0) + kwota);
  }
  return [...grupy.entries()].map(([numer, kwota]) => ({
    kraj: numer.slice(0, 2),
    numer: numer.slice(2),
    kwota: zlote(kwota),
  }));
}

export function vatUeXml(firma: Firma, faktury: Faktura[], rok: number, miesiac: number): string | null {
  const pozycje = pozycjeVatUe(faktury, rok, miesiac);
  if (!pozycje.length) return null;
  const nip = firma.nip.replace(/\D/g, "");
  const grupy = pozycje
    .map((p) => `<Grupa3><P_Ua>${p.kraj}</P_Ua><P_Ub>${x(p.numer)}</P_Ub><P_Uc>${p.kwota}</P_Uc></Grupa3>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Deklaracja xmlns="${NS}">
  <Naglowek>
    <KodFormularza kodSystemowy="VAT-UE (5)" wersjaSchemy="2-0E">VAT-UE</KodFormularza>
    <WariantFormularza>5</WariantFormularza>
    <Rok>${rok}</Rok>
    <Miesiac>${miesiac}</Miesiac>
    <CelZlozenia>1</CelZlozenia>
    <KodUrzedu>${x(firma.kodUrzedu.trim() || "0000")}</KodUrzedu>
  </Naglowek>
  <Podmiot1 rola="Podatnik">
    <OsobaNiefizyczna>
      <NIP>${x(nip)}</NIP>
      <PelnaNazwa>${x(firma.nazwa.trim())}</PelnaNazwa>
    </OsobaNiefizyczna>
  </Podmiot1>
  <PozycjeSzczegolowe>${grupy}</PozycjeSzczegolowe>
  <Pouczenie>1</Pouczenie>
</Deklaracja>`;
}

export function vatUekXml(firma: Firma, rok: number, miesiac: number, bylo: PozycjaVatUe[], jest: PozycjaVatUe[]): string | null {
  const klucze = new Set([...bylo, ...jest].map((p) => `${p.kraj}${p.numer}`));
  const grupy = [...klucze].flatMap((klucz) => {
    const stary = bylo.find((p) => `${p.kraj}${p.numer}` === klucz);
    const nowy = jest.find((p) => `${p.kraj}${p.numer}` === klucz);
    if (stary && nowy && stary.kwota === nowy.kwota) return [];
    const byloXml = stary ? `<P_UBa>${stary.kraj}</P_UBa><P_UBb>${x(stary.numer)}</P_UBb><P_UBc>${stary.kwota}</P_UBc>` : "";
    const jestXml = nowy ? `<P_UJa>${nowy.kraj}</P_UJa><P_UJb>${x(nowy.numer)}</P_UJb><P_UJc>${nowy.kwota}</P_UJc>` : "";
    return [`<Grupa3>${byloXml}${jestXml}</Grupa3>`];
  });
  if (!grupy.length) return null;
  const nip = firma.nip.replace(/\D/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Deklaracja xmlns="http://crd.gov.pl/wzor/2021/01/12/10294/">
  <Naglowek>
    <KodFormularza kodSystemowy="VATUEK (5)" wersjaSchemy="2-0E">VAT-UEK</KodFormularza>
    <WariantFormularza>5</WariantFormularza>
    <Rok>${rok}</Rok>
    <Miesiac>${miesiac}</Miesiac>
    <CelZlozenia>1</CelZlozenia>
    <KodUrzedu>${x(firma.kodUrzedu.trim() || "0000")}</KodUrzedu>
  </Naglowek>
  <Podmiot1 rola="Podatnik">
    <OsobaNiefizyczna>
      <NIP>${x(nip)}</NIP>
      <PelnaNazwa>${x(firma.nazwa.trim())}</PelnaNazwa>
    </OsobaNiefizyczna>
  </Podmiot1>
  <PozycjeSzczegolowe>${grupy.join("")}</PozycjeSzczegolowe>
  <Pouczenie>1</Pouczenie>
</Deklaracja>`;
}
