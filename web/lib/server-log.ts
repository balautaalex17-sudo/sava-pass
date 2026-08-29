import "server-only";

type ErrorRecord = Record<string, unknown>;

function safeErrorTag(error: unknown) {
  if (error instanceof Error) return { name: error.name.slice(0, 80) };
  if (!error || typeof error !== "object") return { type: typeof error };

  const record = error as ErrorRecord;
  const name = typeof record.name === "string" ? record.name.slice(0, 80) : undefined;
  const code = typeof record.code === "string" || typeof record.code === "number"
    ? String(record.code).slice(0, 80)
    : undefined;
  const status = typeof record.status === "number" ? record.status : undefined;
  return { name, code, status };
}

/** Log enough to correlate failures without printing provider payloads or PII. */
export function logServerError(
  event: string,
  error: unknown,
  context: Record<string, string | number | boolean | null> = {},
) {
  console.error(event, { ...context, error: safeErrorTag(error) });
}

/** Log a successful server-side outcome without printing provider payloads or PII. */
export function logServerInfo(
  event: string,
  context: Record<string, string | number | boolean | null> = {},
) {
  console.info(event, context);
}
