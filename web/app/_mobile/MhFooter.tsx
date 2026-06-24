import { MhGear } from "./MhGear";

// Footer — brand line, links grouped with hairline dividers (not cards), legal.
export function MhFooter() {
  return (
    <footer className="mh-foot" id="mh-arhiva">
      <div className="mh-foot__brand">
        <MhGear size={26} style={{ color: "var(--mh-cyan)" }} />
        SavaPass
      </div>
      <p className="mh-foot__tag">
        Biletele oficiale ale serilor Interact Sf. Sava. Cumperi online, intri cu o scanare.
      </p>
      <nav className="mh-foot__links">
        <a href="#mh-eveniment">Evenimentul curent</a>
        <a href="/devino-membru">Devino membru</a>
        <a href="/conta">Biletele mele</a>
        <a href="/login">Staff</a>
      </nav>
      <div className="mh-foot__legal">
        <span>Interact Sf. Sava</span>
        <span>© {new Date().getFullYear()} SavaPass</span>
      </div>
    </footer>
  );
}
