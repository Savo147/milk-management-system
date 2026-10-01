"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import StatusDonut from "@/components/StatusDonut";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

/**
 * How the round came out, over today, this week or this month.
 *
 * All three are worked out on the server and handed over together. They are
 * five numbers each, read from rows the page had already fetched — holding
 * them all costs nothing, and switching between them is then instant instead
 * of a trip to the database for a panel the eye is already on.
 */
export default function RoundPanel({ periods }) {
  const [period, setPeriod] = useState("today");
  const data = periods[period];

  return (
    <>
      {/* A segmented control, sat in the panel's own header row. */}
      <Stack
        direction="row"
        sx={{
          gap: 0.5,
          p: 0.5,
          mx: 2.5,
          mt: 2,
          borderRadius: 999,
          bgcolor: "grey.100",
          alignSelf: "flex-start",
          display: "inline-flex",
        }}
      >
        {PERIODS.map((p) => {
          const on = p.key === period;

          return (
            <Button
              key={p.key}
              size="small"
              disableRipple
              onClick={() => setPeriod(p.key)}
              sx={{
                px: 1.5,
                py: 0.4,
                minWidth: 0,
                borderRadius: 999,
                fontSize: "0.78rem",
                fontWeight: 600,
                color: on ? "text.primary" : "text.secondary",
                bgcolor: on ? "background.paper" : "transparent",
                boxShadow: on ? "0 1px 3px rgba(21,26,32,.12)" : "none",
                "&:hover": {
                  bgcolor: on ? "background.paper" : "action.hover",
                },
              }}
            >
              {p.label}
            </Button>
          );
        })}
      </Stack>

      <Box sx={{ mt: 1 }}>
        <StatusDonut
          slices={data.slices}
          total={data.total}
          note={data.note}
          figures={data.figures}
        />
      </Box>
    </>
  );
}
