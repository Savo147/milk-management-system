"use client";

import { useRef, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import { createClient } from "@/lib/supabase/client";
import { uploadToBucket, friendlyUploadError } from "@/lib/chat-upload";

/** Big enough for a clear face, small enough that nobody waits for it. */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Picks a profile photo, puts it in Storage and keeps the resulting URL in a
 * hidden field, so the form around it saves the photo along with everything
 * else on the same button.
 *
 * The browser uploads directly, as it does for chat files: a Server Action
 * would have to carry the whole image in its request body, which Next caps
 * at 1MB, and a photo off a phone is bigger than that.
 */
export default function AvatarPicker({ name, userId, initialUrl, label }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const pick = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Pick an image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("The photo has to be under 2 MB.");
      return;
    }

    setBusy(true);
    setError(null);

    // The folder is the user's own id, which is what the storage policy in
    // migration 0006 checks. The uuid in the name means a new photo never
    // sits behind a cached copy of the old one.
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await uploadToBucket("business", path, file);

    setBusy(false);

    if (upErr) {
      setError(friendlyUploadError(upErr, "0006"));
      return;
    }

    const { data } = createClient().storage.from("business").getPublicUrl(path);
    setUrl(data.publicUrl);
  };

  return (
    <Stack direction="row" sx={{ gap: 2, alignItems: "center" }}>
      <Avatar
        src={url || undefined}
        sx={{ width: 64, height: 64, bgcolor: "primary.main", fontSize: "1.5rem" }} // prettier-ignore
      >
        {label?.[0]?.toUpperCase()}
      </Avatar>

      {/* The URL is what actually gets saved; the form never sees the file. */}
      <input type="hidden" name={name} value={url} />

      <Box>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            disabled={busy}
            startIcon={
              busy ? (
                <CircularProgress size={15} />
              ) : (
                <PhotoCameraOutlinedIcon sx={{ fontSize: 17 }} />
              )
            }
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Uploading..." : url ? "Change photo" : "Upload photo"}
          </Button>

          {url && (
            <Button size="small" color="inherit" onClick={() => setUrl("")}>
              Remove
            </Button>
          )}
        </Stack>

        <Typography
          variant="caption"
          sx={{ display: "block", mt: 0.75, color: error ? "error.main" : "text.secondary" }} // prettier-ignore
        >
          {error ?? "JPG or PNG, up to 2 MB. Save to keep it."}
        </Typography>
      </Box>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          // Cleared so picking the same file twice still fires.
          e.target.value = "";
        }}
      />
    </Stack>
  );
}
