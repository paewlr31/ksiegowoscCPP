"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ETYKIETA, type Faktura } from "@/lib/typy";
import { pieniadze } from "@/lib/podatki";

export default function ListaFaktur() {
  const [faktury, setFaktury] = useState<Faktura[]>([]);

  useEffect(() => {
    fetch("/api/faktury").then((r) => r.json()).then((d) => setFaktury(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Faktury</h1>
          <p className="text-sm text-atrament/70">Proforma nie wchodzi do podatków. Reszta tak.</p>
        </div>
        <Link href="/faktury/nowa" className="rounded-lg bg-las px-4 py-2 text-sm text-white">Wystaw</Link>
      </div>
      <div className="mt-6 divide-y divide-linia overflow-hidden rounded-2xl border border-linia bg-karta">
        {faktury.length === 0 && <p className="p-5 text-sm">Nie ma jeszcze faktur.</p>}
        {faktury.map((f) => (
          <Link key={f.id} href={`/faktury/${f.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-papier">
            <span>
              <span className="block text-xs uppercase tracking-wide text-mosiadz">{ETYKIETA[f.typ]}</span>
              <span className="font-medium">{f.numer}</span>
              <span className="mt-0.5 block text-sm text-atrament/60">{f.nabywca.nazwa} · {f.dataWystawienia}</span>
            </span>
            <span className="text-right">
              <span className="block font-medium">{pieniadze(f.brutto)} zł</span>
              <span className="text-xs text-atrament/50">{f.ksefNumer ? "KSeF" : f.typ === "proforma" ? "bez KSeF" : "lokalnie"}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
