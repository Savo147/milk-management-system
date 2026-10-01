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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SaveIcon from "@mui/icons-material/Save";
import { formatRate } from "@/lib/format";
import { updateCustomerRate } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      startIcon={<SaveIcon sx={{ fontSize: 17 }} />}
      disabled={pending}
    >
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}

export default function RateDialog({ rate, onClose }) {
  const [state, formAction] = useActionState(updateCustomerRate, null);

  /**
   * Close once, on the result that said so.
   *
   * useActionState keeps the last result for as long as the component lives,
   * so `state.ok` stays true after a successful one. This effect also depends
   * on `onClose`, which the parent rebuilds on every render — so the next
   * time the dialog was opened the effect ran again, saw the *old* ok, and
   * shut it before it had drawn. The dialog simply would not open a second
   * time. Remembering which result has been acted on fixes it whether or not
   * the component happens to remount.
   */
  const handled = useRef(null);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      onClose();
    }
  }, [state, onClose]);

  return (
    <Dialog
      open={Boolean(rate)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      // A fresh action state per customer, or the last error is still on
      // screen the next time it opens.
      key={rate?.id ?? "none"}
    >
      {rate && (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            Change rate
            <Typography variant="body2" color="text.secondary">
              {rate.customer_name} — now {formatRate(rate.rate_per_liter)} / L
            </Typography>
          </DialogTitle>

          <Box component="form" action={formAction}>
            <DialogContent sx={{ pt: 1 }}>
              <input
                type="hidden"
                name="customer_id"
                value={rate.customer_id}
              />

              {state?.error && (
                <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                  {state.error}
                </Alert>
              )}

              <TextField
                name="rate_per_liter"
                label="New rate"
                type="number"
                defaultValue={rate.rate_per_liter}
                required
                fullWidth
                autoFocus
                sx={{ mt: 1 }}
                slotProps={{
                  htmlInput: { min: 0.01, step: "any" },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">₹</InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">/ L</InputAdornment>
                    ),
                  },
                }}
                helperText="Today's rate. Milk already delivered keeps the rate it was billed at."
              />
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={onClose}>Cancel</Button>
              <SaveButton />
            </DialogActions>
          </Box>
        </>
      )}
    </Dialog>
  );
}
