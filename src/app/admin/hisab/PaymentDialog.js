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

export default function PaymentDialog({ row, from, to, today, onClose }) {
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

  const total = Number(row?.total_amount ?? 0);
  const received = Number(row?.received_amount ?? 0);
  const remaining = Math.max(0, total - received);

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
            <Typography variant="body2" color="text.secondary">
              {formatDate(from)} – {formatDate(to)}
            </Typography>
          </DialogTitle>

          <DialogContent>
            <input type="hidden" name="customer_id" value={row.id} />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="to" value={to} />

            {state?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {state.error}
              </Alert>
            )}

            <Stack spacing={1} sx={{ mb: 3 }}>
              <Row label="Milk" value={formatLiters(row.total_liters)} />
              <Row label="Total" value={formatAmount(total)} />
              {received > 0 && (
                <Row label="Already paid" value={formatAmount(received)} />
              )}
              <Row label="Remaining" value={formatAmount(remaining)} strong />
            </Stack>

            {/* The date has to sit inside the span being billed, or
                re-opening that span would not find the payment again. Today
                when today is in it, the last day of it otherwise — which is
                what a bill settled after the period closed actually means. */}
            <TextField
              name="paid_on"
              label="Paid on"
              type="date"
              defaultValue={today >= from && today <= to ? today : to}
              required
              fullWidth
              sx={{ mb: 2 }}
              slotProps={{ htmlInput: { min: from, max: to } }}
              helperText={`Anywhere between ${formatDate(from)} and ${formatDate(to)}`}
            />

            <TextField
              name="amount"
              label="Amount"
              type="number"
              // What is left, not the whole bill. Somebody paying the rest
              // of what they owe should not have to work out the difference,
              // and the total was being handed to them as if nothing had been
              // paid yet.
              defaultValue={remaining > 0 ? remaining : ""}
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
