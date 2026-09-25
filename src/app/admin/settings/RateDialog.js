"use client";

import { useActionState, useEffect } from "react";
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
import { formatAmount } from "@/lib/format";
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

  useEffect(() => {
    if (state?.ok) onClose();
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
              {rate.customer_name} — now {formatAmount(rate.rate_per_liter)} / L
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
                  htmlInput: { min: 0.5, step: 0.5 },
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
