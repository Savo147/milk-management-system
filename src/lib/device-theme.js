/**
 * The two things only the browser can do about the theme: read what the
 * device is set to, and write the answer down where the server can see it.
 *
 * Browser-only, and deliberately not part of theme-mode.js — that file is
 * "use server". These are its pair: theme-mode.js reads the cookies on the
 * server, this writes them in the browser.
 *
 * Both are written here rather than left to the Server Action, because a
 * cookie written in the browser has taken effect the moment it is written.
 * The action still writes it too, but the action can be slow or can fail on a
 * bad line, and a theme that quietly forgets itself on reload because a
 * request never landed is worse than one saved twice.
 */

/** The choice somebody made in the app: "light" or "dark", or absent. */
export const CHOICE_COOKIE = "theme_mode";
/** What the device itself is set to. Not a choice — a reading. */
export const SYSTEM_COOKIE = "theme_system";

/** A year. A theme is a preference, not a session. */
const MAX_AGE = 60 * 60 * 24 * 365;

const write = (name, value) => {
  document.cookie = `${name}=${value}; path=/; max-age=${MAX_AGE}; samesite=lax`;
  return value;
};

/** "dark" or "light", straight off the phone or laptop. */
export function deviceLook() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Leaves the device's reading where the next server render will find it. */
export const reportDeviceLook = (look = deviceLook()) =>
  write(SYSTEM_COOKIE, look);

/**
 * Writes down a choice made in the app.
 *
 * From here on the device is not consulted: a choice outranks a reading, and
 * theme-mode.js looks at this cookie first.
 */
export const rememberChoice = (look) => write(CHOICE_COOKIE, look);
