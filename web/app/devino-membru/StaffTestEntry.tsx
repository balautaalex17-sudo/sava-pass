"use client";

import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import { StaffTestLogin } from "./StaffTestLogin";

function isAllowedTestHost(hostname: string) {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "[::1]"
    || hostname.endsWith(".vercel.app");
}

const subscribeToHost = () => () => {};
const readBrowserHost = () => isAllowedTestHost(window.location.hostname.toLowerCase());
const readServerHost = () => false;

/** Keeps preview-only URL handling out of the public page's server render. */
export function StaffTestEntry({ enabled }: { enabled: boolean }) {
  const searchParams = useSearchParams();
  const accessKey = searchParams.get("staff") ?? "";
  const hostAllowed = useSyncExternalStore(
    subscribeToHost,
    readBrowserHost,
    readServerHost,
  );

  if (!enabled || !accessKey || !hostAllowed) return null;
  return <StaffTestLogin accessKey={accessKey} />;
}
