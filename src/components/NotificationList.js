"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { DAIRY_TZ, formatDate } from "@/lib/format";
import { problemHref } from "@/lib/notification-link";
import {
  markNotificationsRead,
  markNotificationRead,
  deleteNotification,
  deleteNotifications,
} from "@/lib/notification-actions";

/** YYYY-MM-DD in the dairy's own timezone. Reads a value, never the clock. */
function dayOf(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAIRY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function timeOf(timestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: DAIRY_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/**
 * Splits the page into runs of the same day, newest first.
 *
 * The rows arrive sorted, so this only has to notice where the day changes —
 * no sorting, no grouping map. `today` comes from the server rather than
 * from the browser's clock, so the heading says the same thing to a user
 * whose laptop is set to another timezone.
 */
function byDay(notifications, today) {
  const yesterday = new Date(Date.parse(today) - 86_400_000)
    .toISOString()
    .slice(0, 10);

  const groups = [];
  for (const n of notifications) {
    const day = dayOf(n.created_at);
    const last = groups[groups.length - 1];

    if (last?.day === day) last.items.push(n);
    else {
      groups.push({
        day,
        label:
          day === today
            ? "Today"
            : day === yesterday
              ? "Yesterday"
              : formatDate(n.created_at),
        items: [n],
      });
    }
  }
  return groups;
}

/** One of the two pills at the top. */
function TabPill({ href, label, count, active, tone }) {
  return (
    <Button
      component={Link}
      href={href}
      disableRipple
      sx={{
        px: 2,
        py: 0.75,
        borderRadius: 999,
        minWidth: 0,
        fontWeight: 600,
        color: active ? tone.fg : "text.secondary",
        bgcolor: active ? "background.paper" : "transparent",
        boxShadow: active ? "0 1px 3px rgba(21,26,32,.12)" : "none",
        "&:hover": { bgcolor: active ? "background.paper" : "grey.200" },
      }}
    >
      {label}
      {count > 0 && (
        <Box
          component="span"
          sx={{
            ml: 1,
            px: 0.85,
            height: 19,
            display: "inline-grid",
            placeItems: "center",
            borderRadius: 5,
            fontSize: "0.7rem",
            fontWeight: 700,
            bgcolor: active ? tone.bg : "grey.300",
            color: active ? tone.fg : "text.secondary",
          }}
        >
          {count > 99 ? "99+" : count}
        </Box>
      )}
    </Button>
  );
}

const UNREAD_TONE = { bg: "var(--tile-blue-bg)", fg: "var(--tile-blue-fg)" };
const READ_TONE = { bg: "var(--tile-green-bg)", fg: "var(--tile-green-fg)" };

/**
 * Every notification, a page at a time.
 *
 * The bell carries the newest fifteen and nothing else; anything older used
 * to have nowhere to be read. The rows keep the bell's language — tinted and
 * edged while unread — so this reads as the same list made longer rather
 * than as a different screen.
 */
export default function NotificationList({
  notifications = [],
  unread = 0,
  read = 0,
  total = 0,
  page = 1,
  perPage = 30,
  tab = "unread",
  today,
  isAdmin = false,
  basePath,
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);

  const all = unread + read;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const first = total === 0 ? 0 : (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);
  const groups = byDay(notifications, today);

  const open = (n) => {
    if (!n.is_read) startTransition(() => markNotificationRead(n.id));
    router.push(problemHref(n.created_at, isAdmin, n.reference_id));
  };

  /**
   * Every one of these ends with a refresh. `revalidatePath` on the server
   * clears the cache but the page Next already painted stays as it is until
   * something asks for it again, and that is what leaves a row sitting on
   * screen after it has been deleted.
   */
  const run = (action) =>
    startTransition(async () => {
      setError(null);
      const res = await action();
      if (res?.error) setError(res.error);
      else router.refresh();
    });

  // stopPropagation matters: without it the click carries on to the row
  // underneath and opens the complaint that was just thrown away.
  const remove = (e, id) => {
    e.stopPropagation();
    run(() => deleteNotification(id));
  };

  const clearTab = () => {
    setClearing(false);
    run(() => deleteNotifications(tab));
  };

  return (
    <Box>
      {/* A banner rather than a line of grey text: this is the one number
          the page exists to tell you, so it is allowed to take up room. */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          px: { xs: 2, sm: 2.5 },
          py: { xs: 2, sm: 2.25 },
          borderRadius: 3,
          border: 1,
          borderColor:
            unread > 0 ? "var(--tile-blue-bg)" : "var(--tile-green-bg)",
          borderLeft: 4,
          borderLeftColor:
            unread > 0 ? "var(--tile-blue-line)" : "var(--tile-green-line)",
          bgcolor:
            unread > 0 ? "var(--tile-blue-card)" : "var(--tile-green-card)",
          backgroundImage:
            unread > 0
              ? "radial-gradient(120% 130% at 100% 0%, var(--tile-blue-bg) 0%, var(--tile-fade) 62%)"
              : "radial-gradient(120% 130% at 100% 0%, var(--tile-green-bg) 0%, var(--tile-fade) 62%)",
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: "center", gap: 2, flexWrap: "wrap" }}
        >
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 52,
              height: 52,
              borderRadius: 2.5,
              flexShrink: 0,
              bgcolor:
                unread > 0 ? "var(--tile-blue-bg)" : "var(--tile-green-bg)",
              color:
                unread > 0 ? "var(--tile-blue-fg)" : "var(--tile-green-fg)",
              boxShadow: "0 0 0 4px var(--ring)",
            }}
          >
            {unread > 0 ? (
              <NotificationsActiveIcon sx={{ fontSize: 27 }} />
            ) : (
              <DoneAllIcon sx={{ fontSize: 27 }} />
            )}
          </Box>

          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
              {unread > 0
                ? `${unread} ${unread === 1 ? "notification" : "notifications"} waiting`
                : "All caught up"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {all === 0
                ? isAdmin
                  ? "Complaints from customers land here"
                  : "Replies from the dairy land here"
                : `${all} in all · ${read} already read`}
            </Typography>
          </Box>

          <Stack direction="row" sx={{ gap: 1, flexShrink: 0 }}>
            {unread > 0 && (
              <Button
                size="small"
                variant="contained"
                disabled={pending}
                startIcon={<DoneAllIcon sx={{ fontSize: 17 }} />}
                onClick={() => run(markNotificationsRead)}
              >
                Mark all read
              </Button>
            )}

            {notifications.length > 0 && (
              <Button
                size="small"
                color="error"
                variant="outlined"
                disabled={pending}
                startIcon={<DeleteOutlineIcon sx={{ fontSize: 17 }} />}
                onClick={() => setClearing(true)}
                // On the banner's own tint a bare text button read as a
                // label rather than as something to press.
                sx={{ bgcolor: "background.paper" }}
              >
                Clear all
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Links, not client state: each tab is a place with its own address,
          and the rows behind it are fetched on the server anyway. Moving
          tabs resets the pager — page 3 of one is nothing in the other. */}
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            gap: 0.5,
            p: 0.5,
            borderRadius: 999,
            bgcolor: "grey.100",
          }}
        >
          <TabPill
            href={`${basePath}?tab=unread`}
            label="Unread"
            count={unread}
            active={tab === "unread"}
            tone={UNREAD_TONE}
          />
          <TabPill
            href={`${basePath}?tab=read`}
            label="Read"
            count={read}
            active={tab === "read"}
            tone={READ_TONE}
          />
        </Box>

        {total > 0 && (
          <Typography variant="body2" color="text.secondary">
            Showing {first}–{last} of {total}
          </Typography>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {notifications.length === 0 && (
          <Stack sx={{ alignItems: "center", gap: 1.5, px: 3, py: 8 }}>
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: tab === "read" ? "grey.100" : "var(--tile-green-bg)",
                color: tab === "read" ? "grey.400" : "var(--tile-green-fg)",
              }}
            >
              {tab === "read" ? (
                <NotificationsNoneIcon sx={{ fontSize: 30 }} />
              ) : (
                <DoneAllIcon sx={{ fontSize: 30 }} />
              )}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {tab === "read" ? "Nothing read yet" : "All caught up"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", maxWidth: 360 }}
            >
              {tab === "read"
                ? "Notifications move here once you have opened them."
                : isAdmin
                  ? "When a customer raises a complaint, it lands here."
                  : "When the dairy answers a complaint, it lands here."}
            </Typography>
          </Stack>
        )}

        {groups.map((group, g) => (
          <Box key={group.day}>
            <Box
              sx={{
                px: 2.5,
                py: 0.9,
                bgcolor: "grey.50",
                borderBottom: 1,
                // Only between groups — the first one already has the card's
                // own top edge above it.
                borderTop: g === 0 ? 0 : 1,
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                {group.label}
              </Typography>
            </Box>

            {group.items.map((n, i) => (
              <ListItemButton
                key={n.id}
                onClick={() => open(n)}
                sx={{
                  alignItems: "flex-start",
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  borderRadius: 0,
                  borderBottom: i === group.items.length - 1 ? 0 : 1,
                  borderColor: "divider",
                  // A read row is not blank paper either — a cool grey wash,
                  // with its own left edge, so the list reads as rows rather
                  // than as text floating on a white card.
                  bgcolor: n.is_read ? "grey.50" : "var(--tile-blue-card)",
                  borderLeft: 3,
                  borderLeftColor: n.is_read
                    ? "grey.300"
                    : "var(--tile-blue-line)",
                  "&:hover": {
                    bgcolor: n.is_read ? "grey.100" : "var(--tile-blue-bg)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    flexShrink: 0,
                    mt: 0.25,
                    // White on the wash, so the icon sits in its own tile
                    // instead of disappearing into the row.
                    bgcolor: n.is_read
                      ? "background.paper"
                      : "var(--tile-amber-bg)",
                    color: n.is_read ? "grey.500" : "var(--tile-amber-fg)",
                    border: n.is_read ? 1 : 0,
                    borderColor: "grey.200",
                  }}
                >
                  <ReportProblemIcon sx={{ fontSize: 21 }} />
                </Box>

                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: n.is_read ? 500 : 700,
                        lineHeight: 1.4,
                      }}
                    >
                      {n.title}
                    </Typography>

                    {!n.is_read && (
                      <Box
                        component="span"
                        sx={{
                          px: 0.75,
                          py: 0.1,
                          borderRadius: 5,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          bgcolor: "var(--tile-blue-bg)",
                          color: "var(--tile-blue-fg)",
                        }}
                      >
                        New
                      </Box>
                    )}
                  </Stack>

                  {n.message && (
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.4, color: "text.secondary" }}
                    >
                      {n.message}
                    </Typography>
                  )}

                  <Typography
                    variant="caption"
                    sx={{ mt: 0.6, display: "block", color: "text.disabled" }}
                  >
                    {timeOf(n.created_at)}
                  </Typography>
                </Box>

                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    disabled={pending}
                    onClick={(e) => remove(e, n.id)}
                    aria-label="Delete this notification"
                    sx={{ mt: 0.5, flexShrink: 0, color: "text.secondary", border: 1, borderColor: "grey.300", bgcolor: "background.paper", "&:hover": { color: "error.main", borderColor: "error.main", bgcolor: "error.light" } }} // prettier-ignore
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 19 }} />
                  </IconButton>
                </Tooltip>
              </ListItemButton>
            ))}
          </Box>
        ))}
      </Paper>

      {pages > 1 && (
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "center", gap: 2, mt: 3 }}
        >
          <Button
            component={Link}
            href={`${basePath}?tab=${tab}&page=${page - 1}`}
            disabled={page <= 1}
            startIcon={<ChevronLeftIcon />}
            size="small"
          >
            Newer
          </Button>

          <Typography variant="body2" color="text.secondary">
            Page {page} of {pages}
          </Typography>

          <Button
            component={Link}
            href={`${basePath}?tab=${tab}&page=${page + 1}`}
            disabled={page >= pages}
            endIcon={<ChevronRightIcon />}
            size="small"
          >
            Older
          </Button>
        </Stack>
      )}

      <Dialog
        open={clearing}
        onClose={() => setClearing(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {tab === "read" ? "Clear read notifications?" : "Clear unread ones?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes all {tab === "read" ? read : unread} from this tab —
            not only the ones on this page. The complaints themselves are not
            touched; they stay on the{" "}
            {isAdmin ? "Problems" : "Report a Problem"} page.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setClearing(false)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={clearTab}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
