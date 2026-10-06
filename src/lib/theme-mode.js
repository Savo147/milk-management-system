"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Light or dark, and nothing else.
 *
 * There is no third "follow the device" setting to pick, on purpose. The
 * device is the *starting point*: somebody whose phone is in dark mode opens
 * the app and it is already dark, without being asked. The moment they pick
 * Light or Dark here, that is the answer and the device stops being asked.
 *
 * So "following the device" is not a choice — it is what happens while no
 * choice has been made. Which is why the menu has two lines, not three.
 *
 * Written out here rather than imported from `@/theme`. That is a "use
 * client" module, and importing a value out of one into server code does not
 * hand over the value — it hands over a reference that only means something
 * in the browser, and reading `.includes` off it on the server would throw at
 * the first request.
 */
const LOOKS = ["light", "dark"];

/** Where we land when nobody has chosen and the device has not reported. */
const FALLBACK = "light";

const COOKIE = "theme_mode";
/** What the browser said the device is set to. Written by SystemTheme. */
const SYSTEM_COOKIE = "theme_system";
/** A year. The choice is a preference, not a session. */
const MAX_AGE = 60 * 60 * 24 * 365;

const asLook = (v) => (LOOKS.includes(v) ? v : null);

/**
 * What to paint, and whether it was actually chosen.
 *
 * `explicit` is the half the root layout needs: while it is false the device
 * is still in charge, so the browser has to keep an eye on it. Once it is
 * true there is nothing to watch.
 *
 * In order:
 *   1. the signed-in person's own row — it follows them from the laptop to
 *      the phone and to any browser they sign in from;
 *   2. the cookie — not a leftover: the login and sign-up screens have nobody
 *      signed in to ask, and this is read in the root layout, which runs for
 *      those pages too. It is also what makes a reload instant, with no query
 *      standing between the request and the first paint;
 *   3. what the device reported;
 *   4. light.
 *
 * `getCurrentUser` is wrapped in React's `cache`, so the row is fetched once
 * per request however many layouts ask for it.
 */
export async function resolveTheme() {
  const user = await getCurrentUser();
  const store = await cookies();

  const chosen = asLook(user?.theme_mode) ?? asLook(store.get(COOKIE)?.value);
  if (chosen) return { mode: chosen, explicit: true };

  const device = asLook(store.get(SYSTEM_COOKIE)?.value);
  return { mode: device ?? FALLBACK, explicit: false };
}

/**
 * Saves a choice. The paint has already happened.
 *
 * AppTheme holds the look in client state, so the page turns the moment the
 * menu is clicked and this runs behind it. That is the whole reason there is
 * no `revalidatePath` here: it used to redraw every layout on the server
 * before the colour would change, which on a slow line meant sitting and
 * watching a spinner to switch a theme. Nothing on the server renders
 * differently now except the next cold load, and that reads the cookie.
 *
 * A failed write to the row is not worth stopping for: the browser has
 * already written the cookie and the page is already the right colour, and
 * saying "could not save" about something the person can plainly see has
 * happened reads as a bug. It is logged instead.
 */
export async function setThemeMode(mode) {
  const next = asLook(mode);
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

  return { ok: true };
}
