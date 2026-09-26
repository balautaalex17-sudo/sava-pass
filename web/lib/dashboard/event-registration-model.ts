import type { Tables } from "@/lib/supabase/types";

export type EventRegistration = {
  id: string;
  eventId: string;
  eventTitle: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string | null;
  code: string;
  ticketType: string;
  priceBani: number;
  status: Tables<"tickets">["status"];
  issuedAt: string;
  checkedInAt: string | null;
};

export const registrationStatusLabels: Record<EventRegistration["status"], string> = {
  reserved: "Rezervat",
  paid: "Plătit",
  checked_in: "Intrat",
  cancelled: "Anulat",
  expired: "Expirat",
};
