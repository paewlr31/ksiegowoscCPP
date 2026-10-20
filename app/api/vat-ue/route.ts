import { NextResponse } from "next/server";
import { wczytajBaze, zapiszWysylke } from "@/lib/magazyn";
import { pozycjeVatUe, vatUeXml, vatUekXml, type PozycjaVatUe } from "@/lib/vat-ue";

export const dynamic = "force-dynamic";

function zlozone(baza: Awaited<ReturnType<typeof wczytajBaze>>, rok: number, miesiac: number): PozycjaVatUe[] | null {
  const zapis = baza.wysylki.find((w) => w.opis === "VAT-UE" && w.rok === rok && w.miesiac === miesiac);
  if (!zapis) return null;
  try {
    return JSON.parse(zapis.upo) as PozycjaVatUe[];
  } catch {
    return null;
  }
}

export async function GET(zadanie: Request) {
  const url = new URL(zadanie.url);
  const rok = Number(url.searchParams.get("rok"));
  const miesiac = Number(url.searchParams.get("miesiac"));
  const korekta = url.searchParams.get("korekta") === "1";
  if (!rok || !miesiac) return NextResponse.json({ blad: "Podaj rok i miesiąc." }, { status: 400 });
  const baza = await wczytajBaze();
  if (!korekta) {
    const xml = vatUeXml(baza.firma, baza.faktury, rok, miesiac);
    if (!xml) {
      return NextResponse.json({
        blad: "W tym miesiącu nie ma sprzedaży usług firmie z Unii. Zakup Google nie tworzy VAT-UE.",
      }, { status: 400 });
    }
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="VAT-UE_${rok}_${String(miesiac).padStart(2, "0")}.xml"`,
      },
    });
  }
  const bylo = zlozone(baza, rok, miesiac);
  if (!bylo) {
    return NextResponse.json({ blad: "Najpierw pobierz VAT-UE i kliknij, że plik został złożony. Korekta porównuje tamten stan z fakturami." }, { status: 400 });
  }
  const xml = vatUekXml(baza.firma, rok, miesiac, bylo, pozycjeVatUe(baza.faktury, rok, miesiac));
  if (!xml) return NextResponse.json({ blad: "Faktury nie różnią się od złożonego VAT-UE. Korekty nie ma z czego zbudować." }, { status: 400 });
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="VAT-UEK_${rok}_${String(miesiac).padStart(2, "0")}.xml"`,
    },
  });
}

export async function POST(zadanie: Request) {
  const cialo = await zadanie.json().catch(() => null) as { rok?: number; miesiac?: number } | null;
  const rok = Number(cialo?.rok);
  const miesiac = Number(cialo?.miesiac);
  if (!rok || !miesiac) return NextResponse.json({ blad: "Podaj rok i miesiąc." }, { status: 400 });
  const baza = await wczytajBaze();
  const pozycje = pozycjeVatUe(baza.faktury, rok, miesiac);
  if (!pozycje.length) return NextResponse.json({ blad: "Nie ma pozycji do zapamiętania." }, { status: 400 });
  if (zlozone(baza, rok, miesiac)) return NextResponse.json({ opis: "Ten miesiąc jest już zapamiętany jako złożony. Dalsza zmiana idzie korektą VAT-UEK." });
  await zapiszWysylke({
    id: `VATUE-${rok}-${miesiac}`,
    rok,
    miesiac,
    cel: 1,
    numerReferencyjny: `VATUE-${rok}-${miesiac}`,
    kod: 0,
    opis: "VAT-UE",
    upo: JSON.stringify(pozycje),
    utworzono: new Date().toISOString(),
  });
  return NextResponse.json({ opis: "Zapamiętane. Jak poprawisz fakturę, pobierz VAT-UEK." });
}
