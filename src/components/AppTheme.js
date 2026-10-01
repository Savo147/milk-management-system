"use client";

import { useMemo } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { buildTheme } from "@/theme";

/**
 * Builds the theme in the browser from the mode the server chose.
 *
 * Only the mode crosses over — a word. The theme object itself cannot: it
 * carries functions in its component overrides, and functions do not
 * serialize from a Server Component to a client one.
 */
export default function AppTheme({ mode, children }) {
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
