"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Lancuch } from "@/components/Lancuch";
import { PodgladFaktury } from "@/components/PodgladFaktury";
import type { Faktura, Firma } from "@/lib/typy";

export default function FakturaStrona() {
  const params = useParams<{ id: string }>();
  const [firma, setFirma] = useState<Firma | null>(null);
  const [faktury, setFaktury] = useState<Faktura[]>([]);
  const [nipTestowy, setNipTestowy] = useState("");
  const [komunikat, setKomunikat] = useState("");
  const [wysylka, setWysylka] = useState(false);

  function odswiez() {
    return Promise.all([
      fetch("/api/firma").then((r) => r.json()),
      fetch("/api/faktury").then((r) => r.json()),
      fetch("/api/status").then((r) => r.json()),
    ]).then(([f, lista, status]) => {
      setFirma(f);
      setFaktury(Array.isArray(lista) ? lista : []);
      setNipTestowy(status.nipTestowy || "");
    });
  }

  useEffect(() => {
    odswiez();
  }, []);

  const faktura = faktury.find((f) => f.id === params.id);

  async function wyslij() {
    if (!faktura) return;
    setWysylka(true);
    setKomunikat("");
    const odpowiedz = await fetch("/api/ksef", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: faktura.id }),
    });
    const dane = await odpowiedz.json();
    setWysylka(false);
    if (!odpowiedz.ok) setKomunikat(dane.blad || "KSeF odrzucił fakturę.");
    else {
      setKomunikat(dane.numer ? `Numer KSeF: ${dane.numer}` : dane.opis);
      odswiez();
    }
  }

  if (!firma || !faktura) return <p>Wczytuję fakturę...</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-4">
        <Link href="/faktury" className="text-sm text-las">Wróć do listy</Link>
        <PodgladFaktury faktura={faktura} firma={firma} />
        {faktura.typ !== "proforma" && (
          <div className="rounded-2xl border border-linia bg-karta p-4">
            <p className="text-sm">
              Wysyłka testowa idzie na NIP z tokena KSeF ({nipTestowy || "z klucze.hpp"}), nie na puste NIP działalności nierejestrowanej. KSeF bez NIP faktury nie przyjmie.
            </p>
            <button type="button" onClick={wyslij} disabled={wysylka} className="mt-3 rounded-lg bg-las px-4 py-2 text-white disabled:opacity-50">
              {wysylka ? "Wysyłam..." : "Wyślij do testowego KSeF"}
            </button>
            {faktura.ksefNumer && <p className="mt-2 text-sm text-las">Zapisany numer: {faktura.ksefNumer}</p>}
            {komunikat && <p className="mt-2 text-sm">{komunikat}</p>}
          </div>
        )}
      </div>
      <div>
        <p className="mb-3 font-serif text-2xl">Szlaczek</p>
        <Lancuch id={faktura.id} faktury={faktury} />
        {faktury.filter((f) => f.podstawy.includes(faktura.id) || f.koryguje === faktura.id).length === 0 &&
          faktura.podstawy.length === 0 &&
          !faktura.koryguje && <p className="text-sm text-atrament/60">Ta faktura nie ma jeszcze powiązań.</p>}
      </div>
    </div>
  );
}
