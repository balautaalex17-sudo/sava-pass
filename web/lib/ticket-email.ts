import QRCode from "qrcode";
import type { Attachment } from "resend";

import { escapeHtml } from "@/lib/escape-html";

export const TICKET_QR_CONTENT_ID = "savapass-ticket-qr";

interface TicketEmailDetails {
  ticketUrl: string;
  qrToken: string;
  accessUrl?: string;
}

interface TicketEmailCopy {
  eventTitle: string;
  headline: string;
  supportingText: string;
}

/** Find the signed ticket token already present in a notification's ticket URL. */
export function extractTicketEmailDetails(body: string): TicketEmailDetails | null {
  const match = body.match(/https?:\/\/[^\s<>"']+\/bilet\/((?:SPT2|SP1)\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i);
  if (!match) return null;

  try {
    const ticketUrl = new URL(match[0]);
    if (ticketUrl.protocol !== "https:" && ticketUrl.protocol !== "http:") return null;

    const accessMatch = body.match(/Vezi toate biletele:\s*(https?:\/\/[^\s<>"']+)/i);
    let accessUrl: string | undefined;
    if (accessMatch) {
      const parsedAccessUrl = new URL(accessMatch[1]);
      if (parsedAccessUrl.protocol === "https:" || parsedAccessUrl.protocol === "http:") {
        accessUrl = parsedAccessUrl.toString();
      }
    }

    return {
      ticketUrl: ticketUrl.toString(),
      qrToken: match[1],
      ...(accessUrl ? { accessUrl } : {}),
    };
  } catch {
    return null;
  }
}

/** Build a PNG that Resend can show inline and also expose as an attachment. */
export async function createTicketQrAttachment(qrToken: string): Promise<Attachment> {
  const content = await QRCode.toBuffer(qrToken, {
    errorCorrectionLevel: "M",
    width: 480,
    margin: 2,
    color: { dark: "#0F172A", light: "#FFFFFF" },
  });

  return {
    filename: "bilet-savapass-qr.png",
    content,
    contentType: "image/png",
    contentId: TICKET_QR_CONTENT_ID,
  };
}

function ticketEmailCopy(body: string, ticketUrl: string): TicketEmailCopy {
  const confirmation = body.match(/^Biletul pentru (.+?) este gata:\s*https?:\/\//i);
  if (confirmation) {
    return {
      eventTitle: confirmation[1].trim(),
      headline: "Biletul tău este gata",
      supportingText: "Intrarea ta este confirmată. Păstrează acest email la îndemână.",
    };
  }

  const reminder = body.match(/^(.+?) începe la (.+?)\.\s*Biletul tău:\s*https?:\/\//i);
  if (reminder) {
    return {
      eventTitle: reminder[1].trim(),
      headline: "Ne vedem curând",
      supportingText: `Evenimentul începe la ${reminder[2].trim()}.`,
    };
  }

  const fallbackText = body
    .replace(ticketUrl, "")
    .replace(/\s+/g, " ")
    .replace(/(?:Bilet(?:ul tău)?\s*:|este gata:)\s*$/i, "")
    .trim();

  return {
    eventTitle: "Bilet SavaPass",
    headline: "Biletul tău",
    supportingText: fallbackText || "Biletul este pregătit pentru intrare.",
  };
}

function emailDocument(content: string, preheader: string) {
  return `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>SavaPass</title>
    <style>
      :root { color-scheme: light only; }
      @media only screen and (max-width: 620px) {
        .sp-shell { width: 100% !important; }
        .sp-page-pad { padding: 18px 12px 28px !important; }
        .sp-card-pad { padding-left: 22px !important; padding-right: 22px !important; }
        .sp-qr { width: 248px !important; height: 248px !important; }
        .sp-button { display: block !important; box-sizing: border-box !important; width: 100% !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    ${content}
  </body>
</html>`;
}

function renderTicketEmail(body: string, ticket: TicketEmailDetails, inlineQrContentId?: string) {
  const copy = ticketEmailCopy(body, ticket.ticketUrl);
  const ticketUrl = escapeHtml(ticket.ticketUrl);
  const accessUrl = ticket.accessUrl ? escapeHtml(ticket.accessUrl) : null;
  const eventTitle = escapeHtml(copy.eventTitle);
  const headline = escapeHtml(copy.headline);
  const supportingText = escapeHtml(copy.supportingText);
  const qrBlock = inlineQrContentId
    ? `<div style="margin:0 auto 18px;width:272px;max-width:100%;box-sizing:border-box;padding:11px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px">
        <img class="sp-qr" src="cid:${escapeHtml(inlineQrContentId)}" width="248" height="248" alt="Codul QR al biletului tău" style="display:block;width:248px;max-width:100%;height:auto;margin:0 auto;border:0">
      </div>`
    : `<div style="margin:0 auto 18px;padding:18px 20px;max-width:320px;background:#f1fafe;border-radius:12px;color:#075985;font-size:14px;line-height:1.55">
        Codul QR poate fi deschis din biletul online.
      </div>`;

  const content = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f1f5f9">
    <tr>
      <td class="sp-page-pad" align="center" style="padding:32px 16px 40px">
        <table class="sp-shell" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px">
          <tr>
            <td style="padding:0 4px 14px;color:#475569;font-size:12px;line-height:1.4">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:15px;font-weight:800;letter-spacing:-.01em;color:#0f172a">SavaPass</td>
                  <td align="right" style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#475569">Interact Sf. Sava</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="overflow:hidden;background:#ffffff;border:1px solid #dbe4ee;border-radius:16px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="sp-card-pad" style="padding:28px 32px 30px;background-color:#006fa1;background-image:linear-gradient(135deg,#006fa1 0%,#2563eb 100%);color:#ffffff">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom:24px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffffff">${headline}</td>
                        <td align="right" valign="top" style="padding-bottom:24px">
                          <span style="display:inline-block;padding:6px 10px;border:1px solid rgba(255,255,255,.55);border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffffff">Confirmat</span>
                        </td>
                      </tr>
                    </table>
                    <div style="max-width:470px;font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.025em;color:#ffffff">${eventTitle}</div>
                    <div style="margin-top:10px;max-width:480px;font-size:14px;line-height:1.55;color:#eaf8ff">${supportingText}</div>
                  </td>
                </tr>
                <tr>
                  <td class="sp-card-pad" align="center" style="padding:28px 32px 32px;background:#ffffff">
                    <div style="margin-bottom:6px;font-size:17px;line-height:1.35;font-weight:800;color:#0f172a">Scanează la intrare</div>
                    <div style="margin-bottom:20px;font-size:13px;line-height:1.5;color:#475569">Arată codul echipei de la acces.</div>
                    ${qrBlock}
                    <div style="margin:0 auto 24px;max-width:360px;font-size:12px;line-height:1.55;color:#64748b">Poți folosi și biletul online dacă imaginea QR nu se încarcă.</div>
                    <a class="sp-button" href="${ticketUrl}" style="display:inline-block;min-width:220px;padding:14px 24px;border-radius:12px;background:#0f172a;color:#ffffff;font-size:14px;line-height:1.2;font-weight:800;text-align:center;text-decoration:none;mso-padding-alt:0">Deschide biletul</a>
                    ${accessUrl ? `<div style="margin-top:12px"><a class="sp-button" href="${accessUrl}" style="display:inline-block;min-width:220px;padding:14px 24px;border-radius:12px;background:#009fe3;color:#ffffff;font-size:14px;line-height:1.2;font-weight:800;text-align:center;text-decoration:none;mso-padding-alt:0">Vezi toate biletele</a></div>` : ""}
                    <div style="margin-top:18px;font-size:12px;line-height:1.5;color:#64748b">Butonul nu funcționează? <a href="${ticketUrl}" style="color:#006fa1;font-weight:700;text-decoration:underline">Deschide linkul direct</a>.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 18px 0;font-size:11px;line-height:1.6;color:#64748b">
              Bilet emis de Interact Sf. Sava prin SavaPass.<br>
              Păstrează acest email până la finalul evenimentului.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  return emailDocument(content, `${copy.headline}: ${copy.eventTitle}`);
}

function renderGenericEmail(body: string) {
  const escapedBody = escapeHtml(body).replace(/\n/g, "<br>");
  const content = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f1f5f9">
    <tr>
      <td class="sp-page-pad" align="center" style="padding:32px 16px 40px">
        <table class="sp-shell" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px">
          <tr>
            <td style="padding:0 4px 14px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:15px;font-weight:800;color:#0f172a">SavaPass</td>
                  <td align="right" style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#475569">Interact Sf. Sava</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="overflow:hidden;background:#ffffff;border:1px solid #dbe4ee;border-radius:16px">
              <div style="height:6px;background:#009fe3;font-size:0;line-height:0">&nbsp;</div>
              <div class="sp-card-pad" style="padding:30px 32px 34px">
                <div style="margin-bottom:14px;font-size:22px;line-height:1.25;font-weight:800;letter-spacing:-.02em;color:#0f172a">Mesaj de la Interact Sf. Sava</div>
                <div style="font-size:15px;line-height:1.75;color:#334155">${escapedBody}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 18px 0;font-size:11px;line-height:1.6;color:#64748b">Trimis prin SavaPass.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  return emailDocument(content, body.replace(/\s+/g, " ").trim());
}

/** Render a safe, email-client-compatible notification, with a pass layout for tickets. */
export function renderNotificationEmail(body: string, inlineQrContentId?: string) {
  const ticket = extractTicketEmailDetails(body);
  return ticket ? renderTicketEmail(body, ticket, inlineQrContentId) : renderGenericEmail(body);
}
