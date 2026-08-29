"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";

interface StaffHeaderProps {
  left?: ReactNode;
  right?: ReactNode;
  center?: ReactNode;
  collapsibleRight?: boolean;
}

export function StaffHeader({ left, right, center, collapsibleRight = false }: StaffHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen || !collapsibleRight) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const wideScreen = window.matchMedia("(min-width: 861px)");
    const firstControl = panelRef.current?.querySelector<HTMLElement>('a, button:not([disabled])');
    root.style.overflow = "hidden";
    firstControl?.focus();

    const closeOnWideScreen = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const controls = [...(panelRef.current?.querySelectorAll<HTMLElement>('a, button:not([disabled])') ?? [])]
        .filter((control) => control.getClientRects().length > 0);
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };

    wideScreen.addEventListener("change", closeOnWideScreen);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", closeOnPointerDown);
    return () => {
      root.style.overflow = previousOverflow;
      wideScreen.removeEventListener("change", closeOnWideScreen);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", closeOnPointerDown);
    };
  }, [collapsibleRight, menuOpen]);

  return (
    <header
      ref={headerRef}
      className={`staff-header${collapsibleRight ? " staff-header--collapsible" : ""}`}
      style={{
        background: "var(--im-ink-2)",
        borderBottom: "1px solid var(--im-line)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: "var(--z-sticky)" as unknown as number,
      }}
    >
      <div className="staff-header__left" style={{ minWidth: 100 }}>{left}</div>
      <div className="staff-header__center">{center}</div>
      {collapsibleRight && right && (
        <button
          ref={menuButtonRef}
          type="button"
          className="staff-header__menu"
          aria-label="Meniu administrare"
          aria-controls="staff-header-panel"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      )}
      <div
        ref={panelRef}
        id={collapsibleRight ? "staff-header-panel" : undefined}
        className="staff-header__right"
        data-open={menuOpen ? "true" : "false"}
        style={{ minWidth: 100, display: "flex", justifyContent: "flex-end" }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setMenuOpen(false);
        }}
      >
        {right}
      </div>
      {collapsibleRight && menuOpen && (
        <button className="staff-header__backdrop" type="button" aria-label="Închide meniul" onClick={() => setMenuOpen(false)} />
      )}
      <style>{`
        .staff-header__right{min-width:0!important;padding-bottom:1px}
        .staff-header__right>div{flex-wrap:nowrap}
        .staff-header__right a{flex:none}
        .staff-header__menu,.staff-header__backdrop{display:none}
        @media(max-width:860px){
          .staff-header{display:grid!important;grid-template-columns:minmax(0,1fr)!important;align-items:start!important;padding:max(10px,env(safe-area-inset-top)) 12px 10px!important;gap:9px!important}
          .staff-header__left,.staff-header__center,.staff-header__right{width:100%;min-width:0!important}
          .staff-header__right{justify-content:flex-start!important;overflow:visible}
          .staff-header__right>div{width:100%;flex-wrap:wrap!important;gap:7px!important}
          .staff-header__right a,.staff-header__right button{min-height:44px;font-size:13px!important;gap:7px!important;padding:9px 11px!important}
          .staff-header__right a svg,.staff-header__right button svg{width:16px;height:16px}

          .staff-header--collapsible{grid-template-columns:minmax(0,1fr) 44px!important;align-items:center!important;min-height:64px}
          .staff-header--collapsible .staff-header__center{grid-column:1}
          .staff-header--collapsible .staff-header__menu{
            position:relative;z-index:3;grid-column:2;grid-row:1;display:grid;width:44px;height:44px;padding:0;place-items:center;
            border:1px solid var(--im-line);border-radius:9px;background:var(--im-ink-3);color:var(--im-fg);cursor:pointer
          }
          .staff-header--collapsible .staff-header__right{
            position:absolute;z-index:2;top:100%;right:12px;left:12px;width:auto;max-height:calc(100dvh - 82px - env(safe-area-inset-bottom));
            display:none!important;overflow-y:auto;overscroll-behavior:contain;padding:9px;border:1px solid var(--im-line);border-radius:0 0 12px 12px;
            background:var(--im-ink-2);box-shadow:0 18px 48px rgba(0,0,0,.34)
          }
          .staff-header--collapsible .staff-header__right[data-open="true"]{display:flex!important}
          .staff-header--collapsible .staff-header__right>div{flex-direction:column;align-items:stretch!important;gap:6px!important}
          .staff-header--collapsible .staff-header__right a{width:100%;justify-content:flex-start!important}
          .staff-header--collapsible .staff-header__backdrop{position:fixed;z-index:1;inset:0;display:block;border:0;background:rgba(3,8,15,.54)}
          .staff-header--collapsible .staff-header__left{position:relative;z-index:3;grid-column:1;grid-row:1}
        }
        @media(prefers-reduced-motion:reduce){.staff-header *{scroll-behavior:auto!important}}
      `}</style>
    </header>
  );
}
