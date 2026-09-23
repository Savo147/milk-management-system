"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const pad = (n) => String(n).padStart(2, "0");
const monthKey = (y, i) => `${y}-${pad(i + 1)}`;

/** Local YYYY-MM-DD. toISOString() would roll back a day in IST. */
const ymd = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function monthLabel(v) {
  const [y, m] = v.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function dateLabel(v) {
  const [y, m, d] = v.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** Month key n months back from now. */
function monthsAgo(n) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return monthKey(d.getFullYear(), d.getMonth());
}

/** Date n days back from today. */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

export default function RangePicker({
  mode,
  monthFrom,
  monthTo,
  dateFrom,
  dateTo,
  onChange,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [tab, setTab] = useState(mode);
  const [year, setYear] = useState(Number(monthTo.slice(0, 4)));
  // Set on the first month click; the next click closes the range.
  const [pendingStart, setPendingStart] = useState(null);
  const [start, setStart] = useState(dateFrom);
  const [end, setEnd] = useState(dateTo);

  const open = (e) => {
    setTab(mode);
    setYear(Number(monthTo.slice(0, 4)));
    setPendingStart(null);
    setStart(dateFrom);
    setEnd(dateTo);
    setAnchorEl(e.currentTarget);
  };

  const close = () => {
    setAnchorEl(null);
    setPendingStart(null);
  };

  const apply = (nextMode, a, b) => {
    onChange(nextMode, a, b);
    close();
  };

  const pickMonth = (value) => {
    if (!pendingStart) {
      setPendingStart(value);
      return;
    }
    // Clicking an earlier month second is normal, so accept it rather than
    // rejecting the range.
    const [a, b] =
      value < pendingStart ? [value, pendingStart] : [pendingStart, value];
    apply("month", a, b);
  };

  const thisMonth = monthsAgo(0);
  const today = daysAgo(0);

  const triggerText =
    mode === "date"
      ? `${dateLabel(dateFrom)} – ${dateLabel(dateTo)}`
      : monthFrom === monthTo
        ? monthLabel(monthFrom)
        : `${monthLabel(monthFrom)} – ${monthLabel(monthTo)}`;

  const inRange = (v) =>
    pendingStart ? v === pendingStart : v >= monthFrom && v <= monthTo;
  const isEdge = (v) =>
    pendingStart ? v === pendingStart : v === monthFrom || v === monthTo;

  return (
    <>
      <ButtonBase
        onClick={open}
        sx={{
          px: 1.75,
          py: 1,
          gap: 1,
          border: 1,
          borderColor: "divider",
          borderRadius: 2.25,
          bgcolor: "background.paper",
          justifyContent: "flex-start",
          minWidth: 235,
          "&:hover": { borderColor: "grey.400", bgcolor: "grey.50" },
        }}
      >
        <CalendarMonthIcon sx={{ fontSize: 19, color: "text.secondary" }} />
        <Box sx={{ textAlign: "left", minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.secondary", lineHeight: 1.2 }}
          >
            {mode === "date" ? "Date" : "Month"}
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {triggerText}
          </Typography>
        </Box>
      </ButtonBase>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, width: 330 } } }}
      >
        <Box sx={{ p: 1.5, pb: 1 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            fullWidth
            value={tab}
            onChange={(e, v) => v && setTab(v)}
          >
            <ToggleButton value="month">By month</ToggleButton>
            <ToggleButton value="date">By date</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider />

        {tab === "month" ? (
          <>
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.5,
              }}
            >
              <IconButton size="small" onClick={() => setYear((y) => y - 1)}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography variant="subtitle1">{year}</Typography>
              <IconButton size="small" onClick={() => setYear((y) => y + 1)}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 0.75,
                px: 1.5,
              }}
            >
              {MONTHS.map((name, i) => {
                const value = monthKey(year, i);
                const selected = mode === "month" && inRange(value);
                const edge = mode === "month" && isEdge(value);
                const future = value > thisMonth;

                return (
                  <ButtonBase
                    key={name}
                    disabled={future}
                    onClick={() => pickMonth(value)}
                    sx={{
                      py: 1,
                      borderRadius: 1.5,
                      fontSize: "0.85rem",
                      fontWeight: edge ? 700 : 500,
                      color: edge
                        ? "primary.contrastText"
                        : future
                          ? "text.disabled"
                          : "text.primary",
                      bgcolor: edge
                        ? "primary.main"
                        : selected
                          ? "primary.50"
                          : "transparent",
                      "&:hover": {
                        bgcolor: edge ? "primary.dark" : "primary.50",
                      },
                    }}
                  >
                    {name}
                  </ButtonBase>
                );
              })}
            </Box>

            <Typography
              variant="caption"
              sx={{ display: "block", px: 1.5, py: 1, color: "text.secondary" }}
            >
              {pendingStart
                ? `From ${monthLabel(pendingStart)} — now pick the last month`
                : "One month, or a first and a last — click twice"}
            </Typography>

            <Divider />

            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, p: 1.5 }}>
              <Button
                size="small"
                onClick={() => apply("month", monthsAgo(0), monthsAgo(0))}
              >
                This month
              </Button>
              <Button
                size="small"
                onClick={() => apply("month", monthsAgo(1), monthsAgo(1))}
              >
                Last month
              </Button>
              <Button
                size="small"
                onClick={() => apply("month", monthsAgo(2), monthsAgo(0))}
              >
                Last 3
              </Button>
              <Button
                size="small"
                onClick={() => apply("month", monthsAgo(11), monthsAgo(0))}
              >
                Last 12
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Stack spacing={2} sx={{ p: 1.5 }}>
              <TextField
                type="date"
                label="From"
                size="small"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  if (e.target.value > end) setEnd(e.target.value);
                }}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: today },
                }}
                fullWidth
              />
              <TextField
                type="date"
                label="To"
                size="small"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  if (e.target.value < start) setStart(e.target.value);
                }}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: today },
                }}
                fullWidth
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => apply("date", start, end)}
              >
                Apply
              </Button>
            </Stack>

            <Divider />

            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, p: 1.5 }}>
              <Button
                size="small"
                onClick={() => apply("date", daysAgo(6), daysAgo(0))}
              >
                Last 7 days
              </Button>
              <Button
                size="small"
                onClick={() => apply("date", daysAgo(29), daysAgo(0))}
              >
                Last 30 days
              </Button>
              <Button
                size="small"
                onClick={() => apply("date", daysAgo(0), daysAgo(0))}
              >
                Today
              </Button>
            </Stack>
          </>
        )}
      </Popover>
    </>
  );
}
