import { NextResponse } from "next/server";
import { wczytajBaze, zapiszFakture } from "@/lib/magazyn";
import { wyslijDoKsef } from "@/lib/wyslij-ksef";

export const dynamic = "force-dynamic";

export async function POST(zadanie: Request) {
  try {
    const { id } = (await zadanie.json()) as { id: string };
    const baza = await wczytajBaze();
    const faktura = baza.faktury.find((f) => f.id === id);
    if (!faktura) return NextResponse.json({ blad: "Nie ma takiej faktury." }, { status: 404 });
    const wynik = await wyslijDoKsef(faktura, baza.firma, baza.faktury);
    const zapisana = {
      ...faktura,
      ksefNumer: wynik.numer,
      ksefStatus: wynik.opis,
    };
    await zapiszFakture(zapisana);
    return NextResponse.json({ ...wynik, faktura: zapisana });
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd KSeF";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}
