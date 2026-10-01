"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SaveIcon from "@mui/icons-material/Save";
import LockResetIcon from "@mui/icons-material/LockReset";
import { ACCOUNT_STATUS, STATUS_COLOR } from "@/lib/constants";
import AvatarPicker from "@/components/AvatarPicker";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ThemePicker from "@/components/ThemePicker";
import { updateMyProfile, changeMyPassword, updateMyMilkPlan } from "./actions";

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

function Section({ title, subtitle, action, children }) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 3, border: 1, borderColor: "divider", height: "100%" }}
    >
      <Stack direction="row" sx={{ alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

const TABS = ["My details", "My milk details", "Password"];

export default function ProfileView({ user, customer, settings, themeMode }) {
  const [profileState, saveProfile] = useActionState(updateMyProfile, null);
  const [passwordState, savePassword] = useActionState(changeMyPassword, null);
  const [planState, savePlan] = useActionState(updateMyMilkPlan, null);
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* Tabs, the same way the dairy's Settings page is laid out. Side by
          side these three sat in two columns of very different heights, and
          the shorter one left a hole down the page. */}
      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        {TABS.map((label) => (
          <Tab key={label} label={label} sx={{ textTransform: "none" }} />
        ))}
      </Tabs>

      {tab === 0 && (
        <Section
          title="My details"
          subtitle="You can change your name, mobile and photo yourself."
          // How the app looks is a setting about you, so it sits with the
          // rest of your own details. It saves itself — nothing to press.
          action={<ThemePicker mode={themeMode} />}
        >
          <Box component="form" action={saveProfile}>
            <Box sx={{ mb: 2.5 }}>
              <AvatarPicker
                name="profile_photo"
                userId={user.id}
                initialUrl={user.profile_photo}
                label={user.name}
              />
            </Box>

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
      )}

      {tab === 1 && (
        <Section
          title="My milk details"
          subtitle="Your details and how much milk you want."
        >
          {customer ? (
            <Box component="form" action={savePlan}>
              {planState?.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {planState.error}
                </Alert>
              )}
              {planState?.ok && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Saved.
                </Alert>
              )}

              {/* Two to a row from sm up, the way the dairy's own Settings
                  tabs are laid out. Address gets a row of its own: it is the
                  one field somebody writes a sentence into. */}
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Name (in the dairy's records)"
                    value={customer.name ?? ""}
                    fullWidth
                    disabled
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    name="mobile"
                    label="Mobile"
                    defaultValue={customer.mobile ?? ""}
                    fullWidth
                    helperText="10 digits. The dairy calls this number."
                    slotProps={{
                      htmlInput: { inputMode: "numeric", maxLength: 10 },
                    }}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    name="address"
                    label="Address"
                    defaultValue={customer.address ?? ""}
                    fullWidth
                    multiline
                    rows={2}
                    helperText="Where the milk is delivered"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    name="daily_quantity"
                    label="Daily milk (liters)"
                    type="number"
                    defaultValue={customer.daily_quantity ?? 1}
                    required
                    fullWidth
                    slotProps={{
                      htmlInput: { min: 0.25, max: 99, step: 0.25 },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    name="rate_per_liter"
                    label="Rate (₹ / liter)"
                    type="number"
                    defaultValue={customer.rate_per_liter ?? ""}
                    required
                    fullWidth
                    helperText="Old rates are kept in history"
                    slotProps={{ htmlInput: { min: 0.01, step: "any" } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    name="delivery_time"
                    label="Delivery time"
                    defaultValue={customer.delivery_time ?? ""}
                    fullWidth
                    placeholder="e.g. before 7 am"
                  />
                </Grid>
              </Grid>

              <Stack spacing={2}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", alignItems: "center" }}
                >
                  <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
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

                  <SaveButton label="Save" busy="Saving..." />
                </Stack>

                <Typography variant="caption" color="text.secondary">
                  Your status and the name on the dairy&apos;s records are set
                  by {settings.dairy_name}
                  {settings.phone ? ` — ${settings.phone}` : ""}.
                </Typography>
              </Stack>
            </Box>
          ) : (
            <Alert severity="info">
              Your login is not linked to a dairy record yet. Contact the dairy.
            </Alert>
          )}
        </Section>
      )}

      {tab === 2 && (
        <Section title="Change password" subtitle="Use at least 8 characters.">
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
                label="Confirm password"
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
      )}
    </Box>
  );
}
