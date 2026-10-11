"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ETYKIETA, pustyNabywca, type Faktura, type Firma, type Pozycja, type TypFaktury } from "@/lib/typy";
import { pieniadze, sumaPozycji } from "@/lib/podatki";

const DZIS = new Date().toISOString().slice(0, 10);

const NABYWCA_TEST = {
  nazwa: "Nabywca testowy",
  nip: "5252344078",
  ulica: "ul. Testowa 1",
  kod: "00-001",
  miasto: "Warszawa",
  email: "test@example.com",
  telefon: "500 600 700",
};

export function FormularzFaktury() {
  const router = useRouter();
  const [firma, setFirma] = useState<Firma | null>(null);
  const [faktury, setFaktury] = useState<Faktura[]>([]);
  const [typ, setTyp] = useState<TypFaktury>("koncowa");
  const [dataWystawienia, setDataWystawienia] = useState(DZIS);
  const [dataSprzedazy, setDataSprzedazy] = useState(DZIS);
  const [nabywca, setNabywca] = useState(pustyNabywca());
  const [pozycje, setPozycje] = useState<Pozycja[]>([
    { nazwa: "Strona internetowa", ilosc: 1, cenaNetto: 1000 },
  ]);
  const [podstawy, setPodstawy] = useState<string[]>([]);
  const [koryguje, setKoryguje] = useState("");
  const [przyczyna, setPrzyczyna] = useState("");
  const [blad, setBlad] = useState("");
  const [zapis, setZapis] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/firma").then((r) => r.json()), fetch("/api/faktury").then((r) => r.json())]).then(
      ([f, lista]) => {
        setFirma(f);
        setFaktury(Array.isArray(lista) ? lista : []);
      },
    );
  }, []);

  const kwoty = useMemo(
    () => sumaPozycji(pozycje, Boolean(firma?.platnikVat)),
    [pozycje, firma?.platnikVat],
  );

  const zaliczki = faktury.filter((f) => podstawy.includes(f.id));

  function zmienPozycje(indeks: number, pole: keyof Pozycja, wartosc: string) {
    setPozycje((lista) =>
      lista.map((p, i) =>
        i === indeks
          ? { ...p, [pole]: pole === "nazwa" ? wartosc : Number(wartosc) }
          : p,
      ),
    );
  }

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    if (!firma) return;
    setZapis(true);
    setBlad("");
    const odpowiedz = await fetch("/api/faktury", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typ,
        dataWystawienia,
        dataSprzedazy,
        pozycje,
        nabywca,
        podstawy,
        koryguje: koryguje || null,
        przyczynaKorekty: przyczyna,
        platnikVat: firma.platnikVat,
      }),
    });
    const dane = await odpowiedz.json();
    setZapis(false);
    if (!odpowiedz.ok) {
      setBlad(dane.blad || "Nie zapisano faktury.");
      return;
    }
    router.push(`/faktury/${dane.id}`);
  }

  return (
    <form onSubmit={zapisz} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5 rounded-2xl border border-linia bg-karta p-5 shadow-kartka">
        <div>
          <p className="font-serif text-3xl">Nowa faktura</p>
          <p className="text-sm text-atrament/70">Sprzedawcą jest firma z danych ogólnych. Tu zmieniasz tylko nabywcę i pozycje.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="pole">Typ
            <select className="mt-1" value={typ} onChange={(e) => setTyp(e.target.value as TypFaktury)}>
              <option value="proforma">Proforma — nie idzie do KSeF</option>
              <option value="zaliczkowa">Zaliczkowa</option>
              <option value="koncowa">Końcowa</option>
              <option value="korekta">Korekta</option>
            </select>
          </label>
          <label className="pole">Data wystawienia
            <input className="mt-1" type="date" value={dataWystawienia} onChange={(e) => setDataWystawienia(e.target.value)} required />
          </label>
          <label className="pole">Data sprzedaży
            <input className="mt-1" type="date" value={dataSprzedazy} onChange={(e) => setDataSprzedazy(e.target.value)} required />
          </label>
        </div>

        {typ === "korekta" && (
          <label className="pole">Koryguje fakturę
            <select className="mt-1" value={koryguje} onChange={(e) => setKoryguje(e.target.value)} required>
              <option value="">Wybierz</option>
              {faktury.map((f) => (
                <option key={f.id} value={f.id}>{ETYKIETA[f.typ]} {f.numer}</option>
              ))}
            </select>
          </label>
        )}
        {typ === "korekta" && (
          <label className="pole">Przyczyna
            <input className="mt-1" value={przyczyna} onChange={(e) => setPrzyczyna(e.target.value)} placeholder="np. zła cena" />
          </label>
        )}

        <fieldset>
          <legend className="pole">Na podstawie</legend>
          <p className="mb-2 text-xs text-atrament/60">Proforma może być podstawą zaliczki, zaliczka podstawą końcowej, korekta podstawą kolejnej korekty.</p>
          <div className="max-h-40 space-y-1 overflow-auto rounded-lg border border-linia p-2">
            {faktury.length === 0 && <p className="text-sm text-atrament/50">Nie ma jeszcze wcześniejszych faktur.</p>}
            {faktury.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm normal-case tracking-normal text-atrament">
                <input
                  type="checkbox"
                  className="w-auto"
                  checked={podstawy.includes(f.id)}
                  onChange={(e) =>
                    setPodstawy((lista) => e.target.checked ? [...lista, f.id] : lista.filter((id) => id !== f.id))
                  }
                />
                {ETYKIETA[f.typ]} {f.numer} · {pieniadze(f.brutto)} zł
              </label>
            ))}
          </div>
          {typ === "koncowa" && zaliczki.length > 0 && (
            <p className="mt-2 text-sm text-mosiadz">
              Zaliczki w tym szlaczku: {pieniadze(zaliczki.reduce((s, f) => s + f.brutto, 0))} zł. Na tej fakturze wpisz tylko kwotę, która została.
            </p>
          )}
        </fieldset>

        <div className="flex items-center justify-between">
          <p className="font-medium">Nabywca</p>
          <button type="button" className="text-sm text-las underline" onClick={() => setNabywca(NABYWCA_TEST)}>
            Wstaw nabywcę testowego
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="pole sm:col-span-2">Nazwa
            <input className="mt-1" value={nabywca.nazwa} onChange={(e) => setNabywca({ ...nabywca, nazwa: e.target.value })} required />
          </label>
          <label className="pole">NIP
            <input className="mt-1" value={nabywca.nip} onChange={(e) => setNabywca({ ...nabywca, nip: e.target.value })} />
          </label>
          <label className="pole">E-mail, puste znaczy brak
            <input className="mt-1" value={nabywca.email} onChange={(e) => setNabywca({ ...nabywca, email: e.target.value })} />
          </label>
          <label className="pole">Telefon, puste znaczy brak
            <input className="mt-1" value={nabywca.telefon} onChange={(e) => setNabywca({ ...nabywca, telefon: e.target.value })} />
          </label>
          <label className="pole sm:col-span-2">Ulica
            <input className="mt-1" value={nabywca.ulica} onChange={(e) => setNabywca({ ...nabywca, ulica: e.target.value })} />
          </label>
          <label className="pole">Kod
            <input className="mt-1" value={nabywca.kod} onChange={(e) => setNabywca({ ...nabywca, kod: e.target.value })} />
          </label>
          <label className="pole">Miasto
            <input className="mt-1" value={nabywca.miasto} onChange={(e) => setNabywca({ ...nabywca, miasto: e.target.value })} />
          </label>
        </div>

        <div className="space-y-3">
          {pozycje.map((p, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-linia p-3 sm:grid-cols-[1fr_5rem_8rem_auto]">
              <label className="pole">Nazwa
                <input className="mt-1" value={p.nazwa} onChange={(e) => zmienPozycje(i, "nazwa", e.target.value)} />
              </label>
              <label className="pole">Ilość
                <input className="mt-1" type="number" step="0.01" value={p.ilosc} onChange={(e) => zmienPozycje(i, "ilosc", e.target.value)} />
              </label>
              <label className="pole">Cena netto
                <input className="mt-1" type="number" step="0.01" value={p.cenaNetto} onChange={(e) => zmienPozycje(i, "cenaNetto", e.target.value)} />
              </label>
              <button type="button" className="self-end text-sm text-burak" onClick={() => setPozycje((lista) => lista.filter((_, n) => n !== i))}>
                Usuń
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-las"
            onClick={() => setPozycje((lista) => [...lista, { nazwa: "", ilosc: 1, cenaNetto: 0 }])}
          >
            Dodaj pozycję
          </button>
        </div>

        {blad && <p className="rounded-lg bg-burak/10 px-3 py-2 text-sm text-burak">{blad}</p>}
        <button type="submit" disabled={zapis} className="rounded-lg bg-las px-4 py-2 text-white disabled:opacity-50">
          {zapis ? "Zapisuję..." : "Zapisz fakturę"}
        </button>
      </div>

      <aside className="h-fit rounded-2xl border border-linia bg-karta p-5">
        <p className="text-xs uppercase tracking-wide text-mosiadz">Razem</p>
        <p className="mt-2">Netto {pieniadze(kwoty.netto)} zł</p>
        <p>VAT {firma?.platnikVat ? "23%" : "zwolniony"} · {pieniadze(kwoty.vat)} zł</p>
        <p className="font-serif text-3xl">{pieniadze(kwoty.brutto)} zł</p>
        {!firma?.platnikVat && <p className="mt-3 text-xs leading-relaxed text-atrament/70">{firma?.podstawaZwolnienia}</p>}
        {typ === "korekta" && <p className="mt-3 text-sm">Przy korekcie wpisz różnicę. Kwota ujemna zmniejsza podatek.</p>}
      </aside>
    </form>
  );
}
