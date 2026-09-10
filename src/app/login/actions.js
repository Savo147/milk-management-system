"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signIn(prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email ane password bunne nakho." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
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

    if (credentialsRejected) {
      // Deliberately vague: saying which half was wrong tells an attacker
      // which email addresses exist.
      return { error: "Email ke password khotu chhe." };
    }

    console.error("[login] sign-in failed:", error);
    return {
      error: `Login na thai shakyu — server sudhi pahonchatu nathi. (${error.message})`,
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Aa account setup thayelu nathi. Admin no sampark karo." };
  }

  if (profile.status !== "active") {
    await supabase.auth.signOut();
    return { error: "Tamaru account band chhe. Admin no sampark karo." };
  }

  revalidatePath("/", "layout");

  // redirect() works by throwing, so it must sit outside any try/catch.
  redirect(profile.role === "admin" ? "/admin" : "/customer");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
