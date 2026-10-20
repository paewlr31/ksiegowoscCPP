import { NextResponse } from "next/server";
import { wczytajBaze, zapiszKoszt } from "@/lib/magazyn";
import { policzKoszt } from "@/lib/podatki";
import type { Koszt } from "@/lib/typy";
import { zalogujKsef } from "@/lib/wyslij-ksef";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Metadane = {
  ksefNumber?: string;
  invoiceNumber?: string;
  issueDate?: string;
  seller?: { nip?: string; name?: string };
  netAmount?: number;
  vatAmount?: number;
};

export async function POST(zadanie: Request) {
  const cialo = await zadanie.json().catch(() => null) as { rok?: number; miesiac?: number; faktura?: Metadane } | null;
  const rok = Number(cialo?.rok);
  const miesiac = Number(cialo?.miesiac);
  if (!rok || !miesiac) return NextResponse.json({ blad: "Podaj rok i miesiąc." }, { status: 400 });
  try {
    if (cialo?.faktura?.ksefNumber) {
      const baza = await wczytajBaze();
      const faktura = cialo.faktura;
      const numerKsef = faktura.ksefNumber ?? "";
      if (baza.koszty.some((k) => k.ksefZakupu === numerKsef)) {
        return NextResponse.json({ opis: "Ta faktura już jest w kosztach." });
      }
      const netto = Number(faktura.netAmount) || 0;
      const vat = Number(faktura.vatAmount) || 0;
      const dataFaktury = (faktura.issueDate || "").slice(0, 10);
      const okres = `${rok}-${String(miesiac).padStart(2, "0")}`;
      const kwoty = policzKoszt("kraj", netto, vat, baza.firma.platnikVat);
      const koszt: Koszt = {
        id: crypto.randomUUID(),
        data: dataFaktury.startsWith(okres) ? dataFaktury : `${okres}-01`,
        numer: faktura.invoiceNumber || numerKsef,
        dostawca: faktura.seller?.name || "Sprzedawca z KSeF",
        identyfikator: faktura.seller?.nip || "",
        kraj: "PL",
        rodzaj: "kraj",
        opis: "Pobrane z testowego KSeF",
        rachunek: "",
        bialaLista: "",
        ksefZakupu: numerKsef,
        netto,
        vatNaFakturze: vat,
        ...kwoty,
        utworzono: new Date().toISOString(),
      };
      await zapiszKoszt(koszt);
      return NextResponse.json({ opis: `Dodano ${koszt.numer}.`, dodane: 1 });
    }
    const sesja = await zalogujKsef();
    const od = new Date(Date.UTC(rok, miesiac - 1, 1)).toISOString();
    const dok = new Date(Date.UTC(rok, miesiac, 1)).toISOString();
    const odpowiedz = await fetch(`${sesja.api}/invoices/query/metadata?pageOffset=0&pageSize=30`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sesja.access}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        subjectType: "Subject2",
        dateRange: { dateType: "Invoicing", from: od, to: dok },
      }),
    });
    const dane = await odpowiedz.json().catch(() => ({}));
    if (!odpowiedz.ok) {
      const opis = dane.exception?.exceptionDetailList?.[0]?.exceptionDescription || "KSeF nie oddał listy zakupów.";
      return NextResponse.json({ blad: opis }, { status: 502 });
    }
    const faktury: Metadane[] = dane.invoices ?? dane.invoiceHeaderList ?? [];
    const baza = await wczytajBaze();
    const lista = faktury
      .filter((faktura) => faktura.ksefNumber && !baza.koszty.some((k) => k.ksefZakupu === faktura.ksefNumber))
      .map((faktura) => ({
        ksefNumber: faktura.ksefNumber,
        invoiceNumber: faktura.invoiceNumber,
        issueDate: faktura.issueDate,
        seller: faktura.seller,
        netAmount: faktura.netAmount,
        vatAmount: faktura.vatAmount,
      }));
    return NextResponse.json({
      faktury: lista,
      opis: lista.length
        ? "To faktury, w których ten NIP jest nabywcą. Na teście bywają też cudze. Dodaj tylko swoje. Google i Cursor tu nie wejdą."
        : "W testowym KSeF nie ma nowych faktur zakupu na ten NIP w tym miesiącu. Google i Cursor są spoza polskiego KSeF, więc wpisujesz je ręcznie.",
    });
  } catch (blad) {
    const tekst = blad instanceof Error ? blad.message : "Nie pobrano zakupów.";
    return NextResponse.json({ blad: tekst }, { status: 502 });
  }
}
