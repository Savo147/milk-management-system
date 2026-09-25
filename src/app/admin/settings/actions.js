"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { BRANDING_TAG } from "@/lib/cache-tags";

function refresh() {
  revalidatePath("/", "layout");
}

/** Dairy name, logo, address, phone and the low-stock threshold. */
export async function saveBusinessSettings(prevState, formData) {
  // A Server Action is a public endpoint; the page guard does not cover it.
  await requireAdmin();

  const dairyName = String(formData.get("dairy_name") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!dairyName) return { error: "Enter the dairy name." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("business_settings")
    .update({
      dairy_name: dairyName,
      logo_url: logoUrl || null,
      address: address || null,
      phone: phone || null,
    })
    .eq("id", true);

  if (error) return { error: `Could not save: ${error.message}` };

  // The name and logo are cached for everyone, signed in or not. Without this
  // a rename would keep showing the old one for the next five minutes.
  revalidateTag(BRANDING_TAG);

  refresh();
  return { ok: true };
}

/** The signed-in admin's own name, mobile and photo. */
export async function updateProfile(prevState, formData) {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const photo = String(formData.get("profile_photo") ?? "").trim();

  if (!name) return { error: "Enter a name." };
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { error: "The mobile number must be 10 digits." };
  }

  const supabase = await createClient();

  // Only these three columns are writable by `authenticated` — role and
  // status are not, by design.
  const { error } = await supabase
    .from("users")
    .update({
      name,
      mobile: mobile || null,
      profile_photo: photo || null,
    })
    .eq("id", admin.id);

  if (error) return { error: `Could not save: ${error.message}` };

  refresh();
  return { ok: true };
}

/**
 * A new password, typed twice.
 *
 * The second box is there to catch a typo, not an intruder: it does not ask
 * for the current password, so anyone who finds this screen already open can
 * change it. That was a deliberate call — the dairy is one person at one
 * desk.
 */
export async function changePassword(prevState, formData) {
  await requireAdmin();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "The password must be at least 8 characters." };
  }
  if (password !== confirm) return { error: "The two passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: `Could not change the password: ${error.message}` };
  }

  return { ok: true };
}

/**
 * A customer's rate, changed from the Rates tab.
 *
 * Writes customers.rate_per_liter — the same column the Customers page
 * writes, and the only place a rate actually lives. The milk_rates rows this
 * screen lists are history the database keeps for itself: a trigger closes
 * the old one and opens a new one on every change.
 *
 * Which is why the two screens cannot disagree. Editing a milk_rates row
 * directly would give the rate two homes and they would drift apart; this
 * deliberately does not.
 */
export async function updateCustomerRate(prevState, formData) {
  // A Server Action is a public endpoint; the page guard does not cover it.
  await requireAdmin();

  const customerId = String(formData.get("customer_id") ?? "");
  const rate = Number(formData.get("rate_per_liter"));

  if (!customerId) return { error: "Customer not found." };
  if (!Number.isFinite(rate) || rate <= 0) {
    return { error: "The rate must be greater than 0." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("customers")
    .update({ rate_per_liter: rate })
    .eq("id", customerId);

  if (error) return { error: `Could not save: ${error.message}` };

  // Both screens read the same column, so both have to be refreshed.
  revalidatePath("/admin/settings");
  revalidatePath("/admin/customers");
  return { ok: true };
}

/**
 * Role or status for a staff member.
 *
 * Goes through the service-role client because `authenticated` has no grant on
 * those two columns. An admin cannot change their own — locking yourself out
 * of the only admin account is not a mistake worth allowing.
 */
export async function updateStaff(prevState, formData) {
  const admin = await requireAdmin();

  const id = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id) return { error: "User not found." };
  if (id === admin.id) {
    return { error: "You cannot change your own role or status." };
  }
  if (!["admin", "customer"].includes(role)) {
    return { error: "That role is not valid." };
  }
  if (!["active", "inactive"].includes(status)) {
    return { error: "That status is not valid." };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("users")
    .update({ role, status })
    .eq("id", id);

  if (error) return { error: `Could not save: ${error.message}` };

  refresh();
  return { ok: true };
}

/**
 * Removes a login for good.
 *
 * The customer's milk, billing and complaints are all kept — those hang off
 * the customers row, not this one, and the customer is simply unlinked. What
 * does go with it is any reply the person wrote on a complaint thread, which
 * the database removes along with them. The screen says so before asking.
 *
 * Guarded twice over: nobody can delete themselves, and the last admin
 * standing cannot be deleted by anyone, or there would be no way back in.
 */
export async function deleteStaff(prevState, formData) {
  const admin = await requireAdmin();

  const id = String(formData.get("user_id") ?? "");

  if (!id) return { error: "User not found." };
  if (id === admin.id) return { error: "You cannot delete your own login." };

  const db = createAdminClient();

  const { data: target } = await db
    .from("users")
    .select("id, name, role")
    .eq("id", id)
    .maybeSingle();

  if (!target) return { error: "User not found." };

  if (target.role === "admin") {
    const { count } = await db
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active");

    if ((count ?? 0) <= 1) {
      return { error: "This is the only admin left. Make another one first." };
    }
  }

  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return { error: `Could not delete: ${error.message}` };

  // The Customers page lists unlinked logins in a banner, so it changes too.
  revalidatePath("/admin/settings");
  revalidatePath("/admin/customers");
  return { ok: true };
}

/**
 * Creates another admin login.
 *
 * Signup always produces a 'customer' — the handle_new_user trigger hard-codes
 * it so nobody can register themselves as an admin — so an admin has to be
 * made here, with the service key.
 */
export async function addStaff(prevState, formData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Enter a name." };
  if (!/^\S+@\S+\.\S+$/.test(email))
    return { error: "That email is not valid." };
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { error: "The mobile number must be 10 digits." };
  }
  if (password.length < 8) {
    return { error: "The password must be at least 8 characters." };
  }

  const db = createAdminClient();

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, mobile },
  });

  if (error) return { error: `Could not create the account: ${error.message}` };

  // The trigger has already inserted the profile as a customer; promote it.
  const { error: upErr } = await db
    .from("users")
    .update({ name, mobile: mobile || null, role: "admin", status: "active" })
    .eq("id", data.user.id);

  if (upErr) return { error: `Profile not updated: ${upErr.message}` };

  refresh();
  return { ok: true };
}
