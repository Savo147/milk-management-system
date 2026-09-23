"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/site";

/** Matches the rule the admin's own login screens enforce. */
const MIN_PASSWORD = 8;

/**
 * First time somebody types an email, the account is made for them.
 *
 * Only reached once signInWithPassword has already refused, so the email is
 * either new — make it — or known, and the password was simply wrong.
 *
 * Created with the service key rather than supabase.auth.signUp() so the
 * account is confirmed outright. signUp() would wait on a confirmation email,
 * and a customer standing at the door with their milk book is not going to
 * fish a link out of their inbox to get in.
 *
 * Note this does reveal whether an email is already registered: a new one gets
 * in, a known one is told the password is wrong. That is the behaviour that
 * was asked for, and it is the price of signing up and signing in through one
 * box.
 */
async function registerFirstTime(email, password) {
  const db = createAdminClient();

  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return { error: "That password is wrong." };

  if (password.length < MIN_PASSWORD) {
    return {
      error: `To create a new account the password must be at least ${MIN_PASSWORD} characters.`,
    };
  }

  const { error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // handle_new_user copies this into users.name. The part before the @ is a
    // placeholder worth having — they can change it on their Profile page.
    user_metadata: { name: email.split("@")[0] },
  });

  if (error) {
    // An auth user with no profile row would slip past the check above.
    if (/already (registered|exists)/i.test(error.message)) {
      return { error: "That password is wrong." };
    }
    console.error("[login] first-time sign-up failed:", error);
    return { error: `Account not created: ${error.message}` };
  }

  return { ok: true };
}

export async function signIn(prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter both email and password." };
  }

  const supabase = await createClient();
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Only a genuine credential rejection should read as one. Anything else —
    // the database unreachable, the project paused, a network failure — was
    // being reported as "wrong password", which sends you hunting for a
    // problem that is not there.
    const credentialsRejected =
      error.status === 400 || /invalid login credentials/i.test(error.message);

    if (!credentialsRejected) {
      console.error("[login] sign-in failed:", error);
      return {
        error: `Could not sign in — the server cannot be reached. (${error.message})`,
      };
    }

    // An account that exists but was never confirmed would otherwise be
    // reported as a wrong password, and no password would ever fix it.
    if (/email not confirmed/i.test(error.message)) {
      return {
        error: "This account has not been activated yet. Contact the admin.",
      };
    }

    const made = await registerFirstTime(email, password);
    if (made.error) return { error: made.error };

    ({ data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    }));

    if (error) {
      console.error("[login] sign-in after sign-up failed:", error);
      return {
        error: `The account was created, but signing in failed. (${error.message})`,
      };
    }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "This account has not been set up. Contact the admin." };
  }

  if (profile.status !== "active") {
    await supabase.auth.signOut();
    return { error: "Your account is disabled. Contact the admin." };
  }

  revalidatePath("/", "layout");

  // redirect() works by throwing, so it must sit outside any try/catch.
  redirect(profile.role === "admin" ? "/admin" : "/customer");
}

/**
 * Hands off to Google. Nothing is signed in yet when this returns — Google
 * sends the browser back to /auth/callback with a code, and that route is
 * where the session is actually created and the role is checked.
 */
export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteOrigin()}/auth/callback`,
      // Otherwise Google silently reuses whichever account is already signed
      // in to the browser, which is surprising on a shared phone.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) {
    console.error("[login] google sign-in failed:", error);
    return {
      error: `Could not sign in with Google. (${error.message})`,
    };
  }

  // redirect() works by throwing, so it must sit outside any try/catch.
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();

  // "local", not the default "global": logging out on your phone should not
  // also sign you out on the computer at home. It ends this session and
  // clears these cookies, and nothing else.
  await supabase.auth.signOut({ scope: "local" });

  revalidatePath("/", "layout");
  redirect("/login");
}
