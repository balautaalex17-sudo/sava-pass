param(
  [ValidateSet("integration", "roles")]
  [string] $Mode = "integration"
)

$serviceRole = if ($Mode -eq "integration") { Read-Host "Supabase staging service-role key" -AsSecureString } else { $null }
$adminPassword = Read-Host "Staging Admin password" -AsSecureString
$boardPassword = Read-Host "Staging Board password" -AsSecureString
$scannerPassword = Read-Host "Staging Scanner password" -AsSecureString
$interviewerPassword = Read-Host "Staging Interviewer password" -AsSecureString

$servicePtr = if ($serviceRole) { [Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceRole) } else { [IntPtr]::Zero }
$adminPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword)
$boardPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($boardPassword)
$scannerPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($scannerPassword)
$interviewerPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($interviewerPassword)

try {
  if ($Mode -eq "integration") {
    $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($servicePtr)
  }
  $env:STAFF_TEST_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminPtr)
  $env:STAFF_TEST_BOARD_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($boardPtr)
  $env:STAFF_TEST_SCANNER_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($scannerPtr)
  $env:STAFF_TEST_INTERVIEWER_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($interviewerPtr)

  if ($Mode -eq "roles") {
    & node --env-file=../active/.env.staging scripts/verify-staging-roles.mjs https://sava-pass-staging.vercel.app
  }
  else {
    & node --env-file=../active/.env.staging --import tsx --test --test-concurrency=1 tests/*.test.ts tests/*.test.mjs
  }
  exit $LASTEXITCODE
}
finally {
  if ($servicePtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($servicePtr) }
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminPtr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($boardPtr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($scannerPtr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($interviewerPtr)
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:STAFF_TEST_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:STAFF_TEST_BOARD_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:STAFF_TEST_SCANNER_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:STAFF_TEST_INTERVIEWER_PASSWORD -ErrorAction SilentlyContinue
}
