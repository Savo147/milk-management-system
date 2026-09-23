"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SaveIcon from "@mui/icons-material/Save";
import LockResetIcon from "@mui/icons-material/LockReset";
import { updateProfile, changePassword } from "./actions";

function SubmitButton({ label, icon }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      startIcon={icon}
      disabled={pending}
    >
      {pending ? "Saving..." : label}
    </Button>
  );
}

export default function ProfileForm({ user }) {
  const [profileState, profileAction] = useActionState(updateProfile, null);
  const [passState, passAction] = useActionState(changePassword, null);

  // Never leave a typed password sitting in the form after it is saved.
  useEffect(() => {
    if (passState?.ok) {
      document.getElementById("new-password").value = "";
      document.getElementById("confirm-password").value = "";
    }
  }, [passState]);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            My details
          </Typography>

          <Box component="form" action={profileAction}>
            {profileState?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {profileState.error}
              </Alert>
            )}
            {profileState?.ok && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Saved.
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="name"
                  label="Name"
                  defaultValue={user.name ?? ""}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="mobile"
                  label="Mobile"
                  defaultValue={user.mobile ?? ""}
                  fullWidth
                  slotProps={{
                    htmlInput: { inputMode: "numeric", maxLength: 10 },
                  }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  name="profile_photo"
                  label="Photo URL"
                  defaultValue={user.profile_photo ?? ""}
                  fullWidth
                  placeholder="https://..."
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Email"
                  value={user.email ?? ""}
                  fullWidth
                  disabled
                  helperText="Changing the email means creating a new account"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <SubmitButton
                label="Save"
                icon={<SaveIcon sx={{ fontSize: 17 }} />}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Change password
          </Typography>

          <Box component="form" action={passAction}>
            {passState?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {passState.error}
              </Alert>
            )}
            {passState?.ok && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Password changed.
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="new-password"
                  name="password"
                  type="password"
                  label="New password"
                  required
                  fullWidth
                  helperText="At least 8 characters"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="confirm-password"
                  name="confirm"
                  type="password"
                  label="Repeat it"
                  required
                  fullWidth
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <SubmitButton
                label="Change password"
                icon={<LockResetIcon sx={{ fontSize: 18 }} />}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
