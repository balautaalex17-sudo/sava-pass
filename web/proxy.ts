import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { hasStaffRole, type StaffRole } from "@/lib/roles";
import { staffHomeForRole, staffRedirectForRole } from "@/lib/staff-routes";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isScannerRoute = pathname.startsWith("/scanner");
  const isStatsRoute = pathname.startsWith("/statistici");
  const isStaffRoute = isScannerRoute || isAdminRoute || isStatsRoute;
  const isBuyerRoute = pathname.startsWith("/conta");

  if (!isStaffRoute && !isBuyerRoute && !isLoginRoute) return NextResponse.next();

  const response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Buyer routes only refresh the session cookie. Page components decide redirects.
  if (isBuyerRoute) return response;

  if (isLoginRoute && !session) return response;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  const role = profile?.role as StaffRole | null | undefined;

  if (isLoginRoute) {
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(staffRedirectForRole(role, next), request.url));
  }

  if (!role) return NextResponse.redirect(new URL(staffHomeForRole(role), request.url));

  if (role === "admin") return response;

  if (isScannerRoute && hasStaffRole(role, ["scanner"])) return response;
  if (isStatsRoute && hasStaffRole(role, ["statistici"])) return response;

  if (role === "scanner") {
    return NextResponse.redirect(new URL("/scanner", request.url));
  }

  if (role === "statistici") {
    return NextResponse.redirect(new URL("/statistici", request.url));
  }

  return NextResponse.redirect(new URL("/conta", request.url));
}

export const config = {
  matcher: ["/login", "/scanner/:path*", "/admin/:path*", "/statistici/:path*", "/conta/:path*"],
};
