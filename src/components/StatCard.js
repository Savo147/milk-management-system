import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

/**
 * Icon tints as plain strings, matching the theme palette.
 *
 * These cards render inside Server Components, so an `sx` value cannot be a
 * function — functions do not serialize across to the client, and
 * `sx={{ bgcolor: (t) => ... }}` fails at runtime. Static values it is.
 */
const TINT = {
  primary: { bg: "#eaf4fc", fg: "#095895" },
  info: { bg: "#eaf4fc", fg: "#095895" },
  success: { bg: "#e6f5ee", fg: "#0c6244" },
  warning: { bg: "#fdf1e0", fg: "#8a5200" },
  error: { bg: "#fdeaea", fg: "#9b1c1c" },
};

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "primary",
}) {
  const tint = TINT[color] ?? TINT.primary;

  return (
    <Card
      sx={{
        height: "100%",
        transition: "border-color .15s, box-shadow .15s",
        "&:hover": {
          borderColor: "grey.300",
          boxShadow: "0 1px 3px rgba(21,26,32,.06)",
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
                width: 34,
                height: 34,
                borderRadius: 2,
                flexShrink: 0,
                bgcolor: tint.bg,
                color: tint.fg,
              }}
            >
              <Icon sx={{ fontSize: 19 }} />
            </Box>
          )}
        </Box>

        <Typography
          variant="h4"
          sx={{ mt: 1, fontSize: "1.6rem", fontVariantNumeric: "tabular-nums" }}
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
