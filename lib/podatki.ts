import { uzupelnijFirme, type Faktura, type Firma, type Koszt, type RodzajKosztu, type TypFaktury } from "./typy";

export const LIMIT_VAT = 200_000;

// Te same wzory co core/podatki.cpp. Kwoty wewnętrznie w groszach.

export function grosze(zlote: number): number {
  return Math.round(zlote * 100);
}

export function zlote(grosz: number): number {
  return grosz / 100;
}

export function vatOdNettoGr(nettoGr: number, platnikVat: boolean): number {
  if (!platnikVat || nettoGr === 0) return 0;
  const znak = nettoGr < 0 ? -1 : 1;
  const abs = Math.abs(nettoGr);
  return znak * Math.round((abs * 23) / 100);
}

export function procentCit(firma: Pick<Firma, "rodzaj" | "cit">): number {
  if (firma.rodzaj !== "spolka") return 0;
  return firma.cit === "mala" ? 9 : 19;
}

export function citOdPrzychoduGr(przychodGr: number, procent = 19): number {
  if (przychodGr <= 0 || procent <= 0) return 0;
  return Math.round((przychodGr * procent) / 100);
}

export function kwotyPozycji(ilosc: number, cenaNetto: number, platnikVat: boolean) {
  const nettoGr = grosze(ilosc * cenaNetto);
  const vatGr = vatOdNettoGr(nettoGr, platnikVat);
  return {
    netto: zlote(nettoGr),
    vat: zlote(vatGr),
    brutto: zlote(nettoGr + vatGr),
  };
}

export function sumaPozycji(
  pozycje: { ilosc: number; cenaNetto: number }[],
  platnikVat: boolean,
) {
  const nettoGr = pozycje.reduce((s, p) => s + grosze(p.ilosc * p.cenaNetto), 0);
  const vatGr = vatOdNettoGr(nettoGr, platnikVat);
  return {
    netto: zlote(nettoGr),
    vat: zlote(vatGr),
    brutto: zlote(nettoGr + vatGr),
  };
}

export function wliczaSieDoPodatku(typ: TypFaktury): boolean {
  return typ !== "proforma";
}

export function fakturyOkresu(faktury: Faktura[], rok: number, miesiac: number): Faktura[] {
  const mm = String(miesiac).padStart(2, "0");
  const prefiks = `${rok}-${mm}`;
  return faktury.filter(
    (f) => wliczaSieDoPodatku(f.typ) && f.dataWystawienia.startsWith(prefiks),
  );
}

export function obrotRoku(faktury: Faktura[], rok: number): number {
  return faktury
    .filter((f) => wliczaSieDoPodatku(f.typ) && f.dataWystawienia.startsWith(String(rok)))
    .reduce((s, f) => s + f.netto, 0);
}

export function fakturaZVat(firma: Firma, faktury: Faktura[], data: string, nettoTej: number, typ: TypFaktury): boolean {
  const rok = Number(data.slice(0, 4));
  const przed = obrotRoku(faktury, rok);
  const juzPlatnik = firma.vatRecznie || przed > LIMIT_VAT;
  if (!wliczaSieDoPodatku(typ)) return juzPlatnik;
  return juzPlatnik || przed + nettoTej > LIMIT_VAT;
}

export function firmaNaDzien(firma: Firma, faktury: Faktura[], rok = new Date().getFullYear()): Firma {
  const uzupelniona = uzupelnijFirme(firma);
  const platnik = uzupelniona.vatRecznie || obrotRoku(faktury, rok) > LIMIT_VAT;
  return { ...uzupelniona, platnikVat: platnik };
}

export function policzKoszt(rodzaj: RodzajKosztu, netto: number, vatNaFakturze: number, platnikVat: boolean) {
  const nettoGr = grosze(netto);
  if (rodzaj === "kraj") {
    const vatGr = grosze(vatNaFakturze);
    if (platnikVat) return { vatNalezny: 0, vatNaliczony: zlote(vatGr), kosztCit: zlote(nettoGr) };
    return { vatNalezny: 0, vatNaliczony: 0, kosztCit: zlote(nettoGr + vatGr) };
  }
  const vatPl = vatOdNettoGr(nettoGr, true);
  if (platnikVat) return { vatNalezny: zlote(vatPl), vatNaliczony: zlote(vatPl), kosztCit: zlote(nettoGr) };
  return { vatNalezny: zlote(vatPl), vatNaliczony: 0, kosztCit: zlote(nettoGr + vatPl) };
}

export function kosztyOkresu(koszty: Koszt[], rok: number, miesiac: number): Koszt[] {
  const mm = String(miesiac).padStart(2, "0");
  return koszty.filter((k) => k.data.startsWith(`${rok}-${mm}`));
}

