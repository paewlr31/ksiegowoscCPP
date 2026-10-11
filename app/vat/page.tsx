"use client";

import { useEffect, useMemo, useState } from "react";
import type { Faktura, Firma } from "@/lib/typy";
import { dniDo, formatDaty, pieniadze, rozliczenieMiesiaca, terminPoOkresie } from "@/lib/podatki";

export default function VatStrona() {
  const teraz = new Date();
  const [firma, setFirma] = useState<Firma | null>(null);
  const [faktury, setFaktury] = useState<Faktura[]>([]);
  const [rok, setRok] = useState(teraz.getMonth() === 0 ? teraz.getFullYear() - 1 : teraz.getFullYear());
  const [miesiac, setMiesiac] = useState(teraz.getMonth() === 0 ? 12 : teraz.getMonth());
  const [mikrorachunek, setMikrorachunek] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/firma").then((r) => r.json()),
      fetch("/api/faktury").then((r) => r.json()),
      fetch("/api/status").then((r) => r.json()),
    ]).then(([f, lista, status]) => {
      setFirma(f);
      setFaktury(Array.isArray(lista) ? lista : []);
      setMikrorachunek(f.mikrorachunek || status.mikrorachunek || "");
    });
  }, []);

  const rozliczenie = useMemo(
    () => rozliczenieMiesiaca(faktury, rok, miesiac),
    [faktury, rok, miesiac],
  );
  const termin = terminPoOkresie(rok, miesiac, 25);
  const zostalo = dniDo(termin);
  const poTerminie = zostalo < 0;
  const nazwaOkresu = `${String(miesiac).padStart(2, "0")}.${rok}`;

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

      {!firma?.platnikVat && (
        <div className="rounded-2xl border border-mosiadz/40 bg-karta p-5">
          <p className="font-medium">Nie jesteś płatnikiem VAT.</p>
          <p className="mt-2 text-sm leading-relaxed">
            Pliku JPK nie składasz i VAT-u nie przelewasz. Na fakturach jest zwolnienie z art. 113. Jak zaznaczysz płatnika VAT w danych firmy, tu pojawi się kwota, termin i plik XML.
          </p>
          <p className="mt-3 font-serif text-3xl">0,00 zł</p>
        </div>
      )}

      {firma?.platnikVat && (
        <>
          <section className={`rounded-2xl border p-5 ${poTerminie ? "border-burak bg-burak/5" : "border-linia bg-karta"}`}>
            <p className="text-sm">Za {nazwaOkresu} masz zapłacić VAT</p>
            <p className="font-serif text-4xl">{pieniadze(rozliczenie.vat)} zł</p>
            <p className="mt-2 text-sm">
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
            {!firma.nip && <p className="mt-2 text-sm text-burak">W danych firmy nie ma NIP. Dopisz go, zanim wyślesz plik.</p>}
            {!firma.kodUrzedu && <p className="mt-1 text-sm text-burak">W danych firmy nie ma kodu urzędu. Bez niego bramka pliku nie przyjmie.</p>}
          </section>

          <details className="rounded-2xl border border-linia bg-karta p-5">
            <summary className="cursor-pointer font-medium">Co z tym zrobić, krok po kroku</summary>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              <li>Pobierz przyciskiem plik XML za {nazwaOkresu}.</li>
              <li>Wejdź na testową bramkę JPK: https://test-e-dokumenty.mf.gov.pl. Na produkcji będzie https://e-dokumenty.mf.gov.pl. Na razie zostań na teście.</li>
              <li>Wyślij tam ten XML. To jest JPK_V7M. Osobnego formularza VAT-7 już nie ma. Osobnego pliku na CIT tu nie wrzucasz.</li>
              <li>
                Podatek w wysokości {pieniadze(rozliczenie.vat)} zł przelej ręcznie do {formatDaty(termin)} na mikrorachunek{" "}
                <span className="font-medium">{mikrorachunek || "uzupełnij go w danych firmy"}</span>.
                W przelewie symbol formularza: VAT-7. Okres: {nazwaOkresu}.
              </li>
              <li>Proform nie ma w tym pliku. Zaliczki, faktury końcowe i korekty z tego miesiąca są.</li>
            </ol>
          </details>

          <ul className="divide-y divide-linia rounded-2xl border border-linia bg-karta">
            {rozliczenie.dokumenty.length === 0 && <li className="p-4 text-sm">W tym miesiącu nie ma faktur do VAT.</li>}
            {rozliczenie.dokumenty.map((f) => (
              <li key={f.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{f.numer}</span>
                <span>VAT {pieniadze(f.vat)} zł</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
