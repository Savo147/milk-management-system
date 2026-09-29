import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

/**
 * Tile tints as plain strings, matching the theme palette.
 *
 * These cards render inside Server Components, so an `sx` value cannot be a
 * function — functions do not serialize across to the client, and
 * `sx={{ bgcolor: (t) => ... }}` fails at runtime. Static values it is.
 *
 * Eight hues, spread right around the wheel, so that a grid of eight cards
 * never shows the same colour twice. The inks were checked for separation
 * under normal and colour-blind vision; the pairs that sit closest (amber
 * next to red, indigo next to violet) are kept out of each other's way by the
 * order the dashboards place them in. Colour is decoration here in any case —
 * every tile carries its own label and its own icon, so nothing is being told
 * by hue alone.
 *
 *   card — the wash behind the whole tile
 *   bg   — the icon chip
 *   fg   — the icon itself
 *   line — the edge down the left, the strongest note of the three
 */
const TINT = {
  blue: { card: "#e8f1fb", bg: "#c6def6", fg: "#15599a", line: "#1b6fbf" },
  green: { card: "#e8f6ee", bg: "#c3e7d3", fg: "#19774e", line: "#1f8f5f" },
  violet: { card: "#f1ebfd", bg: "#d9cbf9", fg: "#6136c4", line: "#7b4bd4" },
  amber: { card: "#fdf4e2", bg: "#fae1a8", fg: "#946600", line: "#c08400" },
  pink: { card: "#fcedf4", bg: "#f8cce1", fg: "#a8306f", line: "#c33d84" },
  indigo: { card: "#ebedfc", bg: "#cfd4f7", fg: "#3b48b8", line: "#4b58cf" },
  teal: { card: "#e5f5f9", bg: "#b8e4ee", fg: "#0c7789", line: "#0f8fa8" },
  red: { card: "#fdece9", bg: "#f9cec4", fg: "#b1331c", line: "#d0402a" },
};

// The names the pages used before the palette grew. Kept so that a card asking
// for "primary" or "success" still gets the colour it always had.
TINT.primary = TINT.blue;
TINT.success = TINT.green;
TINT.warning = TINT.amber;
TINT.error = TINT.red;
TINT.info = TINT.teal;

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "blue",
}) {
  const tint = TINT[color] ?? TINT.blue;

  return (
    <Card
      sx={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        bgcolor: tint.card,
        borderColor: tint.bg,
        // A solid edge down the left and a soft bloom behind the icon. Between
        // them the tile reads as its own colour from across the room, while
        // the middle of the card stays pale enough for the number to sit on.
        borderLeft: "4px solid " + tint.line,
        backgroundImage:
          "radial-gradient(120% 120% at 100% 0%, " +
          tint.bg +
          " 0%, rgba(255,255,255,0) 62%)",
        transition: "box-shadow .15s, transform .15s",
        "&:hover": {
          boxShadow: "0 4px 14px rgba(21,26,32,.09)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              letterSpacing: "0.03em",
            }}
          >
            {label}
          </Typography>
          {Icon && (
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 44,
                height: 44,
                borderRadius: 2.5,
                flexShrink: 0,
                bgcolor: tint.bg,
                color: tint.fg,
                boxShadow: "0 0 0 4px rgba(255,255,255,.55)",
              }}
            >
              <Icon sx={{ fontSize: 24 }} />
            </Box>
          )}
        </Box>

        <Typography
          variant="h4"
          sx={{
            mt: 1,
            // Two of these sit side by side on a phone, so a figure like
            // ₹1,23,456.00 has about 150px to live in.
            fontSize: { xs: "1.25rem", sm: "1.6rem" },
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Typography>

        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", minHeight: 18 }}
        >
          {sub ?? ""}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** The heading above a row of cards. */
export function SectionLabel({ children }) {
  return (
    <Typography
      variant="overline"
      sx={{
        color: "text.secondary",
        fontWeight: 700,
        letterSpacing: "0.08em",
        display: "block",
        mb: 1.5,
      }}
    >
      {children}
    </Typography>
  );
}
