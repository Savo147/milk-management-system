"use client";

import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/**
 * Whether this is a phone.
 *
 * This app is worked from a phone — the dairy fills the round in on one
 * walking the street, and the desktop layout is the spare. So "is this a
 * phone" is a question the components get to ask directly rather than
 * something only CSS knows.
 *
 * `sx={{ display: { xs: "none" } }}` covers most of it and should still be
 * the first choice: it costs no JavaScript and it is right on the first
 * paint. This is for the cases CSS cannot reach — a prop that has to be a
 * boolean, like a Dialog's `fullScreen`.
 *
 * `noSsr` because that is exactly such a case. Without it the server renders
 * the desktop answer and the browser corrects it a moment later, which for a
 * dialog means it opens as a floating card and then snaps to full screen in
 * front of you.
 */
export default function usePhone() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
}
