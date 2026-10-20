#pragma once

// Kwoty w groszach. Ta sama arytmetyka jest w lib/podatki.ts.
// Vercel nie uruchamia tego pliku. Trzyma regułę liczenia.

long long vat_od_procentu_gr(long long netto_gr, int procent);
long long vat_od_netto_gr(long long netto_gr, int platnik_vat);
long long cit_od_przychodu_gr(long long przychod_gr, int procent);
