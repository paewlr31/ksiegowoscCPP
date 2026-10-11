import { promises as fs } from "fs";
import path from "path";

export type KonfiguracjaKsef = {
  api: string;
  token: string;
  nip: string;
  mikrorachunek: string;
};

export async function czytajKsef(): Promise<KonfiguracjaKsef> {
  const tekst = await fs.readFile(path.join(process.cwd(), "klucze.hpp"), "utf8");
  const token =
    process.env.KSEF_TOKEN ||
    tekst.match(/token\s*=\s*"([^"]+)"/)?.[1] ||
    "";
  const nipZTokena = token.match(/nip-(\d{10})/)?.[1] ?? "";
  const nip = nipZTokena || tekst.match(/nip = "(\d{10})"/)?.[1] || "";
  const mikrorachunek = tekst.match(/mikrorachunek = "(\d+)"/)?.[1] ?? "";
  return {
    api: process.env.KSEF_API || "https://api-test.ksef.mf.gov.pl/api/v2",
    token,
    nip,
    mikrorachunek,
  };
}
