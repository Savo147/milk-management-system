"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import { formatTime } from "@/lib/format";

/** One row, and how many of them are on show at once. */
const ROW = 36;
const VISIBLE = 5;
/** Rows above and below the middle one, which is the one being picked. */
const PAD = Math.floor(VISIBLE / 2);
/** The panel: five rows plus its own padding. */
const PANEL = ROW * VISIBLE + 24;
/** Keep this much clear of the window edge before calling it "no room". */
const EDGE = 12;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const HALVES = ["AM", "PM"];

/** "18:30" → { hour: "6", minute: "30", half: "PM" } */
function split(value) {
  const m = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!m) return { hour: "6", minute: "00", half: "AM" };

  const h = Number(m[1]);
  return {
    hour: String(h % 12 === 0 ? 12 : h % 12),
    minute: m[2],
    half: h < 12 ? "AM" : "PM",
  };
}

/** The other way round, back to what the database holds. */
function join({ hour, minute, half }) {
  let h = Number(hour) % 12;
  if (half === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

/**
 * One spinning column.
 *
 * The browser does the snapping — `scroll-snap-type` on the column and
 * `scroll-snap-align` on each row — so the motion is the native one the
 * finger expects, with no animation code and no fight over momentum. All this
 * has to do is read back which row ended up in the middle.
 *
 * The padding above and below is what lets the first and last values reach
 * the middle at all; without it the list stops with "1" at the top and "12"
 * at the bottom, neither of them ever selectable.
 */
function Column({ items, value, onChange }) {
  const ref = useRef(null);
  const settle = useRef(null);

  /** Put the current value in the middle, without animating, on open. */
  const mount = (node) => {
    ref.current = node;
    if (!node) return;
    const i = Math.max(0, items.indexOf(value));
    node.scrollTop = i * ROW;
  };

  const handleScroll = () => {
    clearTimeout(settle.current);
    // Read once the scrolling stops rather than on every frame: mid-flick the
    // middle row is whatever is rushing past, and changing the value sixty
    // times a second is both wrong and expensive.
    settle.current = setTimeout(() => {
      const node = ref.current;
      if (!node) return;
      const i = Math.min(
        items.length - 1,
        Math.max(0, Math.round(node.scrollTop / ROW)),
      );
      if (items[i] !== value) onChange(items[i]);
    }, 90);
  };

  const pick = (item, i) => {
    onChange(item);
    ref.current?.scrollTo({ top: i * ROW, behavior: "smooth" });
  };

  return (
    <Box
      ref={mount}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        minWidth: 0,
        height: ROW * VISIBLE,
        overflowY: "auto",
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Box sx={{ height: ROW * PAD }} />

      {items.map((item, i) => (
        <Box
          key={item}
          onClick={() => pick(item, i)}
          sx={{
            height: ROW,
            display: "grid",
            placeItems: "center",
            scrollSnapAlign: "center",
            cursor: "pointer",
            userSelect: "none",
            fontSize: item === value ? "1.15rem" : "1rem",
            fontWeight: item === value ? 700 : 500,
            color: item === value ? "text.primary" : "text.disabled",
            fontVariantNumeric: "tabular-nums",
            transition: "color .12s, font-size .12s",
          }}
        >
          {item}
        </Box>
      ))}

      <Box sx={{ height: ROW * PAD }} />
    </Box>
  );
}

/**
 * Picking a delivery time.
 *
 * The browser's own `type="time"` was doing this before. It works, but it is
 * the browser's picker and not the app's: Chrome paints it its own blue,
 * ignores the theme completely, and on a dark page arrives as a white panel
 * in the middle of a black one. A dropdown of fixed times was the next try,
 * and it ruled out every minute that was not on the quarter hour.
 *
 * So: three columns, any minute of the day, and the app's own colours.
 *
 * There is nothing to confirm. The wheels write straight through to the
 * field, the way a dropdown does — a Confirm button on a control whose
 * current state is already on screen only asks a question that has been
 * answered. Clearing is the small × in the field itself, where it can be
 * reached without opening anything.
 *
 * The value goes to the server in a hidden input, as "HH:MM" — the same
 * string the column has always held. Nothing downstream had to change.
 */
export default function TimeField({
  name,
  label,
  value,
  helperText,
  fullWidth,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [saved, setSaved] = useState(value ?? "");
  // The panel is as wide as the field it belongs to, so it reads as that
  // field opening rather than as a separate thing arriving.
  const [width, setWidth] = useState(0);
  // Which way it opens. Measured when it opens, not guessed: in a dialog
  // already scrolled to its bottom there is no room below, and a panel that
  // always drops downwards ends up hanging off the screen over its own field.
  const [up, setUp] = useState(false);

  const parts = split(saved);

  const open = (e) => {
    const field = e.currentTarget;
    const box = field.getBoundingClientRect();

    setWidth(box.width);
    setUp(window.innerHeight - box.bottom - EDGE < PANEL);
    setAnchorEl(field);
  };

  const set = (patch) => setSaved(join({ ...parts, ...patch }));

  const clear = (e) => {
    // Without this the click carries on to the field and opens the panel.
    e.stopPropagation();
    setSaved("");
  };

  return (
    <>
      <input type="hidden" name={name} value={saved} />

      <TextField
        label={label}
        value={saved ? formatTime(saved) : ""}
        placeholder="Not set"
        helperText={helperText}
        fullWidth={fullWidth}
        onClick={open}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            readOnly: true,
            sx: { cursor: "pointer" },
            startAdornment: (
              <InputAdornment position="start">
                <AccessTimeIcon
                  fontSize="small"
                  sx={{ color: "text.disabled" }}
                />
              </InputAdornment>
            ),
            endAdornment: saved ? (
              <InputAdornment position="end">
                <Tooltip title="Clear">
                  <IconButton size="small" onClick={clear} aria-label="Clear">
                    <CloseIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : null,
          },
        }}
      />

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: up ? "top" : "bottom", horizontal: "left" }}
        transformOrigin={{
          vertical: up ? "bottom" : "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              my: 0.5,
              width,
              px: 1,
              py: 1.5,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            },
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          {/* The band behind the middle row. It is what says "this one" — the
              columns themselves only scroll. */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              top: ROW * PAD,
              height: ROW,
              borderRadius: 1.5,
              bgcolor: "action.selected",
              pointerEvents: "none",
            }}
          />

          <Stack direction="row">
            <Column
              items={HOURS}
              value={parts.hour}
              onChange={(hour) => set({ hour })}
            />
            <Column
              items={MINUTES}
              value={parts.minute}
              onChange={(minute) => set({ minute })}
            />
            <Column
              items={HALVES}
              value={parts.half}
              onChange={(half) => set({ half })}
            />
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
