import { NextResponse } from "next/server";
import { statusJpk } from "@/lib/wyslij-jpk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(zadanie: Request) {
  const numer = new URL(zadanie.url).searchParams.get("numer") ?? "";
  try {
    return NextResponse.json(await statusJpk(numer));
  } catch (blad) {
    const tekst = blad instanceof Error ? blad.message : "Nie sprawdzono statusu.";
    return NextResponse.json({ blad: tekst }, { status: 502 });
  }
}
