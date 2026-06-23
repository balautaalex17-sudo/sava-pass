"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Numele e prea scurt").max(80, "Numele e prea lung"),
});

export interface ProfileState {
  ok?: boolean;
  message?: string;
  error?: string;
}

export async function updateProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const parsed = profileSchema.safeParse({ name: form.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nume invalid." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Trebuie să fii autentificat." };

  const { error } = await supabase.auth.updateUser({ data: { name: parsed.data.name } });
  if (error) return { error: "Profilul nu a putut fi salvat." };

  revalidatePath("/conta");
  return { ok: true, message: "Profil salvat." };
}
