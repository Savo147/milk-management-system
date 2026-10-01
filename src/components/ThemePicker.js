"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckIcon from "@mui/icons-material/Check";
import { setThemeMode } from "@/lib/theme-mode";

/**
 * The looks on offer, each with the colour of the page it makes.
 *
 * Written out here rather than read from the theme on purpose: the theme only
 * ever knows about the look in force, and this list has to show the one you
 * are not using.
 */
const OPTIONS = [
  { mode: "light", label: "Light", page: "#ffffff" },
  { mode: "dark", label: "Dark", page: "#000000" },
];

/**
 * The circle: plainly the colour of the page that look gives you. White for
 * Light, black for Dark.
 *
 * It was two colours split down the diagonal at first — the page on one side,
 * the buttons on the other. Both looks are the same two colours the other way
 * round, so the two circles came out near enough identical to be useless. One
 * solid colour says which is which at a glance.
 *
 * The border is what keeps a white circle visible on a white menu, and a
 * black one on a black menu.
 */
function Swatch({ option, size = 16 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        bgcolor: option.page,
        border: 1,
        borderColor: "text.secondary",
      }}
    />
  );
}

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
      <Tooltip title="How the app looks">
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          disabled={pending}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          startIcon={
            pending ? (
              <CircularProgress size={15} />
            ) : (
              <Swatch option={current} />
            )
          }
          endIcon={<ArrowDropDownIcon />}
          sx={{ color: "text.secondary", borderColor: "divider" }}
        >
          {current.label}
        </Button>
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
              <Swatch option={o} size={18} />
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
