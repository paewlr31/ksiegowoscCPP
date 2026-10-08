#pragma once

#include <string_view>

// Test jednej spolki z o.o.
// Jedyny klucz API to token KSeF. Reszta to adresy, nazwy formularzy i symbole przelewow.
// Program tworzy pliki. Spolka wrzuca je recznie i przelewy robi recznie.
// Lista terminow jest w obowiazki.hpp. Tu sa odpowiedniki techniczne.

namespace ksiegowosc {

inline constexpr std::string_view nip = "1111111111";

namespace spolka {

inline constexpr std::string_view rozliczenie_vat = "miesieczne";
inline constexpr std::string_view zaliczki_cit = "miesieczne";
inline constexpr bool ma_ubezpieczonych = false;
inline constexpr bool prowadzi_ppk = false;
inline constexpr bool ma_nieruchomosc = false;
inline constexpr bool duzy_podatnik = false;

}  // namespace spolka

namespace ksef {

inline constexpr std::string_view api = "https://api-test.ksef.mf.gov.pl";
inline constexpr std::string_view token =
    "20261008-EC-38CF21F000-6C1B284C8D-67|nip-1111111111|dcc0331fcb744bb1b209bfa1dee441640d150553b2c44278897268d015d992e3";
inline constexpr std::string_view token_nazwa = "CPP Bazior Token";

}  // namespace ksef

namespace przelew {

// CIT, VAT i zaliczki PIT placa ida na jeden mikrorachunek. Rozni je symbol.
inline constexpr std::string_view mikrorachunek = "74101000712222111111111100";
inline constexpr std::string_view symbol_cit = "CIT";
inline constexpr std::string_view symbol_cit8 = "CIT-8";
inline constexpr std::string_view symbol_vat = "VAT-7";
inline constexpr std::string_view symbol_vat_kwartal = "VAT-7K";
inline constexpr std::string_view symbol_pit = "PIT-4";
inline constexpr std::string_view symbol_pit8a = "PIT-8A";
inline constexpr std::string_view symbol_cit10z = "CIT-10Z";
inline constexpr std::string_view rachunek_dostawcy = "rachunek podany na fakturze zakupu";
inline constexpr int dzien_cit = 20;
inline constexpr int dzien_vat = 25;
inline constexpr int dzien_wht = 7;

}  // namespace przelew

namespace jpk {

inline constexpr std::string_view bramka = "https://test-e-dokumenty.mf.gov.pl";
inline constexpr std::string_view init =
    "https://test-e-dokumenty.mf.gov.pl/api/Storage/InitUploadSigned";
inline constexpr std::string_view finish =
    "https://test-e-dokumenty.mf.gov.pl/api/Storage/FinishUpload";
inline constexpr std::string_view status =
    "https://test-e-dokumenty.mf.gov.pl/api/Storage/Status/";
inline constexpr bool weryfikuj_podpis_kwalifikowany = false;

inline constexpr std::string_view v7m = "JPK_V7M(3)";
inline constexpr std::string_view v7k = "JPK_V7K(3)";
inline constexpr std::string_view kr_pd = "JPK_KR_PD";
inline constexpr std::string_view st_kr = "JPK_ST_KR";
inline constexpr std::string_view fa = "JPK_FA";
inline constexpr std::string_view wb = "JPK_WB";
inline constexpr std::string_view mag = "JPK_MAG";

}  // namespace jpk

namespace edeklaracje {

inline constexpr std::string_view bramka = "https://test-bramka.edeklaracje.gov.pl";
inline constexpr std::string_view wsdl =
    "https://test-bramka.edeklaracje.gov.pl/uslugi/dokumenty?wsdl";

inline constexpr std::string_view cit8 = "CIT-8";
inline constexpr std::string_view vat_ue = "VAT-UE";
inline constexpr std::string_view pit4r = "PIT-4R";
inline constexpr std::string_view pit11 = "PIT-11";
inline constexpr std::string_view pit8ar = "PIT-8AR";
inline constexpr std::string_view ift2r = "IFT-2R";
inline constexpr std::string_view ord_u = "ORD-U";
inline constexpr std::string_view tpr_c = "TPR-C";
inline constexpr std::string_view pcc3 = "PCC-3";
inline constexpr std::string_view cit10z = "CIT-10Z";
inline constexpr std::string_view ift1r = "IFT-1R";

}  // namespace edeklaracje

namespace biala_lista {

inline constexpr std::string_view api = "https://wl-test.mf.gov.pl";

}  // namespace biala_lista

namespace zus {

inline constexpr std::string_view pue = "https://www.zus.pl/pue";
inline constexpr std::string_view deklaracja = "DRA";
inline constexpr std::string_view zalacznik_rca = "RCA";
inline constexpr std::string_view zalacznik_rsa = "RSA";
inline constexpr std::string_view zalacznik_rpa = "RPA";
inline constexpr int dzien = 15;
// ZUS nadaje numer platnikowi. Sandboxu ani klucza API nie ma.
inline constexpr std::string_view rachunek_skladkowy = "nadaje ZUS, nie ma sandboxu";

}  // namespace zus

namespace ppk {

inline constexpr int dzien = 15;
// Instytucje wybiera spolka. Tu jej nie ma.
inline constexpr std::string_view instytucja = "brak, spolka nie prowadzi PPK";

}  // namespace ppk

namespace nieruchomosc {

inline constexpr std::string_view deklaracja = "DN-1";
inline constexpr std::string_view gdzie = "urzad gminy wlasciwy dla nieruchomosci";
inline constexpr int dzien_raty = 15;
inline constexpr int dzien_deklaracji_styczen = 31;
inline constexpr std::string_view rachunek = "rachunek gminy, nie mikrorachunek";

}  // namespace nieruchomosc

namespace krs {

inline constexpr std::string_view portal = "https://prs.ms.gov.pl";
inline constexpr std::string_view e_sprawozdanie = "e-sprawozdanie finansowe XML";
inline constexpr std::string_view uchwala_zatwierdzenie = "uchwala o zatwierdzeniu sprawozdania";
inline constexpr std::string_view uchwala_podzial = "uchwala o podziale zysku lub pokryciu straty";
inline constexpr std::string_view sprawozdanie_z_dzialalnosci = "sprawozdanie z dzialalnosci";
inline constexpr std::string_view sprawozdanie_z_badania = "sprawozdanie bieglego rewidenta";
inline constexpr int dni_od_zatwierdzenia = 15;

}  // namespace krs

namespace crbr {

inline constexpr std::string_view portal = "https://crbr.podatki.gov.pl";
inline constexpr int dni = 14;

}  // namespace crbr

namespace pcc {

inline constexpr std::string_view formularz = "PCC-3";
inline constexpr int dni = 14;
inline constexpr std::string_view rachunek =
    "rachunek urzedu skarbowego do PCC z wykazu KAS, nie mikrorachunek";

}  // namespace pcc

namespace nip8 {

inline constexpr std::string_view formularz = "NIP-8";
inline constexpr std::string_view gdzie = "urzad skarbowy";
inline constexpr int dni_od_wpisu_krs = 21;
inline constexpr int dni_aktualizacja = 7;

}  // namespace nip8

namespace zatory {

inline constexpr std::string_view gdzie = "https://www.biznes.gov.pl/pl/portal/ou125";
inline constexpr int dzien = 30;
inline constexpr int miesiac = 4;

}  // namespace zatory

}  // namespace ksiegowosc
