"use client";

export default function OperationalTeamError({ reset }: { reset: () => void }) {
  return <div className="dash-page"><div className="dash-card dash-empty"><strong>Echipa nu a putut fi încărcată</strong><span>Verifică rețeaua și încearcă din nou.</span><button type="button" className="dash-button" onClick={reset}>Reîncearcă</button></div></div>;
}
