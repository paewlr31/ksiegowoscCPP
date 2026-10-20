"use client";

import { useEffect, useState } from "react";
import type { Faktura, Firma } from "@/lib/typy";
import { LIMIT_VAT, obrotRoku, pieniadze } from "@/lib/podatki";
import { bledyFirmy, pierwszyBlad, type Bledy } from "@/lib/walidacja";

export default function DaneFirmy() {
  const [firma, setFirma] = useState<Firma | null>(null);
  const [faktury, setFaktury] = useState<Faktura[]>([]);
  const [zapis, setZapis] = useState("");
  const [blad, setBlad] = useState("");
  const [bledy, setBledy] = useState<Bledy>({});

  useEffect(() => {
    Promise.all([fetch("/api/firma").then((r) => r.json()), fetch("/api/faktury").then((r) => r.json())]).then(
      ([f, lista]) => {
        setFirma(f);
        setFaktury(Array.isArray(lista) ? lista : []);
      },
    );
  }, []);

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    if (!firma) return;
    setZapis("");
    setBlad("");
    const znalezione = bledyFirmy(firma);
    setBledy(znalezione);
    if (pierwszyBlad(znalezione)) return;
    const odpowiedz = await fetch("/api/firma", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(firma),
    });
    const dane = await odpowiedz.json();
    if (!odpowiedz.ok) setBlad(dane.blad || "Nie zapisano.");
    else setZapis("Zapisane. Te dane wejdą na kolejną fakturę jako sprzedawca.");
  }

  if (!firma) return <p>Wczytuję dane firmy...</p>;

  function pole<K extends keyof Firma>(klucz: K, etykieta: string, szerokie = false) {
    return (
      <label className={`pole ${szerokie ? "sm:col-span-2" : ""}`}>
        {etykieta}
        <input
          className={`mt-1 ${bledy[String(klucz)] ? "border-burak" : ""}`}
          value={String(firma?.[klucz] ?? "")}
          onChange={(e) => setFirma({ ...firma!, [klucz]: e.target.value })}
        />
        {bledy[String(klucz)] && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy[String(klucz)]}</span>}
      </label>
    );
  }

  return (
    <form onSubmit={zapisz} className="rounded-2xl border border-linia bg-karta p-6 shadow-kartka">
      <p className="font-serif text-4xl">Dane firmy</p>
      <p className="mt-1 max-w-2xl text-sm text-atrament/70">
        To jest sprzedawca na każdej fakturze. Jak założysz spółkę i dostaniesz NIP, wpisujesz go tutaj. Resztę też możesz zmienić.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {pole("nazwa", "Nazwa", true)}
        <label className="pole">
          Forma
          <select
            className="mt-1"
            value={firma.rodzaj}
            onChange={(e) => setFirma({ ...firma, rodzaj: e.target.value as Firma["rodzaj"] })}
          >
            <option value="nierejestrowana">Działalność nierejestrowana</option>
            <option value="spolka">Spółka z o.o.</option>
          </select>
        </label>
        {firma.rodzaj === "spolka" && (
          <label className="pole">
            CIT
            <select
              className="mt-1"
              value={firma.cit}
              onChange={(e) => setFirma({ ...firma, cit: e.target.value as Firma["cit"] })}
            >
              <option value="mala">Mała spółka, 9%</option>
              <option value="duza">Duża spółka, 19%</option>
            </select>
          </label>
        )}
        {pole("ulica", "Ulica", true)}
        {pole("kod", "Kod")}
        {pole("miasto", "Miasto")}
        {pole("email", "E-mail")}
        {pole("telefon", "Telefon")}
        <label className="pole">
          NIP
          <input className={`mt-1 ${bledy.nip ? "border-burak" : ""}`} value={firma.nip} onChange={(e) => setFirma({ ...firma, nip: e.target.value })} />
          {bledy.nip && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.nip}</span>}
          <button type="button" className="mt-1 text-xs normal-case tracking-normal text-las underline" onClick={() => setFirma({ ...firma, nip: "1111111111" })}>
            Wstaw testowy 1111111111
          </button>
        </label>
        {pole("rachunek", "Rachunek bankowy", true)}
        {pole("kodUrzedu", "Kod urzędu skarbowego do JPK")}
        {pole("mikrorachunek", "Mikrorachunek na CIT i VAT", true)}
      </div>
      <p className="mt-2 text-xs text-atrament/60">Puste NIP na fakturze pokaże się jako „brak”. Mikrorachunek uzupełnisz, gdy spółka dostanie NIP.</p>

      <div className="mt-6 rounded-xl border border-linia bg-papier p-4 text-sm">
        <p>Obrót w {new Date().getFullYear()} bez proform: {pieniadze(obrotRoku(faktury, new Date().getFullYear()))} zł z {pieniadze(LIMIT_VAT)} zł.</p>
        <p className="mt-1 text-atrament/70">Do tego limitu VAT się nie nalicza. Faktura, która go przekroczy, i każda następna dostają 23% same.</p>
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-xl border border-linia bg-papier p-4">
        <input
          type="checkbox"
          className="mt-1 w-auto"
          checked={firma.vatRecznie || obrotRoku(faktury, new Date().getFullYear()) > LIMIT_VAT}
          disabled={obrotRoku(faktury, new Date().getFullYear()) > LIMIT_VAT}
          onChange={(e) => setFirma({ ...firma, vatRecznie: e.target.checked })}
        />
        <span>
          <span className="block font-medium normal-case tracking-normal text-atrament">Płatnik VAT wcześniej, bo tak wynika z działalności</span>
          <span className="mt-1 block text-sm normal-case tracking-normal text-atrament/70">
            Zaznacz, jeśli 23% ma być od razu, zanim obrót dojdzie do 200 000 zł. Jak limit padnie, ptaszek zostaje sam i nie da się go odznaczyć.
          </span>
        </span>
      </label>

      <label className="pole mt-4">
        Podstawa zwolnienia z VAT, drukowana na fakturze gdy nie jesteś płatnikiem
        <textarea
          className="mt-1 min-h-28"
          value={firma.podstawaZwolnienia}
          onChange={(e) => setFirma({ ...firma, podstawaZwolnienia: e.target.value })}
        />
      </label>

      {blad && <p className="mt-4 text-sm text-burak">{blad}</p>}
      {zapis && <p className="mt-4 text-sm text-las">{zapis}</p>}
      <button type="submit" className="mt-5 rounded-lg bg-las px-4 py-2 text-white">Zapisz dane</button>
    </form>
  );
}
