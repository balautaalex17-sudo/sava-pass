import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/dashboard/auth";
import {
  recruitmentQuestionsFromFields,
  type RecruitmentQuestion,
} from "@/lib/recruitment-spec";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RecruitmentCampaignManager } from "./RecruitmentCampaignManager";

export const metadata: Metadata = {
  title: "Formular public",
  robots: { index: false, follow: false },
};

export default async function PublicRecruitmentControlPage() {
  await requirePagePermission("manage_recruitment_campaigns");
  const { data, error } = await supabaseAdmin
    .from("recruitment_campaigns")
    .select("id, title, intro, status, opens_at, closes_at, closed_message, updated_at")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const campaigns = data ?? [];
  const questionsByCampaign: Record<string, RecruitmentQuestion[]> = {};

  if (campaigns.length) {
    const { data: forms, error: formsError } = await supabaseAdmin
      .from("recruitment_forms")
      .select("id, campaign_id, version, recruitment_fields(key, label, position)")
      .eq("status", "active")
      .in("campaign_id", campaigns.map((campaign) => campaign.id))
      .order("version", { ascending: false });
    if (formsError) throw formsError;

    for (const form of forms ?? []) {
      if (form.campaign_id && !questionsByCampaign[form.campaign_id]) {
        questionsByCampaign[form.campaign_id] = recruitmentQuestionsFromFields(
          form.recruitment_fields ?? [],
        );
      }
    }
  }

  return (
    <div className="dash-page">
      <header className="dash-page-head">
        <div>
          <span className="dash-eyebrow">Recrutare publică</span>
          <h1>Formularul de înscrieri</h1>
          <p>
            Board-ul decide când formularul este public. Când este închis,
            candidații văd mesajul configurat aici și nu pot trimite aplicații.
          </p>
        </div>
      </header>
      <RecruitmentCampaignManager
        campaigns={campaigns}
        questionsByCampaign={questionsByCampaign}
        referenceNow={new Date().toISOString()}
      />
    </div>
  );
}
