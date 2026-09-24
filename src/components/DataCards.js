"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/**
 * What the admin tables turn into on a phone.
 *
 * Squeezing a seven-column table into 360px does not work: either it has to
 * be dragged sideways, or the columns get so narrow that names wrap onto two
 * lines and the figures end up stacked in a ragged column. Below `md` each
 * row becomes a card instead — title and status on top, the figures as a
 * label/value list underneath, and the row's actions along the bottom.
 *
 * The table itself is untouched and simply hidden at that width, so the
 * desktop layout and this one cannot drift apart in behaviour — they read the
 * same rows and call the same actions.
 */
export default function DataCards({
  items,
  getKey,
  title,
  subtitle,
  badge,
  fields,
  actions,
  onClick,
  empty,
  sx,
}) {
  if (!items.length) {
    return (
      <Box sx={sx}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {empty}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={sx}>
      <Stack sx={{ gap: 1.25 }}>
        {items.map((item) => {
          const rows = (fields?.(item) ?? []).filter(Boolean);
          const foot = actions?.(item);
          const mark = badge?.(item);
          const sub = subtitle?.(item);

          return (
            <Paper
              key={getKey(item)}
              elevation={0}
              onClick={onClick ? () => onClick(item) : undefined}
              sx={{
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 2.5,
                cursor: onClick ? "pointer" : "default",
                ...(onClick && {
                  "&:active": { borderColor: "primary.main" },
                }),
              }}
            >
              <Stack
                direction="row"
                sx={{ alignItems: "flex-start", gap: 1.5 }}
              >
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, lineHeight: 1.35 }}
                  >
                    {title(item)}
                  </Typography>
                  {sub && (
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block" }}
                    >
                      {sub}
                    </Typography>
                  )}
                </Box>
                {mark && <Box sx={{ flexShrink: 0 }}>{mark}</Box>}
              </Stack>

              {rows.length > 0 && (
                <Stack sx={{ gap: 0.4, mt: 1.5 }}>
                  {rows.map(([label, value]) => (
                    <Stack
                      key={label}
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 2,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", flexShrink: 0 }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {value}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}

              {foot && (
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mt: 2,
                  }}
                >
                  {foot}
                </Stack>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
