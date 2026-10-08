#pragma once

#include <string_view>

// Test jednej spolki z o.o.
// Token sluzy do faktur w KSeF.
// Program tworzy pliki i podaje, gdzie je recznie wrzucic.
// Przelewow nie wysyla.

namespace ksiegowosc {

inline constexpr std::string_view nip = "1111111111";

namespace ksef {

inline constexpr std::string_view api = "https://api-test.ksef.mf.gov.pl";
inline constexpr std::string_view token =
    "20261008-EC-38CF21F000-6C1B284C8D-67|nip-1111111111|dcc0331fcb744bb1b209bfa1dee441640d150553b2c44278897268d015d992e3";
inline constexpr std::string_view token_nazwa = "CPP Bazior Token";

}  // namespace ksef

namespace przelew {

// Recznie, z rachunku firmy. Ten sam numer dla CIT i VAT.
inline constexpr std::string_view mikrorachunek = "74101000712222111111111100";
inline constexpr std::string_view symbol_cit = "CIT";
inline constexpr std::string_view symbol_cit8 = "CIT-8";
inline constexpr std::string_view symbol_vat = "VAT-7";
inline constexpr int dzien_cit = 20;
inline constexpr int dzien_vat = 25;

}  // namespace przelew

namespace jpk {

// Tu wrzucasz wygenerowane pliki JPK.
inline constexpr std::string_view bramka = "https://test-e-dokumenty.mf.gov.pl";
inline constexpr std::string_view init =
    "https://test-e-dokumenty.mf.gov.pl/api/Storage/InitUploadSigned";
inline constexpr std::string_view finish =
    "https://test-e-dokumenty.mf.gov.pl/api/Storage/FinishUpload";
inline constexpr std::string_view status =
    "https://test-e-dokumenty.mf.gov.pl/api/Storage/Status/";
inline constexpr bool weryfikuj_podpis_kwalifikowany = false;

inline constexpr std::string_view v7m = "JPK_V7M(3)";
inline constexpr std::string_view kr_pd = "JPK_KR_PD";
inline constexpr std::string_view st_kr = "JPK_ST_KR";
inline constexpr std::string_view fa = "JPK_FA";
inline constexpr std::string_view wb = "JPK_WB";
inline constexpr std::string_view mag = "JPK_MAG";

}  // namespace jpk

namespace edeklaracje {

// Tu wrzucasz wygenerowany CIT-8.
inline constexpr std::string_view bramka = "https://test-bramka.edeklaracje.gov.pl";
inline constexpr std::string_view wsdl =
    "https://test-bramka.edeklaracje.gov.pl/uslugi/dokumenty?wsdl";
inline constexpr std::string_view cit8 = "CIT-8";

}  // namespace edeklaracje

namespace biala_lista {

inline constexpr std::string_view api = "https://wl-test.mf.gov.pl";

}  // namespace biala_lista

}  // namespace ksiegowosc
