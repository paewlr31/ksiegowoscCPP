import { NextResponse } from "next/server";
import { wczytajBaze, zapiszKoszt } from "@/lib/magazyn";
import { policzKoszt } from "@/lib/podatki";
import type { Koszt, RodzajKosztu } from "@/lib/typy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baza = await wczytajBaze();
    return NextResponse.json(baza.koszty);
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd odczytu";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}

export async function POST(zadanie: Request) {
  try {
    const cialo = (await zadanie.json()) as Partial<Koszt>;
    const rodzaj = cialo.rodzaj as RodzajKosztu;
    if (!["kraj", "ue", "poza_ue"].includes(rodzaj)) {
      return NextResponse.json({ blad: "Wybierz rodzaj kosztu." }, { status: 400 });
    }
    if (!cialo.dostawca?.trim() || !cialo.numer?.trim() || !cialo.data) {
      return NextResponse.json({ blad: "Wpisz dostawcę, numer dokumentu i datę." }, { status: 400 });
    }
    const netto = Number(cialo.netto);
    if (!Number.isFinite(netto) || netto === 0) {
      return NextResponse.json({ blad: "Wpisz kwotę netto." }, { status: 400 });
    }
    const baza = await wczytajBaze();
    const vatNaFakturze = rodzaj === "kraj" ? Number(cialo.vatNaFakturze) || 0 : 0;
    const kwoty = policzKoszt(rodzaj, netto, vatNaFakturze, baza.firma.platnikVat);
    const koszt: Koszt = {
      id: crypto.randomUUID(),
      data: cialo.data,
      numer: cialo.numer.trim(),
      dostawca: cialo.dostawca.trim(),
      identyfikator: (cialo.identyfikator ?? "").trim(),
      kraj: (cialo.kraj ?? (rodzaj === "kraj" ? "PL" : "")).trim().toUpperCase(),
      rodzaj,
      opis: (cialo.opis ?? "").trim(),
      netto,
      vatNaFakturze,
      ...kwoty,
      utworzono: new Date().toISOString(),
    };
    await zapiszKoszt(koszt);
    return NextResponse.json(koszt);
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd zapisu";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}
