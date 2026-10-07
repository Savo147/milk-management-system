"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PublicIcon from "@mui/icons-material/Public";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ChatThread from "@/components/ChatThread";
import MessagesIcon from "@/components/MessagesIcon";
import DiscoverDialog from "@/components/DiscoverDialog";
import ChannelMembersDialog from "@/components/ChannelMembersDialog";
import CreateChannelDialog from "@/components/CreateChannelDialog";
import EditChannelDialog from "@/components/EditChannelDialog";
import { ago, preview } from "@/lib/chat-format";

const SIDEBAR_WIDTH = 300;

/** The grey heading over each block of the sidebar. */
const sectionSx = {
  display: "block",
  px: 2,
  pt: 2,
  pb: 0.5,
  color: "text.secondary",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: "0.68rem",
};

/**
 * A channel carries two independent facts — who can see it, and who can post
 * in it — so the badge carries both rather than picking one and hiding the
 * other.
 *
 *   the icon  says who can see it:  a lock (private) or a globe (public)
 *   the tone  says who can post:    amber (the dairy only) or teal (anyone)
 *
 * The first version of this treated the two as three exclusive kinds, and a
 * private announcement board came out looking exactly like a private channel
 * its members could talk in.
 */
const CHANNEL_TONE = {
  // The same two the dashboard tiles use, so they darken with everything else
  // instead of staying two pale chips on a black page.
  announcement: { bg: "var(--tile-amber-bg)", fg: "var(--tile-amber-fg)" },
  open: { bg: "var(--tile-teal-bg)", fg: "var(--tile-teal-fg)" },
};

function toneFor(channel) {
  return channel?.announcementOnly
    ? CHANNEL_TONE.announcement
    : CHANNEL_TONE.open;
}

/** The little red count on the right of a row. */
function UnreadDot({ count }) {
  if (!count) return null;

  return (
    <Box
      sx={{
        minWidth: 18,
        height: 18,
        px: 0.5,
        borderRadius: 9,
        bgcolor: "error.main",
        color: "primary.contrastText",
        fontSize: "0.65rem",
        fontWeight: 700,
        lineHeight: "18px",
        textAlign: "center",
      }}
    >
      {count}
    </Box>
  );
}

/** One row in either list: an avatar or icon, a name, its last line and age. */
function Row({ item, selected, onClick, avatar }) {
  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{
        gap: 1.25,
        borderRadius: 2,
        py: 1,
        mb: 0.25,
        // An unread row is tinted, the same way the header preview and the
        // notification list mark theirs. The selected row keeps its own
        // stronger tint — being the one you are reading outranks being new.
        ...(!selected && item.unread ? { bgcolor: "primary.50" } : null),
      }}
    >
      {avatar}

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="body2"
          noWrap
          sx={{ fontWeight: item.unread ? 700 : 600 }}
        >
          {item.name}
        </Typography>
        <Typography
          variant="caption"
          noWrap
          sx={{
            display: "block",
            color: item.unread ? "text.primary" : "text.secondary",
          }}
        >
          {preview(item)}
        </Typography>
      </Box>

      <Stack sx={{ alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}>
        <Typography variant="caption" color="text.disabled">
          {ago(item.lastAt)}
        </Typography>

        {item.problems > 0 && (
          <Stack direction="row" sx={{ alignItems: "center", gap: 0.25 }}>
            <ReportProblemOutlinedIcon
              sx={{
                fontSize: 13,
                // Amber while something is still open, grey once it is all
                // dealt with — the count alone would not say which.
                color: item.pending ? "warning.main" : "text.disabled",
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: item.pending ? "warning.main" : "text.disabled" }}
            >
              {item.problems}
            </Typography>
          </Stack>
        )}

        <UnreadDot count={item.unread} />
      </Stack>
    </ListItemButton>
  );
}

/**
 * The chat page: channels and direct conversations on the left, whichever one
 * is open on the right.
 *
 * The same component serves the dairy and a customer. A customer has no list
 * to manage — one direct thread with the dairy plus whatever channels they
 * are in — so the buttons that create things are simply left out for them.
 */
