"use client";

import { useEffect, useMemo, useState } from "react";
import type { Faktura, Firma, Koszt } from "@/lib/typy";
import { dniDo, formatDaty, pieniadze, procentCit, rozliczenieMiesiaca, terminPoOkresie } from "@/lib/podatki";

function cyfry(wartosc: string, limit: number) {
  return wartosc.replace(/\D/g, "").replace(/^0+/, "").slice(0, limit);
}

export default function CitStrona() {
  const start = new Date();
  const [firma, setFirma] = useState<Firma | null>(null);
  const [faktury, setFaktury] = useState<Faktura[]>([]);
  const [koszty, setKoszty] = useState<Koszt[]>([]);
  const [rok, setRok] = useState(start.getFullYear());
  const [miesiac, setMiesiac] = useState(start.getMonth() + 1);
  const [rokPole, setRokPole] = useState(String(start.getFullYear()));
  const [miesiacPole, setMiesiacPole] = useState(String(start.getMonth() + 1));
  const [czasUrzadzenia, setCzasUrzadzenia] = useState("");
  const [mikrorachunek, setMikrorachunek] = useState("");

  useEffect(() => {
    const data = new Date();
    setRok(data.getFullYear());
    setMiesiac(data.getMonth() + 1);
    setRokPole(String(data.getFullYear()));
    setMiesiacPole(String(data.getMonth() + 1));
    setCzasUrzadzenia(data.toLocaleString("pl-PL", { dateStyle: "long", timeStyle: "short" }));
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

  const stawka = firma ? procentCit(firma) : 0;
  const rozliczenie = useMemo(
    () => rozliczenieMiesiaca(faktury, rok, miesiac, stawka, koszty),
    [faktury, rok, miesiac, stawka, koszty],
  );
  const termin = terminPoOkresie(rok, miesiac, 20);
  const zostalo = dniDo(termin);
  const nazwaOkresu = `${String(miesiac).padStart(2, "0")}.${rok}`;
  const nierejestrowana = firma?.rodzaj !== "spolka";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">CIT</h1>
        <p className="max-w-2xl text-sm text-atrament/70">
          Zaliczka miesięczna nie ma pliku XML. Płaci się przelewem. Plik CIT-8 jest raz w roku, do 31 marca, i na tym etapie program go jeszcze nie składa.
        </p>
      </div>

      {nierejestrowana && (
        <p className="rounded-2xl border border-mosiadz/40 bg-karta p-4 text-sm leading-relaxed">
          Działalność nierejestrowana nie płaci CIT. Kwota poniżej jest zero. Żeby liczyć podatek, w danych firmy wybierz spółkę z o.o. i małą albo dużą stawkę.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="pole">Miesiąc
          <input
            className="mt-1"
            inputMode="numeric"
            value={miesiacPole}
            onChange={(e) => {
              const tekst = cyfry(e.target.value, 2);
              setMiesiacPole(tekst);
              const liczba = Number(tekst);
              if (liczba >= 1 && liczba <= 12) setMiesiac(liczba);
            }}
          />
        </label>
        <label className="pole">Rok
          <input
            className="mt-1"
            inputMode="numeric"
            value={rokPole}
            onChange={(e) => {
              const tekst = cyfry(e.target.value, 4);
              setRokPole(tekst);
              if (tekst.length === 4) setRok(Number(tekst));
            }}
          />
        </label>
      </div>
      {czasUrzadzenia && <p className="text-sm text-atrament/70">Na tym urządzeniu jest {czasUrzadzenia}. Okres startuje od tego miesiąca.</p>}

      <section className="rounded-2xl border border-linia bg-karta p-5">
        <p className="text-sm">Szacunek zaliczki CIT za {nazwaOkresu}</p>
        <p className="font-serif text-4xl">{pieniadze(rozliczenie.cit)} zł</p>
        <p className="mt-2 text-sm">
          Przychód {pieniadze(rozliczenie.netto)} zł, koszty {pieniadze(rozliczenie.kosztyCit)} zł, dochód {pieniadze(rozliczenie.dochod)} zł. Stawka {stawka}%.
        </p>
        <p className="mt-1 text-sm">
          Termin przelewu: {formatDaty(termin)}. {zostalo < 0 ? "Termin minął." : zostalo === 0 ? "Termin jest dzisiaj." : `Zostało ${zostalo} dni.`}
        </p>
      </section>

      <details className="rounded-2xl border border-linia bg-karta p-5" open>
        <summary className="cursor-pointer font-medium">Co z tym zrobić, krok po kroku</summary>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
          <li>Pliku miesięcznego nie generujesz. Przy zaliczce CIT go nie ma.</li>
          <li>Spółka nie ma pracowników i nie ma nieruchomości, więc w tym miesiącu nie ma ZUS, PIT ani podatku od nieruchomości.</li>
          <li>
            Jak forma to już spółka z o.o., przelej {pieniadze(rozliczenie.cit)} zł do {formatDaty(termin)} na mikrorachunek{" "}
            <span className="font-medium">{mikrorachunek || "uzupełnij go w danych firmy"}</span>.
            Symbol: CIT. Okres: {nazwaOkresu}. To ten sam numer co przy VAT. Inny jest tylko symbol.
          </li>
          <li>Raz w roku, do 31 marca, spółka składa zeznanie CIT-8 na bramce e-Deklaracji i dopłaca różnicę symbolem CIT-8. Tego XML-a program złoży później, razem z księgą.</li>
          <li>Zaliczka jest od dochodu: przychód z faktur minus koszty wpisane w zakładce Koszty. Proform nie ma w przychodzie.</li>
        </ol>
      </details>

      <ul className="divide-y divide-linia rounded-2xl border border-linia bg-karta">
        {rozliczenie.dokumenty.length === 0 && <li className="p-4 text-sm">W tym miesiącu nie ma faktur do CIT.</li>}
        {rozliczenie.dokumenty.map((f) => (
          <li key={f.id} className="flex justify-between px-4 py-3 text-sm">
            <span>{f.numer}</span>
            <span>przychód {pieniadze(f.netto)} zł</span>
          </li>
        ))}
        {rozliczenie.koszty.map((k) => (
          <li key={k.id} className="flex justify-between px-4 py-3 text-sm">
            <span>{k.dostawca} · {k.numer}</span>
            <span>koszt {pieniadze(k.kosztCit)} zł</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
