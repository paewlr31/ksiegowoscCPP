import { NextResponse } from "next/server";
import { usunFakture, wczytajBaze, zapiszFakture, zapiszFirme } from "@/lib/magazyn";
import { fakturaZVat, sumaPozycji, terminPlatnosci } from "@/lib/podatki";
import type { Faktura, Nabywca, Pozycja, TypFaktury } from "@/lib/typy";
import { bledyNabywcy, bledyPozycji, pierwszyBlad } from "@/lib/walidacja";

export const dynamic = "force-dynamic";

type Kontekst = { params: Promise<{ id: string }> };

export async function PUT(zadanie: Request, kontekst: Kontekst) {
  try {
    const { id } = await kontekst.params;
    const baza = await wczytajBaze();
    const byla = baza.faktury.find((f) => f.id === id);
    if (!byla) return NextResponse.json({ blad: "Nie ma takiej faktury." }, { status: 404 });
    if (byla.ksefNumer) {
      return NextResponse.json({ blad: "Ta faktura jest już w KSeF. Poprawkę zrób jako korektę." }, { status: 400 });
    }
    const cialo = (await zadanie.json()) as Partial<Faktura>;
    const typ = (cialo.typ ?? byla.typ) as TypFaktury;
    if (typ === "korekta" && !(cialo.koryguje ?? byla.koryguje)) {
      return NextResponse.json({ blad: "Korekta musi wskazywać fakturę, którą poprawia." }, { status: 400 });
    }
    const pozycje = (cialo.pozycje ?? byla.pozycje) as Pozycja[];
    const nabywca = cialo.nabywca ?? byla.nabywca;
    const znalezione = { ...bledyNabywcy(nabywca as Nabywca), ...bledyPozycji(pozycje, typ) };
    if (pierwszyBlad(znalezione)) return NextResponse.json({ blad: pierwszyBlad(znalezione) }, { status: 400 });
    const dataWystawienia = cialo.dataWystawienia ?? byla.dataWystawienia;
    const pozostale = baza.faktury.filter((f) => f.id !== id);
    const nettoTej = sumaPozycji(pozycje, false).netto;
    const zVat = fakturaZVat(baza.firma, pozostale, dataWystawienia, nettoTej, typ);
    if (zVat && !baza.firma.platnikVat) await zapiszFirme({ ...baza.firma, platnikVat: true });
    const faktura: Faktura = {
      ...byla,
      typ,
      dataWystawienia,
      dataSprzedazy: cialo.dataSprzedazy ?? byla.dataSprzedazy,
      terminPlatnosci: terminPlatnosci(dataWystawienia),
      pozycje,
      nabywca,
      podstawy: cialo.podstawy ?? byla.podstawy,
      koryguje: cialo.koryguje === undefined ? byla.koryguje : cialo.koryguje,
      przyczynaKorekty: cialo.przyczynaKorekty ?? byla.przyczynaKorekty,
      ...sumaPozycji(pozycje, zVat),
      platnikVat: zVat,
      sprzedawca: { ...baza.firma, platnikVat: zVat || baza.firma.platnikVat },
      ksefNumer: "",
      ksefStatus: "",
    };
    await zapiszFakture(faktura);
    return NextResponse.json(faktura);
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd zapisu";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}

export async function DELETE(_zadanie: Request, kontekst: Kontekst) {
  try {
    const { id } = await kontekst.params;
    const baza = await wczytajBaze();
    const faktura = baza.faktury.find((f) => f.id === id);
    if (!faktura) return NextResponse.json({ blad: "Nie ma takiej faktury." }, { status: 404 });
    if (faktura.ksefNumer) {
      return NextResponse.json({ blad: "Tej faktury nie da się usunąć, bo jest już w KSeF." }, { status: 400 });
    }
    const powiazana = baza.faktury.find((f) => f.id !== id && (f.koryguje === id || f.podstawy.includes(id)));
    if (powiazana) {
      return NextResponse.json({ blad: `Najpierw usuń fakturę ${powiazana.numer}, bo jest z nią powiązana.` }, { status: 400 });
    }
    await usunFakture(id);
    return NextResponse.json({ ok: true });
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd usuwania";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}
