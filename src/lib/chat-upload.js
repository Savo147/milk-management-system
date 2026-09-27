"use client";

import { createClient } from "@/lib/supabase/client";

export const BUCKET = "chat-files";

/** Says what went wrong in words the person reading it can act on. */
export function friendlyUploadError(error, migration) {
  const message = error?.message ?? "";

  if (/failed to fetch|network|load failed/i.test(message)) {
    return "Could not reach the server. Check the connection and try again.";
  }
  if (/bucket/i.test(message)) {
    return `File storage is not set up yet (migration ${migration}).`;
  }
  if (/policy|denied|unauthor/i.test(message)) {
    return `Uploads are not allowed yet (migration ${migration}).`;
  }

  return message || "Upload failed.";
}

/** Matches the bucket's own limit in migration 0005. */
export const MAX_BYTES = 10 * 1024 * 1024;

/** "1.4 MB" — what the file row under a message shows. */
export function formatBytes(bytes) {
  const n = Number(bytes ?? 0);
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Strips a filename down to something safe to put in a storage key: Storage
 * keys are URL paths, so spaces, slashes and Gujarati characters in the
 * name would come back as something else. The real name is kept on the
 * message row, which is what the thread actually shows.
 */
function safeName(name) {
  const clean = String(name ?? "file")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-60);

  return clean || "file";
}

/**
 * Puts one file in a bucket, with a couple of goes at it.
 *
 * "Failed to fetch" is what the browser says when the connection never got
 * anywhere — and on this dairy's line that happens often enough to be worth
 * riding out rather than reporting. Retrying is safe because every path
 * carries a fresh uuid: nothing can be written twice.
 */
export async function uploadToBucket(bucket, path, file) {
  const supabase = createClient();
  let last;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (!error) return { ok: true };

    last = error;

    // Anything the server actually answered — a policy refusal, a bucket
    // that is not there — is a real answer and trying again will not change
    // it. Only a connection that failed is worth repeating.
    const networkish = /failed to fetch|network|load failed/i.test(
      error.message ?? "",
    );
    if (!networkish) break;

    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
  }

  return { error: last };
}

/**
 * Sends the file straight from the browser to Storage.
 *
 * Not through a Server Action: those post the whole file as part of the
 * request body, which Next caps at 1MB by default, and a scanned bill is
 * bigger than that. The browser talks to Storage directly with the user's own
 * session, so the cap never comes into it.
 *
 * Returns what the message row needs, or an error to show under the box.
 */
export async function uploadAttachment(file, kind, targetId) {
  if (!file) return { error: "No file chosen." };

  if (file.size > MAX_BYTES) {
    return { error: `Files have to be under ${formatBytes(MAX_BYTES)}.` };
  }

  const folder = kind === "channel" ? "channel" : "dm";
  const path = `${folder}/${targetId}/${crypto.randomUUID()}-${safeName(file.name)}`;

  const { error } = await uploadToBucket(BUCKET, path, file);

  if (error) {
    return { error: friendlyUploadError(error, "0005") };
  }

  return {
    attachment: {
      path,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
    },
  };
}
