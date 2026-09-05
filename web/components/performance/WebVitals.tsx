"use client";

import { useReportWebVitals } from "next/web-vitals";

type Sample = { name: string; value: number; rating: string };

declare global {
  interface Window {
    __savaVitals?: Sample[];
  }
}

// Opt-in local diagnostics only. No URLs, user IDs, tokens or network telemetry.
const record: Parameters<typeof useReportWebVitals>[0] = ({ name, value, rating }) => {
  const samples = window.__savaVitals ??= [];
  samples.push({ name, value, rating });
  if (samples.length > 100) samples.shift();
};

export function WebVitals() {
  useReportWebVitals(record);
  return null;
}
