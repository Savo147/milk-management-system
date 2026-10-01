"use client";

import { createTheme, alpha } from "@mui/material/styles";

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

/**
 * The looks the app can wear. One so far: a white page, black type and black
 * buttons.
 *
 * It is written as a set rather than as the only palette so a dark one can be
 * dropped in beside it without the rest of this file moving. Only the palette
 * changes between them — the shapes, the type and every component override
 * below are shared, so two looks can never drift into being two different
 * applications.
 *
 * The status colours are deliberately not part of a palette: a green Done and
 * a red Missed mean different things, and painting them black would throw
 * that away. Colour there is information, not decoration.
 */
const PALETTE = {
  light: {
    // Buttons, links and anything else that takes the primary colour come out
    // black. contrastText is set by hand rather than left to MUI to work out,
    // so it stays white if the black is ever softened to a charcoal.
    primary: {
      50: "#f4f4f5",
      100: "#e4e4e7",
      200: "#c9c9ce",
      300: "#a1a1a8",
      400: "#52525a",
      500: "#111113",
      600: "#09090b",
      700: "#000000",
      800: "#000000",
      900: "#000000",
      main: "#111113",
      dark: "#000000",
      light: "#52525a",
      contrastText: "#ffffff",
    },
    secondary: { main: "#3f3f46" },
    info: { main: "#111113", light: "#f4f4f5", dark: "#000000" },
    // White, not off-white: the page and the cards are the same sheet of
    // paper, and the border is what separates them.
    background: { default: "#ffffff", paper: "#ffffff" },
    text: { primary: "#000000", secondary: "#4b4b52" },
    divider: "#dedee1",
  },

  dark: {
    // `mode` is not decoration. MUI reads it to work out dozens of things of
    // its own — the shade a Paper lifts to, what "action.hover" means, which
    // way a disabled control fades. Leave it out and half the app stays lit
    // for a light page that is no longer there.
    mode: "dark",

    // The mirror of the light one: a black page with white buttons, where
    // that had a white page with black buttons.
    primary: {
      50: "#18181b",
      100: "#27272a",
      200: "#3f3f46",
      300: "#52525b",
      400: "#a1a1aa",
      500: "#fafafa",
      600: "#f4f4f5",
      700: "#ffffff",
      800: "#ffffff",
      900: "#ffffff",
      main: "#fafafa",
      dark: "#ffffff",
      light: "#a1a1aa",
      contrastText: "#09090b",
    },
    secondary: { main: "#d4d4d8" },
    info: { main: "#fafafa", light: "#27272a", dark: "#ffffff" },
    // The page is black; a card is one step off it. Both the same colour
    // would leave the cards invisible, and a border alone is a thin thing to
    // hang a whole layout on.
    background: { default: "#000000", paper: "#121214" },
    text: { primary: "#ffffff", secondary: "#a1a1aa" },
    divider: "#2a2a2e",
  },
};

/**
 * Status colours, which keep their meaning in both looks but not their
 * values: #12855c is a good green on white and a muddy one on black, where it
 * no longer clears the contrast a reader needs.
 */
const STATUS = {
  light: {
    success: { main: "#12855c", light: "#e6f5ee", dark: "#0c6244" },
    warning: { main: "#b26a00", light: "#fdf1e0", dark: "#8a5200" },
    error: { main: "#c62828", light: "#fdeaea", dark: "#9b1c1c" },
  },
  dark: {
    success: { main: "#3ddc97", light: "#0f2a21", dark: "#8cf0c4" },
    warning: { main: "#f5b544", light: "#2d2211", dark: "#ffd27d" },
    error: { main: "#ff6b6b", light: "#2e1416", dark: "#ffa5a5" },
  },
};

/**
 * The grey ramp, turned over for the dark look.
 *
 * The app reaches for `grey.50` and `grey.100` when it wants "a shade off the
 * page" — the Open chat bar under the chat preview, an avatar with no photo,
 * a quoted message. With one ramp shared by both looks those all stayed pale,
 * so on a black page they came out as white slabs.
 *
 * Turning the ramp over keeps every one of those call sites honest without
 * touching them: 50 still means "barely off the surface" and 900 still means
 * "as far from it as this goes" — it is which direction that changes.
 */
