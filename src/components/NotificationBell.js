"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { DAIRY_TZ, formatDate } from "@/lib/format";
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

  /**
   * Opens the complaint the bell is about, and stops counting it.
   *
   * The two sides have different screens for the same thing, and this used to
   * send everyone to the admin's — so a customer tapping their own
   * notification was turned round by the guard and landed back on their
   * dashboard.
   *
   * The date matters too. The dairy's Problems page shows one day at a time,
   * and the customer's a month; opening either on today would hide the very
   * complaint that was tapped. Both are pointed at the day the notification
   * was written.
   */
  const openProblem = (n) => {
    close();

    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: DAIRY_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(n.created_at));

    if (!n.is_read) {
      startTransition(() => markNotificationRead(n.id));
    }

    const month = day.slice(0, 7);

    router.push(
      isAdmin
        ? `/admin/problems?date=${day}`
        : `/customer/report-problem?mode=month&from=${month}&to=${month}`,
    );
  };

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
              // 340 overhangs a 360px screen once the popover's own offset
              // from the edge is counted.
              width: { xs: "calc(100vw - 32px)", sm: 340 },
              maxWidth: 340,
              maxHeight: 420,
            },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", p: 1.5 }}
        >
          <Typography variant="subtitle2">Notifications</Typography>
          {unread > 0 && (
            <Button
              size="small"
              disabled={pending}
              onClick={() => startTransition(() => markNotificationsRead())}
            >
              Mark all as read
            </Button>
          )}
        </Stack>

        <Divider />

        {notifications.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Nothing new.
            </Typography>
          </Box>
        )}

        {notifications.map((n) => (
          <ListItemButton
            key={n.id}
            onClick={() => openProblem(n)}
            sx={{
              alignItems: "flex-start",
              flexDirection: "column",
              gap: 0.25,
              borderRadius: 0,
              // Unread ones are tinted so the new ones stand out in the list.
              bgcolor: n.is_read ? "transparent" : "primary.50",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: n.is_read ? 500 : 700 }}
            >
              {n.title}
            </Typography>
            {n.message && (
              <Typography
                variant="caption"
                sx={{
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
            <Typography variant="caption" sx={{ color: "text.disabled" }}>
              {formatDate(n.created_at)}
            </Typography>
          </ListItemButton>
        ))}
      </Popover>
    </>
  );
}
