# Księgowość

Aplikacja jednej spółki: dane firmy, faktury, szacunek VAT i CIT, plik JPK_V7M, testowa wysyłka do KSeF.

Baza to Neon (darmowy Postgres). Na komputerze, bez `DATABASE_URL`, dane lecą do `.data/baza.json`.

## GitHub

Ten folder sam z siebie nie jest repozytorium. Podłącz go do istniejącego repozytorium i wypchnij poprawkę.

```powershell
cd C:\Users\pryce\Desktop\studia\CPP
git init
git branch -M main
git add ksiegowosc
git status
git commit -m "Przenies baze z Supabase na Neon"
git remote add origin https://github.com/TWOJ-LOGIN/TWOJE-REPO.git
git pull origin main --rebase
git push -u origin main
```

Jeśli `remote add` powie, że origin już jest, pomiń tę linijkę. Jeśli pull krzyczy, że historie się rozjechały, a na GitHubie jest starsza kopia tego samego programu, użyj `git push -u origin main`.

Nie commituj `.env.local` ani `.data`. Są w `.gitignore`.

## Neon

1. Załóż konto na https://neon.tech (logowanie przez GitHub wystarczy).
2. New Project. Nazwa dowolna, region Europa (np. Frankfurt), Postgres.
3. Wejdź w SQL Editor i wklej całość pliku `db/schema.sql`. Uruchom.
4. Na stronie projektu kliknij Connect. Wybierz connection string **Pooled**. Host ma w nazwie `pooler`.
5. W katalogu `ksiegowosc` zrób plik `.env.local`:

```
DATABASE_URL=postgresql://...pooler...neon.tech/neondb?sslmode=require
```

Hasło jest w tym linku. Nie wklejaj go na czat ani do GitHuba.

## Vercel

1. Import projektu z GitHuba. Root Directory: `ksiegowosc`. Framework: Next.js.
2. Environment Variables, tylko to, co jest potrzebne:
   - `DATABASE_URL` — ten sam pooled link z Neon.
   - `KSEF_TOKEN` — opcjonalnie. Jak puste, program bierze token testowy z `klucze.hpp`, który jedzie razem z kodem.
   - `KSEF_API` — opcjonalnie. Domyślnie jest test: `https://api-test.ksef.mf.gov.pl/api/v2`.
3. Deploy.

Kluczy Supabase już nie dodajesz. Zakładka „Klucze i bramki” pokazuje token KSeF, więc strony nie zostawiaj publicznej.

## Lokalnie

```powershell
cd C:\Users\pryce\Desktop\studia\CPP\ksiegowosc
npm install
npm run dev
```

Potem http://localhost:3000. W nagłówku ma być napis Neon, nie „plik lokalny”.
