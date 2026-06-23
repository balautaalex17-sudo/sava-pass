import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
    if (!error) return NextResponse.redirect(new URL("/invite", request.url));
  }

  return NextResponse.redirect(new URL("/invite?error=1", request.url));
}
