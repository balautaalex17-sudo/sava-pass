# SavaPass staging

## Medii separate

| Componentă | Staging | Producție |
|---|---|---|
| Aplicație | `https://staging.interactsfsava.com` | `https://www.interactsfsava.com` |
| Vercel project | `nexuswork/sava-pass-staging` | `nexuswork/sava-pass` |
| Supabase ref | `eetuijxhkpaqggegppek` | `shzyvrojbtbczqqoilip` |
| Plăți | Cash only | Cash only |
| Email | Destinatarul introdus la cumpărare | Destinatar real |

Nicio variabilă Stripe nu trebuie adăugată în staging.

## Protecții

- Staging folosește alt proiect Supabase și alt proiect Vercel.
- Testele refuză automat ref-ul Supabase de producție.
- `EMAIL_TEST_RECIPIENT` rămâne opțional pentru testări izolate; dacă este setat, înlocuiește orice destinatar real și elimină `replyTo`.
- Linkurile din email folosesc domeniul Interact, iar `_dmarc.mail.interactsfsava.com` publică politica sigură `p=none`.
- Toate datele demonstrative sunt marcate `[STAGING]` sau folosesc domenii rezervate pentru test.
- Intrarea rapidă publică pentru rolurile staff rămâne dezactivată.
- Cheile și parolele nu sunt în Git. Accesul local este în `../active/staging-credentials.md`.

Vercel Password Protection nu este disponibil pe echipa curentă. Din acest motiv, paginile publice pot fi accesate prin URL, dar nu conțin date reale; panourile și acțiunile rămân protejate prin Supabase Auth și permisiuni.

## Date incluse

`supabase/seed.staging.sql` poate fi rulat repetat și pregătește:

- un eveniment activ cash și un eveniment arhivat;
- două tipuri de bilet, standard și gratuit;
- campania și formularul oficial de recrutare deschise pentru test;
- trei aplicații: completă, programată la interviu și incompletă;
- o perioadă, două sloturi și un interviu;
- conținut demonstrativ pentru echipă, proiecte, sponsori, impact și contact.

## Pregătire locală sigură

Rulează comenzile din directorul `web/`:

```powershell
npx.cmd --yes vercel@latest env pull ..\active\.env.staging --environment=production --project sava-pass-staging --scope nexuswork --yes
npm.cmd run verify:staging-env
npm.cmd run seed:staff-test:staging
npm.cmd run seed:interviewer-examples:staging
npm.cmd run seed:demo:staging
npm.cmd run test:staging
npm.cmd run test:browser:staging
npm.cmd run test:roles:staging
npm.cmd run test:live-flows:staging
npm.cmd run stress:staging
```

Fișierul `active/.env.staging` este ignorat de Git. Nu înlocui `.env.local`, deoarece acesta aparține mediului local existent.

## Deploy

```powershell
npx.cmd --yes vercel@latest deploy --prod --yes --project sava-pass-staging --scope nexuswork
```

După deploy, verifică mai întâi `npm run verify:staging-env`, apoi rulează testele automate și checklistul manual din PDF.

## Testele reale prin interfață

`npm run test:live-flows:staging` deschide stagingul într-un browser real și verifică:

- rezervarea unui bilet cash și avertismentul de plată neconfirmată;
- formularul complet de recrutare, salvarea lui și confirmarea fără pagină publică de status;
- formularul de contact și salvarea mesajului;
- autentificarea Board;
- blocarea intrării înainte de plată, confirmarea cash, prima intrare și respingerea scanării duplicate;
- starea finală din baza de date, erorile din consolă și cererile de rețea eșuate.

Testul păstrează un singur bilet, o aplicație și un mesaj marcate `E2E`, astfel încât să poată fi inspectate manual în dashboard. Parolele și cheia de serviciu sunt cerute securizat și nu sunt scrise în raport.

## Testul de stres

`npm run stress:staging` rulează exclusiv pe ref-ul de staging și refuză orice variabilă Stripe. Testul folosește tokenuri QR semnate real, apelează aceeași funcție atomică de check-in și introduce formularele direct în baza de date, pentru ca testul de volum să nu trimită sute de emailuri.

- maximum 1.000 operații QR și 1.000 formulare pe rulare;
- 80% QR-uri unice și 20% duplicate;
- 500 aplicații de recrutare și 500 mesaje de contact;
- concurență limitată și timeout pe fiecare cerere;
- capacitatea evenimentului este mărită temporar, apoi restaurată;
- toate datele de stres sunt șterse după test, iar numărul de rânduri rămase trebuie să fie zero.

## Rezultate verificate la 27 august 2026

- teste de integrare: **65/65**;
- pagini și formulare publice în browser: **40/40**;
- autentificare și permisiuni: **4/4 roluri**;
- fluxuri reale cash, formulare și QR: **15/15**, fără erori în consolă sau cereri eșuate;
- stres QR: **1.000 operații**, 800 acceptate și 200 duplicate respinse, p95 **94,7 ms**, debit **304,45 operații/s**;
- stres formulare: **1.000 salvări**, toate reușite, p95 **69,7 ms** pentru recrutare și **59,8 ms** pentru contact, debit total **361,38 operații/s**;
- curățare: zero rânduri de stres rămase și capacitatea evenimentului restaurată la **120**.

Testarea formularului a descoperit și corectat calculul de completare pentru datele personale. O aplicație completă este acum marcată **100% / completă** în Board.

Rapoarte locale:

- `active/stress-results/staging-5bb610b6-7210-4a82-a13b-29e66a56aa56.json`
- `active/staging-browser/live-flows/5bc3e553-report.json`

## Reîmprospătarea datelor

Pentru datele demonstrative standard, rulează din nou `supabase/seed.staging.sql` în SQL Editor-ul proiectului de staging. Scriptul actualizează aceleași UUID-uri și nu creează duplicate.

Nu reseta și nu șterge proiectul de producție. Ref-ul permis pentru testele distructive este exclusiv `eetuijxhkpaqggegppek`.
