const PRODUCTION_PROJECT_REF = "shzyvrojbtbczqqoilip";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Stop integration tests before they can mutate the live SavaPass project. */
export function assertSafeTestDatabase() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) throw new Error("Supabase test environment is missing");

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Supabase test URL is invalid");
  }

  if (LOCAL_HOSTS.has(url.hostname)) return;

  const projectRef = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1]?.toLowerCase();
  if (!projectRef) {
    throw new Error("Integration tests require localhost or an explicit Supabase test branch");
  }
  if (projectRef === PRODUCTION_PROJECT_REF) {
    throw new Error("Refusing to run integration tests against the production SavaPass database");
  }
  if (process.env.SUPABASE_TEST_PROJECT_REF?.toLowerCase() !== projectRef) {
    throw new Error("Set SUPABASE_TEST_PROJECT_REF to the non-production branch ref before testing");
  }
}

assertSafeTestDatabase();
