const PRODUCTION_PROJECT_REF = "shzyvrojbtbczqqoilip";

function required(name, minimumLength = 1) {
  const value = process.env[name]?.trim();
  if (!value || value.length < minimumLength) {
    throw new Error(`Staging environment is missing ${name}`);
  }
  return value;
}

const projectUrl = new URL(required("NEXT_PUBLIC_SUPABASE_URL"));
const projectRef = projectUrl.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1]?.toLowerCase();
const expectedRef = required("SUPABASE_TEST_PROJECT_REF").toLowerCase();
const siteUrl = new URL(required("NEXT_PUBLIC_SITE_URL"));
const emailSink = required("EMAIL_TEST_RECIPIENT").toLowerCase();

if (!projectRef) throw new Error("Staging Supabase URL has an unexpected host");
if (projectRef === PRODUCTION_PROJECT_REF) throw new Error("Refusing the production Supabase project");
if (projectRef !== expectedRef) throw new Error("SUPABASE_TEST_PROJECT_REF does not match the Supabase URL");
if (!siteUrl.hostname.includes("staging")) throw new Error("NEXT_PUBLIC_SITE_URL is not clearly a staging host");
if (!emailSink.endsWith("@resend.dev")) throw new Error("EMAIL_TEST_RECIPIENT must use a safe Resend test address");
if (process.env.STAFF_TEST_LOGIN_ENABLED === "true") throw new Error("Public staff test login must stay disabled on the stable staging URL");

required("NEXT_PUBLIC_SUPABASE_ANON_KEY", 20);
required("SUPABASE_SERVICE_ROLE_KEY", 32);
required("QR_SIGNING_SECRET", 32);
required("RESEND_API_KEY", 10);
required("CRON_SECRET", 32);

const stripeVariables = Object.keys(process.env).filter((name) => name.startsWith("STRIPE_"));
if (stripeVariables.length > 0) {
  throw new Error(`Stripe variables are forbidden in cash-only staging: ${stripeVariables.join(", ")}`);
}

for (const role of ["ADMIN", "BOARD", "SCANNER", "INTERVIEWER"]) {
  required(`STAFF_TEST_${role}_EMAIL`, 6);
  required(`STAFF_TEST_${role}_PASSWORD`, 12);
}

console.log(`Staging environment verified for Supabase ${projectRef} and ${siteUrl.hostname}.`);
console.log("Cash-only mode, safe email sink, four staff roles, and production guard are active.");
