/**
 * fetch that survives a dead keep-alive socket.
 *
 * A dev server that has been sitting idle keeps pooled connections that the
 * other end has already dropped. The next request picks one up and dies before
 * it is ever sent — Node reports the bare "fetch failed", and Supabase wraps it
 * as AuthRetryableFetchError, which is the library telling us in its own name
 * that trying again is the right answer.
 *
 * Only connection-level failures are retried. Those happen before the server
 * has seen anything, so repeating them cannot apply the same write twice. A
 * request that reached Supabase and came back with an error — a bad password,
 * a rejected row — is returned untouched.
 */

const RETRYABLE = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const ATTEMPTS = 3;

/**
 * Stop retrying once this much time has gone by, however many attempts are
 * left. A dropped socket fails instantly and is worth three goes; a connection
 * timeout takes ten seconds each, and three of those is half a minute of
 * somebody watching a button do nothing. Better to give up and say so.
 */
const DEADLINE_MS = 12_000;

function isRetryable(err) {
  return RETRYABLE.has(err?.cause?.code ?? err?.code);
}

export async function fetchWithRetry(input, init) {
  const startedAt = Date.now();
  let last;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      if (!isRetryable(err)) throw err;
      last = err;

      const spent = Date.now() - startedAt;
      if (attempt === ATTEMPTS - 1 || spent > DEADLINE_MS) break;

      // 150ms, then 300ms. Long enough for the pool to hand out a fresh
      // socket, short enough that nobody notices.
      await new Promise((r) => setTimeout(r, 150 * 2 ** attempt));
    }
  }

  // warn, not error: a flaky connection is worth knowing about, but Next's
  // dev overlay turns console.error into a full-screen report, which makes a
  // two-second hiccup look like the app has fallen over.
  console.warn(
    `[supabase] unreachable after ${Math.round((Date.now() - startedAt) / 1000)}s:`,
    last?.cause?.code ?? last?.message,
  );
  throw last;
}
