import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/dashboard/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MembersManager } from "./MembersManager";

export const metadata: Metadata = { title: "Membri", robots: { index: false, follow: false } };

export default async function MembersPage(){const viewer=await requirePagePermission("manage_members");const{data}=await supabaseAdmin.from("profiles").select("id, full_name, email, phone, grade, membership_status, role, created_at").order("full_name");const members=(data??[]).map((row)=>({id:row.id,fullName:row.full_name,email:row.email,phone:row.phone,grade:row.grade,membershipStatus:row.membership_status,role:row.role,createdAt:row.created_at}));return <div className="dash-page"><header className="dash-page-head"><div><span className="dash-eyebrow">Administrare membri</span><h1>Membri</h1><p>Super Admin poate administra toate rolurile. Board poate administra doar membrii și rolurile aflate sub Board.</p></div></header><MembersManager members={members} viewerRole={viewer.profile.role}/></div>}
