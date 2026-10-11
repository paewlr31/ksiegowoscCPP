import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { firmaNaDzien } from "./podatki";
import { domyslnaFirma, uzupelnijFirme, type Baza, type Faktura, type Firma } from "./typy";

const PLIK = path.join(process.cwd(), ".data", "baza.json");

function adresBazy(): string | null {
  const surowy = process.env.DATABASE_URL?.trim();
  if (!surowy) return null;
  const url = surowy.replace(/^DATABASE_URL=/, "").replace(/&channel_binding=[^&]*/g, "");
  if (url.includes("USER:HASLO") || url.includes("ep-xxxx")) {
    throw new Error("W Vercelu jest przykładowy adres bazy, nie ten z Neon. Wklej skopiowany connection string z włączonym poolingiem.");
  }
  return url;
}

function klient() {
  const url = adresBazy();
  if (!url) return null;
  return neon(url);
}

export function bazaWlaczona(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function jakoObiekt<T>(wartosc: unknown): T {
  if (typeof wartosc === "string") return JSON.parse(wartosc) as T;
  return wartosc as T;
}

async function wczytajPlik(): Promise<Baza> {
  try {
    const surowe = await fs.readFile(PLIK, "utf8");
    const dane = JSON.parse(surowe) as Baza;
    const faktury = dane.faktury ?? [];
    return { firma: firmaNaDzien(uzupelnijFirme(dane.firma), faktury), faktury };
  } catch {
    return { firma: domyslnaFirma(), faktury: [] };
  }
}

async function zapiszPlik(baza: Baza): Promise<void> {
  await fs.mkdir(path.dirname(PLIK), { recursive: true });
  await fs.writeFile(PLIK, JSON.stringify(baza, null, 2), "utf8");
}

export async function wczytajBaze(): Promise<Baza> {
  const sql = klient();
  if (!sql) return wczytajPlik();

  const firmaWiersze = await sql`select dane from firma where id = 1`;
  const fakturyWiersze = await sql`select dane from faktury order by utworzono desc`;

  const faktury = fakturyWiersze.map((wiersz) => jakoObiekt<Faktura>(wiersz.dane));
  const surowa = firmaWiersze[0] ? jakoObiekt<Firma>(firmaWiersze[0].dane) : domyslnaFirma();
  return { firma: firmaNaDzien(surowa, faktury), faktury };
}

export async function zapiszFirme(firma: Firma): Promise<void> {
  const sql = klient();
  if (!sql) {
    const baza = await wczytajPlik();
    baza.firma = firma;
    await zapiszPlik(baza);
    return;
  }
  const json = JSON.stringify(firma);
  await sql`
    insert into firma (id, dane)
    values (1, ${json}::jsonb)
    on conflict (id) do update set dane = excluded.dane
  `;
}

export async function zapiszFakture(faktura: Faktura): Promise<void> {
  const sql = klient();
  if (!sql) {
    const baza = await wczytajPlik();
    baza.faktury = [faktura, ...baza.faktury.filter((f) => f.id !== faktura.id)];
    await zapiszPlik(baza);
    return;
  }
  const json = JSON.stringify(faktura);
  await sql`
    insert into faktury (id, dane, utworzono)
    values (${faktura.id}, ${json}::jsonb, ${faktura.utworzono})
    on conflict (id) do update set dane = excluded.dane
  `;
}
