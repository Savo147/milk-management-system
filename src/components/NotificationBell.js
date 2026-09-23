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
import { formatDate } from "@/lib/format";
import { markNotificationsRead } from "@/lib/notification-actions";

export default function NotificationBell({ notifications = [], unread = 0 }) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [pending, startTransition] = useTransition();

  const open = (e) => setAnchorEl(e.currentTarget);
  const close = () => setAnchorEl(null);

  // The bell only carries problems, so every one of them opens the same page.
  const openProblems = () => {
    close();
    router.push("/admin/problems");
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
          paper: { sx: { mt: 1, borderRadius: 3, width: 340, maxHeight: 420 } },
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
            onClick={openProblems}
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
