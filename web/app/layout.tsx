import type { Metadata, Viewport } from "next";
import { Manrope, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

// Runs before first paint. Two jobs:
//  1. Force-on motion: shim `matchMedia` so any `prefers-reduced-motion` query
//     reports `matches:false`. This makes the homepage GSAP engine, the Framer
//     reveals and ScrollReveal all animate regardless of the visitor's OS "reduce
//     motion" setting (product decision). CSS `@media reduce` suppressors are
//     neutralized separately in globals.css + the immersive CSS.
//  2. Arm the scroll-reveal gate so entrance elements start hidden (no flash);
//     ScrollReveal then plays them in. If it never boots (JS error), the timer
//     strips the gate so nothing stays hidden — content always ends up visible.
const SCROLL_REVEAL_BOOT = `(function(){try{if('scrollRestoration'in history)history.scrollRestoration='manual';}catch(e){}try{window.scrollTo(0,0);}catch(e){}try{var mm=window.matchMedia?window.matchMedia.bind(window):null;if(mm){window.matchMedia=function(q){if(typeof q==='string'&&q.indexOf('prefers-reduced-motion')!==-1){return{media:q,matches:false,onchange:null,addEventListener:function(){},removeEventListener:function(){},addListener:function(){},removeListener:function(){},dispatchEvent:function(){return false;}};}return mm(q);};}}catch(e){}var d=document.documentElement;d.classList.add('sr-on');setTimeout(function(){if(!window.__srReady){d.classList.remove('sr-on');}},4000);})();`;

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://savapass.ro";

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
      className={`${manrope.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full`}
      // The pre-paint SCROLL_REVEAL_BOOT script adds the `sr-on` class to <html>
      // before hydration, so server/client classNames differ by design.
      suppressHydrationWarning
    >
      <body
        className="theme-immersive min-h-full flex flex-col"
        style={{
          fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <script dangerouslySetInnerHTML={{ __html: SCROLL_REVEAL_BOOT }} />
        {children}
        <ScrollReveal />
      </body>
    </html>
  );
}
