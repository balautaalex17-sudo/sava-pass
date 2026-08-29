import { LegalPage } from "@/components/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termeni și condiții — SavaPass",
  description: "Termenii și condițiile pentru achiziția de bilete SavaPass — Interact Sf. Sava.",
};

export default function TermeniPage() {
  return (
    <LegalPage title="Termeni și condiții" lastUpdated="28 iunie 2026">
      <p>
        Acești termeni se aplică achiziției și folosirii biletelor prin SavaPass, platforma de
        bilete a clubului <strong>Interact Sf. Sava</strong>. Cumpărând un bilet, ești de acord cu ei.
      </p>

      <h2>Cine organizează</h2>
      <p>
        Evenimentele sunt organizate de Interact Sf. Sava (clubul de elevi al Liceului „Sfântul Sava”,
        București), prin platforma SavaPass. Organizatorul este vânzătorul biletelor.
      </p>

      <h2>Biletele</h2>
      <p>
        Un bilet SavaPass dă acces unei persoane la evenimentul indicat pe bilet. Fiecare bilet are un
        cod QR unic și un cod scurt de 6 caractere. Biletul este personal; nu îl revinde la un preț mai mare.
      </p>

      <h2>Preț și plată</h2>
      <p>
        Prețurile sunt afișate în lei (RON) și includ orice taxe aplicabile. Plata se face exclusiv cash,
        la punctul comunicat de organizator. Rezervarea și codul QR nu confirmă automat plata.
      </p>

      <h2>Livrarea biletului</h2>
      <p>
        După rezervare primești codul QR pe email și îl poți accesa oricând în aplicație. Pentru biletele cu
        plată, accesul devine valid numai după ce organizatorul confirmă încasarea cash.
      </p>

      <h2>Accesul la eveniment</h2>
      <p>
        La intrare prezinți codul QR, care este scanat de echipa organizatoare. <strong>Fiecare bilet poate fi
        folosit o singură dată</strong>: după prima scanare validă, biletul devine „folosit” și nu mai permite o nouă intrare.
      </p>

      <h2>Bilete de invitație</h2>
      <p>
        Organizatorul poate emite bilete gratuite (invitații sau bilete de test). Acestea respectă aceleași
        reguli de acces ca biletele cumpărate.
      </p>

      <h2>Rambursări și anulări</h2>
      <p>
        Dacă evenimentul este anulat de organizator, biletele se rambursează integral. În alte situații,
        rambursarea se face conform politicii organizatorului — scrie-ne înainte de eveniment dacă ai o problemă.
      </p>

      <h2>Comportament la eveniment</h2>
      <p>
        Organizatorul poate refuza sau întrerupe accesul în caz de comportament necorespunzător sau periculos,
        fără rambursare.
      </p>

      <h2>Răspundere</h2>
      <p>
        În limitele permise de lege, răspunderea organizatorului legată de un bilet se limitează la valoarea
        plătită pentru acel bilet.
      </p>

      <h2>Modificări</h2>
      <p>
        Putem actualiza acești termeni. Versiunea curentă este mereu disponibilă pe această pagină, cu data
        ultimei actualizări de mai sus.
      </p>

      <h2>Contact</h2>
      <p>
        Întrebări despre bilete sau evenimente: <a href="mailto:membri@interactsava.ro">membri@interactsava.ro</a>.
      </p>

      <p className="legal-note">
        Notă: acest text este o variantă practică, nu consultanță juridică. Înainte de lansare, confirmă
        entitatea/organizatorul exact, adresa de contact și politica de rambursare, și — dacă e posibil — cere o
        verificare juridică.
      </p>
    </LegalPage>
  );
}
