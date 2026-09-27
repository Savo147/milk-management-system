"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import { EMOJI_GROUPS } from "@/lib/emoji-data";

/** The six swatches: the plain yellow one, then the five Fitzpatrick tones. */
const TONE_SWATCHES = ["✋", "✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"];

/** Which browser key the chosen tone is kept under. */
const TONE_KEY = "chat.emojiTone";

/** The emoji as it should be inserted: plain, or in the chosen tone. */
const inTone = (entry, tone) => (tone > 0 && entry[2] ? entry[2][tone - 1] : entry[0]); // prettier-ignore

/** Search runs across every group, so it needs them in one flat list. */
const ALL = EMOJI_GROUPS.flatMap((g) => g.emojis);

export default function EmojiPicker({ onPick, disabled = false }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [group, setGroup] = useState(0);
  const [query, setQuery] = useState("");
  // Whichever skin tone you last used is the one you almost certainly want
  // next time. Read here rather than in an effect: nothing that depends on it
  // is in the server's HTML — the swatches and the grid only exist once the
  // popover is open — so there is no hydration to get wrong. Losing it is
  // harmless; a private window or blocked storage just starts at yellow.
  const [tone, setTone] = useState(() => {
    if (typeof window === "undefined") return 0;

    try {
      const saved = Number(localStorage.getItem(TONE_KEY));
      return saved >= 0 && saved <= 5 ? saved : 0;
    } catch {
      return 0;
    }
  });

  const chooseTone = (next) => {
    setTone(next);
    try {
      localStorage.setItem(TONE_KEY, String(next));
    } catch {
      // Nothing to do — the picker still works for this visit.
    }
  };

  const q = query.trim().toLowerCase();

  const shown = useMemo(() => {
    if (!q) return EMOJI_GROUPS[group].emojis;
    // 1,900 names is small enough to walk on each keystroke; capped so a
    // single letter does not paint the whole set into the grid.
    return ALL.filter((e) => e[1].includes(q)).slice(0, 180);
  }, [q, group]);

  const close = () => {
    setAnchorEl(null);
    setQuery("");
  };

  return (
    <>
      <Tooltip title="Emoji">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="Emoji"
            sx={{ color: "text.secondary" }}
          >
            <SentimentSatisfiedAltIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: { sx: { borderRadius: 3, width: 340, overflow: "hidden" } },
        }}
      >
        <Stack
          direction="row"
          sx={{ gap: 1, alignItems: "center", p: 1.25, pb: 1 }}
        >
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji"
            size="small"
            fullWidth
            autoFocus
            slotProps={{
              input: {
                sx: { borderRadius: 3 },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* The skin tone, the way a phone keyboard does it: one choice that
              applies to every emoji that has tones, rather than five extra
              rows in the grid for each of them. */}
          <Tooltip title="Skin tone">
            <Stack
              direction="row"
              sx={{
                gap: 0.25,
                p: 0.25,
                borderRadius: 3,
                border: 1,
                borderColor: "divider",
                flexShrink: 0,
              }}
            >
              {TONE_SWATCHES.map((swatch, i) => (
                <ButtonBase
                  key={swatch}
                  onClick={() => chooseTone(i)}
                  aria-label={i === 0 ? "Default" : `Skin tone ${i}`}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    fontSize: "0.95rem",
                    lineHeight: 1,
                    bgcolor: tone === i ? "action.selected" : "transparent",
                  }}
                >
                  {swatch}
                </ButtonBase>
              ))}
            </Stack>
          </Tooltip>
        </Stack>

        {!q && (
          <Tabs
            value={group}
            onChange={(_, v) => setGroup(v)}
            variant="scrollable"
            scrollButtons={false}
            sx={{ minHeight: 38, "& .MuiTab-root": { minHeight: 38, minWidth: 40 } }} // prettier-ignore
          >
            {EMOJI_GROUPS.map((g, i) => (
              <Tab
                key={g.key}
                value={i}
                label={g.label}
                aria-label={g.name}
                sx={{ fontSize: "1.05rem", p: 0 }}
              />
            ))}
          </Tabs>
        )}

        <Typography
          variant="caption"
          sx={{ display: "block", px: 1.5, pt: 1, color: "text.secondary" }}
        >
          {q ? `${shown.length} found` : EMOJI_GROUPS[group].name}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gap: 0.25,
            p: 1,
            height: 240,
            overflowY: "auto",
          }}
        >
          {shown.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ gridColumn: "1 / -1", p: 2, textAlign: "center" }}
            >
              Nothing matches that.
            </Typography>
          )}

          {shown.map((entry) => {
            const char = inTone(entry, tone);

            return (
              <ButtonBase
                key={entry[1]}
                title={entry[1]}
                // The popover stays open: picking three in a row is the
                // normal way people use one of these.
                onClick={() => onPick(char)}
                sx={{
                  borderRadius: 1.5,
                  height: 34,
                  fontSize: "1.3rem",
                  lineHeight: 1,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                {char}
              </ButtonBase>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}
