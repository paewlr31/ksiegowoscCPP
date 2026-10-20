import { NextResponse } from "next/server";
import { wczytajBaze, zapiszWysylke } from "@/lib/magazyn";
import { jpkV7m } from "@/lib/jpk";
import { kosztyOkresu } from "@/lib/podatki";
import { bladPrzedWysylka, wyslijJpk } from "@/lib/wyslij-jpk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(zadanie: Request) {
  const cialo = await zadanie.json().catch(() => null) as { rok?: number; miesiac?: number; cel?: number; powod?: string } | null;
  const rok = Number(cialo?.rok);
  const miesiac = Number(cialo?.miesiac);
  const cel = cialo?.cel === 2 ? 2 : 1;
  const powod = (cialo?.powod ?? "").trim();
  if (!rok || !miesiac) return NextResponse.json({ blad: "Podaj rok i miesiąc." }, { status: 400 });
  try {
    const baza = await wczytajBaze();
    const importUslug = kosztyOkresu(baza.koszty, rok, miesiac).some((k) => k.rodzaj !== "kraj");
    if (!baza.firma.platnikVat && !importUslug) {
      return NextResponse.json({ blad: "W tym miesiącu nie ma JPK. Nie jesteś płatnikiem VAT i nie było importu usług." }, { status: 400 });
    }
    const brak = bladPrzedWysylka(baza.firma, rok, miesiac);
    if (brak) return NextResponse.json({ blad: brak }, { status: 400 });
    if (cel === 2 && !powod) return NextResponse.json({ blad: "Wpisz, co poprawiasz w korekcie." }, { status: 400 });
    const xml = jpkV7m(baza.firma, baza.faktury, baza.koszty, rok, miesiac, cel, powod);
    const wynik = await wyslijJpk(xml, baza.firma.nip, rok, miesiac);
    if (wynik.numerReferencyjny) {
      await zapiszWysylke({
        id: wynik.numerReferencyjny,
        rok,
        miesiac,
        cel,
        numerReferencyjny: wynik.numerReferencyjny,
        kod: wynik.kod,
        opis: wynik.opis,
        upo: wynik.upo,
        utworzono: new Date().toISOString(),
      });
    }
    return NextResponse.json(wynik);
  } catch (blad) {
    const tekst = blad instanceof Error ? blad.message : "Nie wysłano JPK.";
    return NextResponse.json({ blad: tekst }, { status: 502 });
  }
}
