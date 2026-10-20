import { NextResponse } from "next/server";
import { wczytajBaze } from "@/lib/magazyn";
import { vatUeXml } from "@/lib/vat-ue";

export const dynamic = "force-dynamic";

export async function GET(zadanie: Request) {
  const url = new URL(zadanie.url);
  const rok = Number(url.searchParams.get("rok"));
  const miesiac = Number(url.searchParams.get("miesiac"));
  if (!rok || !miesiac) return NextResponse.json({ blad: "Podaj rok i miesiąc." }, { status: 400 });
  const baza = await wczytajBaze();
  const xml = vatUeXml(baza.firma, baza.faktury, rok, miesiac);
  if (!xml) {
    return NextResponse.json({
      blad: "W tym miesiącu nie ma VAT-UE. Zakup Google to import usług i jest w JPK. VAT-UE powstaje, gdy sam sprzedajesz usługę firmie z innego kraju Unii.",
    }, { status: 400 });
  }
  const nazwa = `VAT-UE_${rok}_${String(miesiac).padStart(2, "0")}.xml`;
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nazwa}"`,
    },
  });
}