const GREY_DARK = {
  50: "#141417",
  100: "#1c1c21",
  200: "#27272c",
  300: "#3a3a41",
  400: "#5c5c65",
  500: "#8b8b95",
  600: "#a8a8b1",
  700: "#c7c7ce",
  800: "#e3e3e8",
  900: "#f6f6f8",
};

/**
 * The eight dashboard tile colours, in both looks.
 *
 * `card` is the wash behind the whole tile, `bg` the icon chip, `fg` the icon
 * itself and `line` the edge down the left. `fade` is what the bloom in the
 * corner dissolves into — transparent white on a light page, transparent
 * black on a dark one. Fading to the wrong one leaves a grey haze across the
 * corner of every tile, because a colour fading to "transparent white" passes
 * through white on the way.
 */
const TILE_HUES = [
  [
    "blue",
    "#e8f1fb #c6def6 #15599a #1b6fbf",
    "#0e1b28 #16344f #8cc5f0 #2f86c8",
  ],
  [
    "green",
    "#e8f6ee #c3e7d3 #19774e #1f8f5f",
    "#0c1d16 #143b2b #6fdca9 #22a06b",
  ],
  [
    "violet",
    "#f1ebfd #d9cbf9 #6136c4 #7b4bd4",
    "#17122b #2a204f #bda6f5 #8a5ce0",
  ],
  [
    "amber",
    "#fdf4e2 #fae1a8 #946600 #c08400",
    "#241a09 #45310e #f0c267 #cf9312",
  ],
  [
    "pink",
    "#fcedf4 #f8cce1 #a8306f #c33d84",
    "#251019 #441f32 #f2a3c6 #d45593",
  ],
  [
    "indigo",
    "#ebedfc #cfd4f7 #3b48b8 #4b58cf",
    "#13152f #242a58 #a9b2f3 #6470e0",
  ],
  [
    "teal",
    "#e5f5f9 #b8e4ee #0c7789 #0f8fa8",
    "#082120 #103c3d #6fd6e2 #19a2bb",
  ],
  ["red", "#fdece9 #f9cec4 #b1331c #d0402a", "#27120f #4b221d #f6a59a #de5540"],
];

function TILES(dark) {
  const vars = {
    "--tile-fade": dark ? "rgba(0,0,0,0)" : "rgba(255,255,255,0)",

    // The page a lone card floats on — the login and sign-up screens. It has
    // to sit *behind* a card rather than beside one, so it cannot be the
    // ordinary page colour: in the light look that is white, and a white card
    // on a white page is one border away from not being a card at all.
    "--surface-sunken": dark ? "#000000" : "#eef0f4",

    // That card's edge. On black the ordinary divider all but disappears, and
    // the card loses its shape against the page.
    "--surface-card-edge": dark ? "#ffffff" : "#e2e6ec",

    // The halo that lifts an icon chip off the tile behind it. It is meant to
    // be the surface showing through, so on a dark page it is a shadow, not a
    // glow — written white it ringed every icon in light on a black card.
    "--ring": dark ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.55)",

    // The ring that shows how today's round came out. These are filled wedges
    // rather than ink, so they are chosen for how they sit against the panel
    // behind them: deep enough to read on white, light enough to read on
    // black. Green and red are the two the eye cannot separate under the
    // commonest colour blindness — which is why every wedge in that ring is
    // also named, counted and given its share beside it. The colour is there
    // to be quick, not to be the only thing saying it.
    "--ring-pending": dark ? "#6b7280" : "#9aa4b2",
    "--ring-done": dark ? "#28b873" : "#15a05e",
    "--ring-partial": dark ? "#e0a02a" : "#cf8f0a",
    "--ring-extra": dark ? "#9a78ec" : "#7b4bd4",
    "--ring-missed": dark ? "#ef5a5a" : "#d93b3b",

    // The two lines in the milk report. Warm against cool rather than two
    // blues, so the pair survives colour blindness; brighter on a dark page,
    // where the light-page versions read as muddy. Both pairs were checked
    // for contrast against the surface they are drawn on and for separation
    // from each other — the worst case is 26 under protanopia, which is wide.
    "--chart-now": dark ? "#4aa8f0" : "#1b7fd4",
    "--chart-before": dark ? "#f0b23c" : "#c08400",

    // Marks drawn *on top of* the accent colour — the panel behind a file in
    // your own chat bubble, the outline of a chip inside it. The bubble is
    // black in the light look and white in the dark one, so "a little white
    // over it" is right once and invisible the other time.
    "--on-accent-wash": dark ? "rgba(0,0,0,.10)" : "rgba(255,255,255,.16)",
    "--on-accent-line": dark ? "rgba(0,0,0,.35)" : "rgba(255,255,255,.5)",
  };

  for (const [name, light, night] of TILE_HUES) {
    const [card, bg, fg, line] = (dark ? night : light).split(" ");
    vars[`--tile-${name}-card`] = card;
    vars[`--tile-${name}-bg`] = bg;
    vars[`--tile-${name}-fg`] = fg;
    vars[`--tile-${name}-line`] = line;
  }

  return vars;
}

