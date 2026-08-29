export const ATTENDANCE_MESSAGES: Record<string, string> = {
  accepted: "Prezență confirmată",
  already_present: "Membrul este deja marcat prezent",
  expired_token: "Codul QR a expirat. Membrul trebuie să îl reîncarce.",
  invalid_token: "Cod QR invalid",
  wrong_qr_type: "Ai scanat un bilet în modul de prezență",
  inactive_member: "Membrul nu este activ",
  attendance_closed: "Fereastra de prezență este închisă",
  self_scan_blocked: "Nu îți poți confirma singur prezența",
  unauthorized: "Nu ai permisiunea de a scana prezența",
  rate_limited: "Ai scanat prea repede. Așteaptă câteva secunde.",
  error: "Scanarea nu a putut fi procesată. Încearcă din nou.",
};

export const TICKET_MESSAGES: Record<string, string> = {
  reservation_found: "Rezervare găsită. Plata cash nu este confirmată.",
  valid_ticket: "Bilet valid. Plata este confirmată.",
  accepted: "Intrare confirmată",
  already_checked_in: "Biletul a fost deja folosit",
  payment_required: "Plata cash trebuie confirmată înainte de intrare",
  payment_confirmed: "Plata cash a fost confirmată",
  already_paid: "Plata era deja confirmată",
  cancelled: "Bilet anulat",
  expired: "Bilet expirat",
  expired_token: "Codul QR a expirat",
  invalid: "Biletul nu există",
  invalid_token: "Cod QR invalid",
  wrong_qr_type: "Ai scanat un cod de membru în modul de bilete",
  inactive_event: "Evenimentul nu este activ",
  unauthorized: "Nu ai permisiunea necesară",
  rate_limited: "Ai scanat prea repede. Așteaptă câteva secunde.",
  error: "Operațiunea nu a putut fi finalizată. Încearcă din nou.",
};

export function resultObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
