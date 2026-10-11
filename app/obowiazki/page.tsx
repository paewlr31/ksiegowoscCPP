import { czytajObowiazki } from "@/lib/czytaj-hpp";

export const dynamic = "force-dynamic";

const KOLEJNOSC = ["na biezaco", "miesiac", "kwartal", "rok", "na zadanie", "po zdarzeniu"];

export default async function ObowiazkiStrona() {
  const wiersze = await czytajObowiazki();
  const grupy = KOLEJNOSC.map((rytm) => ({
    rytm,
    wiersze: wiersze.filter((w) => w.rytm === rytm),
  })).filter((g) => g.wiersze.length);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl">Obowiązki</h1>
        <p className="text-sm text-atrament/70">Treść z pliku obowiazki.hpp, bez zmiany tego pliku.</p>
      </div>
      {grupy.map((grupa) => (
        <section key={grupa.rytm}>
          <h2 className="mb-3 font-serif text-2xl capitalize">{grupa.rytm}</h2>
          <div className="space-y-3">
            {grupa.wiersze.map((w) => (
              <article key={w.punkt} className="rounded-2xl border border-linia bg-karta p-4">
                <p className="text-xs uppercase tracking-wide text-mosiadz">Punkt {w.punkt}</p>
                <h3 className="font-medium">{w.co}</h3>
                <p className="mt-1 text-sm">{w.termin}</p>
                <p className="text-sm text-atrament/70">Gdzie: {w.gdzie}</p>
                <p className="text-sm text-atrament/70">Kogo dotyczy: {w.kogo}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
