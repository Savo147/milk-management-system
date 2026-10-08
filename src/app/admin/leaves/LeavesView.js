"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import SearchIcon from "@mui/icons-material/Search";
import SelectField from "@/components/SelectField";
import StatCard from "@/components/StatCard";
import DataCards from "@/components/DataCards";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import { formatDate, formatLiters } from "@/lib/format";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { leaveState, lengthInDays, sortLeaves } from "@/lib/leaves";
import { cancelLeave } from "@/app/customer/leave/actions";
import BookForCustomerDialog from "./BookForCustomerDialog";

const STATE_CHIP = {
  current: { label: "Away now", color: "warning" },
  upcoming: { label: "Coming up", color: "info" },
  past: { label: "Over", color: "default" },
};

const spanText = (l) =>
  l.from_date === l.to_date
    ? formatDate(l.from_date)
    : `${formatDate(l.from_date)} – ${formatDate(l.to_date)}`;

export default function LeavesView({ leaves = [], customers = [], today }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Opens on what matters this morning. "Over" is a record, not a worry, so
  // it takes asking for.
  const [when, setWhen] = useState("active");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState(null);
  const [busy, startBusy] = useTransition();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return sortLeaves(leaves, today).filter((l) => {
      const state = leaveState(l, today);
      if (when === "active" && state === "past") return false;
      if (when !== "active" && when !== "all" && state !== when) return false;

      if (!q) return true;
      return (
        (l.customer_name ?? "").toLowerCase().includes(q) ||
        (l.customer_mobile ?? "").includes(q)
      );
    });
  }, [leaves, query, when, today]);

  const counts = useMemo(() => {
    const month = today.slice(0, 7);
    let away = 0;
    let soon = 0;
    // Litres the round does not have to carry this morning.
    let liters = 0;
    // Counted as people, not as bookings: somebody who booked two separate
    // weeks this month is one customer who was away, not two.
    const thisMonth = new Set();

    for (const l of leaves) {
      const state = leaveState(l, today);

      if (state === "current") {
        away += 1;
        liters += Number(l.daily_quantity ?? 0);
      }
      if (state === "upcoming") soon += 1;

      // Any part of the span falling inside this month counts.
      if (l.from_date.slice(0, 7) <= month && l.to_date.slice(0, 7) >= month) {
        thisMonth.add(l.customer_id);
      }
    }

    return { away, soon, liters, thisMonth: thisMonth.size };
  }, [leaves, today]);

  const cancel = (id) => {
    setError(null);
    startBusy(async () => {
      const res = await cancelLeave(id);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  const chipFor = (l) => {
    const chip = STATE_CHIP[leaveState(l, today)];
    return <Chip size="small" label={chip.label} color={chip.color} />;
  };

  return (
    <>
      {/* Four, and a hue each — the same rule the dashboards follow, so no
          two cards on a screen ever wear the same colour. */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Away today"
            value={counts.away}
            sub={counts.away > 0 ? "skip these on the round" : "everybody in"}
            icon={EventBusyIcon}
            color="amber"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          {/* The one figure here that changes what gets loaded on the
              vehicle before the round leaves. */}
          <StatCard
            label="Milk not needed"
            value={formatLiters(counts.liters)}
            sub="less to carry today"
            icon={LocalDrinkIcon}
            color="blue"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Coming up"
            value={counts.soon}
            sub="booked for later"
            icon={EventAvailableIcon}
            color="violet"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Away this month"
            value={counts.thisMonth}
            sub={counts.thisMonth === 1 ? "customer" : "customers"}
            icon={CalendarMonthIcon}
            color="teal"
          />
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: "center" } }}
      >
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer"
          size="small"
          sx={{ flexGrow: 1, maxWidth: { sm: 280 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <SelectField
          size="small"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="active">Now and ahead</MenuItem>
          <MenuItem value="current">Away now</MenuItem>
          <MenuItem value="upcoming">Coming up</MenuItem>
          <MenuItem value="past">Over</MenuItem>
          <MenuItem value="all">All</MenuItem>
        </SelectField>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setBooking(true)}
        >
          Book for a customer
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataCards
        sx={cardsOnly}
        items={rows}
        getKey={(l) => l.id}
        title={(l) => l.customer_name}
        subtitle={(l) => l.customer_mobile}
        badge={chipFor}
        fields={(l) => [
          ["Days", spanText(l)],
          ["Length", `${lengthInDays(l)} ${lengthInDays(l) === 1 ? "day" : "days"}`], // prettier-ignore
          ["Reason", l.reason || "—"],
        ]}
        actions={(l) =>
          leaveState(l, today) === "past" ? null : (
            <Button
              size="small"
              color="inherit"
              disabled={busy}
              startIcon={<DeleteOutlineIcon sx={{ fontSize: 17 }} />}
              onClick={() => cancel(l.id)}
              sx={{ color: "text.secondary" }}
            >
              Cancel
            </Button>
          )
        }
        empty={
          leaves.length === 0
            ? "Nobody has booked leave."
            : "Nothing matches this filter."
        }
      />

      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider", ...tableOnly }}
      >
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell align="center" sx={{ width: "26%" }}>
                Days
              </TableCell>
              <TableCell align="center" sx={{ width: "10%" }}>
                Length
              </TableCell>
              <TableCell sx={{ width: "22%" }}>Reason</TableCell>
              <TableCell align="center" sx={{ width: "13%" }}>
                Status
              </TableCell>
              <TableCell align="right" sx={{ width: "9%" }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {leaves.length === 0
                      ? "Nobody has booked leave."
                      : "Nothing matches this filter."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((l) => (
              <TableRow key={l.id} hover>
                <TableCell>
                  <Stack direction="row" sx={{ gap: 1.25, alignItems: "center" }}>
                    <Avatar
                      src={l.customer_photo || undefined}
                      sx={{ width: 30, height: 30, fontSize: "0.8rem" }}
                    >
                      {l.customer_name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {l.customer_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {l.customer_mobile}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>

                <TableCell align="center">{spanText(l)}</TableCell>

                <TableCell align="center">{lengthInDays(l)}</TableCell>

                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {l.reason || "—"}
                  </Typography>
                </TableCell>

                <TableCell align="center">{chipFor(l)}</TableCell>

                <TableCell align="right">
                  {leaveState(l, today) !== "past" && (
                    <Tooltip title="Cancel this leave">
                      <IconButton
                        size="small"
                        disabled={busy}
                        onClick={() => cancel(l.id)}
                        aria-label="Cancel this leave"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <BookForCustomerDialog
        open={booking}
        onClose={() => setBooking(false)}
        customers={customers}
        today={today}
      />
    </>
  );
}
