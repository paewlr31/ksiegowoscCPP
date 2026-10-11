import Link from "next/link";
import { ETYKIETA, type Faktura } from "@/lib/typy";
import { pieniadze } from "@/lib/podatki";

export function zbierzLancuch(id: string, faktury: Faktura[]): Faktura[] {
  const poId = new Map(faktury.map((f) => [f.id, f]));
  const widziane = new Set<string>();
  const wynik: Faktura[] = [];

  function wstecz(biezace: string) {
    const faktura = poId.get(biezace);
    if (!faktura || widziane.has(biezace)) return;
    for (const rodzic of faktura.podstawy) wstecz(rodzic);
    if (faktura.koryguje) wstecz(faktura.koryguje);
    widziane.add(biezace);
    wynik.push(faktura);
  }

  function dalej(biezace: string) {
    for (const faktura of faktury) {
      if (widziane.has(faktura.id)) continue;
      if (faktura.koryguje === biezace || faktura.podstawy.includes(biezace)) {
        widziane.add(faktura.id);
        wynik.push(faktura);
        dalej(faktura.id);
      }
    }
  }

  wstecz(id);
  dalej(id);
  return wynik.sort((a, b) => a.dataWystawienia.localeCompare(b.dataWystawienia) || a.utworzono.localeCompare(b.utworzono));
}

export function Lancuch({ id, faktury }: { id: string; faktury: Faktura[] }) {
  const ogniwa = zbierzLancuch(id, faktury);
  if (ogniwa.length < 2) return null;
  return (
    <ol className="relative space-y-3 border-l-2 border-las/30 pl-4">
      {ogniwa.map((f) => (
        <li key={f.id} className="relative">
          <span className={`absolute -left-[1.28rem] top-2 h-2.5 w-2.5 rounded-full ${f.id === id ? "bg-las" : "bg-linia"}`} />
          <Link href={`/faktury/${f.id}`} className={`block rounded-lg border px-3 py-2 ${f.id === id ? "border-las bg-las/5" : "border-linia bg-white"}`}>
            <span className="text-xs uppercase tracking-wide text-mosiadz">{ETYKIETA[f.typ]}</span>
            <span className="mt-0.5 block font-medium">{f.numer}</span>
            <span className="text-sm text-atrament/70">{pieniadze(f.brutto)} zł</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
