import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { domyslnaFirma, type Baza, type Faktura, type Firma } from "./typy";

const PLIK = path.join(process.cwd(), ".data", "baza.json");

function klient() {
  const url = process.env.DATABASE_URL;
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
  const sql = klient();
  if (!sql) return wczytajPlik();

  const firmaWiersze = await sql`select dane from firma where id = 1`;
  const fakturyWiersze = await sql`select dane from faktury order by utworzono desc`;

  const firma = firmaWiersze[0]
    ? ({ ...domyslnaFirma(), ...jakoObiekt<Firma>(firmaWiersze[0].dane) } satisfies Firma)
    : domyslnaFirma();
  const faktury = fakturyWiersze.map((wiersz) => jakoObiekt<Faktura>(wiersz.dane));
  return { firma, faktury };
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
