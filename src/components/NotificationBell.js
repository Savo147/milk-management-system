"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { formatDate } from "@/lib/format";
import { problemHref } from "@/lib/notification-link";
import {
  markNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-actions";

export default function NotificationBell({
  notifications = [],
  unread = 0,
  isAdmin = false,
}) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [pending, startTransition] = useTransition();

  const open = (e) => setAnchorEl(e.currentTarget);
  const close = () => setAnchorEl(null);

  /** Opens the complaint the bell is about, and stops counting it. */
  const openProblem = (n) => {
    close();
    if (!n.is_read) startTransition(() => markNotificationRead(n.id));
    router.push(problemHref(n.created_at, isAdmin, n.reference_id));
  };

  const allHref = isAdmin ? "/admin/notifications" : "/customer/notifications";

  return (
    <>
      <IconButton onClick={open} aria-label="Notifications">
        <Badge badgeContent={unread} color="error" max={99}>
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>

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
              // The rounded corners only stay rounded if the paper clips, so
              // the scrolling happens on the list inside rather than here.
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              // 340 overhangs a 360px screen once the popover's own offset
              // from the edge is counted.
              width: { xs: "calc(100vw - 32px)", sm: 360 },
              maxWidth: 360,
              maxHeight: 440,
            },
          },
        }}
      >
        {/* The header holds still; only the list below it moves. */}
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 2,
            py: 1.25,
            flexShrink: 0,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2">Notifications</Typography>
            {unread > 0 && (
              <Box
                sx={{
                  px: 0.9,
                  height: 19,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 5,
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

          {unread > 0 && (
            <Button
              size="small"
              disabled={pending}
              onClick={() => startTransition(() => markNotificationsRead())}
              sx={{ minWidth: 0, px: 1 }}
            >
              Mark all read
            </Button>
          )}
        </Stack>

        {/* Its own scroller. Fifteen of these are taller than the popover is
            allowed to be, and the paper itself has to clip to keep its
            rounded corners. */}
        <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
          {notifications.length === 0 && (
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
                <NotificationsNoneIcon />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Nothing new.
              </Typography>
            </Stack>
          )}

          {notifications.map((n, i) => (
            <ListItemButton
              key={n.id}
              onClick={() => openProblem(n)}
              sx={{
                alignItems: "flex-start",
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: 0,
                borderBottom: i === notifications.length - 1 ? 0 : 1,
                borderColor: "divider",
                // Unread ones are tinted, and carry a blue edge down the left
                // so the new ones are countable without reading a word.
                bgcolor: n.is_read ? "transparent" : "primary.50",
                borderLeft: 3,
                borderLeftColor: n.is_read ? "transparent" : "primary.main",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  flexShrink: 0,
                  mt: 0.25,
                  bgcolor: n.is_read ? "grey.100" : "primary.100",
                  color: n.is_read ? "grey.500" : "primary.dark",
                }}
              >
                <ReportProblemIcon sx={{ fontSize: 18 }} />
              </Box>

              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: n.is_read ? 500 : 700, lineHeight: 1.35 }}
                >
                  {n.title}
                </Typography>
                {n.message && (
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.25,
                      color: "text.secondary",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.message}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  sx={{ mt: 0.25, display: "block", color: "text.disabled" }}
                >
                  {formatDate(n.created_at)}
                </Typography>
              </Box>

              {!n.is_read && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    mt: 1,
                    borderRadius: "50%",
                    flexShrink: 0,
                    bgcolor: "primary.main",
                  }}
                />
              )}
            </ListItemButton>
          ))}
        </Box>

        {/* The bell only carries the newest fifteen. Everything ever sent
            lives on the page behind this. */}
        <Button
          fullWidth
          component={Link}
          href={allHref}
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
          View all
        </Button>
      </Popover>
    </>
  );
}
