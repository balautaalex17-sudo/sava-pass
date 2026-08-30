import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye } from "lucide-react";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { getManagedEventBySlug } from "@/lib/event-archive";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ArchiveEventEditor } from "../ArchiveEventEditor";

export const metadata: Metadata = {
  title: "Editor card eveniment",
  robots: { index: false, follow: false },
};

export default async function ArchiveEventEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePagePermission("manage_public_events");
  const { slug } = await params;
  const [event, mediaResult] = await Promise.all([
    getManagedEventBySlug(slug, true),
    supabaseAdmin
      .from("media_assets")
      .select("id, file_name, public_url, source_kind")
      .eq("archived", false)
      .eq("excluded", false)
      .order("quality_score", { ascending: false }),
  ]);

  if (!event) notFound();

  return (
    <div className="dash-page" style={{ maxWidth: 980 }}>
      <header className="dash-page-head">
        <div>
          <div className="dash-editor-context">
            <Link href="/board/evenimente" className="dash-back-link"><ChevronLeft size={16} /> Evenimente</Link>
            <span className="dash-eyebrow">Eveniment importat</span>
          </div>
          <h1>{event.title}</h1>
          <p>Editezi cardul și pagina publică. Evenimentul original importat rămâne păstrat ca sursă.</p>
        </div>
        {event.publishingStatus === "published" && <Link href={`/evenimente/${event.slug}`} className="dash-button dash-button--secondary"><Eye size={17} /> Vezi pe site</Link>}
      </header>

      <ArchiveEventEditor event={event} mediaAssets={mediaResult.data ?? []} />
    </div>
  );
}
