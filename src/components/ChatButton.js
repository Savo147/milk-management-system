"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MessagesIcon from "@/components/MessagesIcon";
import ChatThread from "@/components/ChatThread";
import { ago, preview } from "@/lib/chat-format";

/** How many conversations the preview list shows before "Open chat". */
const PREVIEW_COUNT = 3;

export default function ChatButton({
  dairyName,
  logoUrl,
  meName,
  mePhoto,
  isAdmin,
  threads = [],
  channels = [],
  chatHref,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  // Which thread is open. A customer only has one, so it opens straight away.
  const [openThread, setOpenThread] = useState(null);

  // Channels and direct threads sit in one list here, newest first: the
  // header preview is about what has just happened, not about which kind of
  // conversation it happened in.
  const all = [...threads, ...channels]
    .map((c) => ({ ...c, name: c.name ?? dairyName }))
    .sort((a, b) => new Date(b.lastAt ?? 0) - new Date(a.lastAt ?? 0));

  const unread = all.reduce((n, c) => n + c.unread, 0);
  const shown = all.slice(0, PREVIEW_COUNT);

  // Everyone gets the same list first — the dairy, and whatever channels
  // they are in. Dropping a customer straight into the one thread saved a
  // click and hid the channels behind a back arrow they had no reason to
  // press.
  const open = (e) => setAnchorEl(e.currentTarget);

  const close = () => {
    setAnchorEl(null);
    setOpenThread(null);
  };

  return (
    <>
      <Tooltip title="Chat">
        <IconButton onClick={open} aria-label="Chat">
          <Badge badgeContent={unread} color="error" max={99}>
            <MessagesIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: 3,
              border: 1,
              borderColor: "divider",
              boxShadow: "0 12px 32px rgba(21,26,32,.12)",
              overflow: "hidden",
              width: { xs: "calc(100vw - 32px)", sm: 360 },
              maxWidth: 360,
              // The preview list shrinks to its rows; only an open thread
              // needs the full height, which its own scroller asks for.
              maxHeight: 470,
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.25,
            flexShrink: 0,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          {openThread && (
            <IconButton
              size="small"
              onClick={() => setOpenThread(null)}
              aria-label="Back to all conversations"
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}

          <Typography variant="subtitle2" noWrap sx={{ flexGrow: 1 }}>
            {openThread
              ? openThread.kind === "channel"
                ? openThread.name
                : (openThread.name ?? dairyName)
              : "Chat"}
          </Typography>

          {unread > 0 && !openThread && (
            <Box
              sx={{
                px: 0.9,
                height: 19,
                display: "grid",
                placeItems: "center",
                borderRadius: 5,
                flexShrink: 0,
                bgcolor: "error.main",
                color: "#fff",
                fontSize: "0.7rem",
                fontWeight: 700,
              }}
            >
              {unread > 99 ? "99+" : unread}
            </Box>
          )}
        </Stack>

        {/* The list of conversations — admin only; a customer has just one.
            Only the newest few, the way a header preview should read; the
            whole lot lives on the chat page under "Open chat". */}
        {!openThread && (
          <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
            {all.length === 0 && (
              <Stack sx={{ alignItems: "center", gap: 1, px: 3, py: 5 }}>
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: "grey.100",
                    color: "grey.400",
                  }}
                >
                  <MessagesIcon />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  No conversations yet.
                </Typography>
              </Stack>
            )}

            {shown.map((t, i) => (
              <ListItemButton
                key={`${t.kind}:${t.id}`}
                onClick={() => setOpenThread(t)}
                sx={{
                  gap: 1.5,
                  px: 2,
                  py: 1.25,
                  borderRadius: 0,
                  borderBottom: i === shown.length - 1 ? 0 : 1,
                  borderColor: "divider",
                  // Same language as the bell: unread is tinted and edged.
                  bgcolor: t.unread ? "primary.50" : "transparent",
                  borderLeft: 3,
                  borderLeftColor: t.unread ? "primary.main" : "transparent",
                }}
              >
                <Avatar
                  src={
                    (t.kind === "channel"
                      ? null
                      : isAdmin
                        ? t.photo
                        : logoUrl) || undefined
                  }
                  variant={t.kind === "channel" ? "rounded" : "circular"}
                  sx={{
                    width: 38,
                    height: 38,
                    // A channel is a room, not a person, so it gets a square
                    // badge with its hash rather than a round face.
                    bgcolor:
                      t.kind === "channel" ? "primary.100" : "primary.main",
                    color: t.kind === "channel" ? "primary.dark" : undefined,
                    fontSize: "0.9rem",
                    fontWeight: 700,
                  }}
                >
                  {t.kind === "channel" ? "#" : t.name?.[0]?.toUpperCase()}
                </Avatar>

                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: t.unread ? 700 : 600 }}
                  >
                    {t.kind === "channel" ? `# ${t.name}` : t.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      display: "block",
                      color: t.unread ? "text.primary" : "text.secondary",
                      fontWeight: t.unread ? 600 : 400,
                    }}
                  >
                    {preview(t)}
                  </Typography>
                </Box>

                <Stack sx={{ alignItems: "flex-end", gap: 0.5 }}>
                  <Typography variant="caption" color="text.disabled">
                    {ago(t.lastAt)}
                  </Typography>
                  {t.unread > 0 && (
                    <Box
                      sx={{
                        minWidth: 18,
                        height: 18,
                        px: 0.5,
                        borderRadius: 9,
                        bgcolor: "error.main",
                        color: "common.white",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        lineHeight: "18px",
                        textAlign: "center",
                      }}
                    >
                      {t.unread}
                    </Box>
                  )}
                </Stack>
              </ListItemButton>
            ))}
          </Box>
        )}

        {/* The thread itself, in a fixed-height pane so a two-line
            conversation does not collapse the popover to nothing. */}
        {openThread && (
          <Stack sx={{ height: 360, minHeight: 0 }}>
            <ChatThread
              key={`${openThread.kind}:${openThread.id}`}
              kind={openThread.kind}
              targetId={openThread.id}
              meName={meName}
              themName={openThread.name}
              mePhoto={mePhoto}
              themPhoto={isAdmin ? openThread.photo : logoUrl}
              hasUnread={openThread.unread > 0}
              canPost={
                openThread.kind !== "channel" ||
                isAdmin ||
                !openThread.announcementOnly
              }
              readOnlyNote={`Only ${dairyName} can post here.`}
            />
          </Stack>
        )}

        {!openThread && (
          <Button
            fullWidth
            component={Link}
            href={chatHref}
            onClick={close}
            sx={{
              py: 1.25,
              borderRadius: 0,
              flexShrink: 0,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "grey.50",
            }}
          >
            Open chat
            {all.length > PREVIEW_COUNT &&
              ` (${all.length - PREVIEW_COUNT} more)`}
          </Button>
        )}
      </Popover>
    </>
  );
}
