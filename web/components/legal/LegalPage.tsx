import type { ReactNode } from "react";
import { FlowNav } from "@/components/ui/FlowNav";

/**
 * Shared light shell for the legal pages (Terms, Privacy). Renders inside
 * `.sp-light` so FlowNav's Logo + tokens resolve light against the dark app theme.
 */
export function LegalPage({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: ReactNode }) {
  return (
    <div className="sp-light legal-page">
      <FlowNav backHref="/" />
      <main className="legal-shell">
        <header className="legal-head">
          <h1>{title}</h1>
          <p className="legal-updated">Ultima actualizare: {lastUpdated}</p>
        </header>
        <article className="legal-prose">{children}</article>
      </main>
      <style>{`
        .legal-page { min-height: 100vh; background: var(--slate-50); color: var(--slate-900); }
        .legal-shell { width: min(760px, calc(100% - 40px)); margin: 0 auto; padding: 40px 0 80px; }
        .legal-head h1 { margin: 0; font-size: clamp(30px, 5vw, 40px); font-weight: 800; letter-spacing: -0.025em; color: var(--slate-900); }
        .legal-updated { margin: 8px 0 0; font-size: 13px; color: var(--slate-500); }
        .legal-prose { margin-top: 28px; }
        .legal-prose h2 { margin: 32px 0 10px; font-size: 18px; font-weight: 800; color: var(--slate-900); letter-spacing: -0.01em; }
        .legal-prose h2:first-child { margin-top: 0; }
        .legal-prose p { margin: 0 0 12px; font-size: 15px; line-height: 1.7; color: var(--slate-700); }
        .legal-prose ul { margin: 0 0 12px; padding-left: 22px; }
        .legal-prose li { font-size: 15px; line-height: 1.7; color: var(--slate-700); margin-bottom: 4px; }
        .legal-prose strong { color: var(--slate-900); font-weight: 700; }
        .legal-prose a { color: var(--brand-cyan-700); font-weight: 600; }
        .legal-note { margin-top: 24px; padding: 14px 16px; border-radius: var(--radius-md); background: var(--brand-cyan-50); border: 1px solid var(--slate-200); font-size: 13px; color: var(--slate-600); line-height: 1.55; }
      `}</style>
    </div>
  );
}
