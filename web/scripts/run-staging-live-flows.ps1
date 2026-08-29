param(
  [string] $ResumeCheckoutEmail = "",
  [string] $ResumeApplicationEmail = "",
  [string] $ResumeContactEmail = ""
)

$serviceRole = Read-Host "Supabase staging service-role key" -AsSecureString
$boardPassword = Read-Host "Staging Board password" -AsSecureString
$servicePtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceRole)
$boardPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($boardPassword)

try {
  $env:NEXT_PUBLIC_SUPABASE_URL = "https://eetuijxhkpaqggegppek.supabase.co"
  $env:SUPABASE_TEST_PROJECT_REF = "eetuijxhkpaqggegppek"
  $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($servicePtr)
  $env:STAFF_TEST_BOARD_EMAIL = "board@savapass-staging.example.com"
  $env:STAFF_TEST_BOARD_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($boardPtr)
  $env:LIVE_FLOW_CONFIRM = "STAGING_ONLY"
  if ($ResumeCheckoutEmail) {
    $env:LIVE_FLOW_RESUME_EMAIL = $ResumeCheckoutEmail
  }
  if ($ResumeApplicationEmail) {
    $env:LIVE_FLOW_RESUME_APPLICATION_EMAIL = $ResumeApplicationEmail
  }
  if ($ResumeContactEmail) {
    $env:LIVE_FLOW_RESUME_CONTACT_EMAIL = $ResumeContactEmail
  }

  & node scripts/verify-staging-live-flows.mjs https://sava-pass-staging.vercel.app
  exit $LASTEXITCODE
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($servicePtr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($boardPtr)
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:STAFF_TEST_BOARD_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:LIVE_FLOW_RESUME_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:LIVE_FLOW_RESUME_APPLICATION_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:LIVE_FLOW_RESUME_CONTACT_EMAIL -ErrorAction SilentlyContinue
}
