# Prezență și motivarea absențelor

- `/board/prezenta`: tabel pe ședință, cu alegerea ședinței.
- `/board/prezenta?view=member`: istoricul unei persoane active, cu alegerea membrului.
- `/board/prezenta?view=requests`: toate cererile în așteptare, pentru Board și Super Admin.
- `/membru/prezenta`: membrul trimite cererea și vede decizia, motivul trimis și răspunsul board-ului.

Tabelul permite căutare fără diacritice, sortare după nume sau data ședinței în ambele sensuri și filtre pentru prezențe, absențe, absențe motivate și cereri în așteptare. CSV-ul folosește aceleași filtre și aceeași sortare; nu exportă motivele private.

O absență apare la 3 ore după ora de final programată a ședinței (`ends_at + 3 ore`). Până atunci, lipsa confirmării apare ca „Neconfirmat”, inclusiv dacă ședința este marcată „Încheiată” sau intervalul de confirmare s-a închis deja. Un interval de confirmare mai lung nu amână acest termen. De exemplu, finalul la 15:30 produce absențe de la 18:30. Ședințele anulate și ciornele nu produc absențe. Fiecare membru poate trimite o singură cerere pentru o ședință, după același termen de 3 ore. Cererea are 10–2000 de caractere; răspunsul board-ului este opțional și are maximum 1000.

Deciziile sunt definitive pentru acea cerere. O cerere acceptată afișează „Absent motivat” fără să creeze o prezență. Rata de prezență rămâne rata participării efective. Corectarea ulterioară a prezenței are prioritate în afișare; cererea și decizia rămân în istoric.

Membrul vede doar propriile motive. Board și Super Admin pot citi și soluționa cererile, dar nu pe cele proprii. Dreptul de corectare a prezenței nu acordă automat dreptul de a decide motivări. Scrierile se fac prin funcții accesibile numai serverului, care verifică din nou actorul și starea absenței. Trimiterea și decizia sunt auditate; motivele nu se duplică în audit.

## Activare

Migrarea `supabase/migrations/20260906160416_attendance_absence_requests.sql` este aplicată pe staging (`eetuijxhkpaqggegppek`) și, din 6 septembrie 2026, pe producție (`shzyvrojbtbczqqoilip`). Actualizarea structurii a precedat publicarea codului; datele existente de prezență au fost păstrate.

Corecția din 10 septembrie 2026 adaugă `supabase/migrations/20260910153059_attendance_after_meeting_end.sql`: trimiterea și soluționarea motivărilor folosesc termenul `ends_at + 3 ore`. Migrarea este aplicată pe producție (`shzyvrojbtbczqqoilip`), înaintea promovării aplicației, și păstrează prezențele, cererile și permisiunile existente. Numele fișierului corespunde versiunii înregistrate de Supabase; pe staging nu a fost aplicată în această intervenție.

Publicat pe `https://www.interactsfsava.com` din commitul `10004fadb6b359c3e2fdc65e4271410edb49dd33`, peste versiunea live care conține filtrul „Neevaluate de mine”. Deployment: `dpl_6zx79LfHyPFSgtKzdtjHrVo8mEfB`; versiunea anterioară pentru revenire: `dpl_DLoccpigUtVLX48vgiC5rryUUAXH`. Build-ul Vercel și TypeScript au trecut. Verificarea în browser, autentificat, după 18:30 a arătat 40 de prezențe și 24 de absențe pentru ședința din 10 septembrie; verificarea logurilor versiunii noi nu a găsit erori. Cele două funcții de motivare au regula de 3 ore și rămân apelabile numai de server.

Fișierul local `active/.env.staging` conține un placeholder pentru cheia serverului. Pentru verificarea completă cu aplicația conectată la staging este necesară o cheie validă furnizată doar în mediul serverului, fără modificarea fișierului de producție.

## Verificări

- `node --import tsx --test tests/attendance.test.ts`: reguli de stare, sortare, filtre, validarea cererilor și rolurile de review; fără conexiune la bază.
- `tests/attendance-database.test.mjs`: cu `PGLITE_MODULE_PATH` către un motor local `@electric-sql/pglite/dist/index.js`, rulează migrarea și toate aserțiunile SQL într-o bază temporară în memorie. Reproduce eroarea cu regula veche și verifică remedierea, inclusiv imediat înainte și exact la `ends_at + 3 ore`, cu confirmări deja închise sau încă deschise. Dependențele pentru permisiunile generale ale portalului sunt simulate; regulile de motivare sunt cele din migrările reale.
- `tests/attendance-database.sql`: executat manual exclusiv în mediul de test, într-o tranzacție anulată la final. Verifică trimitere, duplicate, aprobare, respingere, blocarea propriei cereri, cereri devenite nevalide, audit, accesul serverului și confidențialitatea între membri. Nu executa în producție.
- Componentele React au fost verificate în browser cu acțiuni simulate, la 1440px și 390px: validare, erori de conexiune, cerere, decizie, sortare, filtre, parametrii CSV, drepturi și corecții. Aceasta nu înlocuiește verificarea întregii aplicații conectate la staging.
- Verificările TypeScript, lint pe fișierele schimbate și build-ul aplicației au trecut.

După configurarea conexiunii staging: trimite o cerere dintr-un cont de membru, accept-o sau respinge-o din alt cont Board, apoi verifică starea în istoricul membrului și CSV. Verifică și navigarea pe persoană/ședință în aplicația completă.
