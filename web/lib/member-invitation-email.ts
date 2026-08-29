import { escapeHtml } from "@/lib/escape-html";
import type { StaffRole } from "@/lib/roles";

interface MemberInvitationEmailInput {
  fullName: string;
  email: string;
  code: string;
  activationUrl: string;
  role: StaffRole | null;
}

const accessLabels: Record<StaffRole, string> = {
  admin: "Super admin",
  board: "Board",
  scanner: "Scanner bilete",
  statistici: "Statistici",
  interviewer: "Intervievator",
};

function accessLabel(role: StaffRole | null) {
  return role ? accessLabels[role] : "Membru Interact";
}

/**
 * Pure renderer for the account invitation. Keeping it free of provider code
 * makes the exact email easy to test and preview without sending anything.
 */
export function renderMemberInvitationEmail({
  fullName,
  email,
  code,
  activationUrl,
  role,
}: MemberInvitationEmailInput) {
  const firstName = fullName.trim().split(/\s+/)[0] || "Bun venit";
  const safeFirstName = escapeHtml(firstName);
  const safeEmail = escapeHtml(email);
  const safeCode = escapeHtml(code);
  const safeActivationUrl = escapeHtml(activationUrl);
  const safeAccessLabel = escapeHtml(accessLabel(role));

  const subject = "Contul tău de membru SavaPass este pregătit";
  const text = [
    `Salut, ${firstName}.`,
    "",
    "Contul tău de membru Interact Sf. Sava este pregătit.",
    `Cod de activare: ${code}`,
    `Activează contul: ${activationUrl}`,
    "",
    `Email: ${email}`,
    `Acces: ${accessLabel(role)}`,
    "",
    "Introdu emailul și codul, apoi alege o parolă. După activare vei avea acces la dashboard, codul QR de prezență, întâlniri, istoricul tău și instrumentele rolului tău.",
    "",
    "Codul nu expiră, dar poate fi folosit o singură dată și nu trebuie trimis altcuiva.",
    "Dacă nu te așteptai la această invitație, ignoră mesajul și anunță echipa Interact Sf. Sava.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#F8FAFC;color:#0F172A;font-family:Manrope,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Codul tău de activare SavaPass este ${safeCode}.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#F8FAFC;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="height:5px;background:#009FE3;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:24px 28px;background:#0F172A;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="color:#FFFFFF;font-size:20px;font-weight:800;letter-spacing:-0.03em;">SavaPass</td>
                    <td align="right" style="color:#BAE6FD;font-size:12px;font-weight:700;">Interact Sf. Sava</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 12px;">
                <div style="margin-bottom:12px;color:#006FA1;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Cont de membru</div>
                <h1 style="margin:0;color:#0F172A;font-size:27px;line-height:1.2;letter-spacing:-0.025em;">Salut, ${safeFirstName}.</h1>
                <p style="margin:12px 0 0;color:#334155;font-size:16px;line-height:1.65;">Ai fost adăugat în echipa Interact Sf. Sava. Folosește codul de mai jos pentru a-ți activa contul și a intra în dashboard.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 8px;">
                <div style="padding:22px 18px;background:#F1FAFE;border:1px solid #BAE6FD;border-radius:14px;text-align:center;">
                  <div style="margin-bottom:8px;color:#475569;font-size:12px;font-weight:700;">Codul tău de activare</div>
                  <div style="color:#0F172A;font-family:'Courier New',ui-monospace,monospace;font-size:34px;font-weight:800;letter-spacing:0.18em;line-height:1.2;">${safeCode}</div>
                  <div style="margin-top:10px;color:#475569;font-size:12px;line-height:1.5;">Nu expiră · valabil pentru o singură activare</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 8px;">
                <a href="${safeActivationUrl}" style="display:block;padding:14px 20px;background:#009FE3;border-radius:14px;color:#FFFFFF;font-size:16px;font-weight:800;line-height:1.2;text-align:center;text-decoration:none;">Activează contul</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:11px 0;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Email</td>
                    <td align="right" style="padding:11px 0;border-bottom:1px solid #E2E8F0;color:#0F172A;font-size:13px;font-weight:700;">${safeEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding:11px 0;color:#64748B;font-size:13px;">Acces inițial</td>
                    <td align="right" style="padding:11px 0;color:#0F172A;font-size:13px;font-weight:700;">${safeAccessLabel}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 28px 28px;">
                <h2 style="margin:0 0 12px;color:#0F172A;font-size:16px;line-height:1.4;">Ce găsești după activare</h2>
                <p style="margin:0;color:#334155;font-size:14px;line-height:1.75;">Dashboard-ul tău de membru, codul QR pentru prezență, întâlnirile clubului, istoricul personal și orice instrumente suplimentare oferite rolului tău.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#F8FAFC;border-top:1px solid #E2E8F0;color:#475569;font-size:12px;line-height:1.6;">
                Codul este secret. Echipa SavaPass nu ți-l va cere prin mesaj sau telefon.<br>
                Dacă nu te așteptai la invitație, ignoră emailul și anunță echipa Interact Sf. Sava.
              </td>
            </tr>
          </table>
          <div style="max-width:560px;padding:18px 12px 0;color:#64748B;font-size:11px;line-height:1.5;text-align:center;">SavaPass · Interact Sf. Sava · București</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
