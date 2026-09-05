/** Opt-in server diagnostics. Never log URLs, filters, credentials or payloads. */
export const timedSupabaseFetch: typeof fetch = async (input, init) => {
  if (process.env.SAVAPASS_PERF_LOG !== "1") return fetch(input, init);

  const started = performance.now();
  let status = 0;
  let operation = "supabase";
  try {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const match = url.pathname.match(/^\/rest\/v1\/(?:rpc\/)?([a-z_]+)$/);
    if (match) operation = match[1];
    else if (url.pathname.startsWith("/auth/v1/")) operation = "auth";
    const response = await fetch(input, init);
    status = response.status;
    return response;
  } finally {
    console.info("[performance:server]", JSON.stringify({
      operation,
      status,
      durationMs: Math.round(performance.now() - started),
    }));
  }
};
