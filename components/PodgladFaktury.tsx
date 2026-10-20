import { ETYKIETA, type Faktura, type Firma } from "@/lib/typy";
import { pieniadze, poPolsku, terminPlatnosci } from "@/lib/podatki";

export function PodgladFaktury({ faktura, firma }: { faktura: Faktura; firma: Firma }) {
  const sprzedawca = faktura.sprzedawca ?? firma;
  return (
    <article className="relative overflow-hidden rounded-2xl border border-linia bg-white p-6 shadow-kartka">
      {faktura.typ === "proforma" && (
        <p className="pointer-events-none absolute right-6 top-16 rotate-12 border-4 border-burak/70 px-3 py-1 font-serif text-3xl uppercase tracking-widest text-burak/70">
          Proforma
        </p>
      )}
      <p className="text-xs uppercase tracking-[0.2em] text-mosiadz">{ETYKIETA[faktura.typ]}</p>
      <h2 className="font-serif text-3xl">{faktura.numer}</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-mosiadz">Sprzedawca</p>
          <p className="mt-1 font-medium">{sprzedawca.nazwa}</p>
          <p className="text-sm">{sprzedawca.forma}</p>
          <p className="text-sm">{sprzedawca.ulica}</p>
          <p className="text-sm">{sprzedawca.kod} {sprzedawca.miasto}</p>
          <p className="text-sm">NIP: {sprzedawca.nip || "brak"}</p>
          <p className="text-sm">{sprzedawca.email}</p>
          <p className="text-sm">{sprzedawca.telefon}</p>
          <p className="mt-2 text-sm">Rachunek: {sprzedawca.rachunek}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-mosiadz">Nabywca</p>
          <p className="mt-1 font-medium">{faktura.nabywca.nazwa}</p>
          <p className="text-sm">{faktura.nabywca.ulica}</p>
          <p className="text-sm">{faktura.nabywca.kod} {faktura.nabywca.miasto}</p>
          <p className="text-sm">NIP: {faktura.nabywca.nip || "brak"}</p>
          <p className="text-sm">E-mail: {faktura.nabywca.email || "brak"}</p>
          <p className="text-sm">Telefon: {faktura.nabywca.telefon || "brak"}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-atrament/70">
        Wystawiono {poPolsku(faktura.dataWystawienia)}, sprzedaż {poPolsku(faktura.dataSprzedazy)}
      </p>
      <div className="mt-4 rounded-xl border border-las/30 bg-las/5 p-4">
        <p className="text-xs uppercase tracking-wide text-mosiadz">Płatność</p>
        <p className="mt-1 font-medium">Zapłać do {poPolsku(faktura.terminPlatnosci || terminPlatnosci(faktura.dataWystawienia))}</p>
        <p className="text-sm">7 dni od daty wystawienia</p>
        <p className="mt-2 text-sm">Kwota: {pieniadze(faktura.brutto)} zł</p>
        <p className="text-sm">Rachunek: {sprzedawca.rachunek}</p>
        <p className="text-sm">Tytuł: {faktura.numer}</p>
      </div>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-linia text-left text-xs uppercase text-mosiadz">
            <th className="py-2">Pozycja</th>
            <th>Ilość</th>
            <th>Netto</th>
          </tr>
        </thead>
        <tbody>
          {faktura.pozycje.map((p, i) => (
            <tr key={i} className="border-b border-linia/70">
              <td className="py-2">{p.nazwa}{p.stawka === "poza" ? " · poza Unią" : p.stawka === "ue" ? " · Unia" : ""}</td>
              <td>{p.ilosc}</td>
              <td>{pieniadze(p.ilosc * p.cenaNetto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-4 space-y-1 text-right">
        <div>Netto: {pieniadze(faktura.netto)} zł</div>
        <div>VAT: {pieniadze(faktura.vat)} zł</div>
        <div className="font-serif text-2xl">Brutto: {pieniadze(faktura.brutto)} zł</div>
      </dl>
      {faktura.pozycje.some((p) => p.stawka === "poza") && (
        <p className="mt-4 text-xs leading-relaxed text-atrament/70">Świadczenie usług poza terytorium kraju, na przykład do Senegalu. Nie podlega polskiemu VAT. Netto jest przychodem do CIT.</p>
      )}
      {faktura.pozycje.some((p) => p.stawka === "ue") && (
        <p className="mt-4 text-xs leading-relaxed text-atrament/70">Usługa dla podatnika z Unii. Polskiego VAT nie ma. Transakcja wchodzi do informacji VAT-UE.</p>
      )}
      {!faktura.platnikVat && !faktura.pozycje.some((p) => p.stawka === "poza" || p.stawka === "ue") && (
        <p className="mt-4 text-xs leading-relaxed text-atrament/70">{sprzedawca.podstawaZwolnienia}</p>
      )}
      {faktura.typ === "proforma" && (
        <p className="mt-3 text-sm text-burak">Ta proforma nie jest wysyłana do KSeF i nie wchodzi do VAT ani CIT.</p>
      )}
    </article>
  );
}
