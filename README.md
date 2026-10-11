# Księgowość

Aplikacja jednej spółki: dane firmy, faktury, szacunek VAT i CIT, plik JPK_V7M, testowa wysyłka do KSeF.

## Supabase

1. Załóż projekt na https://supabase.com.
2. Wejdź w SQL Editor i wklej całość pliku `supabase/schema.sql`. Uruchom.
3. Wejdź w Project Settings, potem API.
4. Skopiuj Project URL i klucz `service_role`. Klucza `anon` tu nie używaj.
5. W katalogu `ksiegowosc` zrób plik `.env.local`:

```
SUPABASE_URL=https://twoj-projekt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=twoj-service-role
```

Bez tych dwóch zmiennych program trzyma dane w pliku `.data/baza.json` na twoim komputerze. Na Vercelu taki plik się nie zachowa, więc tam Supabase jest potrzebny.

## Vercel

1. Wypchnij katalog na GitHuba albo w Vercelu wybierz import tego folderu.
2. Root Directory ustaw na `ksiegowosc`.
3. Framework: Next.js. Build: `npm run build`.
4. W Settings, potem Environment Variables, dodaj te same dwie zmienne co wyżej: `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY`.
5. `KSEF_TOKEN` możesz zostawić puste. Program czyta token testowy z `klucze.hpp`.
6. Deploy.

Zakładka „Klucze i bramki” pokazuje token. Nie ustawiaj tej strony jako publicznej.

## Lokalnie

```
cd ksiegowosc
npm install
npm run dev
```

Potem otwórz http://localhost:3000.
