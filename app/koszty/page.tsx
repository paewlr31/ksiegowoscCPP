"use client";

import { useEffect, useMemo, useState } from "react";
import { DOSTAWCY } from "@/lib/dostawcy";
import { policzKoszt, pieniadze } from "@/lib/podatki";
import type { Firma, Koszt, RodzajKosztu } from "@/lib/typy";
import { bledyKosztu, type Bledy } from "@/lib/walidacja";

const DZIS = new Date().toISOString().slice(0, 10);

const OPIS_RODZAJU: Record<RodzajKosztu, string> = {
  kraj: "Polska faktura. Do KSeF jej nie wysyłasz: polski sprzedawca sam ją tam wystawia, a ty ją odbierasz. Tu wpisujesz ją, żeby weszła w VAT i CIT.",
  ue: "Usługa z Unii, na przykład Google Ads z Irlandii. Na fakturze zwykle nie ma polskiego VAT. Spółka sama nalicza 23% i, jeśli jest płatnikiem VAT, odlicza tę samą kwotę. Dodatkowo składujesz informację VAT-UE.",
  poza_ue: "Usługa spoza Unii, na przykład Cursor ze Stanów. Też sam naliczasz polskie 23%. Do VAT-UE tego nie wpisujesz. Do KSeF ta faktura nie trafia.",
};

