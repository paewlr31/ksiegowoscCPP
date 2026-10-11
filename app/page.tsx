"use client";

import { useEffect, useState } from "react";
import type { Firma } from "@/lib/typy";

export default function DaneFirmy() {
  const [firma, setFirma] = useState<Firma | null>(null);
  const [zapis, setZapis] = useState("");
  const [blad, setBlad] = useState("");

  useEffect(() => {
    fetch("/api/firma")
      .then((r) => r.json())
      .then(setFirma);
  }, []);

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    if (!firma) return;
    setZapis("");
    setBlad("");
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
          className="mt-1"
          value={String(firma?.[klucz] ?? "")}
          onChange={(e) => setFirma({ ...firma!, [klucz]: e.target.value })}
        />
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
        {pole("forma", "Forma", true)}
        {pole("ulica", "Ulica", true)}
        {pole("kod", "Kod")}
        {pole("miasto", "Miasto")}
        {pole("email", "E-mail")}
        {pole("telefon", "Telefon")}
        {pole("nip", "NIP")}
        {pole("rachunek", "Rachunek bankowy", true)}
        {pole("kodUrzedu", "Kod urzędu skarbowego do JPK")}
        {pole("mikrorachunek", "Mikrorachunek na CIT i VAT", true)}
      </div>
      <p className="mt-2 text-xs text-atrament/60">Puste NIP na fakturze pokaże się jako „brak”. Mikrorachunek uzupełnisz, gdy spółka dostanie NIP.</p>

      <label className="mt-6 flex items-start gap-3 rounded-xl border border-linia bg-papier p-4">
        <input
          type="checkbox"
          className="mt-1 w-auto"
          checked={firma.platnikVat}
          onChange={(e) => setFirma({ ...firma, platnikVat: e.target.checked })}
        />
        <span>
          <span className="block font-medium normal-case tracking-normal text-atrament">Jestem płatnikiem VAT</span>
          <span className="mt-1 block text-sm normal-case tracking-normal text-atrament/70">
            Po zaznaczeniu każda nowa faktura dostaje 23%. To stawka za strony, aplikacje webowe, Androida i iOS. Teraz, przy działalności nierejestrowanej, zostaw odznaczone.
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
