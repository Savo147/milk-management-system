"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import BoltIcon from "@mui/icons-material/Bolt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import {
  TEMPLATE_GROUPS,
  TEMPLATE_COUNT,
  fillTemplate,
} from "@/lib/chat-templates";

/**
 * The replies the dairy keeps typing, one tap away.
 *
 * Picking one drops the text into the message box rather than sending it —
 * every one of these wants a word added or taken out before it goes, and a
 * template that sends itself is how a customer ends up being told their milk
 * is late on a day it was not.
 */
export default function TemplatePicker({ onPick, name }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);

  const q = query.trim().toLowerCase();

  // While something is typed every group opens and only the matching lines
  // are in them, so the answer is on screen rather than behind a heading.
  const groups = useMemo(() => {
    if (!q) return TEMPLATE_GROUPS;

    return TEMPLATE_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (t) =>
          t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  const shown = groups.reduce((n, g) => n + g.items.length, 0);

  const close = () => {
    setAnchorEl(null);
    setQuery("");
    setOpen(null);
  };

  const choose = (body) => {
    onPick(fillTemplate(body, name));
    close();
  };

  return (
    <>
      <Tooltip title="Saved replies">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Saved replies"
        >
          <BoltIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mb: 1,
              width: { xs: "calc(100vw - 32px)", sm: 400 },
              maxWidth: 400,
              maxHeight: 420,
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              border: 1,
              borderColor: "divider",
              overflow: "hidden",
            },
          },
        }}
      >
        <Box sx={{ p: 1.5, flexShrink: 0 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved replies..."
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
        </Box>

        <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
          {groups.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 2, py: 4, textAlign: "center" }}
            >
              Nothing matches that.
            </Typography>
          )}

          {groups.map((group) => {
            const isOpen = Boolean(q) || open === group.key;

            return (
              <Box key={group.key}>
                <Stack
                  direction="row"
                  onClick={() => setOpen(isOpen && !q ? null : group.key)}
                  sx={{
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 1,
                    cursor: "pointer",
                    bgcolor: isOpen ? "action.selected" : "grey.50",
                    borderTop: 1,
                    borderColor: "divider",
                    // The open group carries a coloured edge, so which one you
                    // are inside is clear without reading the headings.
                    borderLeft: 3,
                    borderLeftColor: isOpen ? "primary.main" : "transparent",
                  }}
                >
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{
                      color: "text.secondary",
                      transform: isOpen ? "none" : "rotate(-90deg)",
                      transition: "transform .15s",
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      flexGrow: 1,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: isOpen ? "primary.main" : "text.secondary",
                    }}
                  >
                    {group.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {group.items.length}
                  </Typography>
                </Stack>

                <Collapse in={isOpen} unmountOnExit>
                  {group.items.map((t) => (
                    <Box
                      key={t.title}
                      onClick={() => choose(t.body)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        cursor: "pointer",
                        borderTop: 1,
                        borderColor: "divider",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {fillTemplate(t.body, name)}
                      </Typography>
                    </Box>
                  ))}
                </Collapse>
              </Box>
            );
          })}
        </Box>

        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 1,
            flexShrink: 0,
            color: "text.secondary",
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "grey.50",
          }}
        >
          {q
            ? `${shown} of ${TEMPLATE_COUNT} match`
            : `${TEMPLATE_COUNT} saved replies`}
        </Typography>
      </Popover>
    </>
  );
}
