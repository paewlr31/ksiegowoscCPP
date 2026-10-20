import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { firmaNaDzien } from "./podatki";
import { domyslnaFirma, uzupelnijFirme, type Baza, type Faktura, type Firma, type Koszt, type WysylkaJpk } from "./typy";

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
    return {
      firma: firmaNaDzien(uzupelnijFirme(dane.firma), faktury),
      faktury,
      koszty: dane.koszty ?? [],
      wysylki: dane.wysylki ?? [],
    };
  } catch {
    return { firma: domyslnaFirma(), faktury: [], koszty: [], wysylki: [] };
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
  let koszty: Koszt[] = [];
  try {
    const kosztyWiersze = await sql`select dane from koszty order by utworzono desc`;
    koszty = kosztyWiersze.map((wiersz) => jakoObiekt<Koszt>(wiersz.dane));
  } catch {
    throw new Error("W Neon nie ma tabeli koszty. W SQL Editor uruchom tworzenie tabeli koszty z pliku db/schema.sql.");
  }
  const surowa = firmaWiersze[0] ? jakoObiekt<Firma>(firmaWiersze[0].dane) : domyslnaFirma();
  const wysylki = await wczytajWysylkiSql(sql);
  return { firma: firmaNaDzien(surowa, faktury), faktury, koszty, wysylki };
}

type Sql = Exclude<ReturnType<typeof klient>, null>;

async function zapewnijWysylki(sql: Sql) {
  await sql`create table if not exists wysylki (
    id text primary key,
    dane jsonb not null,
    utworzono timestamptz not null default now()
  )`;
}

async function wczytajWysylkiSql(sql: Sql): Promise<WysylkaJpk[]> {
  try {
    const wiersze = await sql`select dane from wysylki order by utworzono desc`;
    return wiersze.map((wiersz) => jakoObiekt<WysylkaJpk>(wiersz.dane));
  } catch {
    await zapewnijWysylki(sql);
    const wiersze = await sql`select dane from wysylki order by utworzono desc`;
    return wiersze.map((wiersz) => jakoObiekt<WysylkaJpk>(wiersz.dane));
  }
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

export async function zapiszKoszt(koszt: Koszt): Promise<void> {
  const sql = klient();
  if (!sql) {
    const baza = await wczytajPlik();
    baza.koszty = [koszt, ...baza.koszty.filter((k) => k.id !== koszt.id)];
    await zapiszPlik(baza);
    return;
  }
  const json = JSON.stringify(koszt);
  await sql`
    insert into koszty (id, dane, utworzono)
    values (${koszt.id}, ${json}::jsonb, ${koszt.utworzono})
    on conflict (id) do update set dane = excluded.dane
  `;
}

export async function zapiszWysylke(wysylka: WysylkaJpk): Promise<void> {
  const sql = klient();
  if (!sql) {
    const baza = await wczytajPlik();
    baza.wysylki = [wysylka, ...baza.wysylki.filter((w) => w.numerReferencyjny !== wysylka.numerReferencyjny)];
    await zapiszPlik(baza);
    return;
  }
  await zapewnijWysylki(sql);
  const json = JSON.stringify(wysylka);
  await sql`
    insert into wysylki (id, dane, utworzono)
    values (${wysylka.id}, ${json}::jsonb, ${wysylka.utworzono})
    on conflict (id) do update set dane = excluded.dane
  `;
}

export async function usunKoszt(id: string): Promise<void> {
  const sql = klient();
  if (!sql) {
    const baza = await wczytajPlik();
    baza.koszty = baza.koszty.filter((k) => k.id !== id);
    await zapiszPlik(baza);
    return;
  }
  await sql`delete from koszty where id = ${id}`;
}

export async function usunFakture(id: string): Promise<void> {
  const sql = klient();
  if (!sql) {
    const baza = await wczytajPlik();
    baza.faktury = baza.faktury.filter((f) => f.id !== id);
    await zapiszPlik(baza);
    return;
  }
  await sql`delete from faktury where id = ${id}`;
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
