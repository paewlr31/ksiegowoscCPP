import type { Faktura, Firma, Koszt } from "./typy";
import { fakturyOkresu, kosztyOkresu, rozliczenieMiesiaca } from "./podatki";

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

function krajINumer(identyfikator: string, kraj: string): { kod: string; numer: string } {
  const surowy = identyfikator.replace(/\s/g, "");
  if (/^[A-Za-z]{2}/.test(surowy)) return { kod: surowy.slice(0, 2).toUpperCase(), numer: surowy.slice(2) };
  return { kod: kraj.toUpperCase() || "PL", numer: surowy };
}

export function jpkV7m(firma: Firma, faktury: Faktura[], koszty: Koszt[], rok: number, miesiac: number): string {
  const sprzedaż = fakturyOkresu(faktury, rok, miesiac).filter((f) => f.vat !== 0 || f.platnikVat);
  const kosztyMiesiaca = kosztyOkresu(koszty, rok, miesiac);
  const rozliczenie = rozliczenieMiesiaca(faktury, rok, miesiac, 0, koszty);
  const importy = kosztyMiesiaca.filter((k) => k.rodzaj !== "kraj" && k.vatNalezny !== 0);
  const zakupy = kosztyMiesiaca.filter((k) => k.rodzaj === "kraj" || k.vatNaliczony !== 0);

  const wierszeSprzedazy = [
    ...sprzedaż.map((f) => {
      const nip = f.nabywca.nip.replace(/\D/g, "") || "BRAK";
      return `<SprzedazWiersz><LpSprzedazy>0</LpSprzedazy><NrKontrahenta>${x(nip)}</NrKontrahenta><NazwaKontrahenta>${x(f.nabywca.nazwa)}</NazwaKontrahenta><DowodSprzedazy>${x(f.numer)}</DowodSprzedazy><DataWystawienia>${f.dataWystawienia}</DataWystawienia><DataSprzedazy>${f.dataSprzedazy}</DataSprzedazy><K_19>${kwota(f.netto)}</K_19><K_20>${kwota(f.vat)}</K_20></SprzedazWiersz>`;
    }),
    ...importy.map((k) => {
      const { kod, numer } = krajINumer(k.identyfikator, k.kraj);
      const pola = k.rodzaj === "ue"
        ? `<K_29>${kwota(k.netto)}</K_29><K_30>${kwota(k.vatNalezny)}</K_30>`
        : `<K_27>${kwota(k.netto)}</K_27><K_28>${kwota(k.vatNalezny)}</K_28>`;
      return `<SprzedazWiersz><LpSprzedazy>0</LpSprzedazy><KodKrajuNadaniaTIN>${x(kod)}</KodKrajuNadaniaTIN><NrKontrahenta>${x(numer || "BRAK")}</NrKontrahenta><NazwaKontrahenta>${x(k.dostawca)}</NazwaKontrahenta><DowodSprzedazy>${x(k.numer)}</DowodSprzedazy><DataWystawienia>${k.data}</DataWystawienia>${pola}</SprzedazWiersz>`;
    }),
  ].map((wiersz, i) => wiersz.replace("<LpSprzedazy>0</LpSprzedazy>", `<LpSprzedazy>${i + 1}</LpSprzedazy>`));

  const wierszeZakupu = zakupy.map((k, i) => {
    const { kod, numer } = krajINumer(k.identyfikator, k.kraj);
    const kwoty = k.vatNaliczony !== 0 ? `<K_42>${kwota(k.netto)}</K_42><K_43>${kwota(k.vatNaliczony)}</K_43>` : "";
    return `<ZakupWiersz><LpZakupu>${i + 1}</LpZakupu><KodKrajuNadaniaTIN>${x(kod)}</KodKrajuNadaniaTIN><NrDostawcy>${x(numer || "BRAK")}</NrDostawcy><NazwaDostawcy>${x(k.dostawca)}</NazwaDostawcy><DowodZakupu>${x(k.numer)}</DowodZakupu><DataZakupu>${k.data}</DataZakupu><DataWplywu>${k.data}</DataWplywu>${kwoty}</ZakupWiersz>`;
  });

  const p19 = sprzedaż.reduce((s, f) => s + f.netto, 0);
  const p20 = sprzedaż.reduce((s, f) => s + f.vat, 0);
  const ue = kosztyMiesiaca.filter((k) => k.rodzaj === "ue");
  const poza = kosztyMiesiaca.filter((k) => k.rodzaj === "poza_ue");
  const p29 = ue.reduce((s, k) => s + k.netto, 0);
  const p30 = ue.reduce((s, k) => s + k.vatNalezny, 0);
  const p27 = poza.reduce((s, k) => s + k.netto, 0);
  const p28 = poza.reduce((s, k) => s + k.vatNalezny, 0);
  const p37 = p19 + p27 + p29;
  const p38 = p20 + p28 + p30;
  const p42 = zakupy.reduce((s, k) => s + (k.vatNaliczony !== 0 ? k.netto : 0), 0);
  const p43 = zakupy.reduce((s, k) => s + k.vatNaliczony, 0);
  const podatekNaleznyWiersze = p20 + p28 + p30;
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
      <P_19>${kwota(p19)}</P_19>
      <P_20>${kwota(p20)}</P_20>
      ${p27 || p28 ? `<P_27>${kwota(p27)}</P_27><P_28>${kwota(p28)}</P_28>` : ""}
      ${p29 || p30 ? `<P_29>${kwota(p29)}</P_29><P_30>${kwota(p30)}</P_30>` : ""}
      <P_37>${kwota(p37)}</P_37>
      <P_38>${kwota(p38)}</P_38>
      ${p42 || p43 ? `<P_42>${kwota(p42)}</P_42><P_43>${kwota(p43)}</P_43>` : ""}
      <P_48>${kwota(p43)}</P_48>
      <P_51>${kwota(rozliczenie.vat)}</P_51>
      ${rozliczenie.nadwyzka ? `<P_62>${kwota(rozliczenie.nadwyzka)}</P_62>` : ""}
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
