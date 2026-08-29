/**
 * Converts common Romanian phone formats to one database-safe form.
 * Examples: 0722123456, +40 722 123 456, 0040 722 123 456.
 */
export function normalizeRomanianPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  let nationalNumber = "";

  if (digits.length === 10 && digits.startsWith("0")) {
    nationalNumber = digits.slice(1);
  } else if (digits.length === 11 && digits.startsWith("40")) {
    nationalNumber = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith("0040")) {
    nationalNumber = digits.slice(4);
  }

  return /^\d{9}$/.test(nationalNumber) ? `+40${nationalNumber}` : null;
}
