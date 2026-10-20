"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ETYKIETA, pustyNabywca, type Faktura, type Firma, type Pozycja, type StawkaVat, type TypFaktury } from "@/lib/typy";
import { fakturaZVat, pieniadze, sumaPozycji } from "@/lib/podatki";
import { bledyNabywcy, bledyPozycji, pierwszyBlad, type Bledy } from "@/lib/walidacja";

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

export function FormularzFaktury({ edytowana }: { edytowana?: Faktura }) {
  const router = useRouter();
  const szukane = useSearchParams();
  const [firma, setFirma] = useState<Firma | null>(null);
  const [faktury, setFaktury] = useState<Faktura[]>([]);
  const [typ, setTyp] = useState<TypFaktury>("koncowa");
  const [dataWystawienia, setDataWystawienia] = useState(DZIS);
  const [dataSprzedazy, setDataSprzedazy] = useState(DZIS);
  const [nabywca, setNabywca] = useState(pustyNabywca());
  const [pozycje, setPozycje] = useState<Pozycja[]>([
    { nazwa: "Strona internetowa", ilosc: 1, cenaNetto: 1000, stawka: 23 },
  ]);
  const [podstawy, setPodstawy] = useState<string[]>([]);
  const [koryguje, setKoryguje] = useState("");
  const [przyczyna, setPrzyczyna] = useState("");
  const [blad, setBlad] = useState("");
  const [bledy, setBledy] = useState<Bledy>({});
  const [zapis, setZapis] = useState(false);
  const [szukajPodstawy, setSzukajPodstawy] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/firma").then((r) => r.json()), fetch("/api/faktury").then((r) => r.json())]).then(
      ([f, lista]) => {
        setFirma(f);
        setFaktury(Array.isArray(lista) ? lista : []);
      },
    );
  }, []);

  useEffect(() => {
    if (!edytowana) return;
    setTyp(edytowana.typ);
    setDataWystawienia(edytowana.dataWystawienia);
    setDataSprzedazy(edytowana.dataSprzedazy);
    setNabywca({ ...pustyNabywca(), ...edytowana.nabywca });
    setPozycje(edytowana.pozycje);
    setPodstawy(edytowana.podstawy);
    setKoryguje(edytowana.koryguje ?? "");
    setPrzyczyna(edytowana.przyczynaKorekty);
  }, [edytowana]);

  useEffect(() => {
    if (edytowana) return;
    const id = szukane.get("korekta");
    if (!id) return;
    const pierwotna = faktury.find((f) => f.id === id);
    if (!pierwotna) return;
    setTyp("korekta");
    setKoryguje(id);
    setNabywca({ ...pustyNabywca(), ...pierwotna.nabywca });
    setPozycje(pierwotna.pozycje.map((p) => ({ ...p, cenaNetto: p.cenaNetto > 0 ? -p.cenaNetto : p.cenaNetto })));
    setPrzyczyna("Korekta całej faktury");
    setDataWystawienia(DZIS);
    setDataSprzedazy(pierwotna.dataSprzedazy);
  }, [edytowana, faktury, szukane]);

  const kwoty = useMemo(() => {
    const netto = sumaPozycji(pozycje, false).netto;
    const bezTej = faktury.filter((f) => f.id !== edytowana?.id);
    const zVat = firma ? fakturaZVat(firma, bezTej, dataWystawienia, netto, typ) : false;
    return { ...sumaPozycji(pozycje, zVat), zVat };
  }, [pozycje, firma, faktury, dataWystawienia, typ, edytowana?.id]);

  const zaliczki = faktury.filter((f) => podstawy.includes(f.id));
  const fraza = szukajPodstawy.trim().toLowerCase();
  const podpowiedzi = fraza
    ? faktury.filter((f) => `${f.numer} ${f.nabywca.nazwa} ${ETYKIETA[f.typ]}`.toLowerCase().includes(fraza) && !podstawy.includes(f.id)).slice(0, 20)
    : [];

  function zmienPozycje(indeks: number, pole: keyof Pozycja, wartosc: string) {
    setPozycje((lista) =>
      lista.map((p, i) => {
        if (i !== indeks) return p;
        if (pole === "nazwa") return { ...p, nazwa: wartosc };
        if (pole === "stawka") {
          const stawka: StawkaVat = wartosc === "zw" || wartosc === "ue" ? wartosc : Number(wartosc) as StawkaVat;
          return { ...p, stawka };
        }
        return { ...p, [pole]: Number(wartosc) };
      }),
    );
  }

  async function zapisz(e: React.FormEvent) {
    e.preventDefault();
    if (!firma) return;
    setZapis(true);
    setBlad("");
    const znalezione = { ...bledyNabywcy(nabywca), ...bledyPozycji(pozycje, typ) };
    if (typ === "korekta" && !koryguje) znalezione.koryguje = "Wybierz fakturę, którą korygujesz.";
    if (pozycje.some((p) => p.stawka === "ue") && !/^[A-Za-z]{2}[A-Za-z0-9]{2,12}$/.test(nabywca.nip.replace(/\s/g, ""))) {
      znalezione.nip = "Przy usłudze dla firmy z Unii wpisz jej numer VAT, na przykład IE6388047V.";
    }
    if (pozycje.some((p) => p.stawka === "poza") && !pozycje.some((p) => p.stawka === "ue")) delete znalezione.nip;
    setBledy(znalezione);
    if (pierwszyBlad(znalezione)) {
      setZapis(false);
      return;
    }
    const odpowiedz = await fetch(edytowana ? `/api/faktury/${edytowana.id}` : "/api/faktury", {
      method: edytowana ? "PUT" : "POST",
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
          <p className="font-serif text-3xl">{edytowana ? `Edycja ${edytowana.numer}` : "Nowa faktura"}</p>
          <p className="text-sm text-atrament/70">Sprzedawcą jest firma z danych ogólnych. Tu zmieniasz tylko nabywcę i pozycje.</p>
        </div>
        <details className="rounded-xl border border-linia bg-papier p-4 text-sm leading-relaxed" open>
          <summary className="cursor-pointer font-medium">Jak wystawić, poprawić i usunąć</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Nowa faktura to dodanie. Proforma nie wchodzi do VAT ani CIT. Końcowa wchodzi.</li>
            <li>Polska firma albo osoba: stawka 23, 8, 5, 0 albo zwolnienie.</li>
            <li>Firma z Unii, na przykład Niemcy: stawka „usługa dla firmy z Unii” i jej numer VAT. Polskiego VAT nie ma. Powstaje plik VAT-UE.</li>
            <li>Kraj spoza Unii, na przykład Senegal: stawka „eksport usługi poza Unię”. Polskiego VAT nie ma i VAT-UE nie ma. Netto i tak wchodzi do CIT, a JPK pokazuje usługę poza Polską.</li>
            <li>Zanim faktura wejdzie do KSeF, na jej stronie jest Edytuj i Anuluj. Anuluj kasuje ją z ksiąg.</li>
            <li>Jak numer KSeF już jest, edycji i kasowania nie ma. Klikasz „Wystaw korektę”. Program podstawia minus. Minus zmniejsza CIT i VAT. Korektę korygujesz kolejną korektą.</li>
          </ol>
        </details>

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
          <p className="mb-2 text-xs text-atrament/60">Zostaw puste, jeśli ta faktura nie wynika z wcześniejszej. Jak wynika, wpisz numer. Lista nie pokazuje wszystkich faktur naraz.</p>
          {zaliczki.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {zaliczki.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-full border border-linia px-3 py-1 text-sm">
                  {ETYKIETA[f.typ]} {f.numer}
                  <button type="button" className="text-burak" onClick={() => setPodstawy((lista) => lista.filter((id) => id !== f.id))}>usuń</button>
                </li>
              ))}
            </ul>
          )}
          <input className="w-full" value={szukajPodstawy} onChange={(e) => setSzukajPodstawy(e.target.value)} placeholder="Szukaj numeru, na przykład FV/1" />
          {fraza && (
            <div className="mt-1 max-h-48 overflow-auto rounded-lg border border-linia">
              {podpowiedzi.length === 0 && <p className="p-3 text-sm text-atrament/60">Nie ma faktury o takim numerze.</p>}
              {podpowiedzi.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-papier"
                  onClick={() => {
                    setPodstawy((lista) => [...lista, f.id]);
                    setSzukajPodstawy("");
                  }}
                >
                  {ETYKIETA[f.typ]} {f.numer} · {f.nabywca.nazwa || "bez nazwy"} · {pieniadze(f.brutto)} zł
                </button>
              ))}
            </div>
          )}
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
          <label className="pole">NIP, puste gdy osoba prywatna
            <input className={`mt-1 ${bledy.nip ? "border-burak" : ""}`} value={nabywca.nip} onChange={(e) => setNabywca({ ...nabywca, nip: e.target.value })} />
            {bledy.nip && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.nip}</span>}
          </label>
          <label className="pole">E-mail, puste znaczy brak
            <input className={`mt-1 ${bledy.email ? "border-burak" : ""}`} value={nabywca.email} onChange={(e) => setNabywca({ ...nabywca, email: e.target.value })} />
            {bledy.email && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.email}</span>}
          </label>
          <label className="pole">Telefon, puste znaczy brak
            <input className={`mt-1 ${bledy.telefon ? "border-burak" : ""}`} value={nabywca.telefon} onChange={(e) => setNabywca({ ...nabywca, telefon: e.target.value })} />
            {bledy.telefon && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.telefon}</span>}
          </label>
          <label className="pole sm:col-span-2">Ulica
            <input className="mt-1" value={nabywca.ulica} onChange={(e) => setNabywca({ ...nabywca, ulica: e.target.value })} />
          </label>
          <label className="pole">Kod
            <input className={`mt-1 ${bledy.kod ? "border-burak" : ""}`} value={nabywca.kod} onChange={(e) => setNabywca({ ...nabywca, kod: e.target.value })} />
            {bledy.kod && <span className="mt-1 block text-xs normal-case tracking-normal text-burak">{bledy.kod}</span>}
          </label>
          <label className="pole">Miasto
            <input className="mt-1" value={nabywca.miasto} onChange={(e) => setNabywca({ ...nabywca, miasto: e.target.value })} />
          </label>
        </div>

        <div className="space-y-3">
          {pozycje.map((p, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-linia p-3 sm:grid-cols-[1fr_8rem_5rem_8rem_auto]">
              <label className="pole">Nazwa
                <input className={`mt-1 ${bledy[`pozycja-${i}`] ? "border-burak" : ""}`} value={p.nazwa} onChange={(e) => zmienPozycje(i, "nazwa", e.target.value)} />
              </label>
              <label className="pole">VAT
                <select className="mt-1" value={String(p.stawka ?? (kwoty.zVat ? 23 : "zw"))} onChange={(e) => zmienPozycje(i, "stawka", e.target.value)}>
                  <option value="23">23%</option>
                  <option value="8">8%</option>
                  <option value="5">5%</option>
                  <option value="0">0%</option>
                  <option value="zw">zwolniony</option>
                  <option value="ue">usługa dla firmy z Unii</option>
                  <option value="poza">eksport usługi poza Unię, na przykład Senegal</option>
                </select>
              </label>
              <label className="pole">Ilość
                <input className={`mt-1 ${bledy[`ilosc-${i}`] ? "border-burak" : ""}`} type="number" step="0.01" value={p.ilosc} onChange={(e) => zmienPozycje(i, "ilosc", e.target.value)} />
              </label>
              <label className="pole">Cena netto
                <input className={`mt-1 ${bledy[`cena-${i}`] ? "border-burak" : ""}`} type="number" step="0.01" value={p.cenaNetto} onChange={(e) => zmienPozycje(i, "cenaNetto", e.target.value)} />
              </label>
              <button type="button" className="self-end text-sm text-burak" onClick={() => setPozycje((lista) => lista.filter((_, n) => n !== i))}>
                Usuń
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-las"
            onClick={() => setPozycje((lista) => [...lista, { nazwa: "", ilosc: 1, cenaNetto: 0, stawka: 23 }])}
          >
            Dodaj pozycję
          </button>
        </div>

        {blad && <p className="rounded-lg bg-burak/10 px-3 py-2 text-sm text-burak">{blad}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={zapis} className="rounded-lg bg-las px-4 py-2 text-white disabled:opacity-50">
            {zapis ? "Zapisuję..." : edytowana ? "Zapisz zmiany" : "Zapisz fakturę"}
          </button>
          <button type="button" className="rounded-lg border border-linia px-4 py-2 text-sm" onClick={() => router.push(edytowana ? `/faktury/${edytowana.id}` : "/faktury")}>
            Anuluj
          </button>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-linia bg-karta p-5">
        <p className="text-xs uppercase tracking-wide text-mosiadz">Razem</p>
        <p className="mt-2">Netto {pieniadze(kwoty.netto)} zł</p>
        <p>VAT {pieniadze(kwoty.vat)} zł</p>
        {pozycje.some((p) => p.stawka === "ue") && <p className="mt-3 text-xs leading-relaxed text-atrament/70">Usługa dla firmy z Unii nie ma polskiego VAT. Wchodzi do informacji VAT-UE (5), termin do 25. następnego miesiąca.</p>}
        {pozycje.some((p) => p.stawka === "poza") && <p className="mt-3 text-xs leading-relaxed text-atrament/70">Eksport usługi do Senegalu i każdego kraju spoza Unii: polskiego VAT nie ma, VAT-UE nie ma. Netto wchodzi do CIT. W JPK jest to świadczenie poza Polską.</p>}
        <p className="font-serif text-3xl">{pieniadze(kwoty.brutto)} zł</p>
        {!kwoty.zVat && <p className="mt-3 text-xs leading-relaxed text-atrament/70">{firma?.podstawaZwolnienia}</p>}
        {typ === "korekta" && <p className="mt-3 text-sm">Przy korekcie wpisz różnicę. Kwota ujemna zmniejsza podatek.</p>}
      </aside>
    </form>
  );
}
