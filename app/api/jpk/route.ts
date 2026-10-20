import { NextResponse } from "next/server";
import { wczytajBaze } from "@/lib/magazyn";
import { jpkV7m } from "@/lib/jpk";
import { kosztyOkresu } from "@/lib/podatki";

export const dynamic = "force-dynamic";

export async function GET(zadanie: Request) {
  const url = new URL(zadanie.url);
  const rok = Number(url.searchParams.get("rok"));
  const miesiac = Number(url.searchParams.get("miesiac"));
  if (!rok || !miesiac) return NextResponse.json({ blad: "Podaj rok i miesiąc." }, { status: 400 });
  const baza = await wczytajBaze();
  const importUslug = kosztyOkresu(baza.koszty, rok, miesiac).some((k) => k.rodzaj !== "kraj");
  if (!baza.firma.platnikVat && !importUslug) {
    return NextResponse.json({ blad: "W tym miesiącu nie ma JPK. Nie jesteś płatnikiem VAT i nie było importu usług." }, { status: 400 });
  }
  const xml = jpkV7m(baza.firma, baza.faktury, baza.koszty, rok, miesiac);
  const nazwa = `JPK_V7M_${rok}_${String(miesiac).padStart(2, "0")}.xml`;
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nazwa}"`,
    },
  });
}
