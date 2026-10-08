#pragma once

#include <string_view>

// Lista obowiazkow jednej spolki z o.o.
// Rok obrotowy kalendarzowy. VAT miesieczny (JPK_V7M). Zaliczki CIT miesieczne.
// Program pliki tworzy. Spolka wrzuca je recznie i przelewy robi recznie.
// Adresy testowe bramek sa w klucze.hpp.
// Gdy termin wypada w sobote, niedziele albo swieto, przesuwa sie na nastepny dzien roboczy.

namespace ksiegowosc {

struct Obowiazek {
    int punkt;
    std::string_view rytm;
    std::string_view co;
    std::string_view termin;
    std::string_view gdzie;
    std::string_view kogo_dotyczy;
};

inline constexpr Obowiazek obowiazki[] = {

    // --- na biezaco, nie raz w miesiacu ---

    {1, "na biezaco",
     "Faktura sprzedazy do KSeF",
     "w dniu wystawienia faktury",
     "KSeF, token z klucze.hpp",
     "kazda faktura sprzedazy"},

    {2, "na biezaco",
     "Faktury zakupu z KSeF",
     "na biezaco, pobranie z KSeF",
     "KSeF, token z klucze.hpp",
     "kazda faktura zakupu wystawiona na spolke"},

    {3, "na biezaco",
     "Sprawdzenie rachunku dostawcy na bialej liscie",
     "przed przelewem do dostawcy",
     "API bialej listy z klucze.hpp",
     "przelew do kontrahenta, obowiazkowo od 15 000 zl"},

    // --- co miesiac, za miesiac poprzedni ---

    {4, "miesiac",
     "Skladki ZUS oraz deklaracja DRA z zalacznikami RCA, RSA, RPA",
     "do 15. dnia nastepnego miesiaca",
     "PUE ZUS albo program Platnik. Przelew na indywidualny rachunek skladkowy ZUS, nie na mikrorachunek",
     "tylko gdy sa ubezpieczeni: pracownicy, zleceniobiorcy albo wynagrodzenie zarzadu objete ZUS"},

    {5, "miesiac",
     "Wplata do PPK",
     "do 15. dnia nastepnego miesiaca",
     "instytucja finansowa prowadzaca PPK",
     "tylko gdy spolka prowadzi PPK"},

    {6, "miesiac",
     "Rata podatku od nieruchomości",
     "do 15. dnia miesiaca. W styczniu deklaracja DN-1 i rata do 31 stycznia",
     "urzad gminy. To nie jest mikrorachunek podatkowy",
     "tylko gdy spolka ma grunt, budynek albo lokal"},

    {7, "miesiac",
     "Zaliczka na CIT",
     "do 20. dnia nastepnego miesiaca. Za grudzien tez, do 20 stycznia",
     "mikrorachunek z klucze.hpp, symbol CIT. Przelew reczny",
     "zawsze, przy miesiecznych zaliczkach"},

    {8, "miesiac",
     "Zaliczki na PIT pobrane od wynagrodzen",
     "do 20. dnia nastepnego miesiaca",
     "mikrorachunek z klucze.hpp. Przelew reczny",
     "tylko gdy spolka wyplaca wynagrodzenia i jest platnikiem PIT"},

    {9, "miesiac",
     "Plik JPK_V7M(3): ewidencja VAT i deklaracja VAT w jednym pliku",
     "do 25. dnia nastepnego miesiaca",
     "bramka JPK z klucze.hpp. Osobnego formularza VAT-7 juz sie nie sklada",
     "zawsze, bo VAT jest miesieczny"},

    {10, "miesiac",
     "Zapłata VAT",
     "do 25. dnia nastepnego miesiaca",
     "mikrorachunek z klucze.hpp, symbol VAT-7. Przelew reczny. Kwota z JPK_V7M",
     "gdy z pliku wychodzi VAT do zaplaty. Nadwyzka VAT nie jest przelewem"},

    {11, "miesiac",
     "Informacja VAT-UE",
     "do 25. dnia nastepnego miesiaca",
     "bramka e-Deklaracje z klucze.hpp",
     "tylko w miesiacu, w ktorym byla transakcja wewnatrz UE"},

    // --- kwartal: ta spolka tego nie sklada, dopoki VAT i CIT sa miesieczne ---

    {12, "kwartal",
     "Zaliczka na CIT kwartalna",
     "do 20. dnia miesiaca po kwartale",
     "mikrorachunek, symbol CIT",
     "nie dotyczy. Tylko gdy maly podatnik wybrze zaliczki kwartalne"},

    {13, "kwartal",
     "JPK_V7K",
     "ewidencja co miesiac do 25. Deklaracja i zaplata VAT do 25. dnia miesiaca po kwartale",
     "bramka JPK. Przelew VAT na mikrorachunek, symbol VAT-7K",
     "nie dotyczy. Tylko gdy maly podatnik rozlicza VAT kwartalnie"},

    // --- rok. Rozliczenie roku R robi sie w roku nastepnym ---

    {14, "rok",
     "PIT-4R, zbiorcza deklaracja platnika PIT",
     "do 31 stycznia",
     "bramka e-Deklaracje",
     "gdy w poprzednim roku spolka pobierala zaliczki PIT"},

    {15, "rok",
     "PIT-11",
     "do urzedu do 31 stycznia. Osobie, ktorej dotyczy, do konca lutego",
     "bramka e-Deklaracje oraz przekazanie podatnikowi",
     "gdy byli pracownicy albo zleceniobiorcy"},

    {16, "rok",
     "PIT-8AR",
     "do 31 stycznia",
     "bramka e-Deklaracje",
     "tylko gdy spolka pobierala zryczaltowany podatek dochodowy"},

    {17, "rok",
     "Deklaracja DN-1 na podatek od nieruchomości na biezacy rok",
     "do 31 stycznia",
     "urzad gminy",
     "tylko gdy spolka ma nieruchomosc"},

    {18, "rok",
     "Sporządzenie sprawozdania finansowego: bilans, rachunek zyskow i strat, informacja dodatkowa",
     "do 31 marca. To jeszcze nie jest wysylka",
     "zostaje w spolce do zatwierdzenia",
     "zawsze"},

    {19, "rok",
     "Zeznanie CIT-8",
     "do 31 marca. Termin nie czeka na zatwierdzenie sprawozdania",
     "bramka e-Deklaracje z klucze.hpp",
     "zawsze"},

    {20, "rok",
     "Doplata CIT z zeznania albo rozliczenie nadplaty",
     "do 31 marca",
     "mikrorachunek z klucze.hpp, symbol CIT-8. Przelew reczny",
     "gdy po zaliczkach zostaje kwota do zaplaty"},

    {21, "rok",
     "IFT-2R, informacja o naleznosciach wyplacanych nierezydentom",
     "do 31 marca",
     "bramka e-Deklaracje",
     "tylko gdy spolka wyplacala naleznosci podmiotom zagranicznym"},

    {22, "rok",
     "ORD-U, informacja o umowach z nierezydentami",
     "do konca trzeciego miesiaca po roku podatkowym, przy roku kalendarzowym do 31 marca",
     "bramka e-Deklaracje",
     "tylko po przekroczeniu progu umow z nierezydentami"},

    {23, "rok",
     "Sprawozdanie o stosowanych terminach zaplaty",
     "do 30 kwietnia",
     "minister wlasciwy do spraw gospodarki, formularz elektroniczny",
     "tylko gdy przychod spolki przekroczyl 50 mln euro i spolka jest w zestawieniu opublikowanym przez ministra finansow"},

    {24, "rok",
     "Zgromadzenie wspolnikow zatwierdza sprawozdanie i decyduje o zysku albo stracie",
     "do 30 czerwca",
     "uchwaly wspolnikow. Jeszcze nie wysylka do KRS",
     "zawsze"},

    {25, "rok",
     "Pakiet do KRS w ciagu 15 dni od zatwierdzenia sprawozdania",
     "15 dni od daty uchwaly. Gdy uchwala jest 30 czerwca, termin mija 15 lipca",
     "e-KRS, Portal Rejestrow Sadowych, repozytorium dokumentow finansowych. XML e-sprawozdania. Spolka wpisana do KRS nie wysyla tego drugiego razu do urzedu skarbowego",
     "zawsze. W pakiecie: e-sprawozdanie finansowe, uchwala o zatwierdzeniu, uchwala o podziale zysku lub pokryciu straty, sprawozdanie z dzialalnosci, a gdy bylo badanie takze sprawozdanie bieglego. Mala i mikrojednostka moze pominac sprawozdanie z dzialalnosci, jesli wymagane dane sa w informacji dodatkowej"},

    {26, "rok",
     "JPK_KR_PD, ksiega rachunkowa",
     "do konca 7. miesiaca po roku. Przy roku kalendarzowym do 31 lipca",
     "bramka JPK z klucze.hpp",
     "duzy podatnik, przychod powyzej 50 mln euro albo podatkowa grupa kapitalowa: juz za rok 2025, termin 31 lipca 2026. Zwykla spolka z miesiecznym JPK_V7M: pierwszy raz za rok 2026, termin 31 lipca 2027"},

    {27, "rok",
     "JPK_ST_KR, srodki trwale",
     "razem z JPK_KR_PD, do konca 7. miesiaca po roku",
     "bramka JPK z klucze.hpp",
     "razem z punktem 26"},

    {28, "rok",
     "Informacja o cenach transferowych TPR-C",
     "do konca 11. miesiaca po roku podatkowym. Przy roku kalendarzowym do 30 listopada",
     "bramka e-Deklaracje",
     "tylko gdy transakcje z podmiotami powiazanymi przekrocza progi dokumentacji"},

    {29, "rok",
     "Badanie sprawozdania przez bieglego rewidenta",
     "przed zatwierdzeniem sprawozdania",
     "nie jest osobna bramka. Sprawozdanie z badania wchodzi do pakietu KRS z punktu 25",
     "tylko gdy w poprzednim roku spolka przekroczyla co najmniej dwa z trzech progow ustawy o rachunkowosci"},

    // --- tylko gdy urzad poprosi ---

    {30, "na zadanie",
     "JPK_FA, JPK_WB albo JPK_MAG",
     "w terminie z wezwania urzedu",
     "bramka JPK z klucze.hpp",
     "tylko na zadanie urzedu skarbowego"},

    // --- po zdarzeniu, nie w stalym rytmie ---

    {31, "po zdarzeniu",
     "Zgloszenie albo zmiana beneficjenta rzeczywistego w CRBR",
     "14 dni od wpisu do KRS albo od zmiany danych",
     "Centralny Rejestr Beneficjentow Rzeczywistych",
     "przy zalozeniu spolki i przy kazdej zmianie danych objetej rejestrem"},

    {32, "po zdarzeniu",
     "PCC-3, podatek od czynnosci cywilnoprawnych",
     "14 dni od czynnosci, na przyklad zmiany umowy spolki albo pozyczki",
     "bramka e-Deklaracje. Podatek PCC idzie na rachunek do PCC, nie na mikrorachunek CIT i VAT",
     "tylko gdy powstanie taka czynnosc"},

    {33, "po zdarzeniu",
     "Wniosek o zmiane wpisu w KRS",
     "po zmianie zarzadu, umowy, adresu albo kapitalu",
     "Portal Rejestrow Sadowych",
     "tylko gdy dane w rejestrze sie zmienia"},

};

}  // namespace ksiegowosc
