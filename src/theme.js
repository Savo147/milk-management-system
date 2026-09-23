"use client";

import { createTheme, alpha } from "@mui/material/styles";

// Blue picked from the Krishna Dairy logo, with a hand-built ramp so tints are
// consistent everywhere instead of one-off alpha values per component.
const BRAND = {
  50: "#eaf4fc",
  100: "#c9e3f8",
  200: "#a3d0f3",
  300: "#74b8ec",
  400: "#3d9ce2",
  500: "#127fd2",
  600: "#0b6cb5",
  700: "#095895",
  800: "#074676",
  900: "#05334f",
};

const GREY = {
  50: "#f7f8fa",
  100: "#eef0f4",
  200: "#e2e6ec",
  300: "#cbd2dc",
  400: "#9aa4b2",
  500: "#6b7683",
  600: "#4d5763",
  700: "#39424d",
  800: "#252c35",
  900: "#151a20",
};

const theme = createTheme({
  cssVariables: true,

  palette: {
    primary: {
      ...BRAND,
      main: BRAND[500],
      dark: BRAND[700],
      light: BRAND[200],
    },
    secondary: { main: "#00897b" },
    success: { main: "#12855c", light: "#e6f5ee", dark: "#0c6244" },
    warning: { main: "#b26a00", light: "#fdf1e0", dark: "#8a5200" },
    error: { main: "#c62828", light: "#fdeaea", dark: "#9b1c1c" },
    info: { main: BRAND[500], light: BRAND[50], dark: BRAND[700] },
    grey: GREY,
    background: { default: GREY[50], paper: "#ffffff" },
    text: { primary: GREY[900], secondary: GREY[500] },
    divider: GREY[200],
  },

  shape: { borderRadius: 10 },

  typography: {
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    // Tighter tracking on headings reads as more considered at large sizes.
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.015em" },
    h6: { fontWeight: 700, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, letterSpacing: 0 },
    caption: { letterSpacing: 0 },
  },

  components: {
    // Flat, bordered surfaces throughout — drop shadows on every card make a
    // dense admin screen look noisy.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: GREY[200] },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${GREY[200]}`,
          borderRadius: 14,
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          // SHOUTING BUTTONS are the fastest way to look unfinished.
          textTransform: "none",
          borderRadius: 9,
          paddingInline: 16,
        },
        sizeLarge: { paddingBlock: 10, fontSize: "0.95rem" },
      },
    },

    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 9 } },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 7 },
        sizeSmall: { height: 23, fontSize: "0.72rem" },
        outlined: { borderWidth: 1 },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          backgroundColor: "#fff",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: GREY[300] },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: GREY[400],
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: GREY[200],
          paddingBlock: 11,
        },
        head: {
          backgroundColor: GREY[50],
          color: GREY[600],
          fontWeight: 700,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: 0 },
          "&.MuiTableRow-hover:hover": { backgroundColor: GREY[50] },
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          "&.Mui-selected": {
            backgroundColor: alpha(BRAND[500], 0.1),
            color: BRAND[700],
            "&:hover": { backgroundColor: alpha(BRAND[500], 0.14) },
            "& .MuiListItemIcon-root": { color: BRAND[600] },
            "& .MuiListItemText-primary": { fontWeight: 600 },
          },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, border: "1px solid transparent" },
        standardInfo: { backgroundColor: BRAND[50], borderColor: BRAND[100] },
      },
    },

    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: GREY[800],
          fontSize: "0.75rem",
          borderRadius: 7,
          paddingBlock: 6,
        },
      },
    },
  },
});

export default theme;
