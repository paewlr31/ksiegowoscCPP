import { NextResponse } from "next/server";
import { wczytajBaze, zapiszFakture } from "@/lib/magazyn";
import { wolnyNumer } from "@/lib/podatki";
import { wyslijDoKsef } from "@/lib/wyslij-ksef";
import type { Faktura } from "@/lib/typy";

export const dynamic = "force-dynamic";

export async function POST(zadanie: Request) {
  try {
    const { id } = (await zadanie.json()) as { id: string };
    const baza = await wczytajBaze();
    const faktura = baza.faktury.find((f) => f.id === id);
    if (!faktura) return NextResponse.json({ blad: "Nie ma takiej faktury." }, { status: 404 });
    let aktualna: Faktura = faktura;
    let wynik;
    let zmienionoNumer = "";
    for (let proba = 0; proba < 4; proba++) {
      try {
        wynik = await wyslijDoKsef(aktualna, baza.firma, baza.faktury);
        break;
      } catch (blad) {
        const komunikat = blad instanceof Error ? blad.message : "Błąd KSeF";
        if (!/duplikat/i.test(komunikat) || proba === 3) {
          const odrzucona = { ...aktualna, ksefStatus: komunikat };
          await zapiszFakture(odrzucona);
          return NextResponse.json({ blad: komunikat, faktura: odrzucona }, { status: 500 });
        }
        const numer = wolnyNumer(baza.faktury, aktualna.typ, aktualna.dataWystawienia, [aktualna.numer]);
        aktualna = { ...aktualna, numer };
        baza.faktury = baza.faktury.map((f) => (f.id === aktualna.id ? aktualna : f));
        zmienionoNumer = numer;
        await zapiszFakture(aktualna);
      }
    }
    if (!wynik) return NextResponse.json({ blad: "KSeF nie przyjął faktury." }, { status: 500 });
    const opis = zmienionoNumer
      ? `Sukces. Poprzedni numer był już w KSeF, więc faktura dostała numer ${zmienionoNumer}.`
      : wynik.opis;
    const zapisana = { ...aktualna, ksefNumer: wynik.numer, ksefStatus: opis };
    await zapiszFakture(zapisana);
    return NextResponse.json({ ...wynik, opis, faktura: zapisana });
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd KSeF";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}
