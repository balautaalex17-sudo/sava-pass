param(
  [ValidateRange(1, 1000)] [int] $Scans = 1000,
  [ValidateRange(1, 1000)] [int] $Forms = 1000,
  [ValidateRange(1, 30)] [int] $Concurrency = 20,
  [ValidateRange(1, 100)] [int] $BatchSize = 25
)

$serviceRole = Read-Host "Supabase staging service-role key" -AsSecureString
$qrSecret = Read-Host "Staging QR signing secret" -AsSecureString
$servicePtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceRole)
$qrPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($qrSecret)

try {
  $env:NEXT_PUBLIC_SUPABASE_URL = "https://eetuijxhkpaqggegppek.supabase.co"
  $env:SUPABASE_TEST_PROJECT_REF = "eetuijxhkpaqggegppek"
  $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($servicePtr)
  $env:QR_SIGNING_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($qrPtr)
  $env:STRESS_CONFIRM = "STAGING_ONLY"
  $env:STRESS_SCANS = [string] $Scans
  $env:STRESS_FORMS = [string] $Forms
  $env:STRESS_CONCURRENCY = [string] $Concurrency
  $env:STRESS_BATCH_SIZE = [string] $BatchSize

  & node --import tsx scripts/stress-staging.mjs
  exit $LASTEXITCODE
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($servicePtr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($qrPtr)
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:QR_SIGNING_SECRET -ErrorAction SilentlyContinue
}
