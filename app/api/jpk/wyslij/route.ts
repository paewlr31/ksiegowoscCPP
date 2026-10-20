import { NextResponse } from "next/server";
import { wczytajBaze } from "@/lib/magazyn";
import { jpkV7m } from "@/lib/jpk";
import { kosztyOkresu } from "@/lib/podatki";
import { bladPrzedWysylka, wyslijJpk } from "@/lib/wyslij-jpk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(zadanie: Request) {
  const cialo = await zadanie.json().catch(() => null) as { rok?: number; miesiac?: number } | null;
  const rok = Number(cialo?.rok);
  const miesiac = Number(cialo?.miesiac);
  if (!rok || !miesiac) return NextResponse.json({ blad: "Podaj rok i miesiąc." }, { status: 400 });
  try {
    const baza = await wczytajBaze();
    const importUslug = kosztyOkresu(baza.koszty, rok, miesiac).some((k) => k.rodzaj !== "kraj");
    if (!baza.firma.platnikVat && !importUslug) {
      return NextResponse.json({ blad: "W tym miesiącu nie ma JPK. Nie jesteś płatnikiem VAT i nie było importu usług." }, { status: 400 });
    }
    const brak = bladPrzedWysylka(baza.firma, rok, miesiac);
    if (brak) return NextResponse.json({ blad: brak }, { status: 400 });
    const xml = jpkV7m(baza.firma, baza.faktury, baza.koszty, rok, miesiac);
    const wynik = await wyslijJpk(xml, baza.firma.nip, rok, miesiac);
    return NextResponse.json(wynik);
  } catch (blad) {
    const tekst = blad instanceof Error ? blad.message : "Nie wysłano JPK.";
    return NextResponse.json({ blad: tekst }, { status: 502 });
  }
}
