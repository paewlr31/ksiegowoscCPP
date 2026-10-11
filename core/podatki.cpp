#include "podatki.hpp"

long long vat_od_netto_gr(long long netto_gr, int platnik_vat) {
    if (!platnik_vat || netto_gr == 0) return 0;
    long long znak = netto_gr < 0 ? -1 : 1;
    long long abs = netto_gr < 0 ? -netto_gr : netto_gr;
    return znak * ((abs * 23 + 50) / 100);
}

long long cit_od_przychodu_gr(long long przychod_gr, int procent) {
    if (przychod_gr <= 0 || procent <= 0) return 0;
    return (przychod_gr * procent + 50) / 100;
}
