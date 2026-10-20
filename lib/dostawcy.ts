import type { RodzajKosztu } from "./typy";

export type ZnanyDostawca = {
  id: string;
  nazwa: string;
  rodzaj: RodzajKosztu;
  kraj: string;
  dostawca: string;
  identyfikator: string;
  opis: string;
  podpowiedz: string;
};

export const DOSTAWCY: ZnanyDostawca[] = [
  {
    id: "olx",
    nazwa: "OLX",
    rodzaj: "kraj",
    kraj: "PL",
    dostawca: "Grupa OLX sp. z o.o.",
    identyfikator: "7792433421",
    opis: "Reklama OLX",
    podpowiedz: "Polski NIP. Na fakturze jest polski VAT.",
  },
  {
    id: "oferteo",
    nazwa: "Oferteo",
    rodzaj: "kraj",
    kraj: "PL",
    dostawca: "Oferteo S.A.",
    identyfikator: "8992693475",
    opis: "Ogłoszenie Oferteo",
    podpowiedz: "Polski NIP. Na fakturze jest polski VAT.",
  },
  {
    id: "google",
    nazwa: "Google Ads",
    rodzaj: "ue",
    kraj: "IE",
    dostawca: "Google Ireland Limited",
    identyfikator: "IE6388047V",
    opis: "Google Ads",
    podpowiedz: "To nie jest polski NIP. To irlandzki numer VAT UE.",
  },
  {
    id: "cursor",
    nazwa: "Cursor",
    rodzaj: "poza_ue",
    kraj: "US",
    dostawca: "Anysphere, Inc.",
    identyfikator: "",
    opis: "Cursor AI",
    podpowiedz: "Cursor jest ze Stanów. Nie ma polskiego NIP ani numeru VAT UE. Pole identyfikatora zostaw puste.",
  },
];
