"use client";

export default function InterviewsError({ reset }: { reset: () => void }) {
  return (
    <div className="dash-page">
      <header className="dash-page-head"><div><h1>Evaluarea candidaților</h1></div></header>
      <div className="dash-card dash-empty" role="alert">
        <strong>Datele nu au putut fi încărcate</strong>
        <p>Verifică conexiunea și încearcă din nou.</p>
        <button type="button" className="dash-button" onClick={reset}>Reîncearcă</button>
      </div>
    </div>
  );
}
