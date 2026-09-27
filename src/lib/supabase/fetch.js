/**
 * fetch that survives a dead keep-alive socket, and a connection that takes
 * its time coming up.
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
 * left. Better to give up and say so than to leave somebody watching a button
 * do nothing for half a minute.
 */
const DEADLINE_MS = 12_000;

/**
 * How long one attempt gets before it is abandoned and tried afresh.
 *
 * Node's own connect timeout is ten seconds. With a twelve-second deadline
 * that left room for exactly one attempt, so on the failure this actually
 * hits — a connection that never opens — the retry above was dead code. Four
 * seconds gives all three attempts a real turn inside the same deadline, and
 * a flaky path usually comes up on the second or third.
 *
 * Only for reads. An abort can land after the request reached Supabase, and
 * sending a write twice is a worse outcome than a slow page.
 */
const ATTEMPT_MS = 4_000;

const SAFE_METHODS = new Set(["GET", "HEAD"]);

function isRetryable(err) {
  return RETRYABLE.has(err?.cause?.code ?? err?.code);
}

/** The caller's signal, if any, plus our own deadline for this attempt. */
function attemptSignal(outer) {
  const mine = AbortSignal.timeout(ATTEMPT_MS);
  return outer ? AbortSignal.any([outer, mine]) : mine;
}

export async function fetchWithRetry(input, init) {
  const method = (init?.method ?? "GET").toUpperCase();
  const safe = SAFE_METHODS.has(method);

  const startedAt = Date.now();
  let last;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      return await fetch(
        input,
        safe ? { ...init, signal: attemptSignal(init?.signal) } : init,
      );
    } catch (err) {
      // Our own deadline for this attempt, not the caller giving up: that is
      // worth another go. If the caller's signal is the one that fired, the
      // answer is no longer wanted at all.
      const timedOut =
        safe &&
        (err?.name === "TimeoutError" || err?.name === "AbortError") &&
        !init?.signal?.aborted;

      if (!isRetryable(err) && !timedOut) throw err;
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
