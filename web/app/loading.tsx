export default function Loading() {
  return (
    <main className="sp-loading" role="status" aria-live="polite" aria-label="SavaPass se încarcă">
      <div className="sp-loading__status">
        <span>Se încarcă…</span>
        <i className="sp-loading__track" aria-hidden="true"><i /></i>
      </div>
      <style>{`
        .sp-loading{min-height:100dvh;display:grid;place-content:center;background:#070a12;color:#eaf4fb}.sp-loading__status{display:grid;justify-items:center;gap:10px;opacity:0;animation:sp-loading-appear 160ms cubic-bezier(.23,1,.32,1) 100ms forwards}.sp-loading__status>span{font-size:11px;font-weight:600;letter-spacing:.02em;color:rgba(234,244,251,.66)}.sp-loading__track{display:block;width:min(160px,42vw);height:2px;overflow:hidden;background:rgba(127,224,255,.15)}.sp-loading__track>i{display:block;width:48%;height:100%;background:#00a7e8;will-change:transform;animation:sp-loading-slide 720ms linear infinite}@keyframes sp-loading-appear{to{opacity:1}}@keyframes sp-loading-slide{from{transform:translate3d(-110%,0,0)}to{transform:translate3d(320%,0,0)}}@media(max-width:820px){.sp-loading{min-height:100svh}.sp-loading__status{animation-delay:70ms}.sp-loading__track{width:min(132px,38vw)}}@media(prefers-reduced-motion:reduce){.sp-loading__status{opacity:1;animation:none}.sp-loading__track>i{width:62%;animation:none}}
      `}</style>
    </main>
  );
}
