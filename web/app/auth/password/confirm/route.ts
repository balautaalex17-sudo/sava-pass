import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");

  if (tokenHash || code) {
    const supabase = await createClient();
    const { error } = tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
      : await supabase.auth.exchangeCodeForSession(code!);
    if (!error) {
      return NextResponse.redirect(new URL("/invite?type=recovery", request.url));
    }
  }

  return NextResponse.redirect(new URL("/invite?type=recovery&error=1", request.url));
}
