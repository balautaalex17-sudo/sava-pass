import { Skeleton } from "@/components/ui/RouteSkeleton";

export default function DashboardLoading() {
  return <div className="dash-page" role="status" aria-label="Se pregătește panoul" aria-busy="true">
    <header className="dash-page-head"><div><span className="dash-eyebrow">Spațiul membrilor</span><Skeleton width={260} height={40} style={{ marginTop: 12 }} /><Skeleton width={300} height={16} style={{ marginTop: 16 }} /></div></header>
    <section className="dash-card"><Skeleton height={88} /><Skeleton height={40} style={{ marginTop: 24 }} /><Skeleton height={40} style={{ marginTop: 12 }} /><Skeleton height={40} style={{ marginTop: 12 }} /></section>
  </div>;
}
