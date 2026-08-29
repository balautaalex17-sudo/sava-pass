import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { calculateRecruitmentCompletion } from "../lib/dashboard/recruitment";
import { parseRecruitmentFile, stableSourceRowIdentifier } from "../lib/dashboard/recruitment-import";
import { signMemberAttendanceWithSecret, signTicketWithSecret, verifyMemberAttendanceWithSecret, verifyTicketTokenWithSecret } from "../lib/qr-token-core";

const secret = "test-secret-with-at-least-thirty-two-characters";
const projectFile = (path:string) => readFileSync(join(process.cwd(),path),"utf8");

test("1. normal member cannot access board routes", () => {
  const boardPages = ["app/(dashboard)/board/page.tsx","app/(dashboard)/board/echipa/page.tsx","app/(dashboard)/board/intalniri/page.tsx","app/(dashboard)/board/scaneaza-prezenta/page.tsx","app/(dashboard)/board/scaneaza-bilete/page.tsx","app/(dashboard)/board/prezenta/page.tsx","app/(dashboard)/board/formular-inscrieri/page.tsx","app/(dashboard)/board/inscrieri/page.tsx","app/(dashboard)/board/evenimente/page.tsx","app/(dashboard)/board/istoric-scanari/page.tsx","app/(dashboard)/board/membri/page.tsx","app/(dashboard)/board/permisiuni/page.tsx"];
  for(const file of boardPages) assert.match(projectFile(file),/requirePagePermission\("(?:view_board_dashboard|manage_staff_assignments|manage_meetings|scan_meeting_attendance|scan_event_tickets|view_attendance_roster|manage_recruitment_campaigns|view_recruitment_signups|manage_public_events|evaluate_interview_candidates|view_scan_audit_log|manage_members|manage_permissions)"\)/);
  assert.match(projectFile("app/(dashboard)/board/interviuri/page.tsx"),/requireAnyPagePermission\(\[[\s\S]*?"evaluate_recruitment_forms"[\s\S]*?"evaluate_interview_candidates"[\s\S]*?\]\)/);
  assert.match(projectFile("lib/dashboard/auth.ts"),/redirect\("\/membru\?acces=refuzat"\)/);
});

test("2. normal member cannot call board scan endpoints directly", () => {
  assert.match(projectFile("app/api/board/attendance/scan/route.ts"),/requirePermission\("scan_meeting_attendance"\)/);
  for(const path of ["inspect","check-in"]) assert.match(projectFile(`app/api/board/tickets/${path}/route.ts`),/requirePermission\("scan_event_tickets"\)/);
  assert.match(projectFile("app/api/board/tickets/confirm-payment/route.ts"),/requirePermission\("confirm_cash_payments"\)/);
  assert.match(projectFile("components/dashboard/OperationalScanner.tsx"),/\/api\/board\/tickets\/check-in/);
  assert.doesNotMatch(projectFile("components/dashboard/OperationalScanner.tsx"),/ticketAction\("confirm-payment"\)/);
  assert.match(projectFile("supabase/migrations/20260827115816_auto_confirm_cash_on_ticket_scan.sql"),/payment_confirmed[\s\S]*v_payment_confirmed/);
});

test("6. expired attendance QR is rejected", () => {
  const now=Date.now(); const token=signMemberAttendanceWithSecret(secret,randomUUID(),30,now).token;
  assert.deepEqual(verifyMemberAttendanceWithSecret(secret,token,now+31_000),{ok:false,code:"expired_token"});
});

test("7. ticket QR is rejected by attendance validation", () => {
  const token=signTicketWithSecret(secret,randomUUID());
  assert.deepEqual(verifyMemberAttendanceWithSecret(secret,token),{ok:false,code:"wrong_qr_type"});
});

test("8. member QR is rejected by ticket validation", () => {
  const token=signMemberAttendanceWithSecret(secret,randomUUID()).token;
  assert.deepEqual(verifyTicketTokenWithSecret(secret,token),{ok:false,code:"wrong_qr_type"});
});

test("16. sign-up data is inaccessible to normal members", () => {
  assert.match(projectFile("app/(dashboard)/board/inscrieri/page.tsx"),/requirePagePermission\("view_recruitment_signups"\)/);
  assert.match(projectFile("app/api/board/recruitment/import/preview/route.ts"),/requirePermission\("import_recruitment_signups"\)/);
  assert.doesNotMatch(projectFile("proxy.ts"),/applicant|source_payload/);
});

