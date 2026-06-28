/**
 * Escape user/admin-controlled strings before interpolating into email HTML
 * (or any HTML string built by hand). Shared by the ticket + membership email
 * builders so neither can inject markup from buyer/applicant input.
 */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}
