import { LegalPage } from "@/components/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de confidențialitate — SavaPass",
  description: "Cum colectează și folosește SavaPass (Interact Sf. Sava) datele tale personale, conform GDPR.",
};

export default function ConfidentialitatePage() {
  return (
    <LegalPage title="Politica de confidențialitate" lastUpdated="28 iunie 2026">
      <p>
        Această politică explică ce date personale colectăm prin SavaPass, de ce, cui le transmitem și ce
        drepturi ai, conform Regulamentului General privind Protecția Datelor (GDPR).
      </p>

      <h2>Operatorul de date</h2>
      <p>
        Operatorul datelor este <strong>Interact Sf. Sava</strong> (clubul de elevi al Liceului „Sfântul Sava”,
        București). Pentru orice întrebare legată de datele tale, scrie la{" "}
        <a href="mailto:membri@interactsava.ro">membri@interactsava.ro</a>.
      </p>

      <h2>Ce date colectăm</h2>
      <ul>
        <li><strong>La cumpărarea biletului:</strong> numele și adresa de email.</li>
        <li><strong>La aplicația de membru:</strong> nume, email, telefon, clasa/liceul, motivația, direcțiile de interes și disponibilitatea.</li>
        <li><strong>La intrarea în eveniment:</strong> momentul scanării biletului (check-in).</li>
        <li><strong>Plata:</strong> se face cash; SavaPass nu colectează și nu stochează date de card.</li>
      </ul>

      <h2>Scopuri și temei legal</h2>
      <ul>
        <li>Emiterea, livrarea biletului și accesul la eveniment — <strong>executarea contractului</strong>.</li>
        <li>Procesarea aplicațiilor de membru — <strong>consimțământul</strong> tău.</li>
        <li>Comunicări legate de biletul sau evenimentul tău — executarea contractului / interes legitim.</li>
      </ul>

      <h2>Cui transmitem datele</h2>
      <p>Folosim furnizori (împuterniciți) care prelucrează datele doar la instrucțiunile noastre:</p>
      <ul>
        <li><strong>Resend</strong> — trimiterea emailurilor (biletul, confirmarea aplicației);</li>
        <li><strong>Supabase</strong> — găzduirea bazei de date;</li>
        <li><strong>Vercel</strong> — găzduirea aplicației.</li>
      </ul>
      <p>Nu vindem datele tale și nu le folosim pentru publicitate către terți.</p>

      <h2>Cât păstrăm datele</h2>
      <p>
        Păstrăm datele comenzilor și biletelor cât este necesar pentru evidențe și pentru desfășurarea
        evenimentului. Aplicațiile de membru sunt păstrate pe durata sesiunii de recrutare și apoi șterse sau
        anonimizate. Ne poți cere ștergerea oricând (vezi mai jos).
      </p>

      <h2>Drepturile tale</h2>
      <p>Conform GDPR, ai dreptul la:</p>
      <ul>
        <li>acces la datele tale și o copie a lor;</li>
        <li>rectificarea datelor incorecte;</li>
        <li>ștergerea datelor („dreptul de a fi uitat”);</li>
        <li>restricționarea sau opoziția la prelucrare;</li>
        <li>portabilitatea datelor;</li>
        <li>retragerea consimțământului, oricând, fără a afecta prelucrarea anterioară;</li>
        <li>o plângere la <strong>ANSPDCP</strong> (Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal).</li>
      </ul>
      <p>Îți exerciți drepturile scriindu-ne la <a href="mailto:membri@interactsava.ro">membri@interactsava.ro</a>.</p>

      <h2>Cookie-uri</h2>
      <p>
        Folosim doar cookie-uri esențiale (de sesiune și autentificare pentru staff). Nu folosim cookie-uri de
        marketing sau de analiză terță, deci nu este nevoie de un banner de consimțământ.
      </p>

      <h2>Modificări</h2>
      <p>Putem actualiza această politică; versiunea curentă este mereu pe această pagină, cu data de mai sus.</p>

      <p className="legal-note">
        Notă: text orientativ, nu consultanță juridică. Confirmă operatorul de date exact, adresa de contact și
        perioadele de păstrare, și cere o verificare juridică înainte de lansare.
      </p>
    </LegalPage>
  );
}