export const THEME_MODES = ["light", "dark"];

export function buildTheme(mode = "light") {
  const dark = mode === "dark";
  const skin = PALETTE[mode] ?? PALETTE.light;

  /**
   * The greys the component overrides below reach for. They are chosen here
   * rather than written into each override: a table head painted GREY[50] is
   * a pale band on a white page and a white slab on a black one.
   */
  const LINE = skin.divider;
  const SUBTLE = dark ? "#18181b" : GREY[50];
  const FIELD = dark ? "#121214" : "#ffffff";
  const EDGE = dark ? "#3f3f46" : GREY[300];
  const EDGE_HOVER = dark ? "#52525b" : GREY[400];
  const MUTED_INK = dark ? "#a1a1aa" : GREY[600];
  const TIP_BG = dark ? "#3f3f46" : GREY[800];

  return createTheme({
    cssVariables: true,

    palette: {
      ...skin,
      ...(dark ? STATUS.dark : STATUS.light),
      grey: dark ? GREY_DARK : GREY,
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
      MuiCssBaseline: {
        styleOverrides: {
          // The dashboard tiles' colours, published as CSS variables.
          //
          // StatCard renders inside Server Components, so it cannot read the
          // theme — an `sx` value there has to be a plain string. Handing it
          // variables keeps it a plain string while still letting the value
          // behind it change with the mode. Written out rather than derived:
          // a pale wash darkened by a formula comes out muddy, and these were
          // picked by eye against the surface each one sits on.
          ":root": TILES(dark),

          // Chrome paints a filled-in field its own pale blue and will not be
          // talked out of it by `background-color` — the only thing it honours
          // is an inset shadow thick enough to cover the field. On a dark page
          // the untreated version is a bright blue slab with white text on it,
          // which is how the login screen looked.
          "input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus":
            {
              WebkitBoxShadow: `0 0 0 100px ${FIELD} inset`,
              WebkitTextFillColor: skin.text.primary,
              caretColor: skin.text.primary,
            },

          // One keyboard focus ring for the whole app. :focus-visible only
          // fires for keyboard and assistive navigation, so nothing changes
          // for a mouse or a thumb.
          "*:focus-visible": {
            outline: `2px solid ${skin.primary[400]}`,
            outlineOffset: 2,
          },
          // Long tables and the chat thread both scroll; the default Windows
          // scrollbar is a grey slab next to this palette.
          "*::-webkit-scrollbar": { width: 10, height: 10 },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: EDGE,
            borderRadius: 8,
            border: "2px solid transparent",
            backgroundClip: "content-box",
          },
          "*::-webkit-scrollbar-thumb:hover": { backgroundColor: EDGE_HOVER },
          "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
        },
      },

      // Flat, bordered surfaces throughout — drop shadows on every card make a
      // dense admin screen look noisy.
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: "none" },
          outlined: { borderColor: LINE },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${LINE}`,
            borderRadius: 14,
          },
        },
      },

      // MUI leaves 32px of margin on every side of a dialog. On a 360px phone
      // that spends a fifth of the screen on nothing, and the forms inside are
      // already tight. Halved below sm, applied once here rather than at each
      // of the dozen call sites.
      MuiDialogContent: {
        styleOverrides: {
          root: {
            /**
             * Room above the first field.
             *
             * MUI drops the content's top padding to zero whenever a
             * DialogTitle sits directly above it. A TextField's label floats
             * *above* its box once the field has a value, and the content is
             * also the scroll container — so with no padding the scroller
             * cuts the first label in half. "Name" came out as a sliver of
             * letters along the top edge.
             *
             * Written as the same adjacent-sibling selector MUI uses, so it
             * carries the same weight and lands after it.
             */
            ".MuiDialogTitle-root + &": { paddingTop: 10 },
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          /**
           * The blur sits on the dialog's own full-screen container, not on the
           * backdrop inside it.
           *
           * MUI gives that backdrop `z-index: -1` so it paints under the paper.
           * `backdrop-filter` blurs whatever is painted behind an element
           * *within its own stacking context*, and from down there the page is
           * not in it — so the filter had nothing to work on and only the dark
           * wash showed. This container sits above the page, so from here there
           * is something to blur. The paper is a child, and children paint on
           * top of a backdrop-filter untouched, so the dialog itself stays sharp.
           */
          root: { backdropFilter: "blur(6px)" },

          paper: ({ theme }) => ({
            borderRadius: 16,
            [theme.breakpoints.down("sm")]: {
              margin: 16,
              width: "calc(100% - 32px)",
              maxHeight: "calc(100% - 32px)",
            },
          }),
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
            backgroundColor: FIELD,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: EDGE },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: EDGE_HOVER,
            },
          },
        },
      },

      MuiTableContainer: {
        styleOverrides: {
          // The head has its own background, so without clipping it squares off
          // the two top corners of the bordered box it sits in.
          root: { borderRadius: 10 },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: LINE,
            paddingBlock: 11,
          },
          head: {
            backgroundColor: SUBTLE,
            color: MUTED_INK,
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            // A firmer line under the head than between the rows, so the
            // header reads as a band rather than as the first row.
            borderBottomColor: EDGE,
          },
          // Figures only line up in a column if the digits are the same width.
          // Every right-aligned cell in this app holds a number.
          alignRight: { fontVariantNumeric: "tabular-nums" },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:last-child td": { borderBottom: 0 },
            transition: "background-color 120ms ease",
            // The old hover was the page colour itself, so against a table of
            // that same colour it was invisible and the rows felt dead. A
            // faint wash of the accent instead: enough to follow your eye
            // across a wide row, not enough to shout.
            "&.MuiTableRow-hover:hover": {
              backgroundColor: alpha(skin.primary[500], 0.06),
            },
            "&.Mui-selected": {
              backgroundColor: alpha(skin.primary[500], 0.1),
              "&:hover": { backgroundColor: alpha(skin.primary[500], 0.14) },
            },
          },
          // Head rows inherit the hover class from nothing, but a table head
          // sitting on the subtle band should never light up under the pointer.
          head: { "&.MuiTableRow-hover:hover": { backgroundColor: SUBTLE } },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 9,
            "&.Mui-selected": {
              backgroundColor: alpha(skin.primary[500], 0.1),
              color: skin.primary[700],
              "&:hover": { backgroundColor: alpha(skin.primary[500], 0.14) },
              "& .MuiListItemIcon-root": { color: skin.primary[600] },
              "& .MuiListItemText-primary": { fontWeight: 600 },
            },
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10, border: "1px solid transparent" },
          standardInfo: {
            backgroundColor: skin.primary[50],
            borderColor: skin.primary[100],
          },
        },
      },

      // Tabs read as navigation, not as buttons: sentence case, a thicker
      // indicator with its ends rounded off.
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, borderRadius: 3 },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            minHeight: 46,
            "&:hover": { color: skin.primary[600] },
          },
        },
      },

      // Menus and popovers get the same flat bordered treatment as the cards,
      // with one soft shadow so they clearly float above the page.
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${LINE}`,
            boxShadow: "0 8px 24px rgba(21,26,32,.10)",
          },
          list: { padding: 6 },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            minHeight: 38,
            "&.Mui-selected": {
              backgroundColor: alpha(skin.primary[500], 0.1),
              "&:hover": { backgroundColor: alpha(skin.primary[500], 0.14) },
            },
          },
        },
      },

      // Behind a dialog the page goes soft as well as dark, so the thing being
      // asked is clearly the only thing to answer. The dark wash lives here;
      // the blur cannot — see MuiDialog below.
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(21, 26, 32, 0.4)",
          },
          // Menus and popovers put an invisible backdrop behind themselves
          // purely to catch the click that closes them. Dimming the page for
          // those would make opening the account menu feel like a decision.
          invisible: {
            backgroundColor: "transparent",
            backdropFilter: "none",
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: TIP_BG,
            fontSize: "0.75rem",
            borderRadius: 7,
            paddingBlock: 6,
          },
        },
      },
    },
  });
}

export default buildTheme("light");
