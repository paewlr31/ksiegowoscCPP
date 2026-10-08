#pragma once

#include <string_view>

// Lista obowiazkow jednej spolki z o.o.
// Rok obrotowy kalendarzowy. VAT miesieczny. Zaliczki CIT miesieczne.
// Kazdy punkt ma odpowiednik w klucze.hpp.
// Gdy termin wypada w sobote, niedziele albo swieto, przesuwa sie na nastepny dzien roboczy.

namespace ksiegowosc {

struct Obowiazek {
    int punkt;
    std::string_view rytm;
    std::string_view co;
    std::string_view termin;
    std::string_view gdzie;
    std::string_view odpowiednik;
    std::string_view kogo_dotyczy;
};

inline constexpr Obowiazek obowiazki[] = {

    {1, "na biezaco",
     "Faktura sprzedazy do KSeF",
     "w dniu wystawienia faktury",
     "KSeF",
     "ksef::api, ksef::token",
     "kazda faktura sprzedazy"},

    {2, "na biezaco",
     "Faktury zakupu z KSeF",
     "na biezaco, pobranie z KSeF",
     "KSeF",
     "ksef::api, ksef::token",
     "kazda faktura zakupu wystawiona na spolke"},

    {3, "na biezaco",
     "Sprawdzenie rachunku dostawcy na bialej liscie",
     "przed przelewem do dostawcy",
     "biala lista VAT",
     "biala_lista::api",
     "przelew do kontrahenta, obowiazkowo od 15 000 zl"},

    {34, "na biezaco",
     "Zapłata za fakture zakupu",
     "termin platnosci z faktury",
     "rachunek podany na fakturze, kwota brutto",
     "przelew::rachunek_dostawcy",
     "kazda faktura zakupu. Najpierw punkt 3"},

    {4, "miesiac",
     "Skladki ZUS oraz deklaracja DRA z zalacznikami RCA, RSA, RPA",
     "do 15. dnia nastepnego miesiaca",
     "PUE ZUS",
     "zus::pue, zus::deklaracja, zus::rachunek_skladkowy",
     "tylko gdy spolka::ma_ubezpieczonych"},

    {5, "miesiac",
     "Wplata do PPK",
     "do 15. dnia nastepnego miesiaca",
     "instytucja finansowa PPK",
     "ppk::instytucja, ppk::dzien",
     "tylko gdy spolka::prowadzi_ppk"},

    {6, "miesiac",
     "Rata podatku od nieruchomosci",
     "do 15. dnia miesiaca. W styczniu deklaracja i rata do 31 stycznia",
     "urzad gminy",
     "nieruchomosc::rachunek, nieruchomosc::deklaracja, nieruchomosc::dzien_raty",
     "tylko gdy spolka::ma_nieruchomosc"},

    {7, "miesiac",
     "Zaliczka na CIT",
     "do 20. dnia nastepnego miesiaca. Za grudzien tez, do 20 stycznia",
     "mikrorachunek, symbol CIT",
     "przelew::mikrorachunek, przelew::symbol_cit, przelew::dzien_cit",
     "zawsze, bo spolka::zaliczki_cit sa miesieczne"},

    {8, "miesiac",
     "Zaliczki na PIT pobrane od wynagrodzen",
     "do 20. dnia nastepnego miesiaca",
     "mikrorachunek, symbol PIT-4",
     "przelew::mikrorachunek, przelew::symbol_pit, przelew::dzien_cit",
     "tylko gdy spolka jest platnikiem PIT"},

    {9, "miesiac",
     "Plik JPK_V7M(3)",
     "do 25. dnia nastepnego miesiaca",
     "bramka JPK",
     "jpk::bramka, jpk::v7m",
     "zawsze, bo spolka::rozliczenie_vat jest miesieczne"},

    {10, "miesiac",
     "Zapłata VAT",
     "do 25. dnia nastepnego miesiaca",
     "mikrorachunek, symbol VAT-7",
     "przelew::mikrorachunek, przelew::symbol_vat, przelew::dzien_vat",
     "gdy z JPK_V7M wychodzi kwota do zaplaty"},

    {11, "miesiac",
     "Informacja VAT-UE",
     "do 25. dnia nastepnego miesiaca",
     "bramka e-Deklaracje",
     "edeklaracje::bramka, edeklaracje::vat_ue",
     "tylko w miesiacu z transakcja wewnatrz UE"},

    {12, "kwartal",
     "Zaliczka na CIT kwartalna",
     "do 20. dnia miesiaca po kwartale",
     "mikrorachunek, symbol CIT",
     "przelew::mikrorachunek, przelew::symbol_cit, przelew::dzien_cit",
     "nie dotyczy, dopoki spolka::zaliczki_cit sa miesieczne"},

    {13, "kwartal",
     "JPK_V7K i zaplata VAT kwartalnego",
     "ewidencja co miesiac do 25. Deklaracja i zaplata do 25. dnia miesiaca po kwartale",
     "bramka JPK i mikrorachunek, symbol VAT-7K",
     "jpk::v7k, przelew::symbol_vat_kwartal, przelew::dzien_vat",
     "nie dotyczy, dopoki spolka::rozliczenie_vat jest miesieczne"},

    {14, "rok",
     "PIT-4R",
     "do 31 stycznia",
     "bramka e-Deklaracje",
     "edeklaracje::bramka, edeklaracje::pit4r",
     "gdy w poprzednim roku spolka pobierala zaliczki PIT"},

    {15, "rok",
     "PIT-11",
     "do urzedu do 31 stycznia. Osobie, ktorej dotyczy, do konca lutego",
     "bramka e-Deklaracje oraz przekazanie podatnikowi",
     "edeklaracje::bramka, edeklaracje::pit11",
     "gdy byli pracownicy albo zleceniobiorcy"},

    {16, "rok",
     "PIT-8AR",
     "do 31 stycznia",
     "bramka e-Deklaracje",
     "edeklaracje::bramka, edeklaracje::pit8ar",
     "tylko gdy spolka pobierala zryczaltowany podatek dochodowy"},

    {17, "rok",
     "Deklaracja DN-1 na podatek od nieruchomosci",
     "do 31 stycznia",
     "urzad gminy",
     "nieruchomosc::deklaracja, nieruchomosc::gdzie, nieruchomosc::dzien_deklaracji_styczen",
     "tylko gdy spolka::ma_nieruchomosc"},

    {18, "rok",
     "Sporządzenie sprawozdania finansowego",
     "do 31 marca. To jeszcze nie jest wysylka",
     "zostaje w spolce do zatwierdzenia",
     "krs::e_sprawozdanie",
     "zawsze. Wysylka jest w punkcie 25"},

    {19, "rok",
     "Zeznanie CIT-8",
     "do 31 marca",
     "bramka e-Deklaracje",
     "edeklaracje::bramka, edeklaracje::cit8",
     "zawsze"},

    {20, "rok",
     "Doplata CIT z zeznania",
     "do 31 marca",
     "mikrorachunek, symbol CIT-8",
     "przelew::mikrorachunek, przelew::symbol_cit8",
     "gdy po zaliczkach zostaje kwota do zaplaty"},

    {21, "rok",
     "IFT-2R",
     "do 31 marca",
     "bramka e-Deklaracje",
     "edeklaracje::bramka, edeklaracje::ift2r",
     "tylko gdy spolka wyplacala naleznosci podmiotom zagranicznym"},

    {22, "rok",
     "ORD-U",
     "do 31 marca",
     "bramka e-Deklaracje",
     "edeklaracje::bramka, edeklaracje::ord_u",
     "tylko po przekroczeniu progu umow z nierezydentami"},

    {23, "rok",
     "Sprawozdanie o stosowanych terminach zaplaty",
     "do 30 kwietnia",
     "minister wlasciwy do spraw gospodarki",
     "zatory::gdzie, zatory::dzien, zatory::miesiac",
     "tylko gdy spolka::duzy_podatnik i spolka jest w zestawieniu ministra finansow"},

    {24, "rok",
     "Zgromadzenie wspolnikow zatwierdza sprawozdanie i decyduje o zysku albo stracie",
     "do 30 czerwca",
     "uchwaly wspolnikow, jeszcze nie wysylka",
     "krs::uchwala_zatwierdzenie, krs::uchwala_podzial",
     "zawsze. Do KRS ida w punkcie 25"},

    {25, "rok",
     "Pakiet do KRS",
     "15 dni od daty uchwaly. Gdy uchwala jest 30 czerwca, termin mija 15 lipca",
     "e-KRS, repozytorium dokumentow finansowych",
     "krs::portal, krs::e_sprawozdanie, krs::uchwala_zatwierdzenie, krs::uchwala_podzial, krs::sprawozdanie_z_dzialalnosci, krs::sprawozdanie_z_badania, krs::dni_od_zatwierdzenia",
     "zawsze. Mala i mikrojednostka moze pominac sprawozdanie z dzialalnosci, jesli dane sa w informacji dodatkowej. Sprawozdanie bieglego tylko gdy bylo badanie"},

    {26, "rok",
     "JPK_KR_PD",
     "do 31 lipca przy roku kalendarzowym",
     "bramka JPK",
     "jpk::bramka, jpk::kr_pd",
     "duzy podatnik: juz za rok 2025. Zwykla spolka z miesiecznym JPK_V7M: pierwszy raz za rok 2026, do 31 lipca 2027"},

    {27, "rok",
     "JPK_ST_KR",
     "razem z JPK_KR_PD",
     "bramka JPK",
     "jpk::bramka, jpk::st_kr",
     "razem z punktem 26"},

    {28, "rok",
     "TPR-C",
     "do 30 listopada przy roku kalendarzowym",
     "bramka e-Deklaracje",
     "edeklaracje::bramka, edeklaracje::tpr_c",
     "tylko po przekroczeniu progow cen transferowych"},

    {29, "rok",
     "Badanie sprawozdania przez bieglego rewidenta",
     "przed zatwierdzeniem",
     "wynik wchodzi do pakietu KRS",
     "krs::sprawozdanie_z_badania",
     "tylko gdy spolka przekroczy co najmniej dwa z trzech progow ustawy o rachunkowosci"},

    {30, "na zadanie",
     "JPK_FA, JPK_WB albo JPK_MAG",
     "w terminie z wezwania urzedu",
     "bramka JPK",
     "jpk::bramka, jpk::fa, jpk::wb, jpk::mag",
     "tylko na zadanie urzedu skarbowego"},

    {31, "po zdarzeniu",
     "Zgloszenie albo zmiana beneficjenta w CRBR",
     "14 dni od wpisu do KRS albo od zmiany danych",
     "CRBR",
     "crbr::portal, crbr::dni",
     "przy zalozeniu spolki i przy kazdej zmianie danych objetej rejestrem"},

    {32, "po zdarzeniu",
     "PCC-3",
     "14 dni od czynnosci",
     "bramka e-Deklaracje. Podatek na rachunek do PCC",
     "edeklaracje::pcc3, pcc::rachunek, pcc::dni",
     "tylko gdy powstanie czynnosc cywilnoprawna, na przyklad zmiana umowy albo pozyczka"},

    {33, "po zdarzeniu",
     "Wniosek o zmiane wpisu w KRS",
     "po zmianie zarzadu, umowy, adresu albo kapitalu",
     "Portal Rejestrow Sadowych",
     "krs::portal",
     "tylko gdy dane w rejestrze sie zmienia"},

    {35, "po zdarzeniu",
     "Zryczaltowany PIT od dywidendy dla osoby fizycznej",
     "do 20. dnia miesiaca nastepnego po miesiacu wyplaty",
     "mikrorachunek, symbol PIT-8A",
     "przelew::mikrorachunek, przelew::symbol_pit8a, przelew::dzien_cit",
     "tylko gdy wyplacono dywidende osobie fizycznej. Roczne zestawienie to PIT-8AR, punkt 16"},

    {36, "po zdarzeniu",
     "Podatek u zrodla od wyplaty dla spolki zagranicznej",
     "do 7. dnia miesiaca nastepnego po miesiacu pobrania podatku",
     "mikrorachunek, symbol CIT-10Z",
     "przelew::mikrorachunek, przelew::symbol_cit10z, przelew::dzien_wht",
     "tylko gdy pobrano podatek od naleznosci dla osoby prawnej bez siedziby w Polsce"},

    {37, "rok",
     "CIT-10Z",
     "do 31 stycznia",
     "bramka e-Deklaracje",
     "edeklaracje::bramka, edeklaracje::cit10z",
     "tylko gdy w poprzednim roku pobrano podatek u zrodla od osob prawnych"},

    {38, "rok",
     "IFT-1R",
     "do konca lutego. Na wniosek podatnika zagranicznego takze IFT-1, w 14 dni od wniosku",
     "bramka e-Deklaracje oraz przekazanie podatnikowi",
     "edeklaracje::bramka, edeklaracje::ift1r",
     "tylko gdy wyplacono naleznosci osobie fizycznej bez miejsca zamieszkania w Polsce"},

    {39, "po zdarzeniu",
     "NIP-8, dane uzupelniajace i rachunki bankowe",
     "21 dni od wpisu do KRS. Aktualizacja w 7 dni od zmiany, takze od otwarcia rachunku",
     "urzad skarbowy. Rachunku VAT sie nie zglasza",
     "nip8::formularz, nip8::gdzie, nip8::dni_od_wpisu_krs, nip8::dni_aktualizacja",
     "przy rejestracji spolki i przy kazdej zmianie rachunku albo danych uzupelniajacych. Od tego zalezy biala lista"},

};

}  // namespace ksiegowosc
