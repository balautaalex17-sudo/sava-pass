import "server-only";

import { unstable_cache, updateTag } from "next/cache";
import {
  RECRUITMENT_QUESTIONS,
  recruitmentQuestionsFromFields,
  type RecruitmentQuestion,
} from "@/lib/recruitment-spec";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const PUBLIC_RECRUITMENT_TAG = "public-recruitment-state";

export type PublicRecruitmentState = {
  campaignId: string | null;
  title: string;
  eyebrow: string;
  intro: string;
  closedMessage: string;
  opensAt: string | null;
  closesAt: string | null;
  isOpen: boolean;
  status: "open" | "scheduled" | "closed";
  deadlineLabel: string | null;
  questions: RecruitmentQuestion[];
};

const CLOSED_FALLBACK = "Înscrierile sunt închise momentan. Urmărește site-ul pentru următoarea perioadă de recrutare.";

function withinWindow(opensAt: string | null, closesAt: string | null, now: number) {
  return (!opensAt || new Date(opensAt).getTime() <= now)
    && (!closesAt || new Date(closesAt).getTime() >= now);
}

function deadlineLabel(value: string | null) {
  if (!value) return null;
  return `Înscrieri până pe ${new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value))}`;
}

async function loadPublicRecruitmentState(): Promise<PublicRecruitmentState> {
  const fallback: PublicRecruitmentState = {
    campaignId: null,
    title: "Următoarea generație",
    eyebrow: "Devino membru",
    intro: "Pregătim următoarea perioadă de recrutare.",
    closedMessage: CLOSED_FALLBACK,
    opensAt: null,
    closesAt: null,
    isOpen: false,
    status: "closed",
    deadlineLabel: null,
    questions: RECRUITMENT_QUESTIONS.map((question) => ({ ...question })),
  };

  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from("recruitment_campaigns")
      .select("id, title, eyebrow, intro, status, opens_at, closes_at, application_limit, closed_message, updated_at")
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error || !campaigns?.length) return fallback;

    const now = Date.now();
    const openCampaign = campaigns.find((campaign) =>
      campaign.status === "open" && withinWindow(campaign.opens_at, campaign.closes_at, now),
    );
    const campaign = openCampaign ?? campaigns.find((item) => item.status === "open") ?? campaigns[0];

    let isOpen = Boolean(openCampaign);
    let closedMessage = campaign.closed_message || CLOSED_FALLBACK;
    let questions: RecruitmentQuestion[] = RECRUITMENT_QUESTIONS.map((question) => ({ ...question }));
    if (isOpen) {
      const formPromise = supabaseAdmin
        .from("recruitment_forms")
        .select("id, recruitment_fields(key, label, position)")
        .eq("status", "active")
        .or(`campaign_id.eq.${campaign.id},campaign_id.is.null`)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const countPromise = campaign.application_limit
        ? supabaseAdmin
            .from("membership_applications")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", campaign.id)
        : Promise.resolve({ count: null });

      const [{ data: form }, { count }] = await Promise.all([formPromise, countPromise]);
      if (!form) {
        isOpen = false;
        closedMessage = "Formularul este în pregătire. Revino în curând.";
      } else {
        questions = recruitmentQuestionsFromFields(form.recruitment_fields ?? []);
      }
      if (isOpen && campaign.application_limit && (count ?? 0) >= campaign.application_limit) {
        isOpen = false;
        closedMessage = "Perioada de înscriere s-a încheiat deoarece a fost atins numărul maxim de aplicații.";
      }
    }

    const scheduled = campaign.status === "open"
      && Boolean(campaign.opens_at)
      && new Date(campaign.opens_at!).getTime() > now;

    return {
      campaignId: campaign.id,
      title: campaign.title,
      eyebrow: campaign.eyebrow || "Devino membru",
      intro: campaign.intro,
      closedMessage,
      opensAt: campaign.opens_at,
      closesAt: campaign.closes_at,
      isOpen,
      status: isOpen ? "open" : scheduled ? "scheduled" : "closed",
      deadlineLabel: isOpen ? deadlineLabel(campaign.closes_at) : null,
      questions,
    };
  } catch {
    return fallback;
  }
}

const cachedPublicRecruitmentState = unstable_cache(
  loadPublicRecruitmentState,
  ["public-recruitment-state-v1"],
  { tags: [PUBLIC_RECRUITMENT_TAG], revalidate: 60 },
);

export function getPublicRecruitmentState(): Promise<PublicRecruitmentState> {
  return cachedPublicRecruitmentState();
}

/** Call only from a Server Action after recruitment settings change. */
export function revalidatePublicRecruitmentState(): void {
  updateTag(PUBLIC_RECRUITMENT_TAG);
}
