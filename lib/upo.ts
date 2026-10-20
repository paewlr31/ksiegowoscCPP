export type CzytelneUpo = {
  przyjeto: boolean;
  kto: string;
  numer: string;
  formularz: string;
  struktura: string;
  nip: string;
  urzad: string;
  rok: string;
  miesiac: string;
  data: string;
  cel: string;
};

function pole(blok: string, nazwa: string): string {
  const znalezione = blok.match(new RegExp(`<${nazwa}>([^<]*)</${nazwa}>`));
  return znalezione?.[1]?.trim() ?? "";
}

export function czytajUpo(xml: string): CzytelneUpo | null {
  const blok = xml.match(/<Potwierdzenie\b[^>]*>([\s\S]*?)<\/Potwierdzenie>/);
  if (!blok) return null;
  const tresc = blok[1];
  const rok = pole(tresc, "RokCD") || pole(tresc, "RokCE");
  const miesiac = pole(tresc, "MiesiacCD") || pole(tresc, "MiesiacCE");
  return {
    przyjeto: pole(tresc, "Przyjeto") === "true",
    kto: pole(tresc, "NazwaPodmiotuPrzyjmujacego"),
    numer: pole(tresc, "NumerReferencyjny"),
    formularz: pole(tresc, "KodFormularza"),
    struktura: pole(tresc, "NazwaStrukturyLogicznej"),
    nip: pole(tresc, "NIP1"),
    urzad: pole(tresc, "KodUrzedu"),
    rok,
    miesiac,
    data: pole(tresc, "DataWplyniecia"),
    cel: pole(tresc, "CelZlozenia") === "2" ? "korekta" : "złożenie",
  };
}

export function formatujWplyw(wartosc: string): string {
  const data = new Date(wartosc);
  if (Number.isNaN(data.getTime())) return wartosc;
  return data.toLocaleString("pl-PL", { dateStyle: "long", timeStyle: "short" });
}
