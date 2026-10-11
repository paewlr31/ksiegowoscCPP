export const PODSTAWA_ZWOLNIENIA =
  "Sprzedawca zwolniony z podatku od towarów i usług na podstawie art. 113 ust. 1 i 9 ustawy z dnia 11 marca 2004 r. o podatku od towarów i usług (zwolnienie podmiotowe ze względu na nieprzekroczenie limitu obrotów w ramach działalności nierejestrowanej).";

export type TypFaktury = "proforma" | "zaliczkowa" | "koncowa" | "korekta";

export type Pozycja = {
  nazwa: string;
  ilosc: number;
  cenaNetto: number;
};

export type Firma = {
  nazwa: string;
  forma: string;
  ulica: string;
  kod: string;
  miasto: string;
  email: string;
  telefon: string;
  nip: string;
  rachunek: string;
  platnikVat: boolean;
  podstawaZwolnienia: string;
  kodUrzedu: string;
  mikrorachunek: string;
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

export type Baza = {
  firma: Firma;
  faktury: Faktura[];
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
    ulica: "ul. Wacława Lipińskiego 9/6",
    kod: "30-349",
    miasto: "Kraków",
    email: "paewlr31@gmail.com",
    telefon: "889 599 088",
    nip: "",
    rachunek: "39 1140 2004 0000 3302 8341 9061",
    platnikVat: false,
    podstawaZwolnienia: PODSTAWA_ZWOLNIENIA,
    kodUrzedu: "",
    mikrorachunek: "",
  };
}

export function pustyNabywca(): Nabywca {
  return { nazwa: "", nip: "", ulica: "", kod: "", miasto: "", email: "", telefon: "" };
}
