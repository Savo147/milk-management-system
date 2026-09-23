"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SaveIcon from "@mui/icons-material/Save";
import LockResetIcon from "@mui/icons-material/LockReset";
import { formatAmount, formatLiters } from "@/lib/format";
import { ACCOUNT_STATUS, STATUS_COLOR } from "@/lib/constants";
import { updateMyProfile, changeMyPassword } from "./actions";

function SaveButton({ icon: Icon = SaveIcon, label, busy }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      startIcon={<Icon sx={{ fontSize: 17 }} />}
      disabled={pending}
    >
      {pending ? busy : label}
    </Button>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 3, border: 1, borderColor: "divider", height: "100%" }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Paper>
  );
}

function Row({ label, value }) {
  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 2,
        py: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function ProfileView({ user, customer, settings }) {
  const [profileState, saveProfile] = useActionState(updateMyProfile, null);
  const [passwordState, savePassword] = useActionState(changeMyPassword, null);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Section
          title="My details"
          subtitle="You can change your name, mobile and photo yourself."
        >
          <Box component="form" action={saveProfile}>
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: "center", mb: 2.5 }}
            >
              <Avatar
                src={user.profile_photo ?? undefined}
                sx={{ width: 56, height: 56, bgcolor: "primary.main" }}
              >
                {user.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2">{user.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Stack>

            {profileState?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {profileState.error}
              </Alert>
            )}
            {profileState?.ok && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Details saved.
              </Alert>
            )}

            <Stack spacing={2}>
              <TextField
                name="name"
                label="Name"
                defaultValue={user.name ?? ""}
                required
                fullWidth
              />
              <TextField
                name="mobile"
                label="Mobile"
                defaultValue={user.mobile ?? ""}
                fullWidth
                slotProps={{
                  htmlInput: { inputMode: "numeric", maxLength: 10 },
                }}
              />
              <TextField
                name="profile_photo"
                label="Photo link"
                defaultValue={user.profile_photo ?? ""}
                fullWidth
                placeholder="https://..."
              />
              {/* Email is what you sign in with, so it is shown but not
                  editable here — changing it needs the dairy. */}
              <TextField
                label="Email"
                value={user.email ?? ""}
                fullWidth
                disabled
                helperText="To change your email, contact the dairy."
              />

              <Box sx={{ textAlign: "right" }}>
                <SaveButton label="Save" busy="Saving..." />
              </Box>
            </Stack>
          </Box>
        </Section>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Stack spacing={3}>
          <Section
            title="My milk plan"
            subtitle="The dairy sets these details."
          >
            {customer ? (
              <>
                <Row
                  label="Name (in the dairy's records)"
                  value={customer.name}
                />
                <Divider />
                <Row label="Mobile" value={customer.mobile} />
                <Divider />
                <Row label="Address" value={customer.address || "—"} />
                <Divider />
                <Row
                  label="Daily milk"
                  value={formatLiters(customer.daily_quantity)}
                />
                <Divider />
                <Row
                  label="My rate"
                  value={`${formatAmount(customer.rate_per_liter)} / L`}
                />
                <Divider />
                <Row
                  label="Delivery time"
                  value={customer.delivery_time || "—"}
                />
                <Divider />
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    size="small"
                    label={ACCOUNT_STATUS[customer.status]}
                    color={STATUS_COLOR[customer.status]}
                    variant={
                      customer.status === "active" ? "filled" : "outlined"
                    }
                  />
                </Stack>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 2 }}
                >
                  To change any of this, contact {settings.dairy_name}
                  {settings.phone ? ` — ${settings.phone}` : ""}.
                </Typography>
              </>
            ) : (
              <Alert severity="info">
                Your login is not linked to a dairy record yet. Contact the
                dairy.
              </Alert>
            )}
          </Section>

          <Section
            title="Change password"
            subtitle="Use at least 8 characters."
          >
            <Box component="form" action={savePassword}>
              {passwordState?.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {passwordState.error}
                </Alert>
              )}
              {passwordState?.ok && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Password changed.
                </Alert>
              )}

              <Stack spacing={2}>
                <TextField
                  type="password"
                  name="password"
                  label="New password"
                  required
                  fullWidth
                  autoComplete="new-password"
                />
                <TextField
                  type="password"
                  name="confirm"
                  label="Repeat it"
                  required
                  fullWidth
                  autoComplete="new-password"
                />
                <Box sx={{ textAlign: "right" }}>
                  <SaveButton
                    icon={LockResetIcon}
                    label="Change password"
                    busy="Changing..."
                  />
                </Box>
              </Stack>
            </Box>
          </Section>
        </Stack>
      </Grid>
    </Grid>
  );
}
