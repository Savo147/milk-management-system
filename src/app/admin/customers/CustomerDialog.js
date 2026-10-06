"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SelectField from "@/components/SelectField";
import TimeField from "@/components/TimeField";
import { toTimeValue } from "@/lib/format";
import { saveCustomer } from "./actions";

function Actions({ onClose }) {
  const { pending } = useFormStatus();
  return (
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" variant="contained" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </DialogActions>
  );
}

export default function CustomerDialog({ open, onClose, customer }) {
  const [state, formAction] = useActionState(saveCustomer, null);

  // Close only once the action reports success, so errors stay visible.
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
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      // Remount on customer change, otherwise the fields keep the old
      // defaultValue when switching between Edit rows.
      key={customer?.id ?? "new"}
      scroll="paper"
      sx={{
        // On a short window this form has to scroll; it does not need a
        // scrollbar down the side to say so. Wheel, trackpad and keyboard
        // all still work.
        "& .MuiDialog-container, & .MuiDialog-paper, & .MuiDialogContent-root":
          {
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": { display: "none" },
          },
      }}
      slotProps={{ paper: { sx: { maxHeight: "calc(100dvh - 32px)" } } }}
    >
      <form action={formAction}>
        <DialogTitle>{customer ? "Edit customer" : "New customer"}</DialogTitle>

        <DialogContent>
          {customer && <input type="hidden" name="id" value={customer.id} />}

          {state?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="name"
                label="Name"
                defaultValue={customer?.name ?? ""}
                required
                fullWidth
                autoFocus
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="mobile"
                label="Mobile"
                defaultValue={customer?.mobile ?? ""}
                fullWidth
                slotProps={{
                  htmlInput: { inputMode: "numeric", maxLength: 10 },
                }}
                helperText="10 digits, or leave it for later"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                name="address"
                label="Address"
                defaultValue={customer?.address ?? ""}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {/* Typed, not picked from a list: a customer on 6 L or 1.25 L
                  is the dairy's business, not something a dropdown written
                  months ago gets to rule out. */}
              <TextField
                name="daily_quantity"
                label="Daily milk (liters)"
                type="number"
                defaultValue={customer?.daily_quantity ?? 1}
                required
                fullWidth
                slotProps={{ htmlInput: { min: 0.25, max: 99, step: 0.25 } }}
                helperText="Any amount, in quarter-liter steps"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="rate_per_liter"
                label="Rate (₹ / liter)"
                type="number"
                defaultValue={customer?.rate_per_liter ?? ""}
                required
                fullWidth
                slotProps={{ htmlInput: { min: 0.01, step: "any" } }}
                helperText={
                  customer
                    ? "Change it and the old rate is kept in history automatically"
                    : undefined
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TimeField
                name="delivery_time"
                label="Delivery time"
                value={toTimeValue(customer?.delivery_time)}
                fullWidth
                helperText="When the milk is delivered"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectField
                name="status"
                label="Status"
                defaultValue={customer?.status ?? "active"}
                fullWidth
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </SelectField>
            </Grid>

            {/* Only when adding. An existing customer's login is its own
                thing — it may already be there, it may be a Google account —
                and it is handled from the row's own menu rather than here. */}
            {!customer && (
              <>
                <Grid size={12}>
                  <Divider sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Their login — optional
                    </Typography>
                  </Divider>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    fullWidth
                    autoComplete="off"
                    helperText="Leave both empty to add them without a login"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    name="password"
                    label="Password"
                    type="password"
                    fullWidth
                    autoComplete="new-password"
                    helperText="At least 8 characters"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>

        <Actions onClose={onClose} />
      </form>
    </Dialog>
  );
}
