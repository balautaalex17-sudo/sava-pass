# Galeria comunității

Pagina `/conta/galerie` este accesibilă tuturor conturilor autentificate, inclusiv recruților fără profil de membru. Linkul apare în cont și în meniurile membrilor și board-ului.

## Utilizare

1. Un membru activ din board sau un administrator deschide galeria și apasă **Conectează Google Drive**.
2. Alege contul Google al clubului și aprobă accesul. SavaPass creează automat folderul privat **SavaPass - Galerie**. Niciun alt utilizator nu trebuie să se conecteze la Google.
3. Orice utilizator autentificat poate adăuga mai multe fotografii, cu o descriere opțională. Toate conturile pot vedea și descărca pozele.
4. Autorul poate elimina pozele proprii; board-ul și administratorii pot modera toate pozele. Originalele eliminate ajung în coșul Drive.
5. Board-ul și administratorii pot apăsa **Elimină contul**, apoi confirma deconectarea. Se elimină doar conexiunea și autorizația salvată în SavaPass, fără ștergerea pozelor din Drive sau a evidenței lor din galerie. Confirmarea este legată de conexiunea afișată, ca să nu elimine un cont reconectat între timp.

După deconectare, galeria are nevoie de un cont cu acces la originale pentru a afișa sau descărca fotografiile. Un alt cont Google nu primește automat acest acces. Conectarea după eliminare poate crea un folder nou pentru încărcările viitoare; fotografiile vechi rămân în folderul original. Butonul nu revocă celelalte permisiuni Google acordate aplicației.

Nu există limită suplimentară de mărime sau redimensionare în aplicație. Se aplică limitele furnizorului și spațiul disponibil în contul Drive. Fișierele acceptate sunt JPG, PNG, WebP, AVIF, HEIC și HEIF. Unele formate pot avea temporar doar descărcare, până când Google generează previzualizarea.

## Configurare privată

Proiectul Google Cloud dedicat este `savapass-galerie`; clientul web este `SavaPass Galerie web`. Drive API este activat, permisiunea `drive.file` este salvată, iar autorizarea Google este în modul **In production**, pentru a permite board-ului să aleagă contul clubului fără înscriere pe o listă de testeri. Clientul identifică aplicația. Drive-ul care păstrează pozele aparține contului autorizat ulterior de board, nu contului care a înregistrat aplicația.

Variabile strict pe server:

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_TOKEN_KEY`: cheie aleatorie de 32 de octeți, în base64, stabilă pentru fiecare mediu. Nu o înlocui fără să recriptezi autorizația salvată sau să reconectezi același cont.
- `NEXT_PUBLIC_SITE_URL`: originea exactă a mediului, folosită la întoarcerea din Google.

Cheile Google sunt salvate în fișierele private `.env.local` și `../active/.env.staging`, cu chei de criptare diferite. Aceste fișiere sunt ignorate de Git. Din 6 septembrie 2026, cele trei setări Google sunt configurate și ca secrete Vercel pentru producție, fără a fi incluse în cod sau în variabile `NEXT_PUBLIC_*`.

Adrese de întoarcere înregistrate pentru client:

- `http://localhost:3000/api/gallery/drive/callback`
- `https://sava-pass-staging.vercel.app/api/gallery/drive/callback`
- `https://www.interactsfsava.com/api/gallery/drive/callback`

Google Drive API trebuie activat, cu permisiunea `https://www.googleapis.com/auth/drive.file`. Ecranul de autorizare trebuie disponibil pentru contul ales de board. În modul Google Testing, accesul este limitat la testeri, iar autorizațiile offline pot expira după șapte zile. Configurarea OAuth și modificările aplicației sunt două lucruri distincte: înregistrarea clientului Google nu publică site-ul.

## Funcționare și limite practice

- Baza Supabase păstrează evidența pozelor și o singură conexiune Drive. Autorizația Google este criptată cu AES-256-GCM; tabelul conexiunii nu poate fi citit direct de utilizatori.
- Încărcarea începe pe server, apoi browserul trimite originalul direct la o sesiune Drive limitată la un fișier. Bucățile au 2 MiB; fișierul complet poate fi mai mare. Tokenul Google nu ajunge în browser.
- După transfer, serverul verifică autorul, folderul, identificatorul, tipul, mărimea și semnătura fișierului înainte să îl publice în galerie. Cererea de publicare este criptată și legată de utilizator; repetarea ei nu dublează fotografia.
- **Reîncearcă** continuă din octeții confirmați de Drive, inclusiv după o eroare de rețea. Dacă doar publicarea eșuează, fotografia nu este încărcată din nou. Fișierul selectat și sesiunea de reluare se păstrează cât timp pagina rămâne deschisă. Sesiunile Drive expirate sunt pornite din nou.
- Previzualizările și originalele sunt servite prin rute autentificate, cu `private, no-store`. Originalele se transmit treptat, fără citirea integrală în memoria serverului. Descărcările rămân supuse duratei maxime a găzduirii și conexiunii, iar ruta acceptă cereri Range.
- Fotografiile și datele originale din fișier se păstrează nemodificate. Nu se creează linkuri publice în Drive.
- O încărcare abandonată după terminarea transferului, dar înainte de publicare, poate lăsa un fișier privat nelistat în folder. Board-ul îl poate elimina din Drive. Nu șterge din Drive originalele publicate dacă dorești să rămână disponibile în aplicație.
- Reconectarea păstrează folderul și acceptă numai același cont Google. Transferul galeriei într-un alt cont este o operațiune separată, pentru a evita pierderea accesului la pozele existente.

## Verificare

Migrările `20260906163015_private_community_gallery.sql` și `20260906164119_gallery_google_drive.sql` sunt aplicate în staging (`eetuijxhkpaqggegppek`) și, din 6 septembrie 2026, în producție (`shzyvrojbtbczqqoilip`). Prima reprezintă structura inițială; a doua o mută pe Drive și elimină limita de 10 MB. Migrarea se oprește dacă găsește poze în vechea structură, pentru a nu pierde date. Bucket-ul privat inițial rămâne gol și nefolosit.

Verificări izolate, fără acces la producție:

```powershell
node --import tsx --test tests/gallery.test.ts tests/gallery-actions.test.mjs
npm run typecheck
npm run build
```

`tests/gallery-database.sql` verifică în staging accesul unui recrut fără profil, al membrilor și board-ului, blocarea vizitatorilor și izolarea autorizației Google. Toate datele de test sunt anulate prin `ROLLBACK`.

Verificarea de browser folosește componenta reală, cu răspunsuri Google și acțiuni de server simulate: 12 verificări la 1440 px și 390 px, fișier de 13 MiB, reluarea publicării fără retransmisie, descărcare, ștergere și lipsa conexiunii. Dovezile locale sunt în `active/gallery-verification/`.

Contul Google al clubului nu a fost autorizat în această implementare, conform cerinței ca board-ul să îl conecteze din aplicație. Testul final cu acel cont este: board conectează contul clubului, recrut încarcă o poză, alt cont o vede, iar un vizitator neautentificat primește refuz.

Documentație: [încărcări reluabile](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [permisiunea Drive pentru fișierele aplicației](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [OAuth pentru aplicații web](https://developers.google.com/identity/protocols/oauth2/web-server).
