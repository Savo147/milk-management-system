/**
 * Uploads public/logo.png to the `business` storage bucket and points
 * business_settings.logo_url at it.
 *
 *   node scripts/upload-logo.mjs [path]
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const path = process.argv[2] ?? "public/logo.png";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const file = readFileSync(path);
console.log(`${path} — ${(file.length / 1024).toFixed(1)} KB`);

const { error: upErr } = await supabase.storage
  .from("business")
  .upload("logo.png", file, { contentType: "image/png", upsert: true });

if (upErr) {
  console.error("Upload failed:", upErr.message);
  process.exit(1);
}

const {
  data: { publicUrl },
} = supabase.storage.from("business").getPublicUrl("logo.png");

const { error: setErr } = await supabase
  .from("business_settings")
  .update({ logo_url: publicUrl })
  .eq("id", true);

if (setErr) {
  console.error("logo_url set karva ma error:", setErr.message);
  process.exit(1);
}

console.log("Uploaded ->", publicUrl);

// Prove it is actually reachable without a key.
const check = await fetch(publicUrl);
console.log(
  `Public fetch: ${check.status} ${check.headers.get("content-type")} ` +
    `${((await check.arrayBuffer()).byteLength / 1024).toFixed(1)} KB`,
);
