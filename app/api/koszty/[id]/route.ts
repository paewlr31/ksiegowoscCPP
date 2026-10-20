import { NextResponse } from "next/server";
import { usunKoszt } from "@/lib/magazyn";

export const dynamic = "force-dynamic";

export async function DELETE(_zadanie: Request, kontekst: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await kontekst.params;
    await usunKoszt(id);
    return NextResponse.json({ ok: true });
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : "Błąd usuwania";
    return NextResponse.json({ blad: komunikat }, { status: 500 });
  }
}
