import { escapeHtml } from "@/lib/escape-html";

export type AuthEmailKind = "magiclink" | "recovery" | "invite";

interface AuthEmailTemplateInput {
  kind: AuthEmailKind;
  email: string;
  actionUrl: string;
}

const COPY: Record<AuthEmailKind, { subject: string; eyebrow: string; title: string; body: string; cta: string }> = {
  magiclink: {
    subject: "Linkul tău de acces SavaPass",
    eyebrow: "Acces securizat",
    title: "Intră în contul tău SavaPass",
    body: "Folosește butonul de mai jos pentru a intra în cont. Linkul este personal și poate fi folosit o singură dată.",
    cta: "Intră în cont",
  },
  recovery: {
    subject: "Alege o parolă nouă pentru SavaPass",
    eyebrow: "Resetare parolă",
    title: "Setează o parolă nouă",
    body: "Ai cerut schimbarea parolei contului SavaPass. Continuă folosind butonul de mai jos.",
    cta: "Alege parola",
  },
  invite: {
    subject: "Ai fost invitat în echipa SavaPass",
    eyebrow: "Invitație în echipă",
    title: "Contul tău SavaPass este pregătit",
    body: "Ai fost invitat în echipa Interact Sf. Sava. Deschide invitația pentru a-ți confirma contul.",
    cta: "Acceptă invitația",
  },
};

/** Pure renderer: it can be tested without Supabase or Resend. */
export function renderAuthLinkEmail({ kind, email, actionUrl }: AuthEmailTemplateInput) {
  const copy = COPY[kind];
  const safeEmail = escapeHtml(email);
  const safeActionUrl = escapeHtml(actionUrl);

  const text = [
    copy.title,
    "",
    copy.body,
    "",
    actionUrl,
    "",
    `Adresă asociată: ${email}`,
    "Dacă nu ai cerut acest mesaj, îl poți ignora.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="ro">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${copy.subject}</title></head>
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
          <tr><td style="height:5px;background:#009fe3;font-size:0">&nbsp;</td></tr>
          <tr><td style="padding:24px 28px;background:#0f172a;color:#fff;font-size:20px;font-weight:800">SavaPass</td></tr>
          <tr><td style="padding:32px 28px">
            <div style="margin-bottom:12px;color:#0077a8;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${copy.eyebrow}</div>
            <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25">${copy.title}</h1>
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.65">${copy.body}</p>
            <a href="${safeActionUrl}" style="display:block;padding:14px 20px;background:#009fe3;border-radius:12px;color:#fff;font-size:16px;font-weight:800;text-align:center;text-decoration:none">${copy.cta}</a>
            <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6">Adresă asociată: ${safeEmail}<br>Dacă nu ai cerut acest mesaj, îl poți ignora.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject: copy.subject, html, text };
}
