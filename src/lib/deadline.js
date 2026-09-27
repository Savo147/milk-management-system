/**
 * Gives a promise only so long, then carries on without it.
 *
 * For the parts of a page that are decoration. The chat preview and the
 * notification bell are worth having, but not worth holding the whole page
 * for: with a connection that drops, waiting for them turned a page that had
 * all its real data into a twelve-second blank screen.
 *
 * The request is not cancelled, only abandoned — whatever it was doing it can
 * finish doing, and the next page load will find it cached or retried.
 */
export function withDeadline(promise, ms, fallback) {
  let timer;

  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

/**
 * How long the header's own loads get. Long enough for a slow-but-working
 * connection, short enough that a dead one costs a moment rather than a wait.
 */
export const HEADER_DEADLINE_MS = 2_500;
