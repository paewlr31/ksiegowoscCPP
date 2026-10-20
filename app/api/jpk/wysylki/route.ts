import { NextResponse } from "next/server";
import { wczytajBaze, zapiszWysylke } from "@/lib/magazyn";
import { czytajUpo } from "@/lib/upo";
import type { WysylkaJpk } from "@/lib/typy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baza = await wczytajBaze();
    return NextResponse.json(baza.wysylki);
  } catch (blad) {
    const tekst = blad instanceof Error ? blad.message : "Nie wczytano wysyłek.";
    return NextResponse.json({ blad: tekst }, { status: 500 });
  }
}

export async function POST(zadanie: Request) {
  try {
    const cialo = await zadanie.json() as { upo?: string };
    const upo = cialo.upo ?? "";
    const potwierdzenie = czytajUpo(upo);
    if (!potwierdzenie?.numer) return NextResponse.json({ blad: "W pliku nie ma numeru referencyjnego." }, { status: 400 });
    const rok = Number(potwierdzenie.rok);
    const miesiac = Number(potwierdzenie.miesiac);
    if (!rok || !miesiac) return NextResponse.json({ blad: "W UPO nie ma okresu." }, { status: 400 });
    const wysylka: WysylkaJpk = {
      id: potwierdzenie.numer,
      rok,
      miesiac,
      cel: potwierdzenie.cel === "korekta" ? 2 : 1,
      numerReferencyjny: potwierdzenie.numer,
      kod: potwierdzenie.przyjeto ? 200 : 0,
      opis: potwierdzenie.przyjeto ? "Przetwarzanie dokumentu zakończone poprawnie. Wygenerowano UPO" : "",
      upo,
      utworzono: new Date().toISOString(),
    };
    await zapiszWysylke(wysylka);
    return NextResponse.json(wysylka);
  } catch (blad) {
    const tekst = blad instanceof Error ? blad.message : "Nie zapisano numeru.";
    return NextResponse.json({ blad: tekst }, { status: 500 });
  }
}
