"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { formatBytes } from "@/lib/chat-upload";

const isImage = (type) => String(type ?? "").startsWith("image/");
const isAudio = (type) => String(type ?? "").startsWith("audio/");
const isPdf = (type) => String(type ?? "").includes("pdf");

/**
 * The file hanging off a message: a photo shows itself, anything else is a
 * row you can click to open.
 *
 * `url` is a link the server signed an hour ago. If it has run out, or the
 * file never signed, the row still says what was sent — it just cannot be
 * opened until the thread is loaded again.
 */
export default function Attachment({ attachment, mine }) {
  if (!attachment) return null;

  const { url, name, type, size } = attachment;
  const Icon = isPdf(type) ? PictureAsPdfOutlinedIcon : InsertDriveFileOutlinedIcon; // prettier-ignore

  if (isImage(type) && url) {
    return (
      <Box
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: "block", mb: 0.5 }}
      >
        <Box
          component="img"
          src={url}
          alt={name || "Photo"}
          loading="lazy"
          sx={{
            display: "block",
            maxWidth: 220,
            maxHeight: 220,
            borderRadius: 1.5,
            objectFit: "cover",
          }}
        />
      </Box>
    );
  }

  // A voice note plays where it sits; there is nothing to open.
  if (isAudio(type) && url) {
    return (
      <Box
        component="audio"
        src={url}
        controls
        preload="metadata"
        sx={{
          display: "block",
          mb: 0.5,
          width: 240,
          height: 40,
          // Chrome's player is dark grey on a dark bubble otherwise.
          filter: mine ? "invert(1) hue-rotate(180deg)" : "none",
        }}
      />
    );
  }

  const body = (
    <Stack
      direction="row"
      sx={{
        gap: 1,
        alignItems: "center",
        mb: 0.5,
        p: 1,
        borderRadius: 1.5,
        // Inside a blue bubble a white panel would shout; a wash of the
        // bubble's own colour reads as part of it. An incoming bubble is
        // white itself now, so there the panel goes the other way — a grey
        // step down, or the file would vanish into the bubble.
        bgcolor: mine ? "var(--on-accent-wash)" : "grey.100",
        maxWidth: 240,
      }}
    >
      <Icon fontSize="small" sx={{ flexShrink: 0, opacity: 0.9 }} />

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {name || "File"}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          {url ? formatBytes(size) : "Link expired — reopen the chat"}
        </Typography>
      </Box>
    </Stack>
  );

  return url ? (
    <Box
      component="a"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ color: "inherit", textDecoration: "none", display: "block" }}
    >
      {body}
    </Box>
  ) : (
    body
  );
}
