"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * The names, written here rather than imported from `@/theme`.
 *
 * theme.js is a "use client" module. Importing a value out of one into
 * server code does not hand over the value — it hands over a reference that
 * only means something in the browser, and reading `.includes` off it on the
 * server would throw at the first request. It is two words; they live here.
 * `buildTheme` falls back to the light one for anything it does not know, so
 * the two cannot disagree in a way that breaks a page.
 */
const THEME_MODES = ["light", "dark"];
/**
 * What to draw in when nothing else says otherwise — a first visit, the login
 * screen before anyone has signed in, a browser with no cookie yet.
 *
 * It is kept in step with the column's own default by hand (migration 0014).
 * The two answer different moments — this one before there is a row to read,
 * that one when a row is created — so they have to agree or a new account
 * would change colour the instant it signed in.
 */
const DEFAULT_MODE = "dark";

const COOKIE = "theme_mode";
/** A year. The choice is a preference, not a session. */
const MAX_AGE = 60 * 60 * 24 * 365;

const clean = (value) => (THEME_MODES.includes(value) ? value : null);

/**
 * Which look to draw in.
 *
 * The signed-in person's own choice comes first: it is kept on their row, so
 * it follows them from the laptop to the phone and to any browser they sign
 * in from. Every row carries a value — see migration 0013 — so for anyone
 * signed in this is the only thing that answers.
 *
 * The cookie is the fallback, and it is not a leftover. The login and sign-up
 * screens have nobody signed in to ask, and this is read in the root layout,
 * which runs for those pages too.
 *
 * Reading it on the server is what keeps the very first paint in the right
 * colours. Read in the browser, every page would render once in the default
 * look and then swap — a flash on every load — and React would complain that
 * the server and the browser had drawn different things.
 *
 * `getCurrentUser` is wrapped in React's `cache`, so the row is fetched once
 * per request however many layouts ask for it.
 */
export async function getThemeMode() {
  const user = await getCurrentUser();
  const mine = clean(user?.theme_mode);
  if (mine) return mine;

  const store = await cookies();
  return clean(store.get(COOKIE)?.value) ?? DEFAULT_MODE;
}

/**
 * Saves the choice in both places.
 *
 * The row is the record. The cookie is a copy, so signing out and landing on
 * the login screen does not throw the look away, and so a cold page load does
 * not have to wait on a query before it knows what colour to be.
 *
 * A failed write to the row is not worth stopping for: the cookie has already
 * taken, the page is already the right colour, and saying "could not save"
 * about something the person can plainly see has happened reads as a bug. It
 * is logged instead.
 */
export async function setThemeMode(mode) {
  const next = clean(mode);
  if (!next) return { error: "Unknown theme." };

  const store = await cookies();
  store.set(COOKIE, next, { maxAge: MAX_AGE, path: "/", sameSite: "lax" });

  const user = await getCurrentUser();

  if (user) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("users")
      .update({ theme_mode: next })
      // Their own row and no other. A Server Action is a public endpoint.
      .eq("id", user.id);

    if (error)
      console.warn("[theme] could not save to the row:", error.message);
  }

  // The look is chosen in the root layout, so every page has to be redrawn.
  revalidatePath("/", "layout");
  return { ok: true };
}