export function rozliczenieMiesiaca(
  faktury: Faktura[],
  rok: number,
  miesiac: number,
  stawkaCit = 19,
  koszty: Koszt[] = [],
) {
  const dokumenty = fakturyOkresu(faktury, rok, miesiac);
  const kosztyMiesiaca = kosztyOkresu(koszty, rok, miesiac);
  const nettoGr = dokumenty.reduce((s, f) => s + grosze(f.netto), 0);
  const kosztGr = kosztyMiesiaca.reduce((s, k) => s + grosze(k.kosztCit), 0);
  const dochodGr = nettoGr - kosztGr;
  const vatSprzedazGr = dokumenty.reduce((s, f) => s + grosze(f.vat), 0);
  const vatNaleznyGr = vatSprzedazGr + kosztyMiesiaca.reduce((s, k) => s + grosze(k.vatNalezny), 0);
  const vatNaliczonyGr = kosztyMiesiaca.reduce((s, k) => s + grosze(k.vatNaliczony), 0);
  const roznicaGr = vatNaleznyGr - vatNaliczonyGr;
  return {
    dokumenty,
    koszty: kosztyMiesiaca,
    netto: zlote(nettoGr),
    kosztyCit: zlote(kosztGr),
    dochod: zlote(dochodGr),
    cit: zlote(citOdPrzychoduGr(dochodGr, stawkaCit)),
    vatNalezny: zlote(vatNaleznyGr),
    vatNaliczony: zlote(vatNaliczonyGr),
    vat: zlote(Math.max(0, roznicaGr)),
    nadwyzka: zlote(Math.max(0, -roznicaGr)),
    importUe: kosztyMiesiaca.filter((k) => k.rodzaj === "ue"),
    importPozaUe: kosztyMiesiaca.filter((k) => k.rodzaj === "poza_ue"),
  };
}

export function pieniadze(kwota: number): string {
  return kwota.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SWIETA = new Set([
  "2026-01-01",
  "2026-01-06",
  "2026-04-05",
  "2026-04-06",
  "2026-05-01",
  "2026-05-03",
  "2026-06-04",
  "2026-08-15",
  "2026-11-01",
  "2026-11-11",
  "2026-12-25",
  "2026-12-26",
  "2027-01-01",
  "2027-01-06",
]);

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function terminPoOkresie(rok: number, miesiac: number, dzien: number): Date {
  const data = new Date(rok, miesiac, dzien);
  while (data.getDay() === 0 || data.getDay() === 6 || SWIETA.has(iso(data))) {
    data.setDate(data.getDate() + 1);
  }
  return data;
}

export function dniDo(termin: Date, dzis = new Date()): number {
  const a = new Date(dzis.getFullYear(), dzis.getMonth(), dzis.getDate());
  const b = new Date(termin.getFullYear(), termin.getMonth(), termin.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function formatDaty(d: Date): string {
  return d.toLocaleDateString("pl-PL");
}

export function terminPlatnosci(dataWystawienia: string): string {
  const [rok, miesiac, dzien] = dataWystawienia.split("-").map(Number);
  const data = new Date(rok, miesiac - 1, dzien + 7);
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mm}-${dd}`;
}

export function poPolsku(iso: string): string {
  const [rok, miesiac, dzien] = iso.split("-");
  if (!rok || !miesiac || !dzien) return iso;
  return `${dzien}.${miesiac}.${rok}`;
}

export function wolnyNumer(faktury: Faktura[], typ: TypFaktury, data: string, zajeteDodatkowo: string[] = []): string {
  const [rok, miesiac] = data.split("-");
  const prefiks = { proforma: "PRO", zaliczkowa: "FZAL", koncowa: "FV", korekta: "FK" }[typ];
  const zajete = new Set([
    ...faktury
      .filter((f) => f.typ === typ && f.dataWystawienia.startsWith(`${rok}-${miesiac}`))
      .map((f) => f.numer),
    ...zajeteDodatkowo,
  ]);
  let n = 1;
  let numer = "";
  do {
    numer = `${prefiks}/${n}/${Number(miesiac)}/${rok}`;
    n += 1;
  } while (zajete.has(numer));
  return numer;
}

export function nastepnyNumer(faktury: Faktura[], typ: TypFaktury, data: string): string {
  const [rok, miesiac] = data.split("-");
  const prefiks = { proforma: "PRO", zaliczkowa: "FZAL", koncowa: "FV", korekta: "FK" }[typ];
  const ile = faktury.filter(
    (f) => f.typ === typ && f.dataWystawienia.startsWith(`${rok}-${miesiac}`),
  ).length;
  return `${prefiks}/${ile + 1}/${Number(miesiac)}/${rok}`;
}
