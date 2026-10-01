"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { formatAmount, formatLiters } from "@/lib/format";

/**
 * Two series, this week against last. Warm against cool rather than two
 * blues: the pair has to stay apart under colour blindness as well as on a
 * good screen, and blue-vs-violet does not.
 */
const NOW = "var(--chart-now)";
const BEFORE = "var(--chart-before)";

const PLOT_HEIGHT = 200;

/**
 * Rounds the top of the scale up to something a person would say out loud —
 * 40, 60, 100 — so the labels are readable numbers rather than whatever the
 * largest day happened to be. It follows the data: four litres gives a scale
 * of 4, ninety gives 100.
 *
 * Every multiplier halves cleanly on purpose. The middle gridline is half the
 * top, and a top of 5 or 25 put "2.5" and "12.5" down the side of the chart,
 * which reads as a rounding error rather than as a scale.
 *
 * The steps between them are close together for the same reason. At around a
 * hundred litres a day a coarser ladder would jump from 100 straight to 200,
 * and a hundred-and-five litre day would then be drawn halfway up a chart
 * whose whole top half was empty. The dairy's own numbers are what the
 * picture has to be shaped around.
 */
const NICE = [1, 1.2, 1.6, 2, 2.4, 3, 4, 6, 8, 10];

function niceMax(value) {
  if (value <= 0) return 10;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  // Rounded back off: 0.1 * 6 is 0.6000000000000001 in binary floating
  // point, and that would be the number the axis label was built from.
  const clean = (n) => Math.round(n * 1e6) / 1e6;

  for (const m of NICE) {
    if (value <= step * m) return clean(step * m);
  }
  return clean(step * 10);
}

/** 1000 → 1,000, and 0.6 stays 0.6 rather than becoming 0.60. */
function tickLabel(n) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

