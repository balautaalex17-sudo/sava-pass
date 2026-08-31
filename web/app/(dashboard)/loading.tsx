export default function DashboardLoading() {
  return (
    <div
      className="dash-page dash-page--member"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Portal membri</span>
          <h1>Pregătim spațiul tău…</h1>
          <p>Încărcăm întâlnirile, codul QR și prezența.</p>
        </div>
      </header>
      <section className="dash-card dash-empty">
        <strong>Doar un moment</strong>
        Datele tale sunt verificate în siguranță.
      </section>
    </div>
  );
}
