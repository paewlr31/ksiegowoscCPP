import { czytajKlucze } from "@/lib/czytaj-hpp";

export const dynamic = "force-dynamic";

export default async function KluczeStrona() {
  const grupy = await czytajKlucze();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl">Klucze i bramki</h1>
        <p className="text-sm text-atrament/70">Treść z pliku klucze.hpp, bez zmiany tego pliku. Token testowy jest tu widoczny, więc tej strony nie wystawiaj publicznie.</p>
      </div>
      {grupy.map((grupa) => (
        <section key={grupa.nazwa}>
          <h2 className="mb-3 font-serif text-2xl">{grupa.nazwa}</h2>
          <dl className="divide-y divide-linia overflow-hidden rounded-2xl border border-linia bg-karta">
            {grupa.pola.map((pole) => (
              <div key={pole.klucz} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]">
                <dt className="text-sm text-mosiadz">{pole.klucz}</dt>
                <dd className="break-all text-sm">{pole.wartosc}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
