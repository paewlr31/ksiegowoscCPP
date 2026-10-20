import type { Firma, Nabywca, Pozycja, RodzajKosztu, TypFaktury } from "./typy";
import { kodUrzeduPoprawny } from "./urzedy";

export type Bledy = Record<string, string>;

export function cyfry(wartosc: string): string {
  return wartosc.replace(/\D/g, "");
}

export function nipPoprawny(nip: string): boolean {
  const c = cyfry(nip);
  if (!/^\d{10}$/.test(c)) return false;
  const wagi = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const suma = wagi.reduce((wynik, waga, i) => wynik + waga * Number(c[i]), 0);
  const reszta = suma % 11;
  return reszta !== 10 && reszta === Number(c[9]);
}

export function nrbPoprawny(rachunek: string): boolean {
  const c = cyfry(rachunek);
  if (!/^\d{26}$/.test(c)) return false;
  const iban = `PL${c}`.slice(4) + `PL${c}`.slice(0, 4);
  const liczby = iban.replace(/[A-Z]/g, (znak) => String(znak.charCodeAt(0) - 55));
  let reszta = 0;
  for (const znak of liczby) reszta = (reszta * 10 + Number(znak)) % 97;
  return reszta === 1;
}

export function emailPoprawny(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function telefonPolski(telefon: string): boolean {
  return /^(\+48)?\d{9}$/.test(telefon.replace(/[\s()-]/g, ""));
}

export function telefonDowolny(telefon: string): boolean {
  return /^\+?\d{8,15}$/.test(telefon.replace(/[\s()-]/g, ""));
}

export function kodPocztowy(kod: string): boolean {
  return /^\d{2}-\d{3}$/.test(kod.trim());
}

export function vatUePoprawny(identyfikator: string, kraj: string): boolean {
  const numer = identyfikator.replace(/[\s.-]/g, "").toUpperCase();
  const kod = kraj.trim().toUpperCase();
  return kod.length === 2 && kod !== "PL" && numer.startsWith(kod) && /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(numer);
}

export function pierwszyBlad(bledy: Bledy): string {
  return Object.values(bledy)[0] ?? "";
}

export function bledyFirmy(firma: Firma): Bledy {
  const bledy: Bledy = {};
  if (!firma.nazwa.trim()) bledy.nazwa = "Wpisz nazwę.";
  if (!firma.ulica.trim()) bledy.ulica = "Wpisz ulicę.";
  if (!firma.miasto.trim()) bledy.miasto = "Wpisz miasto.";
  if (!kodPocztowy(firma.kod)) bledy.kod = "Kod pocztowy ma format 00-000.";
  if (!emailPoprawny(firma.email)) bledy.email = "E-mail ma zawierać nazwę i domenę.";
  if (!telefonPolski(firma.telefon)) bledy.telefon = "Telefon ma 9 cyfr, na przykład 889 599 088.";
  if (firma.rodzaj === "spolka" && !firma.nip.trim()) bledy.nip = "Spółka musi mieć NIP z 10 cyfr.";
  else if (firma.nip.trim() && !nipPoprawny(firma.nip)) bledy.nip = "NIP ma 10 cyfr. Ostatnia to cyfra kontrolna.";
  if (!nrbPoprawny(firma.rachunek)) bledy.rachunek = "Rachunek ma 26 cyfr.";
  if (firma.kodUrzedu.trim() && !kodUrzeduPoprawny(firma.kodUrzedu)) bledy.kodUrzedu = "Nie ma takiego kodu urzędu. Kraków-Podgórze to 1210, spółki w Krakowie często mają 1207.";
  if (firma.dataUrodzenia.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(firma.dataUrodzenia.trim())) bledy.dataUrodzenia = "Data urodzenia ma format RRRR-MM-DD.";
  if (firma.mikrorachunek.trim()) {
    const mikro = cyfry(firma.mikrorachunek);
    if (!nrbPoprawny(mikro) || !mikro.startsWith("10100071222", 2)) {
      bledy.mikrorachunek = "Mikrorachunek ma 26 cyfr i od trzeciej cyfry człon 10100071222.";
    }
  }
  return bledy;
}

export function bledyNabywcy(nabywca: Nabywca): Bledy {
  const bledy: Bledy = {};
  if (!nabywca.nazwa.trim()) bledy.nazwa = "Wpisz nazwę nabywcy.";
  if (nabywca.nip.trim() && !nipPoprawny(nabywca.nip)) bledy.nip = "NIP nabywcy ma 10 cyfr. Jak go nie ma, zostaw puste.";
  if (nabywca.email.trim() && !emailPoprawny(nabywca.email)) bledy.email = "E-mail jest niepoprawny. Możesz zostawić puste.";
  if (nabywca.telefon.trim() && !telefonDowolny(nabywca.telefon)) bledy.telefon = "Telefon ma od 8 do 15 cyfr. Możesz zostawić puste.";
  if (nabywca.kod.trim() && !kodPocztowy(nabywca.kod)) bledy.kod = "Kod pocztowy ma format 00-000 albo zostaw puste.";
  return bledy;
}

export function bledyPozycji(pozycje: Pozycja[], typ: TypFaktury): Bledy {
  const bledy: Bledy = {};
  if (!pozycje.length) bledy.pozycje = "Dodaj pozycję.";
  pozycje.forEach((pozycja, i) => {
    if (!pozycja.nazwa.trim()) bledy[`pozycja-${i}`] = "Każda pozycja potrzebuje nazwy.";
    if (!Number.isFinite(pozycja.ilosc) || pozycja.ilosc === 0) bledy[`ilosc-${i}`] = "Ilość nie może być zerem.";
    if (!Number.isFinite(pozycja.cenaNetto)) bledy[`cena-${i}`] = "Wpisz cenę netto.";
    if (typ !== "korekta" && pozycja.cenaNetto < 0) bledy[`cena-${i}`] = "Ujemna cena jest tylko na korekcie.";
  });
  return bledy;
}

export function bledyKosztu(dane: {
  rodzaj: RodzajKosztu;
  dostawca: string;
  identyfikator: string;
  kraj: string;
  numer: string;
  netto: number;
  vatNaFakturze: number;
}): Bledy {
  const bledy: Bledy = {};
  if (!dane.dostawca.trim()) bledy.dostawca = "Wpisz dostawcę.";
  if (!dane.numer.trim()) bledy.numer = "Wpisz numer dokumentu.";
  if (!/^[A-Za-z]{2}$/.test(dane.kraj.trim())) bledy.kraj = "Kraj to dwie litery, na przykład PL, IE albo US.";
  if (!Number.isFinite(dane.netto) || dane.netto <= 0) bledy.netto = "Kwota netto ma być większa od zera.";
  if (dane.rodzaj === "kraj") {
    if (dane.kraj.trim().toUpperCase() !== "PL") bledy.kraj = "Koszt krajowy ma kraj PL.";
    if (!nipPoprawny(dane.identyfikator)) bledy.identyfikator = "Polski dostawca ma NIP z 10 cyfr.";
    if (!Number.isFinite(dane.vatNaFakturze) || dane.vatNaFakturze < 0) bledy.vatNaFakturze = "VAT z faktury nie może być ujemny.";
  }
  if (dane.rodzaj === "ue" && !vatUePoprawny(dane.identyfikator, dane.kraj)) {
    bledy.identyfikator = "Wpisz numer VAT UE razem z krajem, na przykład IE6388047V.";
  }
  if (dane.rodzaj === "poza_ue" && dane.kraj.trim().toUpperCase() === "PL") {
    bledy.kraj = "Dostawca spoza Unii nie ma kraju PL.";
  }
  return bledy;
}
