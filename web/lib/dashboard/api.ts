import { NextResponse } from "next/server";
import { DashboardAccessError } from "@/lib/dashboard/auth";

export function dashboardAccessResponse(error: unknown): NextResponse | null {
  if (!(error instanceof DashboardAccessError)) return null;

  if (error.code === "UNAUTHENTICATED") {
    return NextResponse.json(
      { error: "Trebuie să te autentifici." },
      { status: 401 },
    );
  }

  if (error.code === "INACTIVE_MEMBER") {
    return NextResponse.json(
      { error: "Contul de membru nu este activ." },
      { status: 403 },
    );
  }

  return NextResponse.json(
    { error: "Nu ai permisiunea necesară." },
    { status: 403 },
  );
}

export function privateJson(data: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
