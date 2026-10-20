import { NextResponse } from "next/server";
import { wczytajBaze, zapiszFirme } from "@/lib/magazyn";
import { LIMIT_VAT, obrotRoku } from "@/lib/podatki";
import { uzupelnijFirme, type Firma } from "@/lib/typy";
import { bledyFirmy, pierwszyBlad } from "@/lib/walidacja";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baza = await wczytajBaze();
    return NextResponse.json(baza.firma);
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd odczytu";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}

export async function PUT(zadanie: Request) {
  try {
    const przychodzaca = uzupelnijFirme((await zadanie.json()) as Firma);
    const znalezione = bledyFirmy(przychodzaca);
    if (pierwszyBlad(znalezione)) return NextResponse.json({ blad: pierwszyBlad(znalezione) }, { status: 400 });
    const baza = await wczytajBaze();
    const obrot = obrotRoku(baza.faktury, new Date().getFullYear());
    const firma = { ...przychodzaca, platnikVat: przychodzaca.vatRecznie || obrot > LIMIT_VAT };
    await zapiszFirme(firma);
    return NextResponse.json(firma);
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd zapisu";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}
