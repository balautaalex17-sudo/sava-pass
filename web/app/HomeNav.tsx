"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { AnimatedNavLink } from "./AnimatedNavLink";

interface HomeNavProps {
  /** Key of the current page for active-link highlight. */
  active?: string;
  /** Marks the landing-page version of the navigation. */
  immersive?: boolean;
  /** Uses the elevated dark surface while preserving immersive geometry. */
  dark?: boolean;
  /** Cash reservation route for the currently promoted event. */
  purchaseHref?: string;
}

const SITE_LINKS = [
  { label: "Acasă", href: "/", key: "acasa" },
  { label: "Evenimente", href: "/evenimente", key: "evenimente" },
  { label: "Devino membru", href: "/devino-membru", key: "membru" },
  { label: "Biletele mele", href: "/conta", key: "bilete" },
];

const LANDING_LINKS = [
  { label: "Despre", href: "/", key: "despre" },
  { label: "Evenimente", href: "/evenimente", key: "evenimente" },
  { label: "Devino membru", href: "/devino-membru", key: "membru" },
  { label: "Biletele mele", href: "/conta", key: "bilete" },
];

/**
 * One public navigation tree at every width. The text links sit inline on wide
 * screens and become the compact menu sheet on narrow screens.
 */
export function HomeNav({
  active,
  immersive = false,
  dark = false,
  purchaseHref = "/evenimente",
}: HomeNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const links = immersive ? LANDING_LINKS : SITE_LINKS;
  const purchaseIsActive = active === "rezerva";
  const navClassName = ["hnav", immersive && "hnav--immersive", dark && "hnav--dark"]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!menuOpen) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const wideScreen = window.matchMedia("(min-width: 821px)");
    root.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    const closeOnWideScreen = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const controls = [...(navRef.current?.querySelectorAll<HTMLElement>('a, button:not([disabled])') ?? [])]
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

    wideScreen.addEventListener("change", closeOnWideScreen);
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      root.style.overflow = previousOverflow;
      wideScreen.removeEventListener("change", closeOnWideScreen);
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <nav ref={navRef} className={navClassName} aria-label="Navigare principală">
      <div className="hnav__frame">
        {immersive && (
          <AnimatedNavLink href="/" className="hnav__brand" aria-label="ITC Sf. Sava — acasă">
            <strong>ITC</strong>
            <span>SF. SAVA</span>
          </AnimatedNavLink>
        )}

        <div id="hnav-links" className="hnav__links" data-open={menuOpen ? "true" : "false"}>
          {links.map((link, index) => {
            const isActive = active === link.key;
            return (
              <AnimatedNavLink
                key={link.key}
                ref={index === 0 ? firstLinkRef : undefined}
                href={link.href}
                prefetch={link.href === "/devino-membru" ? true : null}
                className={isActive ? "hnav__link hnav__link--active" : "hnav__link"}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </AnimatedNavLink>
            );
          })}
          <AnimatedNavLink
            href={purchaseHref}
            className={purchaseIsActive ? "hnav__mobile-cta hnav__mobile-cta--active" : "hnav__mobile-cta"}
            aria-current={purchaseIsActive ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            Rezervă bilet
            <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
          </AnimatedNavLink>
        </div>

        <AnimatedNavLink
          href={purchaseHref}
          className={purchaseIsActive ? "hnav__cta hnav__desktop-cta hnav__cta--active" : "hnav__cta hnav__desktop-cta"}
          aria-current={purchaseIsActive ? "page" : undefined}
        >
          Rezervă bilet
          <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
        </AnimatedNavLink>

        <button
          ref={menuButtonRef}
          type="button"
          className="hnav__burger"
          aria-label="Meniu principal"
          aria-controls="hnav-links"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} strokeWidth={1.75} aria-hidden="true" /> : <Menu size={20} strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </div>

      <style>{`
        .hnav {
          position: fixed;
          inset: 0 0 auto;
          z-index: 70;
          width: 100vw;
          padding: max(10px, env(safe-area-inset-top)) clamp(18px,4vw,48px) 10px;
          border-bottom: 1px solid rgba(127,224,255,.14);
          background: #070a12;
          color: #eaf4fb;
          pointer-events: none;
        }
        .hnav--immersive {
          z-index: 3;
          padding: max(12px, env(safe-area-inset-top)) clamp(16px,4vw,40px) 0;
          border-bottom: 0;
          background: transparent;
        }
        .sp-immersive-root > .intro ~ section,
        .sp-immersive-root > .intro ~ footer { z-index: 4; }
        .hnav__frame {
          width: max-content;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: clamp(22px,2.5vw,38px);
          pointer-events: auto;
        }
        .hnav__links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(22px,2.5vw,38px);
        }
        .hnav--immersive .hnav__frame {
          width: min(100%, clamp(760px, 69.5vw, 1168px));
          min-height: 68px;
          display: grid;
          grid-template-columns: 160px minmax(0, 1fr) 160px;
          gap: 20px;
          padding: 8px 18px;
          border: 1px solid rgba(15,23,42,.08);
          border-radius: 10px;
          background: rgba(255,255,255,.96);
          box-shadow: none;
        }
        .hnav__brand {
          width: max-content;
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          color: #0f172a;
          font-family: var(--font-brand);
          line-height: 1;
          text-decoration: none;
        }
        .hnav__brand strong {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -.045em;
        }
        .hnav__brand span {
          margin-top: 4px;
          color: #0088c2;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .02em;
        }
        .hnav__link,
        .hnav__cta {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-brand);
          font-variation-settings: "FLAR" 18, "VOLM" 4;
          font-size: 14px;
          font-weight: 650;
          letter-spacing: -.015em;
          text-decoration: none;
          white-space: nowrap;
          transition: color 180ms cubic-bezier(.22,1,.36,1), background 180ms cubic-bezier(.22,1,.36,1), transform 180ms cubic-bezier(.22,1,.36,1);
        }
        .hnav__link {
          position: relative;
          padding: 0 1px;
          color: rgba(234,244,251,.76);
        }
        .hnav__link::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: 6px;
          left: 0;
          height: 1px;
          background: #7fe0ff;
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 220ms cubic-bezier(.22,1,.36,1);
        }
        .hnav__link:hover { color: #fff; }
        .hnav__link:hover::after,
        .hnav__link--active::after {
          transform: scaleX(1);
          transform-origin: left;
        }
        .hnav__link--active {
          padding-bottom: 0;
          border-bottom: 0;
          color: #fff;
          background: transparent;
        }
        .hnav__cta {
          gap: 9px;
          padding: 0 17px;
          border-radius: 6px;
          background: #00a7e8;
          color: #03111a;
          font-weight: 760;
        }
        .hnav__cta--active,
        .hnav__mobile-cta--active {
          box-shadow: inset 0 -3px 0 rgba(255,255,255,.72);
        }
        .hnav__mobile-cta { display: none; }
        .hnav__cta:hover { background: #28b6eb; }
        .hnav__cta svg { transition: transform 180ms cubic-bezier(.22,1,.36,1); }
        .hnav__cta:hover svg { transform: translateX(2px); }
        .hnav__link:active,
        .hnav__cta:active,
        .hnav__burger:active { transform: translateY(1px); }
        .hnav a:focus-visible,
        .hnav button:focus-visible { outline: 2px solid #7fe0ff; outline-offset: 3px; }
        .hnav__burger {
          width: 44px;
          height: 44px;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: #eaf4fb;
          cursor: pointer;
          transition: color 180ms cubic-bezier(.22,1,.36,1), transform 180ms cubic-bezier(.22,1,.36,1);
        }
        .hnav__burger:hover,
        .hnav__burger[aria-expanded="true"] { color: #7fe0ff; }
        .hnav--immersive .hnav__link { color: #0f172a; font-size: 14px; }
        .hnav--immersive .hnav__link:hover,
        .hnav--immersive .hnav__link--active,
        .hnav--immersive .hnav__burger:hover { color: #006f9c; }
        .hnav--immersive .hnav__link::after { background: #009fe3; }
        .hnav--immersive .hnav__cta {
          min-height: 44px;
          justify-self: end;
          padding: 0 20px;
          border-radius: 7px;
          background: linear-gradient(135deg, #00a7e8 0%, #078bf0 100%);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
        }
        .hnav--immersive .hnav__cta:hover { background: linear-gradient(135deg, #16b5f0 0%, #1398f2 100%); }
        .hnav--immersive a:focus-visible,
        .hnav--immersive button:focus-visible { outline-color: #007fae; }
        .hnav--immersive.hnav--dark .hnav__frame { border-color: #263543; background: #0d131d; }
        .hnav--dark .hnav__brand { color: #eef6fa; }
        .hnav--dark .hnav__brand span { color: #7fe0ff; }
        .hnav--immersive.hnav--dark .hnav__link { color: #c6d5dd; }
        .hnav--immersive.hnav--dark .hnav__link:hover,
        .hnav--immersive.hnav--dark .hnav__link--active,
        .hnav--immersive.hnav--dark .hnav__burger:hover { color: #fff; }
        .hnav--immersive.hnav--dark a:focus-visible,
        .hnav--immersive.hnav--dark button:focus-visible { outline-color: #7fe0ff; }

        @media (min-width: 821px) and (max-width: 1100px) {
          .hnav--immersive .hnav__frame {
            grid-template-columns: 130px minmax(0, 1fr) 150px;
            gap: 12px;
            padding-inline: 12px;
          }
          .hnav--immersive .hnav__links { gap: 16px; }
          .hnav--immersive .hnav__link { font-size: 13px; }
          .hnav--immersive .hnav__cta { padding-inline: 14px; font-size: 14px; }
        }

        @media (max-width: 820px) {
          .hnav {
            z-index: 70;
            padding: max(10px, env(safe-area-inset-top)) clamp(12px, 4vw, 18px) 10px;
          }
          .hnav--immersive {
          padding: max(10px, env(safe-area-inset-top)) clamp(10px, 3.2vw, 14px) 0;
          }
          .hnav__frame {
            width: 100%;
            justify-content: flex-end;
            gap: 8px;
          }
          .hnav--immersive .hnav__frame {
            width: 100%;
            min-height: 56px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 6px 7px 6px 12px;
            border: 1px solid rgba(15,23,42,.08);
            border-radius: 10px;
            background: rgba(255,255,255,.96);
            box-shadow: none;
          }
          .hnav__desktop-cta { display: none; }
          .hnav--immersive .hnav__cta { display: none; }
          .hnav--immersive .hnav__brand { display: inline-flex; color: #0f172a; }
          .hnav--immersive .hnav__brand span {
            color: #0088c2;
          }
          .hnav--immersive.hnav--dark .hnav__brand { color: #eef6fa; }
          .hnav--immersive.hnav--dark .hnav__brand span { color: #7fe0ff; }
          .hnav--immersive.hnav--dark .hnav__frame {
            border-color: #263543;
            background: #0d131d;
          }
          .hnav__brand { margin-right: auto; }
          .hnav__brand strong { font-size: 19px; }
          .hnav__brand span { margin-top: 3px; font-size: 9px; }
          .hnav__cta { min-height: 44px; padding: 0 14px; font-size: 13px; }
          .hnav__burger { display: inline-flex; flex: none; }
          .hnav__links {
            position: fixed;
            top: calc(max(10px, env(safe-area-inset-top)) + 72px);
            right: clamp(12px, 4vw, 18px);
            left: clamp(12px, 4vw, 18px);
            max-height: calc(100dvh - max(10px, env(safe-area-inset-top)) - 90px - env(safe-area-inset-bottom));
            display: none;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            overflow-y: auto;
            overscroll-behavior: contain;
            padding: 8px 16px 12px;
            border: 1px solid rgba(127,224,255,.16);
            border-radius: 10px;
            background: #070a12;
            box-shadow: 0 18px 48px rgba(3, 8, 15, .28);
          }
          .hnav__links[data-open="true"] { display: flex; }
          .hnav__link,
          .hnav--immersive .hnav__link {
            min-height: 52px;
            justify-content: flex-start;
            padding: 0;
            border-bottom: 1px solid rgba(234,244,251,.1);
            color: rgba(234,244,251,.82);
            font-size: 15px;
          }
          .hnav__link:last-child { border-bottom: 0; }
          .hnav__link::after { display: none; }
          .hnav__mobile-cta {
            min-height: 48px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            margin-top: 8px;
            border-radius: 7px;
            background: #00a7e8;
            color: #03111a;
            font-size: 14px;
            font-weight: 800;
            text-decoration: none;
          }
          .hnav--immersive .hnav__links { border-color: rgba(15,23,42,.1); background: #fff; }
          .hnav--immersive .hnav__link {
            border-bottom-color: rgba(15,23,42,.08);
            color: #0f172a;
          }
          .hnav--immersive.hnav--dark .hnav__links { border-color: #263543; background: #0d131d; }
          .hnav--immersive.hnav--dark .hnav__link {
            border-bottom-color: #263543;
            color: #d9e5ec;
          }
          .hnav--immersive .hnav__burger { color: #0f172a; }
          .hnav--immersive.hnav--dark .hnav__burger { color: #d9e5ec; }
          .hnav--immersive:not(.hnav--dark) .hnav__burger { color: #0f172a; }
          .hnav--immersive .hnav__burger {
            position: relative;
            z-index: 2;
            border-radius: 999px;
            background: #eef2f4;
          }
          .hnav--immersive.hnav--dark .hnav__burger { background: rgba(255,255,255,.08); }
        }
        @media (max-width: 350px) {
          .hnav { padding-inline: 8px; }
          .hnav--immersive { padding-inline: 8px; }
          .hnav--immersive .hnav__frame { padding-left: 10px; }
          .hnav__cta { padding-inline: 11px; font-size: 12px; }
          .hnav__links { right: 8px; left: 8px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hnav__link,
          .hnav__cta,
          .hnav__burger,
          .hnav__link::after,
          .hnav__cta svg { transition: none; }
        }
      `}</style>
    </nav>
  );
}
