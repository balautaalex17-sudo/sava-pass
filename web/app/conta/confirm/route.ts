import { NextRequest, NextResponse } from "next/server";
import { safeLocalPath } from "@/lib/safe-local-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const safeNext = safeLocalPath(request.nextUrl.searchParams.get("next"), "/conta");

  if (tokenHash || code) {
    const supabase = await createClient();
    const { error } = tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
      : await supabase.auth.exchangeCodeForSession(code!);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  return NextResponse.redirect(new URL("/conta?error=1", request.url));
}