/** A dot and a word. Two series, so this is not optional. */
function Key({ color, children }) {
  return (
    <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
      <Box
        sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} // prettier-ignore
      />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * Milk delivered per day — this week drawn over last week's, so a quiet
 * Tuesday can be seen for what it is.
 *
 * The plot is drawn in a viewBox of 0–100 that is then stretched to whatever
 * width the panel gives it. Stretching would normally smear the stroke and
 * squash the dots into eggs, so the lines carry `non-scaling-stroke` — they
 * keep their 2px however far the box is pulled — and the dots are not in the
 * SVG at all. They are ordinary boxes placed by percentage on top of it, so
 * they stay round. Nothing has to measure the container, which means no
 * resize observer and no first paint at the wrong size.
 */
export default function MilkChart({ days = [], previous = [] }) {
  const peak = Math.max(0, ...days.map((d) => d.liters), ...previous);
  const top = niceMax(peak);

  // Three lines is enough to read a height off; more is ink competing with
  // the data.
  const ticks = [top, top / 2, 0];

  if (days.length === 0) {
    return (
      <Box sx={{ py: 7, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No milk recorded yet.
        </Typography>
      </Box>
    );
  }

  // A single day has no line to draw, so it sits in the middle rather than
  // hard against the left edge.
  const xOf = (i) => (days.length === 1 ? 50 : (i / (days.length - 1)) * 100);
  const yOf = (v) => (top > 0 ? (1 - v / top) * 100 : 100);

  const pointsOf = (values) =>
    values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");

  const now = days.map((d) => d.liters);
  const hasPrevious = previous.length === days.length;

  return (
    <>
      <Stack
        direction="row"
        sx={{ gap: 2, justifyContent: "flex-end", mb: 1.5 }}
      >
        <Key color={NOW}>This week</Key>
        {hasPrevious && <Key color={BEFORE}>Last week</Key>}
      </Stack>

      <Stack direction="row" sx={{ gap: 1 }}>
        {/* The scale down the left. Tabular figures so 5 and 40 line up. */}
        <Stack
          sx={{
            height: PLOT_HEIGHT,
            justifyContent: "space-between",
            flexShrink: 0,
            pb: "1px",
          }}
        >
          {ticks.map((t) => (
            <Typography
              key={t}
              variant="caption"
              sx={{
                color: "text.disabled",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                transform: "translateY(-50%)",
              }}
            >
              {tickLabel(t)}
            </Typography>
          ))}
        </Stack>

        <Box
          sx={{
            position: "relative",
            flexGrow: 1,
            minWidth: 0,
            height: PLOT_HEIGHT,
          }}
        >
          {/* Hairline, solid, one step off the surface — there to be read
              past, not looked at. */}
          {ticks.map((t) => (
            <Box
              key={t}
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${(1 - t / top) * 100}%`,
                borderTop: 1,
                borderColor: t === 0 ? "grey.300" : "divider",
              }}
            />
          ))}

          <Box
            component="svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              display: "block",
              overflow: "visible",
            }}
          >
            {/* Last week sits behind, thinner and with no wash under it —
                it is the thing being compared against, not the subject. */}
            {hasPrevious && (
              <polyline
                points={pointsOf(previous)}
                fill="none"
                stroke={BEFORE}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeOpacity={0.75}
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* A wash under this week, not a block — it says "this much" at
                a glance without competing with the line itself. */}
            <polygon
              points={`0,100 ${pointsOf(now)} 100,100`}
              fill={NOW}
              fillOpacity={0.1}
            />
            <polyline
              points={pointsOf(now)}
              fill="none"
              stroke={NOW}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </Box>

          {/* One hover column per day, full height, so a low point is as easy
              to reach as a high one. Each is centred on its own point rather
              than laid out in a row: the points sit at 0%, 50% and 100% of
              the plot, while a row of equal children would centre them at
              1/6, 1/2 and 5/6 — close enough to look right and wrong
              everywhere it matters. */}
          <Box sx={{ position: "absolute", inset: 0 }}>
            {days.map((d, i) => (
              <Tooltip
                key={d.date}
                placement="top"
                title={
                  <Box sx={{ py: 0.25 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, display: "block" }}
                    >
                      {d.label}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {formatLiters(d.liters)} · {formatAmount(d.amount)}
                    </Typography>
                    {hasPrevious && (
                      <Typography
                        variant="caption"
                        sx={{ display: "block", opacity: 0.75 }}
                      >
                        last week {formatLiters(previous[i])}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      sx={{ display: "block", opacity: 0.75 }}
                    >
                      {d.count === 0
                        ? "nobody served"
                        : `${d.count} ${d.count === 1 ? "customer" : "customers"}`}
                    </Typography>
                  </Box>
                }
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${xOf(i)}%`,
                    width: `${100 / days.length}%`,
                    transform: "translateX(-50%)",
                    cursor: "default",
                    "&:hover .cross": { opacity: 1 },
                    "&:hover .dot": { transform: "translate(-50%, -50%) scale(1.35)" }, // prettier-ignore
                  }}
                >
                  <Box
                    className="cross"
                    sx={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: "50%",
                      width: "1px",
                      bgcolor: "grey.400",
                      opacity: 0,
                      transition: "opacity .12s",
                      pointerEvents: "none",
                    }}
                  />

                  {hasPrevious && (
                    <Box
                      sx={{
                        position: "absolute",
                        left: "50%",
                        top: `${yOf(previous[i])}%`,
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        bgcolor: BEFORE,
                        boxShadow:
                          "0 0 0 2px var(--mui-palette-background-paper)",
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* The ring is the surface colour, so the dot stays
                      legible where it crosses the other line. */}
                  <Box
                    className="dot"
                    sx={{
                      position: "absolute",
                      left: "50%",
                      top: `${yOf(d.liters)}%`,
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      bgcolor: NOW,
                      boxShadow:
                        "0 0 0 2px var(--mui-palette-background-paper)",
                      transform: "translate(-50%, -50%)",
                      transition: "transform .12s",
                      pointerEvents: "none",
                    }}
                  />
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>
      </Stack>

      {/* The day names, placed the same way the points are, so each name
          sits under its own point rather than under an equal slice. */}
      <Stack direction="row" sx={{ gap: 1, mt: 0.75 }}>
        <Box sx={{ visibility: "hidden", flexShrink: 0 }}>
          <Typography variant="caption">{tickLabel(top)}</Typography>
        </Box>

        <Box
          sx={{ position: "relative", flexGrow: 1, minWidth: 0, height: 16 }}
        >
          {days.map((d, i) => (
            <Typography
              key={d.date}
              variant="caption"
              noWrap
              sx={{
                position: "absolute",
                left: `${xOf(i)}%`,
                transform: "translateX(-50%)",
                color: "text.disabled",
                fontSize: "0.68rem",
              }}
            >
              {d.tick}
            </Typography>
          ))}
        </Box>
      </Stack>
    </>
  );
}
