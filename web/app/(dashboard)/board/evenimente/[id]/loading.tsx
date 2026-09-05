import { FormSkeleton, Skeleton } from "@/components/ui/RouteSkeleton";

export default function EventEditorLoading() {
  return <div className="dash-page board-event-editor-page" role="status" aria-label="Se pregătește editorul evenimentului" aria-busy="true">
    <header className="dash-page-head"><div><span className="dash-eyebrow">Evenimente</span><h1>Editor eveniment</h1><Skeleton width={280} height={16} /></div></header>
    <section className="dash-card"><FormSkeleton /></section>
  </div>;
}
