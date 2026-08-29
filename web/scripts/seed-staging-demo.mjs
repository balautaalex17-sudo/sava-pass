import { createClient } from "@supabase/supabase-js";

const PRODUCTION_PROJECT_REF = "shzyvrojbtbczqqoilip";
const MEETING_ID = "00000000-0000-4000-8000-000000000701";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const projectUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const expectedProjectRef = required("SUPABASE_TEST_PROJECT_REF");
const actualProjectRef = new URL(projectUrl).hostname.split(".")[0];

if (actualProjectRef === PRODUCTION_PROJECT_REF) {
  throw new Error("Refusing to seed the production Supabase project");
}
if (actualProjectRef !== expectedProjectRef) {
  throw new Error("Supabase project URL does not match SUPABASE_TEST_PROJECT_REF");
}

const supabase = createClient(
  projectUrl,
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const boardEmail = required("STAFF_TEST_BOARD_EMAIL");
const { data: board, error: boardError } = await supabase
  .from("profiles")
  .select("id")
  .eq("email", boardEmail)
  .eq("role", "board")
  .eq("membership_status", "active")
  .single();

if (boardError || !board) {
  throw boardError ?? new Error("The staging Board account is not ready");
}

const now = Date.now();
const meeting = {
  id: MEETING_ID,
  title: "[STAGING] Ședință test QR",
  description: "Date fictive pentru testarea manuală a prezenței și a scannerului QR.",
  starts_at: new Date(now + 30 * 60_000).toISOString(),
  ends_at: new Date(now + 2 * 60 * 60_000).toISOString(),
  location: "Sala de test SavaPass",
  attendance_opens_at: new Date(now - 60 * 60_000).toISOString(),
  attendance_closes_at: new Date(now + 3 * 60 * 60_000).toISOString(),
  status: "attendance_open",
  created_by: board.id,
  updated_at: new Date(now).toISOString(),
};

const { error: meetingError } = await supabase
  .from("meetings")
  .upsert(meeting, { onConflict: "id" });

if (meetingError) throw meetingError;

console.log("Staging demo meeting: ready");
