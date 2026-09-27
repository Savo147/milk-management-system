"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { updateMyMilkPlan } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="contained" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}

/**
 * What a customer may change about their own plan.
 *
 * The rate and the status are not here: what the milk costs and whether the
 * round still calls is the dairy's side of the arrangement. Everything that
 * is here is something the customer knows first.
 */
export default function MilkPlanDialog({ open, onClose, customer }) {
  const [state, action] = useActionState(async (prev, formData) => {
    const res = await updateMyMilkPlan(prev, formData);
    if (res?.ok) onClose();
    return res;
  }, null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      scroll="paper"
      sx={{
        // Whichever of the three ends up doing the scrolling on a short
        // window, it does it without a scrollbar down the side. Scrolling
        // itself still works — wheel, trackpad and keyboard all unaffected.
        "& .MuiDialog-container, & .MuiDialog-paper, & .MuiDialogContent-root":
          {
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": { display: "none" },
          },
      }}
      slotProps={{
        paper: { sx: { borderRadius: 3, maxHeight: "calc(100dvh - 32px)" } },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>My milk plan</DialogTitle>

      <Box component="form" action={action}>
        <DialogContent
          dividers
          sx={{
            // A short window still has to scroll; it just does not need a
            // native scrollbar down the side of the form to say so.
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <Stack sx={{ gap: 2 }}>
            {state?.error && <Alert severity="error">{state.error}</Alert>}

            <TextField
              name="mobile"
              label="Mobile"
              defaultValue={customer?.mobile ?? ""}
              fullWidth
              slotProps={{
                htmlInput: { inputMode: "numeric", maxLength: 10 },
              }}
              helperText="10 digits"
            />

            <TextField
              name="address"
              label="Address"
              defaultValue={customer?.address ?? ""}
              fullWidth
              multiline
              rows={2}
              helperText="Where the milk is delivered"
            />

            <TextField
              name="daily_quantity"
              label="Daily milk (liters)"
              type="number"
              defaultValue={customer?.daily_quantity ?? 1}
              required
              fullWidth
              slotProps={{ htmlInput: { min: 0.25, max: 100, step: 0.25 } }}
            />

            <TextField
              name="rate_per_liter"
              label="Rate (₹ / liter)"
              type="number"
              defaultValue={customer?.rate_per_liter ?? ""}
              required
              fullWidth
              slotProps={{ htmlInput: { min: 0.01, step: "any" } }}
              helperText="Old rates are kept in history"
            />

            <TextField
              name="delivery_time"
              label="Delivery time"
              defaultValue={customer?.delivery_time ?? ""}
              fullWidth
              placeholder="e.g. before 7 am"
            />

            <Typography variant="caption" color="text.secondary">
              Your status and the name on the dairy&apos;s records are set by
              the dairy.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <SaveButton />
        </DialogActions>
      </Box>
    </Dialog>
  );
}
