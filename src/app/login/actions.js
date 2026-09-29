"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { withDeadline } from "@/lib/deadline";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/site";
import { ensureCustomerRecord } from "@/lib/customer-account";

/** Matches the rule the admin's own login screens enforce. */
const MIN_PASSWORD = 8;

/**
 * Makes the account.
 *
 * Created with the service key rather than supabase.auth.signUp() so it is
 * confirmed outright. signUp() would wait on a confirmation email, and a
 * customer standing at the door with their milk book is not going to fish a
 * link out of their inbox to get in — nor, on this project, would the email
 * arrive: the built-in sender only delivers to the project's owner.
 */
async function createAccount(email, password, name) {
  const db = createAdminClient();

  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return {
      error: "An account with that email already exists. Sign in instead.",
    };
  }

  if (password.length < MIN_PASSWORD) {
    return {
      error: `The password must be at least ${MIN_PASSWORD} characters.`,
    };
  }

  const { error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // handle_new_user copies this into users.name.
    user_metadata: { name: name || email.split("@")[0] },
  });

  if (error) {
    // An auth user with no profile row would slip past the check above.
    if (/already (registered|exists)/i.test(error.message)) {
      return {
        error: "An account with that email already exists. Sign in instead.",
      };
    }
    console.error("[signup] could not create the account:", error);
    return { error: `Account not created: ${error.message}` };
  }

  return { ok: true };
}

/** How long a sign-in gets before it is called unreachable. */
const LOGIN_DEADLINE_MS = 8_000;

export async function signIn(prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter both email and password." };
  }

  const supabase = await createClient();

  // Capped on purpose. Our own fetch retries three times over twelve seconds,
  // and the auth client retries on top of that — a sign-in against a dead
  // connection was taking twenty-two seconds to say it had failed. Eight is
  // far longer than a working one has ever needed, and short enough that
  // somebody watching the button learns something.
  const { data, error } = await withDeadline(
    supabase.auth.signInWithPassword({ email, password }),
    LOGIN_DEADLINE_MS,
    { data: null, error: { status: 0, message: "timed out" } },
  );

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
        error:
          error.message === "timed out"
            ? "Could not reach the server. Check the connection and try again."
            : `Could not sign in — the server cannot be reached. (${error.message})`,
      };
    }

    // An account that exists but was never confirmed would otherwise be
    // reported as a wrong password, and no password would ever fix it.
    if (/email not confirmed/i.test(error.message)) {
      return {
        error: "This account has not been activated yet. Contact the admin.",
      };
    }

    // Signing in no longer makes accounts. It used to, so that one box did
    // both — but a typo in the email then quietly opened a second account
    // instead of saying the password was wrong. Creating one is its own
    // screen now, and this points at it.
    return { error: "Wrong email or password." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, status")
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

  // A customer signing in for the first time gets their record here, so
  // they appear on the Customers page and not only in Settings → Users.
  await ensureCustomerRecord(profile);

  revalidatePath("/", "layout");

  // redirect() works by throwing, so it must sit outside any try/catch.
  redirect(profile.role === "admin" ? "/admin" : "/customer");
}

/**
 * Creates an account and signs straight into it.
 *
 * Nobody is asked to go and find a confirmation email: the account is made
 * confirmed, so the two steps a customer would otherwise face are one.
 */
export async function signUp(prevState, formData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name) return { error: "Enter your name." };
  if (!email || !password) return { error: "Enter an email and a password." };

  // Checked before the account is made, not after: a mistyped password that
  // only surfaces at the next sign-in leaves somebody locked out of an
  // account they just created.
  if (password !== confirm) return { error: "The two passwords do not match." };

  const made = await createAccount(email, password, name);
  if (made.error) return { error: made.error };

  const supabase = await createClient();
  const { data, error } = await withDeadline(
    supabase.auth.signInWithPassword({ email, password }),
    LOGIN_DEADLINE_MS,
    { data: null, error: { status: 0, message: "timed out" } },
  );

  if (error) {
    console.error("[signup] made the account but could not sign in:", error);
    return {
      error: "Your account was created. Sign in with it below.",
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "This account has not been set up. Contact the dairy." };
  }

  await ensureCustomerRecord(profile);
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
