# Conturi de recrut

Contul de recrut se acordă după **acceptarea finală în club**. Trimiterea
formularului și selecția pentru interviu nu creează un astfel de profil.

## Flux

1. Board → Interviuri → acceptă candidatul. Ambele ecrane de administrare
   folosesc aceeași operație de acceptare.
2. Se creează sau se reutilizează contul Auth pentru emailul original din formular.
   Un profil nou primește `membership_status = 'recruit'` și `role = null`.
3. Conturile neactivate primesc pe email codul existent de 12 cifre, pentru o
   singură activare, apoi își aleg parola. Un cont confirmat păstrează parola
   și primește notificarea acceptării cu linkul de autentificare.
4. Recrutul ajunge la `/conta/recrut`, cu acces la galerie și biletele proprii.
   Galerie foto permite vizualizare și încărcare după conectarea Drive de către board.
5. Board → Membri → Editează → Statut în club → Membru activ → Salvează.
   Promovarea păstrează contul, parola și fotografiile și acordă accesul de bază al membrilor.

## Permisiuni pentru recruți

Super Admin → Roluri și permisiuni include coloana **Recrut**, înainte de Membru.
Implicit, recruții păstrează galeria și biletele proprii. Super Admin poate activa
funcții suplimentare fără să schimbe statutul contului; acestea apar în
„Instrumentele clubului” din pagina recrutului și se verifică la fiecare acces.
Retragerea unei permisiuni închide accesul pe server, inclusiv dintr-un link salvat.
Administrarea membrilor, a rolurilor și a permisiunilor nu poate fi delegată recruților.

Grupul `recruit` din `role_permissions` este ales după `membership_status`.
Nu moștenește regulile `member` sau roluri operaționale vechi. Excepțiile individuale
sunt respectate, iar conturile suspendate rămân blocate. QR-ul unui recrut poate
fi scanat numai dacă are permisiunea `display_member_qr`.

Board poate și crea manual un cont cu statutul Recrut sau poate retrimite codul
din butonul „Cod nou”. Acțiunea este protejată pe server. Recrutul nu se poate
promova singur, administra alți utilizatori sau conecta contul Google al clubului.

## Consistență și acces

`accept_recruit_application` salvează profilul, acceptarea, încheierea interviului
și istoricul într-o singură tranzacție. Verifică etapa, emailul Auth și dreptul
actorului. Poate fi apelată numai de server (`service_role`).

Codul de activare se emite numai după câștigarea acceptării. O cerere concurentă
care pierde nu poate invalida codul trimis de prima. Dacă livrarea emailului
eșuează, profilul rămâne salvat și board poate retrimite codul. Un răspuns
incert al bazei nu determină ștergerea unui cont care are deja profil.

Conturile deja active își păstrează statutul, rolul și datele. Conturile
inactive, suspendate sau alumni nu sunt reactivate automat prin înscriere;
se administrează separat din Membri. Candidații acceptați înainte de această
modificare nu sunt retrogradați automat la recrut.

## Fișiere principale

- `lib/dashboard/recruit-account.ts`: pregătirea contului și invitația după acceptare.
- `app/(dashboard)/board/inscrieri/actions.ts`: acțiunile board pentru recrutare.
- `app/(dashboard)/board/membri/`: creare, promovare și retrimiterea codului.
- `app/conta/recrut/`: pagina recrutului.
- `lib/dashboard/member-auth.ts`, `lib/member-invitation-email.ts`: invitația reutilizabilă.
- `supabase/migrations/20260906175014_recruit_accounts.sql`: noul statut și tranzacția.

## Verificare și publicare

Migrarea este aplicată în staging (`eetuijxhkpaqggegppek`) și, din 6 septembrie
2026, în producție (`shzyvrojbtbczqqoilip`), înainte de publicarea codului.

Verificări fără conturi sau emailuri reale:

```sh
node --import tsx --test tests/recruit-accounts.test.mjs tests/member-invitation-email.test.ts tests/recruitment-manual-selection.test.ts
npm run build
npm run lint
```

`tests/recruit-accounts-database.sql` rulează **numai în staging/local**, creează
date fictive și încheie cu ROLLBACK. Acoperă tranzacția, cererile repetate,
păstrarea conturilor existente, email nepotrivit, etapă invalidă,
accesul real RLS la galerie și interdicția de auto-promovare.

Verificarea în browser folosește componentele reale cu servicii simulate:
pagina recrutului la 1440/390 px, linkurile către galerie/bilete, retrimiterea
codului, promovarea din administrare și activarea cu parolă. Dovezi locale în
`active/recruit-verification/`. Testele nu înlocuiesc livrarea unui email real.

După publicare: acceptă o înscriere de test, verifică primirea codului și
activarea reală, apoi promovează recrutul și verifică accesul de membru.

Rezultat local: 14 teste automate și 10 verificări de browser trecute; build
reușit. Lint fără erori, cu trei avertismente în fișiere fără legătură cu
conturile de recrut. Verificarea de securitate staging nu a adăugat alerte noi.
