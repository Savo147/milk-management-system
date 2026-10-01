"use client";

import { useState, useTransition } from "react";
import CircularProgress from "@mui/material/CircularProgress";
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

/**
 * The looks on offer.
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

export default function ThemePicker({ mode: inForce = "light" }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [pending, startTransition] = useTransition();

  // The server decides what is in force and hands it down; this copy only
  // has to keep the button honest between the click and the redraw.
  const [mode, setMode] = useState(inForce);

  const current = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[0];
  const close = () => setAnchorEl(null);

  const choose = (next) => {
    close();
    if (next === mode) return;

    setMode(next);
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
          where they are telling the two apart. */}
      <Tooltip title={`Theme — ${current.label}`}>
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={pending}
          aria-label="Theme"
        >
          {pending ? (
            <CircularProgress size={18} />
          ) : (
            <PaletteOutlinedIcon fontSize="small" />
          )}
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
            onClick={() => choose(o.mode)}
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
