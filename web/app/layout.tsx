import type { Metadata, Viewport } from "next";
import { Commissioner, Manrope, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { resolveSiteUrl } from "@/lib/site-url";
import { NavRouteTransitionCoordinator } from "./AnimatedNavLink";

// Runs before first paint so reveal targets never flash fully visible before
// IntersectionObserver arms them. If motion is reduced or JS fails to boot, the
// page stays visible and usable.
const SCROLL_REVEAL_BOOT = `(function(){try{if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;}catch(e){}var d=document.documentElement;d.classList.add('sr-on');setTimeout(function(){d.classList.remove('sr-on');},4000);})();`;

// preload:false on the body font too. With `swap` + `adjustFontFallback` the text
// paints immediately in a metric-matched fallback (no FCP block, no layout shift) and
// swaps to Manrope when it arrives. Preloading all 5 weights put 5 woff2 (~460ms each)
// on the mobile critical path, competing with the LCP image (PageSpeed network-
// dependency-tree). Now the only preloaded resource on mobile is the LCP image itself.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
});

// preload:false on the two non-body fonts — only Manrope (body) belongs on the critical
// path. Instrument Serif is ceremonial and JetBrains Mono is for numerals; preloading all
// three put 3 woff2 (~800-860ms) on the mobile critical path (PageSpeed). They still load on
// demand via `swap`, with no layout shift (adjustFontFallback is on by default).
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

// Brand display face for the public club site. Commissioner can shift from a
// restrained grotesk toward a lightly flared civic-poster voice through its
// variable axes, while Manrope remains the familiar product/UI face.
const commissioner = Commissioner({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  axes: ["FLAR", "VOLM"],
  variable: "--font-commissioner",
  display: "swap",
  preload: false,
});

const siteUrl = resolveSiteUrl({ fallback: "https://savapass.ro" });

export const metadata: Metadata = {
  title: { default: "SavaPass — by Interact Sf. Sava", template: "%s — SavaPass" },
  description: "Biletul tău pentru fiecare seară Interact. Cumpără online, intră cu QR.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    siteName: "SavaPass",
    locale: "ro_RO",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// Mobile foundations (U1): cover the notch/safe areas so env(safe-area-inset-*)
// resolves for sticky bars + the scanner, and set the dark theme-color to match
// the immersive ink so the browser chrome blends in.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070A12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${manrope.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${commissioner.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="theme-immersive min-h-full flex flex-col"
        style={{
          fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <script dangerouslySetInnerHTML={{ __html: SCROLL_REVEAL_BOOT }} />
        <NavRouteTransitionCoordinator />
        {children}
        <ScrollReveal />
      </body>
    </html>
  );
}
