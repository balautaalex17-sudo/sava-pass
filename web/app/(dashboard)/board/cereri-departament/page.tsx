import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalLink as Link } from "@/components/dashboard/PortalLink";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { canReviewDepartmentRequests, DEPARTMENT_REQUEST_LABELS } from "@/lib/dashboard/department-requests";
import { isMemberDepartment, parseDepartmentOptions } from "@/lib/dashboard/member-departments";
import { formatDateTime } from "@/lib/dashboard/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DepartmentRequestReview } from "@/components/dashboard/DepartmentRequestReview";
import styles from "@/components/dashboard/department-requests.module.css";

export const metadata: Metadata = { title: "Cereri HR / PR", robots: { index: false, follow: false } };

export default async function DepartmentRequestsPage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  const viewer = await requirePagePermission("manage_members");
  if (!canReviewDepartmentRequests(viewer.profile.role)) redirect("/membru?acces=refuzat");
  const query = await searchParams;
  const history = query.view === "history";
  const page = Math.max(1, Math.min(10000, Number.parseInt(query.page ?? "1", 10) || 1));
  const base = `/board/cereri-departament?view=${history ? "history" : "pending"}`;
  let requestsQuery = supabaseAdmin.from("member_department_requests").select(
    "*, member:profiles!member_department_requests_member_id_fkey(full_name, grade), reviewer:profiles!member_department_requests_reviewed_by_fkey(full_name)", { count: "exact" },
  );
  requestsQuery = history ? requestsQuery.neq("status", "pending") : requestsQuery.eq("status", "pending");
  const [{ data: requests, error, count }, balanceResult] = await Promise.all([
    requestsQuery.order(history ? "reviewed_at" : "created_at", { ascending: history ? false : true }).order("id").range((page - 1) * 20, page * 20 - 1),
    supabaseAdmin.rpc("get_member_department_balance"),
  ]);
  if (error) throw error;
  if (balanceResult.error) throw balanceResult.error;
  const balance = parseDepartmentOptions(balanceResult.data);
  if (!balance) throw new Error("Invalid department balance");

  return <div className="dash-page dash-page--member">
    <header className="dash-page-head"><div><span className="dash-eyebrow">Board · Membri</span><h1>Cereri HR / PR</h1><p>Evaluează schimbările de departament. Membrii rămân în echipa actuală până la aprobare.</p></div></header>
    <div className={styles.balance}><span><strong>HR</strong> {balance.hr} membri</span><span><strong>PR</strong> {balance.pr} membri</span></div>
    <nav className="attendance-views" aria-label="Cereri de schimbare a departamentului">
      <Link href="/board/cereri-departament" aria-current={!history ? "page" : undefined}>În așteptare</Link>
      <Link href="/board/cereri-departament?view=history" aria-current={history ? "page" : undefined}>Istoric</Link>
    </nav>
    <p className={styles.meta}>{count ?? 0} cereri {history ? "soluționate" : "în așteptare"}</p>
    <section className="dash-section" aria-label={history ? "Istoric cereri" : "Cereri în așteptare"}>
      {!requests?.length && <div className="dash-card dash-empty"><strong>{history ? "Nicio cerere soluționată" : "Nicio cerere în așteptare"}</strong>Cererile trimise din profilul membrilor apar aici.</div>}
      {requests?.map((request) => <article key={`${request.id}:${request.status}`} className={`dash-card ${styles.card}`}>
        <div className={styles.heading}><div><h2>{request.member?.full_name ?? "Membru"}</h2><p>{request.from_department.toUpperCase()} → {request.to_department.toUpperCase()}{request.member?.grade ? ` · ${request.member.grade}` : ""}</p></div>
          <span className={`dash-status dash-status--${request.status === "approved" ? "success" : request.status === "rejected" ? "danger" : "warning"}`}>{DEPARTMENT_REQUEST_LABELS[request.status]}</span>
        </div>
        <p className={styles.meta}>Trimisă pe {formatDateTime(request.created_at)}</p>
        <p className={styles.text}>{request.reason}</p>
        {request.status === "pending" && isMemberDepartment(request.to_department) && <DepartmentRequestReview requestId={request.id} target={request.to_department} balanceWarning={balance.blockedDepartment === request.to_department} isOwn={request.member_id === viewer.user.id} />}
        {request.reviewed_at && <p className={styles.meta}>Evaluată de {request.reviewer?.full_name ?? "Board"} · {formatDateTime(request.reviewed_at)}</p>}
        {request.review_note && <p className={styles.text}><strong>Răspuns:</strong> {request.review_note}</p>}
      </article>)}
    </section>
    <nav className={styles.pagination} aria-label="Pagini cereri">
      {page > 1 && <Link href={`${base}&page=${page - 1}`}>Pagina anterioară</Link>}
      {page * 20 < (count ?? 0) && <Link href={`${base}&page=${page + 1}`}>Pagina următoare</Link>}
    </nav>
  </div>;
}