export default function KosztyStrona() {
  const [firma, setFirma] = useState<Firma | null>(null);
  const [koszty, setKoszty] = useState<Koszt[]>([]);
  const [rodzaj, setRodzaj] = useState<RodzajKosztu>("kraj");
  const [dostawca, setDostawca] = useState("");
  const [identyfikator, setIdentyfikator] = useState("");
  const [kraj, setKraj] = useState("PL");
  const [numer, setNumer] = useState("");
  const [data, setData] = useState(DZIS);
  const [opis, setOpis] = useState("");
  const [netto, setNetto] = useState("100");
  const [vatNaFakturze, setVatNaFakturze] = useState("23");
  const [blad, setBlad] = useState("");
  const [bledy, setBledy] = useState<Bledy>({});
  const [dostawcaId, setDostawcaId] = useState("");

  function wczytaj() {
    return Promise.all([fetch("/api/firma").then((r) => r.json()), fetch("/api/koszty").then((r) => r.json())]).then(
      ([f, lista]) => {
        if (f.blad) setBlad(f.blad);
        setFirma(f.blad ? null : f);
        setKoszty(Array.isArray(lista) ? lista : []);
        if (lista?.blad) setBlad(lista.blad);
      },
    );
  }

  useEffect(() => {
    wczytaj();
  }, []);

  const podglad = useMemo(
    () => policzKoszt(rodzaj, Number(netto) || 0, Number(vatNaFakturze) || 0, Boolean(firma?.platnikVat)),
    [rodzaj, netto, vatNaFakturze, firma?.platnikVat],
  );

  function wybierzDostawce(id: string) {
    setDostawcaId(id);
    const znaleziony = DOSTAWCY.find((d) => d.id === id);
    if (!znaleziony) return;
    setRodzaj(znaleziony.rodzaj);
    setKraj(znaleziony.kraj);
    setDostawca(znaleziony.dostawca);
    setIdentyfikator(znaleziony.identyfikator);
    setOpis(znaleziony.opis);
    setVatNaFakturze(znaleziony.rodzaj === "kraj" ? (Number(netto) * 0.23).toFixed(2) : "0");
  }

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    setBlad("");
    const znalezione = bledyKosztu({
      rodzaj,
      dostawca,
      identyfikator,
      kraj,
      numer,
      netto: Number(netto),
      vatNaFakturze: Number(vatNaFakturze) || 0,
    });
    setBledy(znalezione);
    if (Object.keys(znalezione).length) return;
    const odpowiedz = await fetch("/api/koszty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rodzaj,
        dostawca,
        identyfikator,
        kraj,
        numer,
        data,
        opis,
        netto: Number(netto),
        vatNaFakturze: Number(vatNaFakturze) || 0,
      }),
    });
    const dane = await odpowiedz.json();
    if (!odpowiedz.ok) {
      setBlad(dane.blad || "Nie zapisano kosztu.");
      return;
    }
    setNumer("");
    wczytaj();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={zapisz} className="space-y-4 rounded-2xl border border-linia bg-karta p-5 shadow-kartka">
        <div>
          <h1 className="font-serif text-4xl">Koszty</h1>
          <p className="mt-1 text-sm text-atrament/70">OLX i Oferteo są krajowe. Google Ads jest z Unii. Cursor jest spoza Unii.</p>
        </div>
        <label className="pole">Znany dostawca
          <select className="mt-1" value={dostawcaId} onChange={(e) => wybierzDostawce(e.target.value)}>
            <option value="">Wpiszę sam</option>
            {DOSTAWCY.map((d) => (
              <option key={d.id} value={d.id}>{d.nazwa}</option>
            ))}
          </select>
          {DOSTAWCY.find((d) => d.id === dostawcaId)?.podpowiedz && (
            <span className="mt-1 block text-xs normal-case tracking-normal text-atrament/70">{DOSTAWCY.find((d) => d.id === dostawcaId)?.podpowiedz}</span>
          )}
        </label>
        <label className="pole">Rodzaj
          <select className="mt-1" value={rodzaj} onChange={(e) => {
            const wartosc = e.target.value as RodzajKosztu;
            setRodzaj(wartosc);
            if (wartosc !== "kraj") setVatNaFakturze("0");
            if (wartosc === "kraj") setKraj("PL");
          }}>
            <option value="kraj">Krajowy, polski VAT na fakturze</option>
            <option value="ue">Unia, import usługi</option>
            <option value="poza_ue">Poza Unią, import usługi</option>
          </select>
        </label>
        <p className="text-sm leading-relaxed text-atrament/70">{OPIS_RODZAJU[rodzaj]}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="pole sm:col-span-2">Dostawca
            <input className={`mt-1 ${bledy.dostawca ? "border-burak" : ""}`} value={dostawca} onChange={(e) => setDostawca(e.target.value)} />
            {bledy.dostawca && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.dostawca}</span>}
          </label>
          <label className="pole">{rodzaj === "kraj" ? "NIP, 10 cyfr" : rodzaj === "ue" ? "Numer VAT UE" : "Identyfikator, może być pusty"}
            <input className={`mt-1 ${bledy.identyfikator ? "border-burak" : ""}`} value={identyfikator} onChange={(e) => setIdentyfikator(e.target.value)} placeholder={rodzaj === "ue" ? "IE6388047V" : rodzaj === "kraj" ? "10 cyfr" : "puste dla Cursora"} />
            {bledy.identyfikator && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.identyfikator}</span>}
          </label>
          <label className="pole">Kraj
            <input className={`mt-1 ${bledy.kraj ? "border-burak" : ""}`} value={kraj} onChange={(e) => setKraj(e.target.value.toUpperCase())} maxLength={2} />
            {bledy.kraj && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.kraj}</span>}
          </label>
          <label className="pole">Numer dokumentu
            <input className={`mt-1 ${bledy.numer ? "border-burak" : ""}`} value={numer} onChange={(e) => setNumer(e.target.value)} />
            {bledy.numer && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.numer}</span>}
          </label>
          <label className="pole">Data
            <input className="mt-1" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </label>
          <label className="pole sm:col-span-2">Opis
            <input className="mt-1" value={opis} onChange={(e) => setOpis(e.target.value)} />
          </label>
          <label className="pole">Kwota netto
            <input className={`mt-1 ${bledy.netto ? "border-burak" : ""}`} type="number" step="0.01" value={netto} onChange={(e) => {
              setNetto(e.target.value);
              if (rodzaj === "kraj") setVatNaFakturze((Number(e.target.value) * 0.23).toFixed(2));
            }} />
            {bledy.netto && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.netto}</span>}
          </label>
          {rodzaj === "kraj" && (
            <label className="pole">VAT na fakturze
              <input className={`mt-1 ${bledy.vatNaFakturze ? "border-burak" : ""}`} type="number" step="0.01" value={vatNaFakturze} onChange={(e) => setVatNaFakturze(e.target.value)} />
              {bledy.vatNaFakturze && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.vatNaFakturze}</span>}
            </label>
          )}
        </div>
        {blad && <p className="rounded-lg bg-burak/10 px-3 py-2 text-sm text-burak">{blad}</p>}
        <button className="rounded-lg bg-las px-4 py-2 text-white">Zapisz koszt</button>
      </form>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-linia bg-karta p-5">
          <p className="text-xs uppercase tracking-wide text-mosiadz">Jak to wejdzie w podatki</p>
          <p className="mt-2 text-sm">VAT należny: {pieniadze(podglad.vatNalezny)} zł</p>
          <p className="text-sm">VAT do odliczenia: {pieniadze(podglad.vatNaliczony)} zł</p>
          <p className="text-sm">Koszt w CIT: {pieniadze(podglad.kosztCit)} zł</p>
          <p className="mt-3 text-sm leading-relaxed text-atrament/70">
            {firma?.platnikVat
              ? "Jesteś płatnikiem VAT. Przy koszcie krajowym odliczasz VAT z faktury, a w CIT wchodzi netto. Przy Google i Cursorze naliczasz 23% i od razu je odliczasz, więc do urzędu z tego tytułu zwykle wychodzi zero, a w CIT zostaje netto."
              : "Nie jesteś płatnikiem VAT. Przy OLX i Oferteo w CIT wchodzi brutto, a VAT-u nie odliczasz i nie płacisz go sam. Przy Google i Cursorze sam płacisz polskie 23% i nie odliczasz go, więc w CIT wchodzi netto plus ten podatek."}
          </p>
        </div>
        <ul className="divide-y divide-linia overflow-hidden rounded-2xl border border-linia bg-karta">
          {koszty.length === 0 && <li className="p-4 text-sm">Nie ma jeszcze kosztów.</li>}
          {koszty.map((k) => (
            <li key={k.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="block font-medium">{k.dostawca}</span>
                <span className="text-atrament/60">{k.numer} · {k.data} · {k.rodzaj === "kraj" ? "kraj" : k.rodzaj === "ue" ? "UE" : "poza UE"}</span>
              </span>
              <span className="text-right">
                <span className="block">{pieniadze(k.kosztCit)} zł CIT</span>
                <button
                  type="button"
                  className="text-xs text-burak"
                  onClick={async () => {
                    await fetch(`/api/koszty/${k.id}`, { method: "DELETE" });
                    wczytaj();
                  }}
                >
                  Usuń
                </button>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
