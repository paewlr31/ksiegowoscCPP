import { NextResponse } from "next/server";
import { bazaWlaczona } from "@/lib/magazyn";
import { czytajKsef } from "@/lib/ksef-konfiguracja";

export const dynamic = "force-dynamic";

export async function GET() {
  const ksef = await czytajKsef();
  return NextResponse.json({
    baza: bazaWlaczona(),
    ksef: Boolean(ksef.token),
    nipTestowy: ksef.nip,
    mikrorachunek: ksef.mikrorachunek,
  });
}
