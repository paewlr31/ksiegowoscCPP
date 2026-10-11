import type { Faktura, Firma } from "./typy";
import { fakturyOkresu } from "./podatki";

const NS = "http://crd.gov.pl/wzor/2025/12/19/14090/";

function x(wartosc: string): string {
  return wartosc
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function kwota(n: number): string {
  return n.toFixed(2);
}

export function jpkV7m(firma: Firma, faktury: Faktura[], rok: number, miesiac: number): string {
  const dokumenty = fakturyOkresu(faktury, rok, miesiac).filter((f) => f.vat !== 0 || f.platnikVat);
  const netto = dokumenty.reduce((s, f) => s + f.netto, 0);
  const vat = dokumenty.reduce((s, f) => s + f.vat, 0);
  const wiersze = dokumenty
    .map((f, i) => {
      const nip = f.nabywca.nip.replace(/\D/g, "") || "BRAK";
      return `<SprzedazWiersz><LpSprzedazy>${i + 1}</LpSprzedazy><NrKontrahenta>${x(nip)}</NrKontrahenta><NazwaKontrahenta>${x(f.nabywca.nazwa)}</NazwaKontrahenta><DowodSprzedazy>${x(f.numer)}</DowodSprzedazy><DataWystawienia>${f.dataWystawienia}</DataWystawienia><DataSprzedazy>${f.dataSprzedazy}</DataSprzedazy><K_19>${kwota(f.netto)}</K_19><K_20>${kwota(f.vat)}</K_20></SprzedazWiersz>`;
    })
    .join("");
  const nip = firma.nip.replace(/\D/g, "");
  const teraz = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  return `<?xml version="1.0" encoding="UTF-8"?>
<JPK xmlns="${NS}">
  <Naglowek>
    <KodFormularza kodSystemowy="JPK_V7M (3)" wersjaSchemy="1-0E">JPK_VAT</KodFormularza>
    <WariantFormularza>3</WariantFormularza>
    <DataWytworzeniaJPK>${teraz}</DataWytworzeniaJPK>
    <NazwaSystemu>Ksiegowosc CPP</NazwaSystemu>
    <CelZlozenia poz="P_7">1</CelZlozenia>
    <KodUrzedu>${x(firma.kodUrzedu || "0000")}</KodUrzedu>
    <Rok>${rok}</Rok>
    <Miesiac>${miesiac}</Miesiac>
  </Naglowek>
  <Podmiot1 rola="Podatnik">
    <OsobaNiefizyczna>
      <NIP>${x(nip)}</NIP>
      <PelnaNazwa>${x(firma.nazwa)}</PelnaNazwa>
      <Email>${x(firma.email)}</Email>
    </OsobaNiefizyczna>
  </Podmiot1>
  <Deklaracja>
    <Naglowek>
      <KodFormularzaDekl kodSystemowy="VAT-7 (23)" kodPodatku="VAT" rodzajZobowiazania="Z" wersjaSchemy="1-0E">VAT-7</KodFormularzaDekl>
      <WariantFormularzaDekl>23</WariantFormularzaDekl>
    </Naglowek>
    <PozycjeSzczegolowe>
      <P_19>${kwota(netto)}</P_19>
      <P_20>${kwota(vat)}</P_20>
      <P_37>${kwota(netto)}</P_37>
      <P_38>${kwota(vat)}</P_38>
      <P_51>${kwota(vat)}</P_51>
    </PozycjeSzczegolowe>
    <Pouczenia>1</Pouczenia>
  </Deklaracja>
  <Ewidencja>
    ${wiersze}
    <SprzedazCtrl>
      <LiczbaWierszySprzedazy>${dokumenty.length}</LiczbaWierszySprzedazy>
      <PodatekNalezny>${kwota(vat)}</PodatekNalezny>
    </SprzedazCtrl>
  </Ewidencja>
</JPK>`;
}
