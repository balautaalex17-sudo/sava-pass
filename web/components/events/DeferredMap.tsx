"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Copy, MapPin } from "lucide-react";
import styles from "./deferred-map.module.css";

const subscribe = () => () => {};
const getServerSnapshot = () => false;
const needsExternalMap = () => /Instagram/i.test(navigator.userAgent)
  || typeof IntersectionObserver === "undefined";

interface Props {
  src: string;
  title: string;
  mapUrl: string;
  address: string;
}

/** Native iframe lazy loading reaches far beyond the screen on slow networks. */
export function DeferredMap({ src, title, mapUrl, address }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  // Read browser-only capabilities after hydration, preserving the server markup.
  const externalMap = useSyncExternalStore(subscribe, needsExternalMap, getServerSnapshot);

  useEffect(() => {
    const element = frame.current;
    if (!element || needsExternalMap()) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("manual");
    }
  }

  const showEmbed = visible && !externalMap;

  return (
    <div ref={frame}>
      {showEmbed ? (
        <iframe
          src={src}
          title={title}
          // The observer already defers loading. Do not defer again in WebViews.
          loading="eager"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className={styles.fallback}>
          <MapPin size={28} strokeWidth={1.75} aria-hidden="true" />
          <strong>Vezi locația în Google Maps</strong>
          <p className={styles.address}>{address}</p>
          <p>Deschide harta pentru detalii și traseu.</p>
          <div className={styles.actions}>
            <a href={mapUrl}>
              Deschide în Google Maps <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <button type="button" onClick={copyAddress}>
              <Copy size={16} aria-hidden="true" /> Copiază adresa
            </button>
          </div>
          <p role="status">
            {copyStatus === "copied" ? "Adresa a fost copiată." : copyStatus === "manual"
              ? "Ține apăsat pe adresă pentru a o selecta și copia." : ""}
          </p>
        </div>
      )}
      {showEmbed ? (
        // Cross-origin iframe load events also fire on failure, so keep a real
        // link available even when the embedded map appears to have loaded.
        <p className={styles.help}>
          Harta nu se afișează? <a href={mapUrl}>Deschide în Google Maps</a>
        </p>
      ) : null}
    </div>
  );
}
