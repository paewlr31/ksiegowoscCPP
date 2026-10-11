"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lancuch } from "@/components/Lancuch";
import { PodgladFaktury } from "@/components/PodgladFaktury";
import type { Faktura, Firma } from "@/lib/typy";

export default function FakturaStrona() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
        <div className="no-print flex flex-wrap items-center gap-3">
          <Link href="/faktury" className="text-sm text-las">Wróć do listy</Link>
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-linia bg-karta px-4 py-2 text-sm">
            Pobierz PDF
          </button>
          {!faktura.ksefNumer && (
            <>
              <Link href={`/faktury/${faktura.id}/edytuj`} className="rounded-lg border border-linia bg-karta px-4 py-2 text-sm">
                Edytuj
              </Link>
              <button
                type="button"
                className="rounded-lg border border-burak/40 px-4 py-2 text-sm text-burak"
                onClick={async () => {
                  if (!window.confirm("Usunąć tę fakturę? Do KSeF nie weszła.")) return;
                  const odpowiedz = await fetch(`/api/faktury/${faktura.id}`, { method: "DELETE" });
                  const dane = await odpowiedz.json();
                  if (!odpowiedz.ok) {
                    setKomunikat(dane.blad || "Nie usunięto.");
                    return;
                  }
                  router.push("/faktury");
                }}
              >
                Anuluj fakturę
              </button>
            </>
          )}
        </div>
        <PodgladFaktury faktura={faktura} firma={firma} />
        <div className="no-print rounded-2xl border border-linia bg-karta p-4">
          <p className="font-medium">PDF wysyłasz mailem</p>
          <p className="mt-1 text-sm">
            Osoba prywatna nie ma KSeF i tej faktury tam nie zobaczy. Kliknij „Pobierz PDF”, w oknie drukowania wybierz „Zapisz jako PDF” i ten plik jej wyślij.
          </p>
        </div>
        {faktura.typ === "proforma" ? (
          <div className="no-print rounded-2xl border border-linia bg-karta p-4 text-sm">
            Proforma nie idzie do KSeF. Zostaje u ciebie i w PDF.
          </div>
        ) : faktura.ksefNumer ? (
          <div className="no-print rounded-2xl border border-las/40 bg-las/5 p-4">
            <p className="font-medium text-las">Tak, ta faktura jest w testowym KSeF.</p>
            <p className="mt-2 break-all text-sm">Numer: {faktura.ksefNumer}</p>
            <p className="mt-2 text-sm">
              Sprawdzenie: wejdź na{" "}
              <a className="underline" href="https://ap-test.ksef.mf.gov.pl" target="_blank" rel="noreferrer">ap-test.ksef.mf.gov.pl</a>
              , zaloguj się uwierzytelnieniem testowym na NIP {nipTestowy || "1111111111"} i otwórz Faktury. Ten numer tam będzie.
            </p>
          </div>
        ) : (
          <div className={`no-print rounded-2xl border p-4 ${faktura.ksefStatus || komunikat ? "border-burak/40 bg-burak/5" : "border-linia bg-karta"}`}>
            <p className="font-medium">Jeszcze nie ma jej w KSeF.</p>
            <p className="mt-1 text-sm">
              Wysyłka testowa idzie na NIP z tokena ({nipTestowy || "z klucze.hpp"}), nie na puste NIP działalności nierejestrowanej.
            </p>
            {(faktura.ksefStatus || komunikat) && (
              <p className="mt-2 text-sm text-burak">{komunikat || faktura.ksefStatus}</p>
            )}
            <button type="button" onClick={wyslij} disabled={wysylka} className="mt-3 rounded-lg bg-las px-4 py-2 text-white disabled:opacity-50">
              {wysylka ? "Wysyłam..." : "Wyślij do testowego KSeF"}
            </button>
          </div>
        )}
      </div>
      <div className="no-print">
        <p className="mb-3 font-serif text-2xl">Szlaczek</p>
        <Lancuch id={faktura.id} faktury={faktury} />
        {faktury.filter((f) => f.podstawy.includes(faktura.id) || f.koryguje === faktura.id).length === 0 &&
          faktura.podstawy.length === 0 &&
          !faktura.koryguje && <p className="text-sm text-atrament/60">Ta faktura nie ma jeszcze powiązań.</p>}
      </div>
    </div>
  );
}
