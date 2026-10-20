"use client";

import { useEffect, useMemo, useState } from "react";
import type { Faktura, Firma, Koszt } from "@/lib/typy";
import { dniDo, formatDaty, pieniadze, rozliczenieMiesiaca, terminPoOkresie } from "@/lib/podatki";

export default function VatStrona() {
  const teraz = new Date();
  const [firma, setFirma] = useState<Firma | null>(null);
  const [faktury, setFaktury] = useState<Faktura[]>([]);
  const [koszty, setKoszty] = useState<Koszt[]>([]);
  const [rok, setRok] = useState(teraz.getMonth() === 0 ? teraz.getFullYear() - 1 : teraz.getFullYear());
  const [miesiac, setMiesiac] = useState(teraz.getMonth() === 0 ? 12 : teraz.getMonth());
  const [mikrorachunek, setMikrorachunek] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/firma").then((r) => r.json()),
      fetch("/api/faktury").then((r) => r.json()),
      fetch("/api/koszty").then((r) => r.json()),
      fetch("/api/status").then((r) => r.json()),
    ]).then(([f, lista, kosztyLista, status]) => {
      setFirma(f);
      setFaktury(Array.isArray(lista) ? lista : []);
      setKoszty(Array.isArray(kosztyLista) ? kosztyLista : []);
      setMikrorachunek(f.mikrorachunek || status.mikrorachunek || "");
    });
  }, []);

  const rozliczenie = useMemo(
    () => rozliczenieMiesiaca(faktury, rok, miesiac, 0, koszty),
    [faktury, rok, miesiac, koszty],
  );
  const termin = terminPoOkresie(rok, miesiac, 25);
  const zostalo = dniDo(termin);
  const poTerminie = zostalo < 0;
  const nazwaOkresu = `${String(miesiac).padStart(2, "0")}.${rok}`;
  const jestImport = rozliczenie.importUe.length > 0 || rozliczenie.importPozaUe.length > 0;
  const trzebaJpk = Boolean(firma?.platnikVat) || jestImport;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">VAT i JPK</h1>
        <p className="text-sm text-atrament/70">Spółka składa JPK_V7M co miesiąc. Kwartalny JPK jej nie dotyczy.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="pole">Miesiąc
          <input className="mt-1" type="number" min={1} max={12} value={miesiac} onChange={(e) => setMiesiac(Number(e.target.value))} />
        </label>
        <label className="pole">Rok
          <input className="mt-1" type="number" value={rok} onChange={(e) => setRok(Number(e.target.value))} />
        </label>
      </div>

      {!trzebaJpk && (
        <div className="rounded-2xl border border-mosiadz/40 bg-karta p-5">
          <p className="font-medium">Nie jesteś płatnikiem VAT.</p>
          <p className="mt-2 text-sm leading-relaxed">
            Pliku JPK nie składasz i VAT-u nie przelewasz. Na fakturach jest zwolnienie z art. 113. Jak zaznaczysz płatnika VAT w danych firmy, tu pojawi się kwota, termin i plik XML.
          </p>
          <p className="mt-3 font-serif text-3xl">0,00 zł</p>
        </div>
      )}

      {trzebaJpk && (
        <>
          <section className={`rounded-2xl border p-5 ${poTerminie ? "border-burak bg-burak/5" : "border-linia bg-karta"}`}>
            {!firma?.platnikVat && jestImport && (
              <p className="mb-2 text-sm">Nie jesteś płatnikiem VAT, ale import usług i tak zgłaszasz i płacisz.</p>
            )}
            <p className="text-sm">Za {nazwaOkresu} {rozliczenie.vat > 0 ? "masz zapłacić VAT" : "nie przelewasz VAT"}</p>
            <p className="font-serif text-4xl">{pieniadze(rozliczenie.vat)} zł</p>
            <p className="mt-2 text-sm">
              Należny {pieniadze(rozliczenie.vatNalezny)} zł, odliczenie {pieniadze(rozliczenie.vatNaliczony)} zł
              {rozliczenie.nadwyzka ? `, nadwyżka ${pieniadze(rozliczenie.nadwyzka)} zł na następny miesiąc` : ""}.
            </p>
            <p className="mt-1 text-sm">
              Termin: {formatDaty(termin)}.{" "}
              {poTerminie
                ? `Za okres ${nazwaOkresu} trzeba już złożyć JPK i zapłacić.`
                : zostalo === 0
                  ? "Termin jest dzisiaj."
                  : `Zostało ${zostalo} dni.`}
            </p>
            <a
              className="mt-4 inline-block rounded-lg bg-las px-4 py-2 text-sm text-white"
              href={`/api/jpk?rok=${rok}&miesiac=${miesiac}`}
            >
              Pobierz XML JPK_V7M za {nazwaOkresu}
            </a>
            {!firma?.nip && <p className="mt-2 text-sm text-burak">W danych firmy nie ma NIP. Dopisz go, zanim wyślesz plik.</p>}
            {!firma?.kodUrzedu && <p className="mt-1 text-sm text-burak">W danych firmy nie ma kodu urzędu. Bez niego bramka pliku nie przyjmie.</p>}
            {rozliczenie.importUe.length > 0 && (
              <p className="mt-3 text-sm">
                W tym miesiącu jest import usług z Unii ({rozliczenie.importUe.map((k) => `${k.dostawca} ${pieniadze(k.netto)} zł`).join(", ")}).
                Oprócz JPK złóż informację VAT-UE do 25. na bramce e-Deklaracji. Cursora i innych spoza Unii w VAT-UE nie ma.
              </p>
            )}
          </section>

          <details className="rounded-2xl border border-linia bg-karta p-5" open>
            <summary className="cursor-pointer font-medium">Gdzie złożyć i jak zapłacić</summary>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              <li>Pobierz przyciskiem plik XML za {nazwaOkresu}.</li>
              <li>Wyślij go na testową bramkę JPK: https://test-e-dokumenty.mf.gov.pl. To jest plik JPK_V7M. Osobnego VAT-7 nie ma.</li>
              <li>Termin złożenia i zapłaty: {formatDaty(termin)}. {poTerminie ? "Ten termin już minął." : zostalo === 0 ? "Termin jest dzisiaj." : `Zostało ${zostalo} dni.`}</li>
              <li>
                {rozliczenie.vat > 0
                  ? `Przelej ${pieniadze(rozliczenie.vat)} zł na mikrorachunek ${mikrorachunek || "(uzupełnij go w danych firmy)"}. Symbol: VAT-7. Okres: ${nazwaOkresu}.`
                  : "Przelewu nie rób. Podatek należny został odliczony."}
              </li>
              {rozliczenie.importUe.length > 0 && (
                <li>Dodatkowo złóż informację VAT-UE do tego samego dnia, 25., na bramce e-Deklaracji. Dotyczy tylko kosztów z Unii.</li>
              )}
            </ol>
          </details>

          <ul className="divide-y divide-linia rounded-2xl border border-linia bg-karta">
            {rozliczenie.dokumenty.length === 0 && rozliczenie.koszty.length === 0 && <li className="p-4 text-sm">W tym miesiącu nie ma dokumentów do VAT.</li>}
            {rozliczenie.dokumenty.map((f) => (
              <li key={f.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{f.numer}</span>
                <span>VAT sprzedaży {pieniadze(f.vat)} zł</span>
              </li>
            ))}
            {rozliczenie.koszty.filter((k) => k.vatNalezny !== 0 || k.vatNaliczony !== 0).map((k) => (
              <li key={k.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{k.dostawca} · {k.numer}</span>
                <span>należny {pieniadze(k.vatNalezny)} zł, odliczenie {pieniadze(k.vatNaliczony)} zł</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