export default function ChatWorkspace({
  isAdmin,
  dairyName,
  meName,
  mePhoto,
  logoUrl,
  threads = [],
  problemThreads = [],
  channels = [],
  customers = [],
  initialSelection = null,
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialSelection);
  const [query, setQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  // On, the customer list narrows to whoever has raised a complaint —
  // including those who have never sent a chat message.
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [creating, setCreating] = useState(false);
  // Which channel the settings dialog is for, or null when it is shut.
  const [editing, setEditing] = useState(null);
  // And which one's People list is open.
  const [viewingMembers, setViewingMembers] = useState(null);

  const chattingWith = useMemo(
    () => new Set(threads.map((t) => t.customerId)),
    [threads],
  );

  const q = query.trim().toLowerCase();
  const matches = (item) =>
    !q ||
    (item.name ?? "").toLowerCase().includes(q) ||
    (item.last ?? "").toLowerCase().includes(q);

  // A customer's own thread has no name of its own; it is the dairy.
  const dms = useMemo(
    () =>
      (onlyProblems ? problemThreads : threads)
        .map((t) => ({ ...t, name: t.name ?? dairyName }))
        .filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, problemThreads, onlyProblems, dairyName, q],
  );

  const rooms = useMemo(
    () => channels.filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, q],
  );

  const unread =
    threads.reduce((n, t) => n + t.unread, 0) +
    channels.reduce((n, c) => n + c.unread, 0);

  // Picking someone out of the Find dialog has to work even when there is no
  // thread yet, so the selection carries its own name rather than looking one
  // up in a list they are not in.
  const pickCustomer = (customer) =>
    setSelected({
      kind: "dm",
      id: customer.id,
      name: customer.name,
      sub: customer.mobile,
      photo: customer.photo ?? null,
      unread: 0,
    });

  const pickThread = (t) =>
    setSelected({
      kind: "dm",
      id: t.customerId,
      name: t.name,
      // A customer is only ever talking to the dairy, so the dairy's own
      // logo stands in for a face on that side.
      photo: isAdmin ? (t.photo ?? null) : logoUrl,
      sub: isAdmin ? t.mobile : "Your dairy",
      unread: t.unread,
    });

  /**
   * The line under a channel's name: what it is, who is in it, and its own
   * description if it was given one. The count is the thing worth having up
   * there — "Public" on its own does not say whether that is six customers
   * or sixty.
   */
  const channelSub = (c) => {
    const parts = [`${c.isPrivate ? "Private" : "Public"} channel`];

    if (c.members != null) {
      parts.push(`${c.members} customer${c.members === 1 ? "" : "s"}`);
    }
    if (c.description) parts.push(c.description);

    return parts.join(" · ");
  };

  const pickChannel = (c) =>
    setSelected({
      kind: "channel",
      id: c.id,
      name: c.name,
      sub: channelSub(c),
      unread: c.unread,
      isPrivate: c.isPrivate,
      announcementOnly: c.announcementOnly,
      members: c.members,
      memberIds: c.memberIds,
    });

  const sidebar = (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      {/* A tinted cap on the list, so the sidebar opens with something other
          than grey and the unread count has somewhere to live. */}
      <Stack
        direction="row"
        sx={{
          gap: 1.5,
          alignItems: "center",
          px: 2,
          py: 1.75,
          flexShrink: 0,
          // Neutral tokens, not a pale blue written out by hand: the hand-
          // written one stayed pale on a black page, which is how this band
          // came out white in dark mode.
          bgcolor: "grey.50",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {/* Neutral, not the accent colour. The accent is black in the light
            look and white in the dark one, so an accent-filled badge turned
            into a glaring white square on a black page. This is a label for
            the panel, not something to press — it should sit quietly. */}
        <Avatar
          variant="rounded"
          sx={{
            bgcolor: "grey.100",
            color: "text.primary",
            width: 40,
            height: 40,
            border: 1,
            borderColor: "divider",
          }}
        >
          <MessagesIcon sx={{ fontSize: 22 }} />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {dairyName} Chat
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: unread > 0 ? "text.primary" : "text.secondary", fontWeight: unread > 0 ? 700 : 400 }} // prettier-ignore
          >
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ px: 2, pb: 1.5, flexShrink: 0 }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          size="small"
          fullWidth
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

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto", px: 1, pb: 1 }}>
        {/* Channels are hidden while "Only with complaints" is on. A
            channel has no complaints in it — the toggle is for working
            through who has raised one, and a notice board on top of that
            list is just something else to scroll past. */}
        {!onlyProblems && (
          <>
          <Stack direction="row" sx={{ alignItems: "center", pr: 0.5 }}>
            <Typography variant="caption" sx={{ ...sectionSx, flexGrow: 1 }}>
              Channels
            </Typography>
            {isAdmin && (
              <Tooltip title="Create a channel">
                <IconButton size="small" onClick={() => setCreating(true)}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {rooms.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 1, py: 1 }}
            >
              {isAdmin
                ? "No channels yet. Make one to tell every customer something at once."
                : "No channels yet."}
            </Typography>
          )}

          {rooms.map((c) => (
            <Row
              key={c.id}
              item={c}
              selected={selected?.kind === "channel" && selected.id === c.id}
              onClick={() => pickChannel(c)}
              avatar={
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: toneFor(c).bg,
                    color: toneFor(c).fg,
                  }}
                >
                  {c.isPrivate ? (
                    <LockOutlinedIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <PublicIcon sx={{ fontSize: 18 }} />
                  )}
                </Avatar>
              }
            />
          ))}
          </>
        )}

        <Stack direction="row" sx={{ alignItems: "center", pr: 0.5 }}>
          <Typography variant="caption" sx={{ ...sectionSx, flexGrow: 1 }}>
            {isAdmin
              ? onlyProblems
                ? "With complaints"
                : "Customers"
              : "The dairy"}
          </Typography>
          {isAdmin && (
            <Tooltip title="Find a customer">
              <IconButton size="small" onClick={() => setDiscovering(true)}>
                <ExploreOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* Narrows the list to whoever has raised a complaint. They are shown
            whether or not there is a conversation with them yet — somebody
            who complained and has never been answered is exactly who this is
            meant to surface. */}
        {isAdmin && (
          <Stack
            direction="row"
            sx={{ alignItems: "center", gap: 1, pl: 2, pr: 1, py: 0.25 }}
          >
            <ReportProblemOutlinedIcon
              sx={{
                fontSize: 16,
                color: onlyProblems ? "warning.main" : "text.disabled",
              }}
            />
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              Only with complaints
            </Typography>
            <Switch
              size="small"
              checked={onlyProblems}
              onChange={(e) => {
                const on = e.target.checked;
                setOnlyProblems(on);

                // A channel open on the right, with its row gone from the
                // left, would be the one thing on screen that has nothing to
                // do with what the screen now says it is showing.
                if (on && selected?.kind === "channel") setSelected(null);
              }}
              slotProps={{
                input: { "aria-label": "Show only customers who complained" },
              }}
            />
          </Stack>
        )}

        {isAdmin && (
          <ListItemButton
            onClick={() => setDiscovering(true)}
            sx={{ gap: 1.5, borderRadius: 2, py: 1 }}
          >
            <ExploreOutlinedIcon
              fontSize="small"
              sx={{ color: "text.secondary" }}
            />
            <Typography variant="body2">Find a customer</Typography>
          </ListItemButton>
        )}

        {dms.length === 0 && isAdmin && onlyProblems && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 1, py: 1 }}
          >
            Nobody has complained. Turn this off to see everyone.
          </Typography>
        )}

        {dms.length === 0 && !isAdmin && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 1, py: 1 }}
          >
            No messages with the dairy yet.
          </Typography>
        )}

        {dms.map((t) => (
          <Row
            key={t.customerId}
            item={t}
            selected={selected?.kind === "dm" && selected.id === t.customerId}
            onClick={() => pickThread(t)}
            avatar={
              <Avatar
                src={(isAdmin ? t.photo : logoUrl) || undefined}
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "primary.main",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {t.name?.[0]?.toUpperCase()}
              </Avatar>
            }
          />
        ))}
      </Box>
    </Stack>
  );

  const isChannel = selected?.kind === "channel";
  // In an announcement channel only the dairy writes; everywhere else both
  // sides can.
  const canPost = !isChannel || isAdmin || !selected.announcementOnly;

  const conversation = selected ? (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      {/* The thread's own cap takes the colour of what is open — the
          channel's tone, or the dairy blue for a person. */}
      <Stack
        direction="row"
        sx={{
          gap: 1.5,
          alignItems: "center",
          p: 1.75,
          flexShrink: 0,
          bgcolor: isChannel ? toneFor(selected).bg : "grey.50",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {/* On a phone the two panes take turns, so the thread needs its own
            way back to the list. */}
        <IconButton
          size="small"
          onClick={() => setSelected(null)}
          aria-label="Back to conversations"
          sx={{ display: { md: "none" } }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>

        <Avatar
          src={isChannel ? undefined : selected.photo || undefined}
          variant={isChannel ? "rounded" : "circular"}
          sx={{
            width: 38,
            height: 38,
            fontSize: "0.9rem",
            fontWeight: 600,
            bgcolor: isChannel ? "background.paper" : "primary.main",
            color: isChannel ? toneFor(selected).fg : undefined,
            boxShadow: "0 0 0 3px var(--ring)",
          }}
        >
          {isChannel ? (
            selected.isPrivate ? (
              <LockOutlinedIcon sx={{ fontSize: 20 }} />
            ) : (
              // This used to show the announcement horn for every channel
              // that was not private, so an open public channel claimed to
              // be a notice board.
              <PublicIcon sx={{ fontSize: 20 }} />
            )
          ) : (
            selected.name?.[0]?.toUpperCase()
          )}
        </Avatar>

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {selected.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {selected.sub || "Customer"}
          </Typography>
        </Box>

        {/* The count, and a way to see the names behind it. A notice going
            out to "6 customers" is worth checking before it goes out. */}
        {isChannel && selected.members != null && (
          <Tooltip title="Who is in this channel">
            <Button
              size="small"
              color="inherit"
              onClick={() => setViewingMembers(selected)}
              startIcon={<PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />}
              sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", color: "text.secondary", minWidth: 0, px: 1.25 }} // prettier-ignore
            >
              {selected.members}
            </Button>
          </Tooltip>
        )}

        {isChannel && isAdmin && (
          <Tooltip title="Channel settings">
            <IconButton
              size="small"
              onClick={() => setEditing(selected)}
              aria-label="Channel settings"
              sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider" }} // prettier-ignore
            >
              <SettingsOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {isChannel && selected.announcementOnly && (
          <Chip
            size="small"
            icon={<CampaignOutlinedIcon sx={{ fontSize: 16, color: "inherit !important" }} />} // prettier-ignore
            label="Announcements"
            sx={{ bgcolor: "background.paper", color: "var(--tile-amber-fg)", border: 1, borderColor: "var(--tile-amber-bg)" }} // prettier-ignore
          />
        )}
      </Stack>

      <ChatThread
        key={`${selected.kind}:${selected.id}:${onlyProblems}`}
        kind={selected.kind}
        targetId={selected.id}
        meName={meName}
        themName={selected.name}
        mePhoto={mePhoto}
        themPhoto={selected.photo}
        canManage={isAdmin}
        withComplaints={onlyProblems}
        hasUnread={selected.unread > 0}
        canPost={canPost}
        readOnlyNote={`Only ${dairyName} can post here.`}
        emptyText={
          isChannel
            ? `Nothing posted in ${selected.name} yet.`
            : `No messages with ${selected.name} yet. Say hello.`
        }
        // The sidebar's previews and unread counts come from the server, so
        // a sent message has to go back for them.
        onSent={() => router.refresh()}
      />
    </Stack>
  ) : (
    <Stack
      sx={{ height: "100%", alignItems: "center", justifyContent: "center", p: 4, gap: 1 }} // prettier-ignore
    >
      <Avatar
        sx={{
          bgcolor: "grey.100",
          color: "text.secondary",
          width: 56,
          height: 56,
        }}
      >
        {" "}
        {/* prettier-ignore */}
        <MessagesIcon sx={{ fontSize: 28 }} />
      </Avatar>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>
        Pick a conversation
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center" }}
      >
        {isAdmin
          ? "Choose a channel or a customer on the left, or find a customer to start a new one."
          : "Choose the dairy or a channel on the left."}
      </Typography>
    </Stack>
  );

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          overflow: "hidden",
          borderRadius: 0,
          // The page hands over its whole area, so the two panes fill it and
          // each scrolls inside itself.
          height: "100%",
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", md: SIDEBAR_WIDTH },
            flexShrink: 0,
            borderRight: { md: 1 },
            borderColor: { md: "divider" },
            // The list sits back a shade so the thread beside it reads as
            // the thing being looked at. Standard for a two-pane messenger.
            bgcolor: "grey.50",
            // One pane at a time on a phone: the list until something is
            // picked, then the thread.
            display: { xs: selected ? "none" : "block", md: "block" },
          }}
        >
          {sidebar}
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: { xs: selected ? "block" : "none", md: "block" },
          }}
        >
          {conversation}
        </Box>
      </Paper>

      {isAdmin && (
        <>
          <DiscoverDialog
            open={discovering}
            onClose={() => setDiscovering(false)}
            customers={customers}
            chattingWith={chattingWith}
            onPick={pickCustomer}
          />

          <ChannelMembersDialog
            open={Boolean(viewingMembers)}
            onClose={() => setViewingMembers(null)}
            channel={viewingMembers}
            customers={customers}
          />

          <CreateChannelDialog
            open={creating}
            onClose={() => setCreating(false)}
            customers={customers}
          />

          {/* Keyed on the channel, so opening a second one starts from its
              own values rather than from the first one's. */}
          {editing && (
            <EditChannelDialog
              key={editing.id}
              open
              onClose={() => setEditing(null)}
              channel={editing}
            />
          )}
        </>
      )}
    </>
  );
}
