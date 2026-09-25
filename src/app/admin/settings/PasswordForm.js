"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import LockResetIcon from "@mui/icons-material/LockReset";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { changePassword } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      startIcon={<LockResetIcon sx={{ fontSize: 18 }} />}
      disabled={pending}
    >
      {pending ? "Changing..." : "Change password"}
    </Button>
  );
}

/** The show/hide toggle, one per field so they reveal independently. */
function eye(shown, toggle) {
  return {
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          onClick={toggle}
          edge="end"
          size="small"
          aria-label={shown ? "Hide password" : "Show password"}
          // Out of the tab order: tabbing should move to the next field.
          tabIndex={-1}
        >
          {shown ? (
            <VisibilityOffIcon fontSize="small" />
          ) : (
            <VisibilityIcon fontSize="small" />
          )}
        </IconButton>
      </InputAdornment>
    ),
  };
}

export default function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Never leave a typed password sitting in the form after it is saved. The
  // eye toggles are left alone: the boxes are empty, so there is nothing for
  // them to reveal.
  useEffect(() => {
    if (state?.ok) {
      document.getElementById("new-password").value = "";
      document.getElementById("confirm-password").value = "";
    }
  }, [state]);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1">Change password</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Type it twice so a slip of the finger cannot lock you out.
        </Typography>

        <Box component="form" action={formAction}>
          {state?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}
          {state?.ok && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Password changed. The old one stops working now.
            </Alert>
          )}

          <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="new-password"
                name="password"
                type={showNew ? "text" : "password"}
                label="New password"
                autoComplete="new-password"
                required
                fullWidth
                helperText="At least 8 characters"
                slotProps={{
                  input: eye(showNew, () => setShowNew((on) => !on)),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="confirm-password"
                name="confirm"
                type={showConfirm ? "text" : "password"}
                label="Confirm password"
                autoComplete="new-password"
                required
                fullWidth
                slotProps={{
                  input: eye(showConfirm, () => setShowConfirm((on) => !on)),
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <SubmitButton />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
