const INTERNAL_ORIGIN = "https://savapass.invalid";
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const ENCODED_UNSAFE_CHARACTER = /%(?:0[0-9a-f]|1[0-9a-f]|5c|7f)/i;

/** Accept only a path that stays on the SavaPass origin after URL normalization. */
export function safeLocalPath(
  value: string | null | undefined,
  fallback = "/conta",
): string {
  if (!value?.startsWith("/")) return fallback;
  if (
    value.includes("\\")
    || CONTROL_CHARACTER.test(value)
    || ENCODED_UNSAFE_CHARACTER.test(value)
  ) return fallback;

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
