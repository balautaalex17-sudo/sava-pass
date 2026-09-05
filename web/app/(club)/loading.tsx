import { Skeleton } from "@/components/ui/RouteSkeleton";

export default function ClubLoading() {
  return <main className="cl-shell" role="status" aria-label="Se pregătește pagina Interact" aria-busy="true">
    <section className="cl-hero"><div className="cl-hero__inner" style={{ paddingBlock: "clamp(120px,18vw,220px)" }}>
      <Skeleton width="25%" height={16} /><Skeleton width="85%" height={80} style={{ marginTop: 30 }} /><Skeleton width="65%" height={24} style={{ marginTop: 28 }} />
    </div></section>
  </main>;
}
