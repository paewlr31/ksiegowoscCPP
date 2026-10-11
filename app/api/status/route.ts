import { NextResponse } from "next/server";
import { supabaseWlaczony } from "@/lib/magazyn";
import { czytajKsef } from "@/lib/ksef-konfiguracja";

export const dynamic = "force-dynamic";

export async function GET() {
  const ksef = await czytajKsef();
  return NextResponse.json({
    supabase: supabaseWlaczony(),
    ksef: Boolean(ksef.token),
    nipTestowy: ksef.nip,
    mikrorachunek: ksef.mikrorachunek,
  });
}
