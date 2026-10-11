import { NextResponse } from "next/server";
import { wczytajBaze, zapiszFakture, zapiszFirme } from "@/lib/magazyn";
import { fakturaZVat, nastepnyNumer, sumaPozycji, terminPlatnosci } from "@/lib/podatki";
import type { Faktura, Pozycja, TypFaktury } from "@/lib/typy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baza = await wczytajBaze();
    return NextResponse.json(baza.faktury);
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd odczytu";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}

export async function POST(zadanie: Request) {
  try {
    const cialo = (await zadanie.json()) as Omit<Faktura, "id" | "numer" | "netto" | "vat" | "brutto" | "utworzono" | "ksefNumer" | "ksefStatus" | "terminPlatnosci"> & {
      numer?: string;
    };
    const baza = await wczytajBaze();
    const typ = cialo.typ as TypFaktury;
    if (typ === "korekta" && !cialo.koryguje) {
      return NextResponse.json({ blad: "Korekta musi wskazywać fakturę, którą poprawia." }, { status: 400 });
    }
    const pozycje = (cialo.pozycje ?? []) as Pozycja[];
    if (!pozycje.length || pozycje.some((p) => !p.nazwa.trim())) {
      return NextResponse.json({ blad: "Dodaj przynajmniej jedną pozycję z nazwą." }, { status: 400 });
    }
    if (!cialo.nabywca?.nazwa?.trim()) {
      return NextResponse.json({ blad: "Wpisz nazwę nabywcy." }, { status: 400 });
    }
    const nettoTej = sumaPozycji(pozycje, false).netto;
    const zVat = fakturaZVat(baza.firma, baza.faktury, cialo.dataWystawienia, nettoTej, typ);
    if (zVat && !baza.firma.platnikVat) await zapiszFirme({ ...baza.firma, platnikVat: true });
    const kwoty = sumaPozycji(pozycje, zVat);
    const faktura: Faktura = {
      id: crypto.randomUUID(),
      numer: cialo.numer?.trim() || nastepnyNumer(baza.faktury, typ, cialo.dataWystawienia),
      typ,
      dataWystawienia: cialo.dataWystawienia,
      dataSprzedazy: cialo.dataSprzedazy,
      terminPlatnosci: terminPlatnosci(cialo.dataWystawienia),
      pozycje,
      nabywca: cialo.nabywca,
      podstawy: cialo.podstawy ?? [],
      koryguje: cialo.koryguje,
      przyczynaKorekty: cialo.przyczynaKorekty ?? "",
      ...kwoty,
      platnikVat: zVat,
      sprzedawca: { ...baza.firma, platnikVat: zVat || baza.firma.platnikVat },
      ksefNumer: "",
      ksefStatus: "",
      utworzono: new Date().toISOString(),
    };
    await zapiszFakture(faktura);
    return NextResponse.json(faktura);
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd zapisu";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}
