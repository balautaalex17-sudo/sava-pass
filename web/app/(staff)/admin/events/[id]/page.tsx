import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaffRole } from "@/lib/roles";
import { EventEditor } from "../EventEditor";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Editor eveniment - SavaPass", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EventEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await requireStaffRole(["admin"]);
  if (!current) redirect("/conta");

  const { id } = await params;
  const isNew = id === "new";
  const event = isNew ? null : await supabaseAdmin.from("events").select("*").eq("id", id).single();
  if (!isNew && !event?.data) notFound();

  const { count } = isNew
    ? { count: 0 }
    : await supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("event_id", id);

  return (
    <>
      <StaffHeader
        left={
          <Link href="/admin/events" className="pressable" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--im-fg-2)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
            <ChevronLeft size={16} strokeWidth={1.75} />
            Evenimente
          </Link>
        }
      />

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontWeight: 800, fontSize: 26, color: "var(--im-fg)", margin: "0 0 4px" }}>
            {isNew ? "Eveniment nou" : event!.data!.title}
          </h1>
          <p style={{ color: "var(--im-fg-2)", fontSize: 13, margin: 0 }}>
            {count ? "Slug-ul este blocat pentru că există comenzi." : "Salvează ca draft, apoi activează din lista de evenimente."}
          </p>
        </div>

        <EventEditor event={event?.data ?? null} hasOrders={(count ?? 0) > 0} />
      </main>
    </>
  );
}
