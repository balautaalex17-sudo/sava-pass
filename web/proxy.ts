import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { hasStaffRole, type StaffRole } from "@/lib/roles";
import { staffHomeForRole, staffRedirectForRole } from "@/lib/staff-routes";

const MAX_PUBLIC_ACTION_BYTES = 128 * 1024;

function isPublicActionPath(pathname: string) {
  return pathname === "/contact"
    || pathname === "/devino-membru"
    || pathname === "/conta"
    || pathname === "/login"
    || /^\/[^/]+\/checkout$/.test(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/dev/") && process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (
    request.method === "POST"
    && request.headers.has("next-action")
    && isPublicActionPath(pathname)
  ) {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_PUBLIC_ACTION_BYTES) {
      return NextResponse.json({ error: "Request body too large." }, { status: 413 });
    }
  }

  const isLoginRoute = pathname === "/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isScannerRoute = pathname.startsWith("/scanner");
  const isStatsRoute = pathname.startsWith("/statistici");
  const isStaffRoute = isScannerRoute || isAdminRoute || isStatsRoute;
  const isBuyerRoute = pathname.startsWith("/conta");
  const isMemberDashboardRoute = pathname.startsWith("/membru");
  const isBoardDashboardRoute = pathname.startsWith("/board");
  const isDashboardRoute = isMemberDashboardRoute || isBoardDashboardRoute;

  if (!isStaffRoute && !isBuyerRoute && !isLoginRoute && !isDashboardRoute) return NextResponse.next();

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

  // This project uses an asymmetric ES256 signing key, so getClaims() verifies
  // the signed session locally instead of making an Auth network request.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub ?? null;

  // Buyer routes only refresh the session cookie. Page components decide redirects.
  if (isBuyerRoute) return response;

  if (isLoginRoute && !userId) return response;

  if (!userId) {
    const loginUrl = new URL(isDashboardRoute ? "/conta/login" : "/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Dashboard layouts and every action/handler perform the authoritative
  // permission check. The proxy only refreshes cookies and redirects guests.
  if (isDashboardRoute) return response;

  const [profileResult, operationalRolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, membership_status")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("profile_roles")
      .select("role")
      .eq("profile_id", userId),
  ]);

  const profile = profileResult.data;
  const roles = profile?.membership_status === "active"
    ? [
        ...(profile.role ? [profile.role as StaffRole] : []),
        ...(operationalRolesResult.data ?? []).map((assignment) => assignment.role),
      ]
    : [];

  const role = roles[0] ?? null;

  if (isLoginRoute) {
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(staffRedirectForRole(role, next), request.url));
  }

  if (!role) return NextResponse.redirect(new URL(staffHomeForRole(role), request.url));

  if (role === "admin") return response;

  if (isScannerRoute && roles.includes("scanner")) return response;
  if (isStatsRoute && hasStaffRole(role, ["statistici"])) return response;

  if (roles.includes("scanner")) {
    return NextResponse.redirect(new URL("/scanner", request.url));
  }

  if (role === "statistici") {
    return NextResponse.redirect(new URL("/statistici", request.url));
  }

  return NextResponse.redirect(new URL("/conta", request.url));
}

export const config = {
  matcher: ["/dev/:path*", "/login", "/contact", "/devino-membru", "/:slug/checkout", "/scanner/:path*", "/admin/:path*", "/statistici/:path*", "/conta/:path*", "/membru/:path*", "/board/:path*"],
};
