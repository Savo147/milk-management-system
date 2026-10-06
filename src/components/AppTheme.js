"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { buildTheme } from "@/theme";

/**
 * The look in force, and the one handle that changes it.
 *
 * Kept in context so the picker up in the top bar can turn the page over
 * without asking the server first. Everything coloured — including the cards
 * drawn by Server Components, which read the CSS variables CssBaseline
 * writes onto :root — follows from this one value.
 */
const ThemeModeContext = createContext({ mode: "light", setMode: () => {} });

export const useThemeMode = () => useContext(ThemeModeContext);

/**
 * Builds the theme in the browser from the mode the server chose.
 *
 * Only the mode crosses over — a word. The theme object itself cannot: it
 * carries functions in its component overrides, and functions do not
 * serialize from a Server Component to a client one.
 *
 * The mode then lives in state here, not in the prop. The server still
 * decides the *first* paint, which is what keeps a page from loading white
 * and turning black a moment later. After that the switch is a local one: a
 * click repaints immediately and the save goes off behind it. It used to go
 * the other way round — save, revalidate every layout, then recolour — and
 * on a slow line changing theme meant watching a spinner.
 */
export default function AppTheme({ mode: fromServer, children }) {
  const [mode, setMode] = useState(fromServer);

  // When the server hands down a different mode than it did last time, it
  // knows something we do not — the device setting changed, or another tab
  // saved a choice — so its word wins. Adjusted during render rather than in
  // an effect so the page never paints once in the old colours first.
  const [seen, setSeen] = useState(fromServer);
  if (seen !== fromServer) {
    setSeen(fromServer);
    setMode(fromServer);
  }

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const handle = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <ThemeModeContext.Provider value={handle}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
