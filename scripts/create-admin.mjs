/**
 * Creates the first admin account.
 *
 * Signup always makes a 'customer' (the handle_new_user trigger hard-codes it,
 * so nobody can sign themselves up as an admin). The first admin therefore has
 * to be made here, with the secret key.
 *
 *   node scripts/create-admin.mjs <email> <password> "<name>" [mobile]
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [email, password, name, mobile] = process.argv.slice(2);

if (!email || !password || !name) {
  console.error(
    'Usage: node scripts/create-admin.mjs <email> <password> "<name>" [mobile]',
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password at least 8 characters no hovo joiye.");
  process.exit(1);
}

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

// 1. Auth user. email_confirm skips the confirmation mail — this is the owner
//    creating their own first login, not a public signup.
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name, mobile },
});

if (error) {
  console.error("Auth user banavva ma error:", error.message);
  process.exit(1);
}

// 2. The trigger already inserted the profile as 'customer'. Promote it.
const { error: upErr } = await supabase
  .from("users")
  .update({ role: "admin", name, mobile: mobile ?? null, status: "active" })
  .eq("id", data.user.id);

if (upErr) {
  console.error("Profile update ma error:", upErr.message);
  process.exit(1);
}

console.log(`Admin banai gayo:\n  ${name} <${email}>\n  id: ${data.user.id}`);
console.log("\nHave http://localhost:3000/login par login karo.");
