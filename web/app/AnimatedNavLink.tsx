"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  type ComponentProps,
  type MouseEvent,
} from "react";

const PRIMARY_ROUTES = new Set(["/", "/evenimente", "/devino-membru"]);
const TRANSITION_DURATION_MS = 220;
const FALLBACK_FADE_DURATION_MS = 100;
const NAVIGATION_TIMEOUT_MS = 10_000;
const REVEAL_EASING = "cubic-bezier(0.23, 1, 0.32, 1)";

type PendingNavigation = {
  pathname: string;
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
};

let pendingNavigation: PendingNavigation | null = null;

function finishPendingNavigation(pathname: string) {
  if (pendingNavigation?.pathname !== pathname) return;

  const pending = pendingNavigation;
  pendingNavigation = null;
  clearTimeout(pending.timer);
  pending.resolve();
}

/** Keeps the primary public pages warm and signals when Next has committed the new route. */
export function NavRouteTransitionCoordinator() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const routes = window.matchMedia("(max-width: 820px)").matches
      ? ["/devino-membru"]
      : PRIMARY_ROUTES;
    for (const route of routes) {
      if (route !== pathname) router.prefetch(route);
    }
  }, [pathname, router]);

  useLayoutEffect(() => {
    finishPendingNavigation(pathname);
  }, [pathname]);

  return null;
}

type AnimatedNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/** Expands a circle from the clicked link until it covers every viewport corner. */
function getCircleClipPath(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const coverRadius = Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y),
  );
  const origin = `${x.toFixed(2)}px ${y.toFixed(2)}px`;

  return [
    `circle(0px at ${origin})`,
    `circle(${(coverRadius * 1.02).toFixed(2)}px at ${origin})`,
  ];
}

/** Circular theme reveal shared by the primary public pages. */
export function AnimatedNavLink({ href, onClick, prefetch = null, ...props }: AnimatedNavLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.target === "_blank" ||
      event.currentTarget.hasAttribute("download")
    ) {
      return;
    }

    const target = new URL(event.currentTarget.href, window.location.href);
    const currentPathname = window.location.pathname;
    const isInternalRouteSwitch =
      target.origin === window.location.origin && target.pathname !== currentPathname;
    const isSameLocation =
      target.pathname === currentPathname &&
      target.search === window.location.search &&
      target.hash === window.location.hash;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 820px)").matches;

    if (
      !isInternalRouteSwitch ||
      isSameLocation ||
      reduceMotion ||
      isMobile
    ) {
      return;
    }

    event.preventDefault();

    const root = document.documentElement;
    if (root.dataset.savaRouteVt === "active") return;

    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const x = left + width / 2;
    const y = top + height / 2;
    const clipPath = getCircleClipPath(x, y, viewportWidth, viewportHeight);
    const destination = `${target.pathname}${target.search}${target.hash}`;

    root.dataset.savaRouteVt = "active";
    root.style.setProperty("--sava-route-vt-clip-from", clipPath[0]);

    let activeAnimation: Animation | null = null;
    let fallbackOverlay: HTMLDivElement | null = null;
    const cleanup = () => {
      delete root.dataset.savaRouteVt;
      root.style.removeProperty("--sava-route-vt-clip-from");
      activeAnimation?.cancel();
      activeAnimation = null;
      fallbackOverlay?.remove();
      fallbackOverlay = null;
    };

    const navigate = () =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          if (pendingNavigation?.pathname === target.pathname) {
            pendingNavigation = null;
          }
          resolve();
        }, NAVIGATION_TIMEOUT_MS);

        pendingNavigation = { pathname: target.pathname, resolve, timer };
        router.push(destination);
      });

    if (typeof document.startViewTransition !== "function") {
      fallbackOverlay = document.createElement("div");
      fallbackOverlay.setAttribute("aria-hidden", "true");
      Object.assign(fallbackOverlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "80",
        pointerEvents: "auto",
        background: "var(--brand-cyan)",
        clipPath: clipPath[0],
        willChange: "clip-path, opacity",
      });
      document.body.appendChild(fallbackOverlay);

      const overlay = fallbackOverlay;
      overlay.style.transition = `clip-path ${TRANSITION_DURATION_MS}ms ${REVEAL_EASING}`;
      overlay.getBoundingClientRect();
      overlay.style.clipPath = clipPath[1];

      void (async () => {
        await Promise.all([
          navigate(),
          new Promise<void>((resolve) => {
            setTimeout(resolve, TRANSITION_DURATION_MS);
          }),
        ]);
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        overlay.style.transition = `opacity ${FALLBACK_FADE_DURATION_MS}ms cubic-bezier(.22,1,.36,1)`;
        overlay.getBoundingClientRect();
        overlay.style.opacity = "0";
        await new Promise<void>((resolve) => {
          setTimeout(resolve, FALLBACK_FADE_DURATION_MS);
        });
      })()
        .catch(() => {
          if (window.location.pathname !== target.pathname) {
            router.push(destination);
          }
        })
        .finally(cleanup);
      return;
    }

    const transition = document.startViewTransition(navigate);

    void (async () => {
      try {
        await transition.ready;
        activeAnimation = root.animate(
          {
            clipPath,
            opacity: [0.84, 1],
          },
          {
            duration: TRANSITION_DURATION_MS,
            easing: REVEAL_EASING,
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          },
        );

        await Promise.allSettled([transition.finished, activeAnimation.finished]);
      } catch {
        await transition.finished.catch(() => {});
      } finally {
        cleanup();
      }
    })();
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      {...props}
      onClick={handleClick}
    />
  );
}
