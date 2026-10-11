import type { Faktura, TypFaktury } from "./typy";

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

export function citOdPrzychoduGr(przychodGr: number): number {
  if (przychodGr <= 0) return 0;
  return Math.round((przychodGr * 19) / 100);
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

export function rozliczenieMiesiaca(faktury: Faktura[], rok: number, miesiac: number) {
  const dokumenty = fakturyOkresu(faktury, rok, miesiac);
  const nettoGr = dokumenty.reduce((s, f) => s + grosze(f.netto), 0);
  const vatGr = dokumenty.reduce((s, f) => s + grosze(f.vat), 0);
  return {
    dokumenty,
    netto: zlote(nettoGr),
    vat: zlote(vatGr),
    cit: zlote(citOdPrzychoduGr(nettoGr)),
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

export function nastepnyNumer(faktury: Faktura[], typ: TypFaktury, data: string): string {
  const [rok, miesiac] = data.split("-");
  const prefiks = { proforma: "PRO", zaliczkowa: "FZAL", koncowa: "FV", korekta: "FK" }[typ];
  const ile = faktury.filter(
    (f) => f.typ === typ && f.dataWystawienia.startsWith(`${rok}-${miesiac}`),
  ).length;
  return `${prefiks}/${ile + 1}/${Number(miesiac)}/${rok}`;
}
