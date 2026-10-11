import { NextResponse } from "next/server";
import { wczytajBaze, zapiszFirme } from "@/lib/magazyn";
import type { Firma } from "@/lib/typy";

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
    const firma = (await zadanie.json()) as Firma;
    await zapiszFirme(firma);
    return NextResponse.json(firma);
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd zapisu";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}
