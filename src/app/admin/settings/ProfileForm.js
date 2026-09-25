"use client";

import { useActionState } from "react";
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
import { updateProfile } from "./actions";

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

            <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="profile_photo"
                  label="Photo URL"
                  defaultValue={user.profile_photo ?? ""}
                  fullWidth
                  placeholder="https://..."
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Email"
                  value={user.email ?? ""}
                  fullWidth
                  disabled
                  helperText="Changing the email means creating a new account"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <SubmitButton
                label="Save"
                icon={<SaveIcon sx={{ fontSize: 17 }} />}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
