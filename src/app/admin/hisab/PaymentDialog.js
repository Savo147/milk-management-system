"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatAmount, formatDate, formatLiters } from "@/lib/format";
import { recordPayment } from "./actions";

function Row({ label, value, strong }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: strong ? 700 : 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function Actions({ onClose }) {
  const { pending } = useFormStatus();
  return (
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onClose} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" variant="contained" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </DialogActions>
  );
}

export default function PaymentDialog({ row, to, today, onClose }) {
  const [state, formAction] = useActionState(recordPayment, null);

  // Closed once per save, not once per render. useActionState keeps the
  // last result for the life of the component, so "ok" stays true after a
  // payment goes through — and the next time the dialog was opened this
  // effect saw it again and shut it before anybody could type. Remembering
  // which result has been acted on is what stops that.
  const handled = useRef(null);

  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      onClose();
    }
  }, [state, onClose]);

  // The milk since the last payment, what is still owed from before it, and
  // the two added up. The bill's own start is the day after that payment —
  // the page worked it out per customer, this just reads it.
  // The milk since the last payment, and nothing else. Paying settles
  // everything up to the day it was paid, so there is no older figure to add
  // on and none to apologise for.
  const total = Number(row?.total_amount ?? 0);
  const paidOn = row?.last_paid_on ?? null;
  const since = row?.since ?? null;

  return (
    <Dialog
      open={Boolean(row)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      key={row?.id ?? "none"}
    >
      {row && (
        <form action={formAction}>
          <DialogTitle sx={{ pb: 1 }}>
            {row.customer_name}
            {/* The days this bill covers, which is not the month on the
                picker: it opens the morning after the last payment. */}
            <Typography variant="body2" color="text.secondary">
              {paidOn
                ? `${formatDate(since)} – ${formatDate(to)}`
                : `Everything up to ${formatDate(to)}`}
            </Typography>
          </DialogTitle>

          <DialogContent>
            <input type="hidden" name="customer_id" value={row.id} />

            {state?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {state.error}
              </Alert>
            )}

            {/* What the last payment was, and the milk it settled, is on the
                row behind this dialog — the Last payment column. Repeating it
                here put the previous bill directly above the one being paid,
                which is two amounts side by side when only one of them is
                being typed into the box below. */}
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Row
                label="Milk since then"
                value={formatLiters(row.total_liters)}
              />
              <Row label="To pay" value={formatAmount(total)} strong />
            </Stack>

            {/* Today, and no later. The date is what the next bill counts
                from, so a payment dated into next week would wipe out milk
                that has not been delivered yet. It no longer has to sit
                inside the month on the picker — the bill is read from every
                payment there has ever been, not from one month's worth. */}
            <TextField
              name="paid_on"
              label="Paid on"
              type="date"
              defaultValue={today}
              required
              fullWidth
              sx={{ mb: 2 }}
              slotProps={{ htmlInput: { max: today } }}
              helperText="The next bill starts the day after this"
            />

            <TextField
              name="amount"
              label="Amount"
              type="number"
              // What is left, not the whole bill. Somebody paying the rest
              // of what they owe should not have to work out the difference,
              // and the total was being handed to them as if nothing had been
              // paid yet.
              defaultValue={total > 0 ? total : ""}
              required
              fullWidth
              autoFocus
              slotProps={{
                htmlInput: { min: 0.5, step: "any" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                },
              }}
            />
          </DialogContent>

          <Actions onClose={onClose} />
        </form>
      )}
    </Dialog>
  );
}
