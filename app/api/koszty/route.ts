import { NextResponse } from "next/server";
import { wczytajBaze, zapiszKoszt } from "@/lib/magazyn";
import { policzKoszt } from "@/lib/podatki";
import type { Koszt, RodzajKosztu } from "@/lib/typy";
import { bledyKosztu, pierwszyBlad } from "@/lib/walidacja";

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
    const dostawca = cialo.dostawca?.trim() ?? "";
    const numer = cialo.numer?.trim() ?? "";
    const data = cialo.data ?? "";
    if (!data) return NextResponse.json({ blad: "Wpisz datę." }, { status: 400 });
    const netto = Number(cialo.netto);
    const vatNaFakturze = rodzaj === "kraj" ? Number(cialo.vatNaFakturze) || 0 : 0;
    const znalezione = bledyKosztu({
      rodzaj,
      dostawca,
      identyfikator: cialo.identyfikator ?? "",
      kraj: cialo.kraj ?? "",
      numer,
      netto,
      vatNaFakturze,
    });
    if (pierwszyBlad(znalezione)) return NextResponse.json({ blad: pierwszyBlad(znalezione) }, { status: 400 });
    const baza = await wczytajBaze();
    const kwoty = policzKoszt(rodzaj, netto, vatNaFakturze, baza.firma.platnikVat);
    const koszt: Koszt = {
      id: crypto.randomUUID(),
      data,
      numer,
      dostawca,
      identyfikator: (cialo.identyfikator ?? "").trim(),
      kraj: (cialo.kraj ?? (rodzaj === "kraj" ? "PL" : "")).trim().toUpperCase(),
      rodzaj,
      opis: (cialo.opis ?? "").trim(),
      rachunek: (cialo.rachunek ?? "").replace(/\D/g, ""),
      bialaLista: (cialo.bialaLista ?? "").trim(),
      ksefZakupu: (cialo.ksefZakupu ?? "").trim(),
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
