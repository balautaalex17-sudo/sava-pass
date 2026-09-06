# Prezență și motivarea absențelor

- `/board/prezenta`: tabel pe ședință, cu alegerea ședinței.
- `/board/prezenta?view=member`: istoricul unei persoane active, cu alegerea membrului.
- `/board/prezenta?view=requests`: toate cererile în așteptare, pentru Board și Super Admin.
- `/membru/prezenta`: membrul trimite cererea și vede decizia, motivul trimis și răspunsul board-ului.

Tabelul permite căutare fără diacritice, sortare după nume sau data ședinței în ambele sensuri și filtre pentru prezențe, absențe, absențe motivate și cereri în așteptare. CSV-ul folosește aceleași filtre și aceeași sortare; nu exportă motivele private.

O absență apare după închiderea intervalului de prezență sau după încheierea explicită a ședinței. Ședințele anulate și ciornele nu produc absențe. Fiecare membru poate trimite o singură cerere pentru o ședință. Cererea are 10–2000 de caractere; răspunsul board-ului este opțional și are maximum 1000.

Deciziile sunt definitive pentru acea cerere. O cerere acceptată afișează „Absent motivat” fără să creeze o prezență. Rata de prezență rămâne rata participării efective. Corectarea ulterioară a prezenței are prioritate în afișare; cererea și decizia rămân în istoric.

Membrul vede doar propriile motive. Board și Super Admin pot citi și soluționa cererile, dar nu pe cele proprii. Dreptul de corectare a prezenței nu acordă automat dreptul de a decide motivări. Scrierile se fac prin funcții accesibile numai serverului, care verifică din nou actorul și starea absenței. Trimiterea și decizia sunt auditate; motivele nu se duplică în audit.

## Activare

Migrarea `supabase/migrations/20260906160416_attendance_absence_requests.sql` este aplicată pe staging (`eetuijxhkpaqggegppek`) și, din 6 septembrie 2026, pe producție (`shzyvrojbtbczqqoilip`). Actualizarea structurii a precedat publicarea codului; datele existente de prezență au fost păstrate.

Fișierul local `active/.env.staging` conține un placeholder pentru cheia serverului. Pentru verificarea completă cu aplicația conectată la staging este necesară o cheie validă furnizată doar în mediul serverului, fără modificarea fișierului de producție.

## Verificări

- `node --import tsx --test tests/attendance.test.ts`: reguli de stare, sortare, filtre, validarea cererilor și rolurile de review; fără conexiune la bază.
- `tests/attendance-database.sql`: executat manual exclusiv în mediul de test, într-o tranzacție anulată la final. Verifică trimitere, duplicate, aprobare, respingere, blocarea propriei cereri, cereri devenite nevalide, audit, accesul serverului și confidențialitatea între membri. Nu executa în producție.
- Componentele React au fost verificate în browser cu acțiuni simulate, la 1440px și 390px: validare, erori de conexiune, cerere, decizie, sortare, filtre, parametrii CSV, drepturi și corecții. Aceasta nu înlocuiește verificarea întregii aplicații conectate la staging.
- Verificările TypeScript, lint pe fișierele schimbate și build-ul aplicației au trecut.

După configurarea conexiunii staging: trimite o cerere dintr-un cont de membru, accept-o sau respinge-o din alt cont Board, apoi verifică starea în istoricul membrului și CSV. Verifică și navigarea pe persoană/ședință în aplicația completă.
