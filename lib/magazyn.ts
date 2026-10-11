import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { domyslnaFirma, type Baza, type Faktura, type Firma } from "./typy";

const PLIK = path.join(process.cwd(), ".data", "baza.json");

function klient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function supabaseWlaczony(): boolean {
  return klient() !== null;
}

async function wczytajPlik(): Promise<Baza> {
  try {
    const surowe = await fs.readFile(PLIK, "utf8");
    const dane = JSON.parse(surowe) as Baza;
    return { firma: { ...domyslnaFirma(), ...dane.firma }, faktury: dane.faktury ?? [] };
  } catch {
    return { firma: domyslnaFirma(), faktury: [] };
  }
}

async function zapiszPlik(baza: Baza): Promise<void> {
  await fs.mkdir(path.dirname(PLIK), { recursive: true });
  await fs.writeFile(PLIK, JSON.stringify(baza, null, 2), "utf8");
}

export async function wczytajBaze(): Promise<Baza> {
  const sb = klient();
  if (!sb) return wczytajPlik();

  const firmaWynik = await sb.from("firma").select("dane").eq("id", 1).maybeSingle();
  if (firmaWynik.error) throw new Error(firmaWynik.error.message);
  const fakturyWynik = await sb.from("faktury").select("dane");
  if (fakturyWynik.error) throw new Error(fakturyWynik.error.message);

  const firma = firmaWynik.data?.dane
    ? ({ ...domyslnaFirma(), ...(firmaWynik.data.dane as Firma) } satisfies Firma)
    : domyslnaFirma();
  const faktury = (fakturyWynik.data ?? []).map((wiersz) => wiersz.dane as Faktura);
  faktury.sort((a, b) => b.utworzono.localeCompare(a.utworzono));
  return { firma, faktury };
}

export async function zapiszFirme(firma: Firma): Promise<void> {
  const sb = klient();
  if (!sb) {
    const baza = await wczytajPlik();
    baza.firma = firma;
    await zapiszPlik(baza);
    return;
  }
  const wynik = await sb.from("firma").upsert({ id: 1, dane: firma });
  if (wynik.error) throw new Error(wynik.error.message);
}

export async function zapiszFakture(faktura: Faktura): Promise<void> {
  const sb = klient();
  if (!sb) {
    const baza = await wczytajPlik();
    baza.faktury = [faktura, ...baza.faktury.filter((f) => f.id !== faktura.id)];
    await zapiszPlik(baza);
    return;
  }
  const wynik = await sb.from("faktury").upsert({
    id: faktura.id,
    dane: faktura,
    utworzono: faktura.utworzono,
  });
  if (wynik.error) throw new Error(wynik.error.message);
}
