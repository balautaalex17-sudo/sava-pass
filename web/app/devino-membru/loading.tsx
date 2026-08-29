export default function MembershipLoading() {
  return (
    <main
      className="apply-route-loading"
      role="status"
      aria-live="polite"
      aria-label="Se încarcă pagina Devino membru"
    >
      <i className="apply-route-loading__progress" aria-hidden="true" />
      <section className="apply-route-loading__hero" aria-hidden="true">
        <div className="apply-route-loading__copy">
          <i className="apply-route-loading__eyebrow" />
          <i className="apply-route-loading__title" />
          <i className="apply-route-loading__title apply-route-loading__title--short" />
          <i className="apply-route-loading__line" />
          <i className="apply-route-loading__line apply-route-loading__line--short" />
        </div>
        <i className="apply-route-loading__media" />
      </section>
      <style>{`
        .apply-route-loading{min-height:100svh;padding:76px clamp(16px,5vw,56px) 0;overflow:hidden;background:#fff;color:#0f172a}.apply-route-loading__progress{position:fixed;z-index:72;top:0;left:0;width:34vw;max-width:180px;height:2px;background:#00a7e8;will-change:transform;animation:apply-route-loading-progress 720ms linear infinite}.apply-route-loading__hero{display:grid;width:min(1120px,100%);margin:0 auto;padding:clamp(72px,10vw,122px) 0;grid-template-columns:minmax(0,1fr) minmax(320px,.9fr);gap:clamp(48px,8vw,100px);align-items:center}.apply-route-loading__copy{display:grid;gap:14px}.apply-route-loading__copy i{display:block;background:#e8edf2}.apply-route-loading__eyebrow{width:86px;height:9px}.apply-route-loading__title{width:min(100%,520px);height:clamp(36px,5vw,58px)}.apply-route-loading__title--short{width:68%}.apply-route-loading__line{width:min(92%,440px);height:12px;margin-top:12px}.apply-route-loading__line--short{width:66%;margin-top:0}.apply-route-loading__media{display:block;min-height:440px;background:#eef2f6}@keyframes apply-route-loading-progress{from{transform:translate3d(-110%,0,0)}to{transform:translate3d(420%,0,0)}}@media(max-width:820px){.apply-route-loading{padding:68px 14px 0}.apply-route-loading__hero{padding:64px 0;grid-template-columns:1fr;gap:38px}.apply-route-loading__media{min-height:340px}.apply-route-loading__title{height:42px}}@media(prefers-reduced-motion:reduce){.apply-route-loading__progress{width:42%;animation:none}}
      `}</style>
    </main>
  );
}
