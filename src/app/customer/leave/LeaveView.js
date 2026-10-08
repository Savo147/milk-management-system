"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import { formatDate } from "@/lib/format";
import { leaveState, lengthInDays, sortLeaves } from "@/lib/leaves";
import usePhone from "@/components/usePhone";
import { bookLeave, cancelLeave } from "./actions";

const STATE_CHIP = {
  current: { label: "On now", color: "warning" },
  upcoming: { label: "Coming up", color: "info" },
  past: { label: "Over", color: "default" },
};

/**
 * One booked span. The dates do the talking, so they are the heading and
 * everything else is underneath them.
 */
function LeaveRow({ leave, today, onCancel, busy }) {
  const state = leaveState(leave, today);
  const chip = STATE_CHIP[state];
  const days = lengthInDays(leave);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: 1,
        borderColor: "var(--surface-card-edge)",
        borderRadius: 2.5,
        opacity: state === "past" ? 0.65 : 1,
      }}
    >
      <Stack direction="row" sx={{ gap: 1.5, alignItems: "flex-start" }}>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {leave.from_date === leave.to_date
              ? formatDate(leave.from_date)
              : `${formatDate(leave.from_date)} – ${formatDate(leave.to_date)}`}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            {days} {days === 1 ? "day" : "days"}
            {leave.reason ? ` · ${leave.reason}` : ""}
          </Typography>
        </Box>

        <Chip size="small" label={chip.label} color={chip.color} />

        {/* A span that is over is a record of what happened; there is
            nothing left to call off. */}
        {state !== "past" && (
          <Tooltip title="Cancel this leave">
            <IconButton
              size="small"
              disabled={busy}
              onClick={() => onCancel(leave.id)}
              aria-label="Cancel this leave"
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );
}

function BookDialog({ open, onClose, today }) {
  const [state, formAction] = useActionState(bookLeave, null);
  const phone = usePhone();

  // Closed once per booking, not once per render: useActionState keeps the
  // last result for the life of the component, so without this the dialog
  // would shut the instant it was reopened.
  const handled = useRef(null);

  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      onClose();
    }
  }, [state, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={phone}
    >
      <form action={formAction}>
        <DialogTitle sx={{ pb: 1 }}>
          Book leave
          <Typography variant="body2" color="text.secondary">
            No milk will be delivered on these days
          </Typography>
        </DialogTitle>

        <DialogContent>
          {state?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}

          <Stack spacing={2}>
            {/* Today is the earliest either end may be. A leave is a notice
                — "do not come" — and a notice about last Tuesday is a
                correction to the book, not a notice. */}
            <TextField
              name="from_date"
              label="First day"
              type="date"
              defaultValue={today}
              required
              fullWidth
              slotProps={{ htmlInput: { min: today }, inputLabel: { shrink: true } }} // prettier-ignore
            />

            <TextField
              name="to_date"
              label="Last day"
              type="date"
              defaultValue={today}
              required
              fullWidth
              helperText="Same day for a single day off"
              slotProps={{ htmlInput: { min: today }, inputLabel: { shrink: true } }} // prettier-ignore
            />

            <TextField
              name="reason"
              label="Reason (optional)"
              placeholder="Out of town for a festival"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained">
            Book
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function LeaveView({ leaves = [], today }) {
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState(null);
  const [busy, startBusy] = useTransition();

  const rows = sortLeaves(leaves, today);
  const onNow = rows.find((l) => leaveState(l, today) === "current") ?? null;

  const cancel = (id) => {
    setError(null);
    startBusy(async () => {
      const res = await cancelLeave(id);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <>
      <Stack
        direction="row"
        sx={{ gap: 2, alignItems: "center", mb: 2, flexWrap: "wrap" }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          Going away? Tell the dairy here and they will not come on those
          days — and those days will not count as missed.
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setBooking(true)}
        >
          Book leave
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {onNow && (
        <Alert severity="warning" icon={<EventBusyIcon />} sx={{ mb: 2 }}>
          You are on leave today — no milk until{" "}
          {formatDate(onNow.to_date)}.
        </Alert>
      )}

      {rows.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            textAlign: "center",
            border: 1,
            borderColor: "var(--surface-card-edge)",
            borderRadius: 2.5,
          }}
        >
          <EventBusyIcon sx={{ fontSize: 34, color: "text.disabled" }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No leave booked. Milk comes every day.
          </Typography>
        </Paper>
      ) : (
        <Stack sx={{ gap: 1.25 }}>
          {rows.map((l) => (
            <LeaveRow
              key={l.id}
              leave={l}
              today={today}
              busy={busy}
              onCancel={cancel}
            />
          ))}
        </Stack>
      )}

      <BookDialog
        open={booking}
        onClose={() => setBooking(false)}
        today={today}
      />
    </>
  );
}
