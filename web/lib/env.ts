import "server-only";

import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(32).optional(),
);

const optionalText = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(3).optional(),
);

const optionalEmail = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().email().optional(),
);

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(32),
  QR_SIGNING_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(10),
  RESEND_FROM: optionalText,
  EMAIL_TEST_RECIPIENT: optionalEmail,
  CRON_SECRET: optionalSecret,
});

const parsed = serverEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  QR_SIGNING_SECRET: process.env.QR_SIGNING_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM,
  EMAIL_TEST_RECIPIENT: process.env.EMAIL_TEST_RECIPIENT,
  CRON_SECRET: process.env.CRON_SECRET,
});

if (!parsed.success) {
  const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))]
    .filter(Boolean)
    .join(", ");
  throw new Error(`Invalid server environment variables: ${names}`);
}

export const serverEnv = parsed.data;
