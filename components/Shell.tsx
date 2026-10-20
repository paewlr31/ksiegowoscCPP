"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKI = [
  { href: "/", etykieta: "Dane firmy" },
  { href: "/faktury", etykieta: "Faktury" },
  { href: "/faktury/nowa", etykieta: "Wystaw fakturę" },
  { href: "/koszty", etykieta: "Koszty" },
  { href: "/vat", etykieta: "VAT i JPK" },
  { href: "/cit", etykieta: "CIT" },
  { href: "/obowiazki", etykieta: "Obowiązki" },
  { href: "/klucze", etykieta: "Klucze i bramki" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const sciezka = usePathname();
  const [otwarte, setOtwarte] = useState(false);
  const [baza, setBaza] = useState<string>("");

  useEffect(() => {
    setOtwarte(false);
  }, [sciezka]);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setBaza(d.baza ? "Neon" : "plik lokalny"))
      .catch(() => setBaza(""));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-linia bg-papier/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOtwarte(true)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-linia bg-karta"
        >
          <span className="flex w-4 flex-col gap-1">
            <span className="h-0.5 bg-atrament" />
            <span className="h-0.5 bg-atrament" />
            <span className="h-0.5 w-3 bg-atrament" />
          </span>
        </button>
        <div>
          <p className="font-serif text-xl leading-none">Księgowość</p>
          <p className="text-xs text-mosiadz">{baza || "łączenie"}</p>
        </div>
      </header>

      {otwarte && (
        <button
          type="button"
          aria-label="Zamknij menu"
          className="fixed inset-0 z-30 bg-atrament/30"
          onClick={() => setOtwarte(false)}
        />
      )}

      <nav
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-linia bg-karta p-5 transition-transform ${otwarte ? "translate-x-0" : "-translate-x-full"}`}
      >
        <p className="font-serif text-2xl">Menu</p>
        <p className="mb-6 text-sm text-mosiadz">Jedna spółka, pełna księgowość</p>
        <div className="flex flex-col gap-1">
          {LINKI.map((link) => {
            const aktywny = sciezka === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm ${aktywny ? "bg-las text-white" : "hover:bg-papier"}`}
              >
                {link.etykieta}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
