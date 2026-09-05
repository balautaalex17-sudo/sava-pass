"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { isStablePublicDestination } from "./AnimatedNavLink";
import { HomeNav } from "./HomeNav";

const CLUB_ROUTES = new Set(["despre", "evenimente", "proiecte", "echipa", "sponsori", "contact", "district"]);
const PRIVATE_ROUTES = new Set(["board", "membru", "admin", "scanner", "statistici", "login", "invite", "dev", "api", "termeni", "confidentialitate"]);

/** Mounted once in the root layout so public navigation survives streamed page changes. */
export function PublicNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // The preserved landing artwork contains HTML anchors rather than React Links.
  // Delegate only those anchors, keeping the rest of the app on native Next Link.
  useEffect(() => {
    if (pathname !== "/") return;
    const warmed = new Set<string>();
    function destination(event: Event) {
      const anchor = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>(".sp-immersive-root a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return null;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return null;
      return { anchor, href: `${url.pathname}${url.search}${url.hash}` };
    }
    function warm(event: Event) {
      const target = destination(event);
      if (!target || !isStablePublicDestination(target.href) || warmed.size >= 3 || warmed.has(target.href)) return;
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      if (connection?.saveData) return;
      warmed.add(target.href);
      router.prefetch(target.href);
    }
    function navigate(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = destination(event);
      if (!target) return;
      event.preventDefault();
      target.anchor.setAttribute("aria-busy", "true");
      target.anchor.dataset.navigationPending = "true";
      startTransition(() => router.push(target.href));
    }
    document.addEventListener("click", navigate);
    document.addEventListener("mouseover", warm);
    document.addEventListener("focusin", warm);
    return () => {
      document.removeEventListener("click", navigate);
      document.removeEventListener("mouseover", warm);
      document.removeEventListener("focusin", warm);
      document.querySelectorAll("[data-navigation-pending]").forEach((element) => {
        element.removeAttribute("aria-busy"); element.removeAttribute("data-navigation-pending");
      });
    };
  }, [pathname, router]);

  useEffect(() => {
    if (pending) return;
    document.querySelectorAll("[data-navigation-pending]").forEach((element) => {
      element.removeAttribute("aria-busy"); element.removeAttribute("data-navigation-pending");
    });
  }, [pending]);
  const segment = pathname.split("/")[1] ?? "";
  if (PRIVATE_ROUTES.has(segment)) return null;
  const club = CLUB_ROUTES.has(segment);
  const active = pathname === "/" ? "despre"
    : segment === "devino-membru" ? "membru"
    : segment === "conta" || segment === "bilet" ? "bilete"
    : club ? segment : "rezerva";
  return <HomeNav active={active} immersive dark={club || segment === "conta"} />;
}
