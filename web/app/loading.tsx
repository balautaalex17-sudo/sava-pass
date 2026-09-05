import { Skeleton } from "@/components/ui/RouteSkeleton";

export default function Loading() {
  return <main role="status" aria-label="Se pregătește pagina" aria-busy="true" style={{ minHeight: "100svh", padding: "140px max(20px,6vw) 60px", background: "var(--im-ink)", color: "var(--im-fg)" }}>
    <Skeleton width="24%" height={14} /><Skeleton width="80%" height={64} style={{ marginTop: 28 }} /><Skeleton width="55%" height={24} style={{ marginTop: 24 }} /><Skeleton height={240} style={{ marginTop: 48 }} />
  </main>;
}
