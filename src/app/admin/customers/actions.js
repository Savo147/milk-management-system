"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { notifyCustomer } from "@/lib/notify";
import { formatRate } from "@/lib/format";

function parseForm(formData) {
  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const dailyQuantity = Number(formData.get("daily_quantity"));
  const rate = Number(formData.get("rate_per_liter"));
  const deliveryTime = String(formData.get("delivery_time") ?? "").trim();
  const status = formData.get("status") === "inactive" ? "inactive" : "active";

  if (!name) return { error: "Enter a name." };
  // Optional: somebody who signed in with Google arrives without one, and the
  // dairy should be able to save the rest of their details meanwhile. Typed
  // wrong, though, is still worth catching.
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { error: "The mobile number must be 10 digits." };
  }
  // Any amount the dairy actually delivers, rather than a fixed list. The
  // bounds are only there to catch a slipped decimal point or a negative.
  if (
    !Number.isFinite(dailyQuantity) ||
    dailyQuantity < 0.25 ||
    dailyQuantity > 99
  ) {
    return {
      error: "Daily milk must be between 0.25 and 99 liters.",
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

  // The rate can be changed from this form as well as from the Rates tab, and
  // the customer should hear about it either way. Read before writing: once
  // the update has run the old number is gone.
  const { data: before } = id
    ? await supabase
        .from("customers")
        .select("rate_per_liter")
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  const { data: saved, error } = id
    ? await supabase.from("customers").update(values).eq("id", id).select("id")
    : await supabase
        .from("customers")
        .insert(values)
        .select("id, name, mobile, user_id");

  if (error) {
    return { error: `Could not save: ${error.message}` };
  }

  // A new customer can be given their login in the same breath. Optional on
  // purpose: a dairy adds plenty of customers who will never sign in, and
  // forcing an email for those would mean inventing one.
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!id && (email || password)) {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { error: "Customer saved, but that email is not valid." };
    }
    if (password.length < 8) {
      return {
        error:
          "Customer saved, but the password must be at least 8 characters.",
      };
    }

    const problem = await attachLogin(
      createAdminClient(),
      saved?.[0] ?? {},
      email,
      password,
    );

    // The customer is in the books either way, and saying otherwise would
    // have the dairy add them a second time.
    if (problem) return { error: `Customer saved, but: ${problem}` };
  }

  // Only when it actually moved — saving a changed address should not tell
  // anybody their rate has changed.
  if (
    before &&
    Number(before.rate_per_liter) !== Number(values.rate_per_liter)
  ) {
    await notifyCustomer({
      customerId: id,
      type: "rate",
      title: "Your rate has changed",
      message: `${formatRate(before.rate_per_liter)} → ${formatRate(values.rate_per_liter)} per liter. Milk delivered before today is still billed at the old rate.`,
    });
  }

  revalidatePath("/admin/customers");
  return { ok: true };
}

/**
 * Makes the auth user and joins it to a customer row.
 *
 * Shared by the two ways in: creating a customer with an email and password
 * filled in, and giving an existing customer a login afterwards. The second
 * one existed first; writing it twice is how the two would come to disagree
 * about what a half-made login looks like.
 *
 * Returns an error string, or null when it worked.
 */
async function attachLogin(db, customer, email, password) {
  if (customer.user_id) return "This customer already has a login.";

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: customer.name, mobile: customer.mobile },
  });

  if (error) return `Could not create the login: ${error.message}`;

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

  if (upErr) return `Profile not updated: ${upErr.message}`;

  const { error: linkErr } = await db
    .from("customers")
    .update({ user_id: data.user.id })
    .eq("id", customer.id);

  if (linkErr) {
    // A login with nothing attached is worse than none at all — it would sign
    // in to an empty panel — so undo it rather than leave it stranded.
    await db.auth.admin.deleteUser(data.user.id);
    return `Could not link it: ${linkErr.message}`;
  }

  return null;
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

  const problem = await attachLogin(db, customer, email, password);
  if (problem) return { error: problem };

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
