import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { EventEditor } from "@/app/(staff)/admin/events/EventEditor";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Editor eveniment",
  robots: { index: false, follow: false },
};

export default async function BoardEventEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("manage_public_events");
  const { id } = await params;
  const isNew = id === "new";
  const eventResult = isNew ? null : await supabaseAdmin.from("events").select("*").eq("id", id).maybeSingle();
  if (!isNew && !eventResult?.data) notFound();

  const [{ count }, { data: ticketTypes }, { data: mediaAssets }] = isNew
    ? [
        { count: 0 },
        { data: [] },
        await supabaseAdmin.from("media_assets").select("id, file_name, public_url, source_kind").eq("archived", false).eq("excluded", false).order("quality_score", { ascending: false }),
      ]
    : await Promise.all([
        supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("event_id", id),
        supabaseAdmin.from("event_ticket_types").select("*").eq("event_id", id).order("sort").order("created_at"),
        supabaseAdmin.from("media_assets").select("id, file_name, public_url, source_kind").eq("archived", false).eq("excluded", false).order("quality_score", { ascending: false }),
      ]);

  return (
    <div className="dash-page board-event-editor-page">
      <header className="dash-page-head">
        <div>
          <Link href="/board/evenimente" className="dash-back-link"><ChevronLeft size={16} /> Evenimente</Link>
          <h1>{isNew ? "Eveniment nou" : eventResult!.data!.title}</h1>
          <p>{count ? "Adresa publică este blocată deoarece există deja rezervări." : "Salvează ca ciornă, apoi publică evenimentul din listă."}</p>
        </div>
      </header>
      <div className="board-event-editor">
        <EventEditor event={eventResult?.data ?? null} ticketTypes={ticketTypes ?? []} mediaAssets={mediaAssets ?? []} hasOrders={(count ?? 0) > 0} />
      </div>
    </div>
  );
}
