"use client";

import { useState, useTransition } from "react";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import CheckIcon from "@mui/icons-material/Check";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { setThemeMode } from "@/lib/theme-mode";
import { rememberChoice } from "@/lib/device-theme";
import { useThemeMode } from "@/components/AppTheme";

/**
 * Two lines, Light and Dark. There is no "System" line, and that is the
 * point: the phone's own setting is where the app starts from, so a dark
 * phone is already showing a dark app by the time anybody opens this menu.
 * Picking here is the override.
 *
 * A sun and a moon rather than a disc of each look's page colour. The disc
 * was honest — white for Light, black for Dark — but in the top bar, beside a
 * speech bubble and a bell, a plain circle is the one thing up there that
 * does not say what it is. These do.
 */
const OPTIONS = [
  { mode: "light", label: "Light", Icon: LightModeOutlinedIcon },
  { mode: "dark", label: "Dark", Icon: DarkModeOutlinedIcon },
];

export default function ThemePicker() {
  const { mode, setMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState(null);
  const [, startTransition] = useTransition();

  const current = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[0];
  const close = () => setAnchorEl(null);

  const pick = (next) => {
    close();
    if (next === mode) return;

    // In this order, and this is the whole fix for "changing theme is slow":
    // the page turns, the choice is written down, and only then does anything
    // leave the machine. Nothing here waits on the network — if the line is
    // down the colour still changed and a reload still remembers it; all that
    // is left for the server is the copy on their account.
    setMode(next);
    rememberChoice(next);
    startTransition(async () => {
      await setThemeMode(next);
    });
  };

  return (
    <>
      {/* A palette, and the same one whichever look is on. The button is
          "choose a theme", not "the theme is light" — and an icon that swaps
          between a sun and a moon makes you read it before you know what
          pressing it does. The sun and moon belong on the two lines inside,
          where they are telling the two apart.

          No spinner and never disabled: there is nothing to wait for. */}
      <Tooltip title={`Theme — ${current.label}`}>
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Theme"
        >
          <PaletteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {OPTIONS.map((o) => (
          <MenuItem
            key={o.mode}
            selected={o.mode === mode}
            onClick={() => pick(o.mode)}
          >
            <ListItemIcon>
              <o.Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{o.label}</ListItemText>
            {o.mode === mode && (
              <CheckIcon fontSize="small" sx={{ ml: 2, opacity: 0.6 }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
