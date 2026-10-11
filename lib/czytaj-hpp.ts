import { promises as fs } from "fs";
import path from "path";

export type WierszObowiazku = {
  punkt: number;
  rytm: string;
  co: string;
  termin: string;
  gdzie: string;
  odpowiednik: string;
  kogo: string;
};

export async function czytajObowiazki(): Promise<WierszObowiazku[]> {
  const tekst = await fs.readFile(path.join(process.cwd(), "obowiazki.hpp"), "utf8");
  const wzor =
    /\{\s*(\d+),\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\s*\}/g;
  const wynik: WierszObowiazku[] = [];
  for (const trafienie of tekst.matchAll(wzor)) {
    wynik.push({
      punkt: Number(trafienie[1]),
      rytm: trafienie[2],
      co: trafienie[3],
      termin: trafienie[4],
      gdzie: trafienie[5],
      odpowiednik: trafienie[6],
      kogo: trafienie[7],
    });
  }
  return wynik.sort((a, b) => a.punkt - b.punkt);
}

export type GrupaKluczy = { nazwa: string; pola: { klucz: string; wartosc: string }[] };

export async function czytajKlucze(): Promise<GrupaKluczy[]> {
  const tekst = await fs.readFile(path.join(process.cwd(), "klucze.hpp"), "utf8");
  const grupy: GrupaKluczy[] = [];
  for (const czesc of tekst.split(/\nnamespace /).slice(1)) {
    const nazwa = czesc.match(/^(\w+)/)?.[1];
    if (!nazwa) continue;
    const cialo = czesc.split(/\n\}/)[0];
    const pola: { klucz: string; wartosc: string }[] = [];
    const pole = /(\w+)\s*=\s*(?:"([^"]*)"|([\d.]+)|(true|false))/g;
    for (const wiersz of cialo.matchAll(pole)) {
      pola.push({ klucz: wiersz[1], wartosc: wiersz[2] ?? wiersz[3] ?? wiersz[4] });
    }
    if (pola.length) grupy.push({ nazwa, pola });
  }
  return grupy;
}
