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
import { saveBusinessSettings } from "./actions";

function SubmitButton() {
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

export default function DairyForm({ settings }) {
  const [state, formAction] = useActionState(saveBusinessSettings, null);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box component="form" action={formAction}>
          {state?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}
          {state?.ok && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Saved.
            </Alert>
          )}

          <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="dairy_name"
                label="Dairy name"
                defaultValue={settings.dairy_name ?? ""}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="phone"
                label="Phone"
                defaultValue={settings.phone ?? ""}
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="address"
                label="Address"
                defaultValue={settings.address ?? ""}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="logo_url"
                label="Logo URL"
                defaultValue={settings.logo_url ?? ""}
                fullWidth
                placeholder="https://..."
                helperText="Leave it empty and public/logo.png is used"
              />
            </Grid>
          </Grid>

          {/* The logo preview sits on the left and Save on the right, where
              a form's confirming action belongs. */}
          <Box
            sx={{
              mt: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                component="img"
                src={settings.logo_url || "/logo.png"}
                alt="Logo"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  // Matches the round mark in the sidebar and the browser tab.
                  objectFit: "cover",
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                This is the logo in use
              </Typography>
            </Box>

            <SubmitButton />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
