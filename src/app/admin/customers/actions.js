"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { MILK_QUANTITIES } from "@/lib/constants";

function parseForm(formData) {
  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const dailyQuantity = Number(formData.get("daily_quantity"));
  const rate = Number(formData.get("rate_per_liter"));
  const deliveryTime = String(formData.get("delivery_time") ?? "").trim();
  const status = formData.get("status") === "inactive" ? "inactive" : "active";

  if (!name) return { error: "Enter a name." };
  if (!/^\d{10}$/.test(mobile))
    return { error: "The mobile number must be 10 digits." };
  if (!MILK_QUANTITIES.includes(dailyQuantity)) {
    return {
      error: "Daily quantity must be between 0.5 and 5 L, in steps of 0.5.",
    };
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    return { error: "The rate must be greater than 0." };
  }

  return {
    values: {
      name,
      mobile,
      address: address || null,
      daily_quantity: dailyQuantity,
      rate_per_liter: rate,
      delivery_time: deliveryTime || null,
      status,
    },
  };
}

export async function saveCustomer(prevState, formData) {
  // Re-checked here on purpose: a Server Action is a public endpoint, so the
  // page's own guard is not enough.
  await requireAdmin();

  const { error: invalid, values } = parseForm(formData);
  if (invalid) return { error: invalid };

  const id = formData.get("id");
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("customers").update(values).eq("id", id)
    : await supabase.from("customers").insert(values);

  if (error) {
    return { error: `Could not save: ${error.message}` };
  }

  revalidatePath("/admin/customers");
  return { ok: true };
}

/**
 * Gives a customer a login for their own panel.
 *
 * A customer and a login are two separate records: `customers` is the round
 * the dairy delivers, `users` is somebody who can sign in. This is what joins
 * them, by writing customers.user_id — until that is set, the customer panel
 * has nothing to show whoever signs in.
 *
 * The service-role client is needed twice over: creating an auth user is not
 * something `authenticated` can do, and the handle_new_user trigger's row has
 * to be corrected afterwards. Both sit behind requireAdmin().
 */
export async function createCustomerLogin(prevState, formData) {
  await requireAdmin();

  const customerId = String(formData.get("customer_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!customerId) return { error: "Customer not found." };
  if (!/^\S+@\S+\.\S+$/.test(email))
    return { error: "That email is not valid." };
  if (password.length < 8) {
    return { error: "The password must be at least 8 characters." };
  }

  const db = createAdminClient();

  const { data: customer } = await db
    .from("customers")
    .select("id, name, mobile, user_id")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) return { error: "Customer not found." };
  if (customer.user_id) {
    return { error: "This customer already has a login." };
  }

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: customer.name, mobile: customer.mobile },
  });

  if (error) return { error: `Could not create the login: ${error.message}` };

  // The trigger has already inserted the profile as a customer; fill in the
  // name and mobile the dairy already knows.
  const { error: upErr } = await db
    .from("users")
    .update({
      name: customer.name,
      mobile: customer.mobile,
      role: "customer",
      status: "active",
    })
    .eq("id", data.user.id);

  if (upErr) return { error: `Profile not updated: ${upErr.message}` };

  const { error: linkErr } = await db
    .from("customers")
    .update({ user_id: data.user.id })
    .eq("id", customer.id);

  if (linkErr) {
    // A login with nothing attached is worse than none at all — it would sign
    // in to an empty panel — so undo it rather than leave it stranded.
    await db.auth.admin.deleteUser(data.user.id);
    return { error: `Could not link it: ${linkErr.message}` };
  }

  revalidatePath("/admin/customers");
  return { ok: true };
}

/**
 * Attaches a login that already exists to a customer.
 *
 * This is the other half of Google sign-in: somebody signs in with Google, the
 * trigger gives them a profile, and they land on "not linked yet" until
 * an admin points a customer row at them here.
 *
 * Goes through the service-role client because `authenticated` has no grant on
 * customers.user_id — the join between a login and a round is the dairy's to
 * make, not something a signed-in user can do for themselves.
 */
export async function linkCustomerLogin(prevState, formData) {
  await requireAdmin();

  const customerId = String(formData.get("customer_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");

  if (!customerId) return { error: "Customer not found." };
  if (!userId) return { error: "Choose which login to link." };

  const db = createAdminClient();

  const [{ data: customer }, { data: account }, { data: taken }] =
    await Promise.all([
      db
        .from("customers")
        .select("id, user_id")
        .eq("id", customerId)
        .maybeSingle(),
      db
        .from("users")
        .select("id, role, status")
        .eq("id", userId)
        .maybeSingle(),
      // A login attached to two customers would make both panels wrong, and
      // silently: each would show the other's milk.
      db
        .from("customers")
        .select("id, name")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (!customer) return { error: "Customer not found." };
  if (customer.user_id) {
    return { error: "This customer already has a login." };
  }
  if (!account) return { error: "Login not found." };
  if (account.role !== "customer") {
    return { error: "This login does not belong to a customer." };
  }
  if (account.status !== "active") return { error: "This login is disabled." };
  if (taken) {
    return { error: `This login is already linked to ${taken.name}.` };
  }

  const { error } = await db
    .from("customers")
    .update({ user_id: userId })
    .eq("id", customerId);

  if (error) return { error: `Could not link it: ${error.message}` };

  revalidatePath("/admin/customers");
  return { ok: true };
}

/**
 * Detaches a login from a customer.
 *
 * The login itself is left alone — deleting somebody's account because it was
 * pointed at the wrong customer would be far more than what was asked for.
 * They simply see "not linked yet" again until it is re-attached.
 */
export async function unlinkCustomerLogin(prevState, formData) {
  await requireAdmin();

  const customerId = String(formData.get("customer_id") ?? "");
  if (!customerId) return { error: "Customer not found." };

  const db = createAdminClient();

  const { error } = await db
    .from("customers")
    .update({ user_id: null })
    .eq("id", customerId);

  if (error) return { error: `Could not remove it: ${error.message}` };

  revalidatePath("/admin/customers");
  return { ok: true };
}

/** A new password for a customer who has forgotten theirs. */
export async function resetCustomerPassword(prevState, formData) {
  await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!userId) return { error: "Login not found." };
  if (password.length < 8) {
    return { error: "The password must be at least 8 characters." };
  }

  const db = createAdminClient();

  // Checked before writing: the id comes from the browser, and an admin must
  // not be able to reset another admin's password from this screen.
  const { data: target } = await db
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (!target || target.role !== "customer") {
    return { error: "This login does not belong to a customer." };
  }

  const { error } = await db.auth.admin.updateUserById(userId, { password });

  if (error)
    return { error: `Could not change the password: ${error.message}` };

  revalidatePath("/admin/customers");
  return { ok: true };
}

export async function setCustomerStatus(id, status) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/customers");
  return { ok: true };
}
