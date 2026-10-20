"use client";

import { useEffect, useMemo, useState } from "react";
import type { Faktura, Firma, Koszt, WysylkaJpk } from "@/lib/typy";
import { dniDo, formatDaty, pieniadze, rozliczenieMiesiaca, terminPoOkresie } from "@/lib/podatki";
import { czytajUpo, formatujWplyw } from "@/lib/upo";
import { pozycjeVatUe } from "@/lib/vat-ue";

function cyfry(wartosc: string, limit: number) {
  return wartosc.replace(/\D/g, "").replace(/^0+/, "").slice(0, limit);
}

export default function VatStrona() {
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
  const [wysylka, setWysylka] = useState("");
  const [trwa, setTrwa] = useState(false);
  const [upo, setUpo] = useState("");
  const [wysylki, setWysylki] = useState<WysylkaJpk[]>([]);
  const [powod, setPowod] = useState("Korekta danych");
  const [korektaRecznie, setKorektaRecznie] = useState(false);

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
      fetch("/api/jpk/wysylki").then((r) => r.json()),
    ]).then(([f, lista, kosztyLista, status, historia]) => {
      setFirma(f);
      setFaktury(Array.isArray(lista) ? lista : []);
      setKoszty(Array.isArray(kosztyLista) ? kosztyLista : []);
      setMikrorachunek(f.mikrorachunek || status.mikrorachunek || "");
      setWysylki(Array.isArray(historia) ? historia : []);
    });
  }, []);

  const rozliczenie = useMemo(
    () => rozliczenieMiesiaca(faktury, rok, miesiac, 0, koszty),
    [faktury, rok, miesiac, koszty],
  );
  const termin = terminPoOkresie(rok, miesiac, 25);
  const zostalo = dniDo(termin);
  const poTerminie = zostalo < 0;
  const nazwaOkresu = `${String(miesiac).padStart(2, "0")}.${rok}`;
  const jestImport = rozliczenie.importUe.length > 0 || rozliczenie.importPozaUe.length > 0;
  const sprzedazUe = pozycjeVatUe(faktury, rok, miesiac);
  const vatUeZlozone = wysylki.some((w) => w.opis === "VAT-UE" && w.rok === rok && w.miesiac === miesiac);
  const trzebaJpk = Boolean(firma?.platnikVat) || jestImport;
  const potwierdzenie = upo ? czytajUpo(upo) : null;
  const historiaMiesiaca = wysylki.filter((w) => w.rok === rok && w.miesiac === miesiac && w.kod === 200);
  const cel = historiaMiesiaca.length > 0 || korektaRecznie ? 2 : 1;
  const ostatnia = historiaMiesiaca[0];

  async function wyslij() {
    setTrwa(true);
    setWysylka("Pakuję plik i wysyłam na bramkę testową...");
    setUpo("");
    const odpowiedz = await fetch("/api/jpk/wyslij", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rok, miesiac, cel, powod }),
    });
    let dane = await odpowiedz.json();
    if (!odpowiedz.ok) {
      setWysylka(dane.blad || "Nie wysłano.");
      setTrwa(false);
      return;
    }
    for (let i = 0; i < 20 && dane.kod > 0 && dane.kod < 200; i++) {
      setWysylka(`Bramka jeszcze sprawdza plik (${dane.opis || dane.kod}). Numer ${dane.numerReferencyjny}.`);
      await new Promise((rozwiaz) => setTimeout(rozwiaz, 3000));
      const status = await fetch(`/api/jpk/status?numer=${dane.numerReferencyjny}`);
      const kolejny = await status.json();
      if (!status.ok) {
        dane = { ...dane, opis: kolejny.blad || dane.opis };
        break;
      }
      dane = kolejny;
    }
    if (dane.kod === 200) {
      setWysylka(`Bramka testowa przyjęła JPK za ${nazwaOkresu}. Numer referencyjny: ${dane.numerReferencyjny}. To nie jest prawdziwy urząd, przelewu z tego testu nie rób.`);
      setUpo(dane.upo || "");
      const historia = await fetch("/api/jpk/wysylki").then((r) => r.json());
      setWysylki(Array.isArray(historia) ? historia : []);
    } else {
      setWysylka(dane.opis || dane.blad || `Bramka zwróciła kod ${dane.kod}. Numer ${dane.numerReferencyjny || ""}.`);
      setUpo("");
    }
    setTrwa(false);
  }

  async function otworzPlik(plik: File) {
    const tekst = await plik.text();
    setUpo(tekst);
    if (!czytajUpo(tekst)) {
      setWysylka("W tym pliku nie ma potwierdzenia. Wybierz XML pobrany przyciskiem UPO.");
      return;
    }
    setWysylka("");
    await fetch("/api/jpk/wysylki", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upo: tekst }),
    });
    const historia = await fetch("/api/jpk/wysylki").then((r) => r.json());
    setWysylki(Array.isArray(historia) ? historia : []);
  }

  function pobierzUpo() {
    const plik = new Blob([upo], { type: "application/xml" });
    const adres = URL.createObjectURL(plik);
    const link = document.createElement("a");
    link.href = adres;
    link.download = `UPO_${rok}_${String(miesiac).padStart(2, "0")}.xml`;
    link.click();
    URL.revokeObjectURL(adres);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">VAT i JPK</h1>
        <p className="text-sm text-atrament/70">Spółka składa JPK_V7M co miesiąc. Kwartalny JPK jej nie dotyczy.</p>
      </div>

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
              const liczba = Number(tekst);
              if (tekst.length === 4) setRok(liczba);
            }}
          />
        </label>
      </div>
      {czasUrzadzenia && <p className="text-sm text-atrament/70">Na tym urządzeniu jest {czasUrzadzenia}. Okres startuje od tego miesiąca.</p>}

      {!trzebaJpk && (
        <div className="rounded-2xl border border-mosiadz/40 bg-karta p-5">
          <p className="font-medium">Nie jesteś płatnikiem VAT.</p>
          <p className="mt-2 text-sm leading-relaxed">
            Pliku JPK nie składasz i VAT-u nie przelewasz. Na fakturach jest zwolnienie z art. 113. Jak zaznaczysz płatnika VAT w danych firmy, tu pojawi się kwota, termin i plik XML.
          </p>
          <p className="mt-3 font-serif text-3xl">0,00 zł</p>
        </div>
      )}

      {trzebaJpk && (
        <>
          <section className={`rounded-2xl border p-5 ${poTerminie ? "border-burak bg-burak/5" : "border-linia bg-karta"}`}>
            {!firma?.platnikVat && jestImport && (
              <p className="mb-2 text-sm">Nie jesteś płatnikiem VAT, ale import usług i tak zgłaszasz i płacisz.</p>
            )}
            <p className="text-sm">Za {nazwaOkresu} {rozliczenie.vat > 0 ? "masz zapłacić VAT" : "nie przelewasz VAT"}</p>
            <p className="font-serif text-4xl">{pieniadze(rozliczenie.vat)} zł</p>
            <p className="mt-2 text-sm">
              Należny {pieniadze(rozliczenie.vatNalezny)} zł, odliczenie {pieniadze(rozliczenie.vatNaliczony)} zł
              {rozliczenie.nadwyzka ? `, nadwyżka ${pieniadze(rozliczenie.nadwyzka)} zł na następny miesiąc` : ""}.
            </p>
            <p className="mt-1 text-sm">
              Termin: {formatDaty(termin)}.{" "}
              {poTerminie
                ? `Za okres ${nazwaOkresu} trzeba już złożyć JPK i zapłacić.`
                : zostalo === 0
                  ? "Termin jest dzisiaj."
                  : `Zostało ${zostalo} dni.`}
            </p>
            {cel === 2 && (
              <label className="pole mt-4">Co poprawiasz
                <input className="mt-1" value={powod} onChange={(e) => setPowod(e.target.value)} />
              </label>
            )}
            {historiaMiesiaca.length === 0 && (
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input className="w-auto" type="checkbox" checked={korektaRecznie} onChange={(e) => setKorektaRecznie(e.target.checked)} />
                Ten miesiąc już poszedł na bramkę. Wyślij korektę.
              </label>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="rounded-lg bg-las px-4 py-2 text-sm text-white disabled:opacity-60" disabled={trwa} onClick={wyslij}>
                {trwa ? "Wysyłam..." : cel === 2 ? `Wyślij korektę JPK za ${nazwaOkresu}` : `Wyślij JPK_V7M za ${nazwaOkresu} na bramkę testową`}
              </button>
              <a className="rounded-lg border border-linia px-4 py-2 text-sm" href={`/api/jpk?rok=${rok}&miesiac=${miesiac}&cel=${cel}&powod=${encodeURIComponent(powod)}`}>
                Pobierz XML
              </a>
              <label className="cursor-pointer rounded-lg border border-linia px-4 py-2 text-sm">
                Otwórz pobrane UPO
                <input className="hidden" type="file" accept=".xml,text/xml" onChange={(e) => {
                  const plik = e.target.files?.[0];
                  if (plik) otworzPlik(plik);
                }} />
              </label>
              {upo && (
                <button type="button" className="rounded-lg border border-linia px-4 py-2 text-sm" onClick={pobierzUpo}>
                  Zapisz plik UPO
                </button>
              )}
            </div>
            {ostatnia && (
              <div className="mt-4 rounded-xl border border-las/40 bg-papier p-4">
                <p className="text-sm text-atrament/70">Numer referencyjny {ostatnia.cel === 2 ? "korekty" : "złożenia"} za {nazwaOkresu}</p>
                <p className="mt-1 break-all font-mono text-lg">{ostatnia.numerReferencyjny}</p>
                <p className="mt-2 text-sm">To jest te 32 znaki. Wklej je na stronie statusu, żeby sprawdzić, czy bramka naprawdę przyjęła plik.</p>
                <a className="mt-2 inline-block text-sm text-las underline" href={`https://e-mikrofirma.mf.gov.pl/jpk-client/status?referenceNumber=${ostatnia.numerReferencyjny}`} target="_blank" rel="noreferrer">
                  Sprawdź status w Klient JPK_WEB
                </a>
              </div>
            )}
            {wysylka && <p className="mt-3 text-sm leading-relaxed">{wysylka}</p>}
            {potwierdzenie && (
              <div className="mt-4 rounded-xl border border-las/30 bg-papier p-4 text-sm">
                <p className="font-medium">{potwierdzenie.przyjeto ? "Bramka przyjęła plik." : "Bramka nie przyjęła pliku."}</p>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div><dt className="text-atrament/60">Kto przyjął</dt><dd>{potwierdzenie.kto}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-atrament/60">Numer referencyjny, 32 znaki</dt><dd className="break-all font-mono text-base">{potwierdzenie.numer}</dd></div>
                  <div><dt className="text-atrament/60">Formularz</dt><dd>{potwierdzenie.formularz}</dd></div>
                  <div><dt className="text-atrament/60">Okres</dt><dd>{potwierdzenie.miesiac.padStart(2, "0")}.{potwierdzenie.rok}</dd></div>
                  <div><dt className="text-atrament/60">NIP</dt><dd>{potwierdzenie.nip}</dd></div>
                  <div><dt className="text-atrament/60">Kod urzędu</dt><dd>{potwierdzenie.urzad}</dd></div>
                  <div><dt className="text-atrament/60">Wpłynęło</dt><dd>{formatujWplyw(potwierdzenie.data)}</dd></div>
                  <div><dt className="text-atrament/60">Cel</dt><dd>{potwierdzenie.cel}</dd></div>
                </dl>
              </div>
            )}
            {upo && !potwierdzenie && <p className="mt-3 text-sm text-burak">Tego XML-a nie da się przeczytać jako UPO.</p>}
            {!firma?.nip && <p className="mt-2 text-sm text-burak">W danych firmy nie ma NIP. Dopisz go, zanim wyślesz plik.</p>}
            {!firma?.kodUrzedu && <p className="mt-1 text-sm text-burak">W danych firmy nie ma kodu urzędu. Bez niego bramka pliku nie przyjmie.</p>}
            {rozliczenie.importUe.length > 0 && (
              <p className="mt-3 text-sm">
                Import usług z Unii ({rozliczenie.importUe.map((k) => `${k.dostawca} ${pieniadze(k.netto)} zł`).join(", ")}) jest już w JPK jako należne 23%. VAT-UE z zakupu Google się nie składa. Tę informację składa Google w Irlandii. Cursor jest spoza Unii i też nie wchodzi do VAT-UE.
              </p>
            )}
            {sprzedazUe.length > 0 && (
              <div className="mt-4 rounded-xl border border-linia bg-papier p-4 text-sm leading-relaxed">
                <p className="font-medium">VAT-UE za {nazwaOkresu}</p>
                <p className="mt-2">To nie jest osobny podatek. Papierowego druku nie ma. Formularz nazywa się VAT-UE (5). Składasz go elektronicznie do {formatDaty(termin)}, razem z JPK. {poTerminie ? "Ten termin już minął." : zostalo === 0 ? "Termin jest dzisiaj." : `Zostało ${zostalo} dni.`}</p>
                <p className="mt-2">Na teście wgrywasz pobrany XML w aplikacji e-Deklaracje wskazanej na bramkę https://test-bramka.edeklaracje.gov.pl. Podpisujesz Profilem Zaufanym albo podpisem kwalifikowanym. Program sam tej bramki nie klika, bo bez podpisu pliku nie przyjmie. Prawdziwej bramki nie używamy.</p>
                <p className="mt-2">Pozycje: {sprzedazUe.map((p) => `${p.kraj}${p.numer} ${p.kwota} zł`).join(", ")}.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a className="rounded-lg bg-las px-4 py-2 text-white" href={`/api/vat-ue?rok=${rok}&miesiac=${miesiac}`}>Pobierz VAT-UE (5)</a>
                  {!vatUeZlozone && (
                    <button
                      type="button"
                      className="rounded-lg border border-linia px-4 py-2"
                      onClick={async () => {
                        const odpowiedz = await fetch("/api/vat-ue", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ rok, miesiac }),
                        });
                        const dane = await odpowiedz.json();
                        setWysylka(dane.opis || dane.blad || "");
                        const historia = await fetch("/api/jpk/wysylki").then((r) => r.json());
                        setWysylki(Array.isArray(historia) ? historia : []);
                      }}
                    >
                      Zapamiętaj, że złożyłem
                    </button>
                  )}
                  {vatUeZlozone && (
                    <a className="rounded-lg border border-linia px-4 py-2" href={`/api/vat-ue?rok=${rok}&miesiac=${miesiac}&korekta=1`}>Pobierz korektę VAT-UEK (5)</a>
                  )}
                </div>
                {vatUeZlozone && <p className="mt-2">Jak poprawisz fakturę po złożeniu, nie wysyłasz drugi raz VAT-UE. Pobierasz VAT-UEK (5): tam jest „było” i „jest”.</p>}
              </div>
            )}
          </section>

          <details className="rounded-2xl border border-linia bg-karta p-5" open>
            <summary className="cursor-pointer font-medium">Gdzie złożyć i jak zapłacić</summary>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              <li>Kliknij „Wyślij JPK”. Program sam wysyła plik na testową bramkę. Swaggera nie otwierasz, tam nie ma formularza dla człowieka.</li>
              <li>Jak bramka przyjmie plik, numer referencyjny zostaje na tej stronie. Ma 32 znaki i jest w UPO w polu NumerReferencyjny. Wklejasz go w Klient JPK_WEB, żeby zobaczyć status 200. Jak coś poprawisz po wysyłce, wyślij korektę, nie drugi raz zwykły plik.</li>
              <li>Termin złożenia i zapłaty: {formatDaty(termin)}. {poTerminie ? "Ten termin już minął." : zostalo === 0 ? "Termin jest dzisiaj." : `Zostało ${zostalo} dni.`}</li>
              <li>
                {rozliczenie.vat > 0
                  ? `Przelej ${pieniadze(rozliczenie.vat)} zł na mikrorachunek ${mikrorachunek || "(uzupełnij go w danych firmy)"}. Symbol: VAT-7. Okres: ${nazwaOkresu}.`
                  : "Przelewu nie rób. Podatek należny został odliczony."}
              </li>
              {sprzedazUe.length > 0 && (
                <li>Pobierz XML VAT-UE i wyślij go na testową bramkę e-Deklaracji do 25. Dotyczy tylko usług, które sam sprzedałeś firmie z Unii.</li>
              )}
            </ol>
          </details>

          <ul className="divide-y divide-linia rounded-2xl border border-linia bg-karta">
            {rozliczenie.dokumenty.length === 0 && rozliczenie.koszty.length === 0 && <li className="p-4 text-sm">W tym miesiącu nie ma dokumentów do VAT.</li>}
            {rozliczenie.dokumenty.map((f) => (
              <li key={f.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{f.numer}</span>
                <span>VAT sprzedaży {pieniadze(f.vat)} zł</span>
              </li>
            ))}
            {rozliczenie.koszty.filter((k) => k.vatNalezny !== 0 || k.vatNaliczony !== 0).map((k) => (
              <li key={k.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{k.dostawca} · {k.numer}</span>
                <span>należny {pieniadze(k.vatNalezny)} zł, odliczenie {pieniadze(k.vatNaliczony)} zł</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
