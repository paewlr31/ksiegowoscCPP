import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(zadanie: Request) {
  const url = new URL(zadanie.url);
  const nip = (url.searchParams.get("nip") ?? "").replace(/\D/g, "");
  const rachunek = (url.searchParams.get("rachunek") ?? "").replace(/\D/g, "");
  const data = url.searchParams.get("data") || new Date().toISOString().slice(0, 10);
  if (!/^\d{10}$/.test(nip)) return NextResponse.json({ blad: "Do białej listy podaj polski NIP." }, { status: 400 });
  const odpowiedz = await fetch(`https://wl-test.mf.gov.pl/api/search/nip/${nip}?date=${data}`, {
    headers: { Accept: "application/json" },
  });
  const dane = await odpowiedz.json().catch(() => null);
  if (!odpowiedz.ok || !dane?.result?.subject) {
    return NextResponse.json({
      status: "brak",
      opis: dane?.message || "Testowa biała lista nie ma tego NIP. To nie znaczy, że na produkcji go nie ma.",
    });
  }
  const podmiot = dane.result.subject;
  const konta: string[] = podmiot.accountNumbers ?? [];
  const rachunekJest = rachunek ? konta.includes(rachunek) : null;
  const opis = [
    `${podmiot.name || "Podmiot"} jest na testowej białej liście: ${podmiot.statusVat || "bez statusu"}.`,
    rachunekJest === null ? "Rachunku nie sprawdzałem, bo go nie wpisałeś." : "",
    rachunekJest === true ? "Wpisany rachunek jest na liście." : "",
    rachunekJest === false ? "Wpisanego rachunku nie ma na liście. Przed przelewem powyżej 15 000 zł sprawdź to jeszcze raz." : "",
  ].filter(Boolean).join(" ");
  return NextResponse.json({
    status: podmiot.statusVat || "brak",
    nazwa: podmiot.name || "",
    rachunekJest,
    opis,
  });
}
