import { Mail, MapPin } from "lucide-react";
import { ClubPage } from "@/components/club/ClubPage";
import { ClubHero } from "@/components/club/ClubHero";
import { ContactForm } from "@/components/club/ContactForm";
import type { Metadata } from "next";

// lucide-react dropped brand icons (Instagram/Facebook not exported) — inline SVG
// at the lucide stroke style, same as SiteFooter.
function IgIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const metadata: Metadata = {
  title: "Contact — Interact Sf. Sava",
  description: "Scrie-ne: colaborări, parteneriate sau orice întrebare despre club.",
};

export default function ContactPage() {
  const hero = (
    <ClubHero
      variant="index"
      lines={[<>Scrie-ne despre un proiect.</>]}
      lead="Spune-ne dacă ai o idee de colaborare, vrei să susții un eveniment sau ai o întrebare despre club."
    />
  );

  return (
    <ClubPage active="contact" hero={hero}>
      <section className="cl-section">
        <div className="cl-contact">
          <div className="cl-contact__form">
            <ContactForm />
          </div>
          <aside className="cl-contact__aside">
            <div className="cl-contact__item">
              <Mail size={18} strokeWidth={1.75} />
              <a href="mailto:membri@interactsava.ro">membri@interactsava.ro</a>
            </div>
            <div className="cl-contact__item">
              <MapPin size={18} strokeWidth={1.75} />
              <span>Colegiul Național „Sfântul Sava”, București</span>
            </div>
            <div className="cl-contact__item">
              <IgIcon />
              <a href="https://instagram.com/interact.sfsava" target="_blank" rel="noopener noreferrer">@interact.sfsava</a>
            </div>
          </aside>
        </div>
      </section>
    </ClubPage>
  );
}
