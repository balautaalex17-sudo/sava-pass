import { Mail } from "lucide-react";

// lucide-react dropped brand icons; inline IG/FB at the lucide stroke style.
function IgIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

/**
 * Shared club-register footer (spec §6.5). The catch-all that lets the top nav
 * stay short. Dark, hairline dividers, mono © line.
 */
export function SiteFooter() {
  return (
    <footer className="cl-footer">
      <div className="cl-footer__inner">
        <div>
          <p className="cl-footer__desc">
            Clubul de voluntariat Interact Sf. Sava — proiecte, evenimente și oameni care schimbă comunitatea.
          </p>
        </div>
        <div className="cl-footer__col">
          <h4>Urmărește-ne</h4>
          <div className="cl-footer__socials">
            <a href="https://instagram.com/interact.sfsava" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IgIcon /></a>
            <a href="https://facebook.com/interactsfsava" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FbIcon /></a>
            <a href="mailto:membri@interactsava.ro" aria-label="Email"><Mail size={20} strokeWidth={1.75} /></a>
          </div>
        </div>
      </div>
      <div className="cl-footer__base">© {new Date().getFullYear()} Interact Sf. Sava · SavaPass</div>
    </footer>
  );
}
