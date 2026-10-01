"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import DairyForm from "./DairyForm";
import ProfileForm from "./ProfileForm";
import StaffSection from "./StaffSection";
import RatesTable from "./RatesTable";
import PasswordForm from "./PasswordForm";

const TABS = ["Dairy", "My details", "Password", "Users", "Rates"];

export default function SettingsTabs({
  settings,
  user,
  staff,
  rates,
  initialTab,
}) {
  /**
   * Which tab to open on, when the URL names one.
   *
   * A notification about a rate links straight here, and landing on the first
   * tab would leave the reader to find the thing they were just told about.
   * A lazy initialiser rather than an effect: the right tab is drawn first
   * time, with no flicker through the wrong one.
   */
  const [tab, setTab] = useState(() =>
    Math.max(
      0,
      TABS.findIndex((t) => t.toLowerCase() === initialTab),
    ),
  );

  return (
    <Box>
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

      {tab === 0 && <DairyForm settings={settings} />}
      {tab === 1 && <ProfileForm user={user} />}
      {tab === 2 && <PasswordForm />}
      {tab === 3 && <StaffSection staff={staff} currentUserId={user.id} />}
      {tab === 4 && <RatesTable rates={rates} />}
    </Box>
  );
}