test("17. required-field completion follows active conditions", () => {
  const fields = [
    {key:"name",label:"Nume",source_header:"Nume",required:true,conditional_rules:null},
    {key:"volunteer",label:"Voluntariat",source_header:"Voluntariat",required:true,conditional_rules:null},
    {key:"details",label:"Detalii",source_header:"Detalii",required:true,conditional_rules:{field:"volunteer",operator:"equals",value:"da"}},
  ];
  assert.deepEqual(calculateRecruitmentCompletion(fields as never,{name:" Ana ",volunteer:"nu",details:""}),{completionPercentage:100,isComplete:true,missingRequiredFields:[]});
  assert.deepEqual(calculateRecruitmentCompletion(fields as never,{name:"Ana",volunteer:"da",details:"   "}),{completionPercentage:66,isComplete:false,missingRequiredFields:["Detalii"]});
});

test("18. sheet import preserves exact headers and long multiline answers", async () => {
  const headers = ["Timestamp","Email address","1. Nume și prenume","2. Email","3. Număr de telefon","4. Clasa (menționează și litera)","5. Ai mai fost implicat/ă în activități de voluntariat până acum? Dacă răspunsul este da, au ajutat acestea la formarea ta ca persoană; Care crezi că este diferența dintre „a face voluntariat” și „a avea impact real”?","6. Care e un defect pe care consideri că îl ai? Cum crezi că te va ajuta Interactul să-l remediezi? ","7. Cum reacționezi când lucrezi cu persoane care nu își respectă responsabilitățile?\nAi fi dispus(ă) să îți asumi vina pentru o greșeală care nu îți aparține, pentru binele echipei? Explică.","8. Dacă ai avea un buget limitat, dar multă influență, ce proiect social ai începe?","9. Dacă treci printr-o perioadă aglomerată cu multe task-uri, cum îti planifici timpul ca să reușești să le gestionezi pe toate?","10. Cum ai atrage tineri care cred că voluntariatul este „o pierdere de timp”?","11. Ce te inspiră cel mai mult atunci când trebuie să creezi ceva nou?","Ce întrebare crezi că ar fi trebuit să te întrebăm și nu am făcut-o? Vrei să ne mai transmiți ceva? 😊"];
  const long="Prima linie, cu virgulă.\nA doua linie păstrată integral.";
  const csv=[headers.map((value)=>`"${value.replaceAll('"','""')}"`).join(","),headers.map((_,index)=>`"${(index===0?"08/13/2026 12:00:00":index===1?"ana@example.com":index===2?"Ana Popescu":index===6?long:`răspuns ${index}`).replaceAll('"','""')}"`).join(",")].join("\r\n");
  const parsed=await parseRecruitmentFile("export.csv",Buffer.from(csv));
  assert.deepEqual(parsed.headers,headers); assert.equal(parsed.rows[0][headers[6]],long); assert.equal(parsed.headers[7].endsWith(" "),true); assert.equal(parsed.rows[0][headers[6]].includes("\n"),true);
});

test("19. duplicate spreadsheet rows receive the same stable identifier", () => {
  const row={Timestamp:"08/13/2026 12:00:00","Email address":"Ana@Example.com"};
  const first=stableSourceRowIdentifier(row,{respondent_email:row["Email address"],timestamp:row.Timestamp});
  const second=stableSourceRowIdentifier({...row},{respondent_email:"ana@example.com",timestamp:row.Timestamp});
  assert.ok(first); assert.equal(first,second);
});

test("20. leaving the dashboard is deterministic and login does not trap browser history", () => {
  const dashboardNav = projectFile("components/dashboard/DashboardNav.tsx");
  const staffLogin = projectFile("app/login/page.tsx");

  assert.match(dashboardNav, /href="\/"[\s\S]*?replace[\s\S]*?Înapoi la site/);
  assert.match(staffLogin, /router\.replace\(staffRedirectForRole\(profile\?\.role, next\)\)/);
  assert.doesNotMatch(staffLogin, /router\.push\(staffRedirectForRole/);
});
