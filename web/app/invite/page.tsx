import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { InviteClient, InviteLoading } from "./InviteClient";

export const metadata: Metadata = {
  title: "Activează contul de membru",
  robots: { index: false, follow: false },
};

export default async function InvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Suspense fallback={<InviteLoading />}>
      <InviteClient initiallyVerified={Boolean(user)} />
    </Suspense>
  );
}
