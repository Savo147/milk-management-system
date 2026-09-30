"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const SIZE = 168;
const THICKNESS = 26;

/**
 * How today's round came out.
 *
 * Four states, each one a condition rather than a series, so the colours are
 * the app's own status colours — green for delivered, amber for short, violet
 * for extra, red for missed. They sit close enough under red-green colour
 * blindness that colour alone would not be safe, which is why every row is
 * also named, counted and given its share.
 *
 * Every state is listed, including the ones that did not happen. A round
 * where everything went right would otherwise show a single line against a
 * ring, and "nothing went wrong" would look the same as "nothing else is
 * being tracked". The empty ones are greyed rather than hidden.
 *
 * Drawn with a conic gradient rather than arcs: four numbers into one
 * background, and a hole punched through the middle. No path arithmetic to
 * get wrong, and it scales with the panel.
 */
export default function StatusDonut({
  slices = [],
  total = 0,
  note = "entries",
  figures = [],
}) {
  const shown = slices.filter((s) => s.value > 0);

  if (total === 0 || shown.length === 0) {
    return (
      <Stack sx={{ alignItems: "center", gap: 1.5, px: 3, py: 6 }}>
        {/* An empty ring rather than a line of grey text: the shape says
            what this panel will hold once the round has been entered. */}
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: "14px solid",
            borderColor: "grey.100",
          }}
        />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Nothing recorded yet
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", maxWidth: 260 }}
        >
          Once today&apos;s round is entered on the Daily Milk page, how it went
          shows up here.
        </Typography>
      </Stack>
    );
  }

  // Each slice picks up where the last left off, so the ring closes exactly
  // once however the rounding falls. A running total kept in a `let` would be
  // a variable reassigned during render, which the rules of React forbid — so
  // the offsets are worked out from the slices before them instead.
  const stops = shown.map((s, i) => {
    const before = shown
      .slice(0, i)
      .reduce((t, prev) => t + prev.value / total, 0);
    const from = before * 100;
    return `${s.color} ${from}% ${from + (s.value / total) * 100}%`;
  });

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      sx={{ alignItems: "center", gap: 3, px: 2.5, py: 2.5 }}
    >
      <Box
        sx={{
          position: "relative",
          width: SIZE,
          height: SIZE,
          flexShrink: 0,
          borderRadius: "50%",
          background: `conic-gradient(${stops.join(", ")})`,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: `${THICKNESS}px`,
            borderRadius: "50%",
            bgcolor: "background.paper",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ lineHeight: 1.1 }}>
              {total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {note}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* The key is not decoration here: the slices are status colours, and
          two of them are close under colour blindness. The word, the count
          and the share are what actually carry it. */}
      <Stack sx={{ gap: 1, flexGrow: 1, minWidth: 0, width: "100%" }}>
        {slices.map((s) => {
          const none = s.value === 0;
          const share = Math.round((s.value / total) * 100);

          return (
            <Stack
              key={s.label}
              direction="row"
              sx={{ alignItems: "center", gap: 1.25 }}
            >
              {/* The dot keeps its own colour even on a row that did not
                  happen: it is the key to the ring, and a grey dot beside
                  "Missed" told you nothing about which colour missed would
                  be if it ever did. The nought and the greyed word already
                  say that it did not. */}
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  flexShrink: 0,
                  bgcolor: s.color,
                  opacity: none ? 0.45 : 1,
                }}
              />
              <Typography
                variant="body2"
                noWrap
                sx={{ flexGrow: 1, minWidth: 0, color: none ? "text.disabled" : "text.primary" }} // prettier-ignore
              >
                {s.label}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, width: 26, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums", color: none ? "text.disabled" : "text.primary" }} // prettier-ignore
              >
                {s.value}
              </Typography>
              <Typography
                variant="caption"
                sx={{ width: 40, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums", color: "text.disabled" }} // prettier-ignore
              >
                {share}%
              </Typography>
            </Stack>
          );
        })}

        {/* The ring says how the round went; these say what it came to. */}
        {figures.length > 0 && (
          <Stack
            sx={{ gap: 1, mt: 1, pt: 1.5, borderTop: 1, borderColor: "divider" }} // prettier-ignore
          >
            {figures.map((f) => (
              <Stack
                key={f.label}
                direction="row"
                sx={{ alignItems: "baseline", gap: 2 }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  noWrap
                  sx={{ flexGrow: 1, minWidth: 0 }}
                >
                  {f.label}
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, flexShrink: 0, color: f.color ?? "text.primary", fontVariantNumeric: "tabular-nums" }} // prettier-ignore
                >
                  {f.value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
