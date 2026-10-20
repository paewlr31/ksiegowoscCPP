export const PODSTAWA_ZWOLNIENIA =
  "Sprzedawca zwolniony z podatku od towarów i usług na podstawie art. 113 ust. 1 i 9 ustawy z dnia 11 marca 2004 r. o podatku od towarów i usług (zwolnienie podmiotowe ze względu na nieprzekroczenie limitu obrotów w ramach działalności nierejestrowanej).";

export type TypFaktury = "proforma" | "zaliczkowa" | "koncowa" | "korekta";

export type StawkaVat = 23 | 8 | 5 | 0 | "zw" | "ue";

export type Pozycja = {
  nazwa: string;
  ilosc: number;
  cenaNetto: number;
  stawka?: StawkaVat;
};

export type RodzajDzialalnosci = "nierejestrowana" | "spolka";
export type WielkoscCit = "mala" | "duza";

export type Firma = {
  nazwa: string;
  forma: string;
  rodzaj: RodzajDzialalnosci;
  cit: WielkoscCit;
  ulica: string;
  kod: string;
  miasto: string;
  email: string;
  telefon: string;
  nip: string;
  rachunek: string;
  platnikVat: boolean;
  vatRecznie: boolean;
  podstawaZwolnienia: string;
  kodUrzedu: string;
  mikrorachunek: string;
  dataUrodzenia: string;
};

export type Nabywca = {
  nazwa: string;
  nip: string;
  ulica: string;
  kod: string;
  miasto: string;
  email: string;
  telefon: string;
};

export type Faktura = {
  id: string;
  numer: string;
  typ: TypFaktury;
  dataWystawienia: string;
  dataSprzedazy: string;
  terminPlatnosci: string;
  pozycje: Pozycja[];
  nabywca: Nabywca;
  podstawy: string[];
  koryguje: string | null;
  przyczynaKorekty: string;
  netto: number;
  vat: number;
  brutto: number;
  platnikVat: boolean;
  sprzedawca: Firma;
  ksefNumer: string;
  ksefStatus: string;
  utworzono: string;
};

export type RodzajKosztu = "kraj" | "ue" | "poza_ue";

export type Koszt = {
  id: string;
  data: string;
  numer: string;
  dostawca: string;
  identyfikator: string;
  kraj: string;
  rodzaj: RodzajKosztu;
  opis: string;
  rachunek: string;
  bialaLista: string;
  ksefZakupu: string;
  netto: number;
  vatNaFakturze: number;
  vatNalezny: number;
  vatNaliczony: number;
  kosztCit: number;
  utworzono: string;
};

export type WysylkaJpk = {
  id: string;
  rok: number;
  miesiac: number;
  cel: 1 | 2;
  numerReferencyjny: string;
  kod: number;
  opis: string;
  upo: string;
  utworzono: string;
};

export type Baza = {
  firma: Firma;
  faktury: Faktura[];
  koszty: Koszt[];
  wysylki: WysylkaJpk[];
};

export const ETYKIETA: Record<TypFaktury, string> = {
  proforma: "Proforma",
  zaliczkowa: "Zaliczkowa",
  koncowa: "Końcowa",
  korekta: "Korekta",
};

export function domyslnaFirma(): Firma {
  return {
    nazwa: "Paweł Rycerz",
    forma: "Działalność nierejestrowana",
    rodzaj: "nierejestrowana",
    cit: "duza",
    ulica: "ul. Wacława Lipińskiego 9/6",
    kod: "30-349",
    miasto: "Kraków",
    email: "paewlr31@gmail.com",
    telefon: "889 599 088",
    nip: "",
    rachunek: "39 1140 2004 0000 3302 8341 9061",
    platnikVat: false,
    vatRecznie: false,
    podstawaZwolnienia: PODSTAWA_ZWOLNIENIA,
    kodUrzedu: "",
    mikrorachunek: "",
    dataUrodzenia: "",
  };
}

export function uzupelnijFirme(dane?: Partial<Firma>): Firma {
  const firma: Firma = { ...domyslnaFirma(), ...dane };
  if (dane && dane.vatRecznie === undefined && dane.platnikVat) firma.vatRecznie = true;
  firma.forma = firma.rodzaj === "spolka" ? "Spółka z o.o." : "Działalność nierejestrowana";
  return firma;
}

export function pustyNabywca(): Nabywca {
  return { nazwa: "", nip: "", ulica: "", kod: "", miasto: "", email: "", telefon: "" };
}
