/**
 * Fills every table with believable demo data so each page has something to
 * show. Uses the secret key, so it bypasses RLS.
 *
 *   node scripts/seed-demo.mjs           # add demo data
 *   node scripts/seed-demo.mjs --reset   # wipe demo data first, then add
 *
 * Only touches rows it created (customers are tagged in `address`), so a real
 * customer typed in by hand is never deleted.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const RESET = process.argv.includes("--reset");
const TAG = "[demo]";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const die = (label, error) => {
  if (error) {
    console.error(`${label}:`, error.message);
    process.exit(1);
  }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUANTITIES = [0.5, 1, 1.5, 2, 2.5, 3];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;

/** Local YYYY-MM-DD — toISOString() would shift the day in IST. */
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const monthStart = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

const NAMES = [
  ["Ramesh Patel", "9876543210", "Krishna Nagar, Block A"],
  ["Suresh Shah", "9825011223", "Gokul Society, 12"],
  ["Nita Desai", "9727334455", "Radha Apartment, 4B"],
  ["Jayesh Trivedi", "9909876543", "Shyam Villa, Nr. Temple"],
  ["Meena Joshi", "9033221144", "Vrundavan Flats, 7"],
  ["Kirit Modi", "9724556677", "Gopal Park, 21"],
  ["Alka Mehta", "9016778899", "Yamuna Residency, 3C"],
  ["Bhavesh Solanki", "9558112233", "Krishna Nagar, Block B"],
  ["Dipika Rana", "9662445566", "Nandanvan, 15"],
  ["Hitesh Chauhan", "9879001122", "Madhav Heights, 9A"],
  ["Falguni Bhatt", "9426778800", "Gokul Society, 30"],
  ["Nilesh Vyas", "9714556611", "Shyam Villa, Nr. School"],
];

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

if (RESET) {
  console.log("Purano demo data kadhi rahyo chhu...");

  const { data: old } = await db
    .from("customers")
    .select("id")
    .like("address", `${TAG}%`);

  const ids = (old ?? []).map((c) => c.id);

  if (ids.length) {
    // report_replies, payment_requests, milk_entries, monthly_bills, reports
    // and milk_rates all cascade from customers.
    die("customers delete", (await db.from("customers").delete().in("id", ids)).error);
  }
  await db.from("milk_stock").delete().gte("date", ymd(daysAgo(400)));
  await db.from("notifications").delete().like("title", `${TAG}%`);
  await db.from("audit_logs").delete().like("module", `${TAG}%`);
  console.log(`  ${ids.length} demo customers ane emno data kadhi nakhyo.\n`);
}

// ---------------------------------------------------------------------------
// 1. Customers  (the trigger opens a milk_rates row for each)
// ---------------------------------------------------------------------------

const customerRows = NAMES.map(([name, mobile, address], i) => ({
  name,
  mobile,
  address: `${TAG} ${address}`,
  daily_quantity: pick(QUANTITIES),
  rate_per_liter: pick([55, 58, 60, 62, 65]),
  delivery_time: chance(0.7) ? "Savare 6:30" : "Sanje 5:30",
  status: i === NAMES.length - 1 ? "inactive" : "active",
}));

const { data: customers, error: cErr } = await db
  .from("customers")
  .insert(customerRows)
  .select("id, name, daily_quantity, rate_per_liter, status");
die("customers insert", cErr);
console.log(`customers        : ${customers.length}`);

const active = customers.filter((c) => c.status === "active");

// ---------------------------------------------------------------------------
// 2. Rate history
//
// The insert trigger opened each customer's rate row as of today, but the
// entries below go back 45 days. Backdate those rows so the history lines up
// with the deliveries.
//
// The backdating also has to happen before the rate change: the trigger closes
// the open row at `current_date - 1`, which would fall before a row that
// started today and trip the milk_rates_date_order check.
// ---------------------------------------------------------------------------

die(
  "backdate rates",
  (
    await db
      .from("milk_rates")
      .update({ effective_from: ymd(daysAgo(45)) })
      .in("customer_id", customers.map((c) => c.id))
      .is("effective_to", null)
  ).error,
);

die(
  "rate change",
  (
    await db
      .from("customers")
      .update({ rate_per_liter: Number(active[0].rate_per_liter) + 3 })
      .eq("id", active[0].id)
  ).error,
);
active[0].rate_per_liter = Number(active[0].rate_per_liter) + 3;
console.log("milk_rates       : history banaavi (1 rate change)");

// ---------------------------------------------------------------------------
// 3. milk_entries — last 45 days
// ---------------------------------------------------------------------------

const entries = [];
for (let d = 45; d >= 0; d--) {
  const date = ymd(daysAgo(d));

  for (const c of active) {
    if (chance(0.03)) continue; // no entry recorded at all

    const expected = Number(c.daily_quantity);
    let actual = expected;

    if (chance(0.05)) actual = 0; // missed
    else if (chance(0.08)) actual = Math.max(0.5, expected - 0.5); // partial
    else if (chance(0.06)) actual = Math.min(5, expected + 0.5); // extra

    const status =
      actual === 0
        ? "missed"
        : actual < expected
          ? "partial"
          : actual > expected
            ? "extra"
            : "delivered";

    entries.push({
      customer_id: c.id,
      date,
      expected_quantity: expected,
      actual_quantity: actual,
      rate_per_liter: c.rate_per_liter,
      delivery_status: status,
      notes: status === "missed" ? "Ghar band hatu" : null,
    });
  }
}

// Chunked: one 5,000-row insert can time out.
for (let i = 0; i < entries.length; i += 500) {
  die(
    "milk_entries insert",
    (await db.from("milk_entries").insert(entries.slice(i, i + 500))).error,
  );
}
console.log(`milk_entries     : ${entries.length}`);

// ---------------------------------------------------------------------------
// 4. milk_stock — one row per day, delivered matches the entries
// ---------------------------------------------------------------------------

const deliveredByDate = new Map();
for (const e of entries) {
  deliveredByDate.set(
    e.date,
    (deliveredByDate.get(e.date) ?? 0) + Number(e.actual_quantity),
  );
}

const stockRows = [...deliveredByDate.entries()].map(([date, delivered]) => ({
  date,
  opening_stock: 0,
  added_stock: Math.ceil((delivered + 5) * 2) / 2,
  delivered_stock: delivered,
}));

die(
  "milk_stock upsert",
  (await db.from("milk_stock").upsert(stockRows, { onConflict: "date" })).error,
);
console.log(`milk_stock       : ${stockRows.length}`);

// ---------------------------------------------------------------------------
// 5. monthly_bills — this month and last month
// ---------------------------------------------------------------------------

const thisMonth = monthStart(new Date());
const lastMonth = monthStart(new Date(new Date().setDate(0)));

const bills = [];
for (const month of [lastMonth, thisMonth]) {
  const inMonth = entries.filter((e) => e.date.startsWith(month.slice(0, 7)));

  for (const c of active) {
    const mine = inMonth.filter((e) => e.customer_id === c.id);
    if (mine.length === 0) continue;

    const liters = mine.reduce((t, e) => t + Number(e.actual_quantity), 0);
    const amount = mine.reduce(
      (t, e) => t + Number(e.actual_quantity) * Number(e.rate_per_liter),
      0,
    );

    // Last month mostly settled; this month mostly still open.
    const paidFull = month === lastMonth ? chance(0.75) : chance(0.15);
    const partial = !paidFull && chance(0.3);
    const received = paidFull ? amount : partial ? Math.floor(amount / 2) : 0;

    bills.push({
      customer_id: c.id,
      billing_month: month,
      total_liters: Number(liters.toFixed(2)),
      total_amount: Number(amount.toFixed(2)),
      received_amount: Number(received.toFixed(2)),
      status: paidFull ? "done" : "pending",
    });
  }
}

const { data: savedBills, error: bErr } = await db
  .from("monthly_bills")
  .upsert(bills, { onConflict: "customer_id,billing_month" })
  .select("id, customer_id, total_amount, received_amount, status");
die("monthly_bills", bErr);
console.log(`monthly_bills    : ${savedBills.length}`);

// ---------------------------------------------------------------------------
// 6. payment_requests — customers claiming they paid a still-pending bill
// ---------------------------------------------------------------------------

const pending = savedBills.filter((b) => b.status === "pending").slice(0, 6);
const requests = pending.map((b, i) => ({
  customer_id: b.customer_id,
  bill_id: b.id,
  requested_amount: Number(
    (Number(b.total_amount) - Number(b.received_amount)).toFixed(2),
  ),
  message: pick([
    "Paisa aapi didha chhe",
    "Kale sanje aapyu hatu",
    "Full payment kari didhu",
  ]),
  status:
    i === 0 ? "confirmed" : i === 1 ? "rejected" : "pending_verification",
}));

if (requests.length) {
  die(
    "payment_requests",
    (await db.from("payment_requests").insert(requests.filter((r) => r.requested_amount > 0))).error,
  );
}
console.log(`payment_requests : ${requests.length}`);

// ---------------------------------------------------------------------------
// 7. reports + replies
// ---------------------------------------------------------------------------

const reportRows = active.slice(0, 5).map((c, i) => ({
  customer_id: c.id,
  issue_type: pick([
    "wrong_quantity",
    "milk_not_received",
    "extra_milk",
    "less_milk",
    "other",
  ]),
  expected_quantity: Number(c.daily_quantity),
  received_quantity: Math.max(0, Number(c.daily_quantity) - 0.5),
  message: pick([
    "Aaje dudh ochhu malyu",
    "Kale dudh aavyu j nahi",
    "Quantity barabar nathi",
    "Time bahu modu thay chhe",
  ]),
  status: ["pending", "in_progress", "resolved", "rejected", "pending"][i],
  resolved_at: i === 2 ? new Date().toISOString() : null,
}));

const { data: savedReports, error: rErr } = await db
  .from("reports")
  .insert(reportRows)
  .select("id");
die("reports", rErr);
console.log(`reports          : ${savedReports.length}`);

// Replies need a sender that exists in public.users — use the admin.
const { data: admin } = await db
  .from("users")
  .select("id")
  .eq("role", "admin")
  .limit(1)
  .maybeSingle();

if (admin) {
  const replies = savedReports.slice(0, 3).map((r) => ({
    report_id: r.id,
    sender_id: admin.id,
    message: pick([
      "Maaf karo, kale barabar aapi daishu.",
      "Check karyu, aavti kale sudhari daishu.",
      "Tamaru issue solve kari didhu chhe.",
    ]),
  }));
  die("report_replies", (await db.from("report_replies").insert(replies)).error);
  console.log(`report_replies   : ${replies.length}`);

  // -------------------------------------------------------------------------
  // 8. notifications + audit_logs (both hang off users, so admin only)
  // -------------------------------------------------------------------------

  const notes = [
    ["Navu payment request", "Ek customer e payment done request mokli chhe", "payment"],
    ["Navi problem", "Delivery ni fariyad nondhai chhe", "problem"],
    ["Stock ochho chhe", "Aajno stock threshold thi niche gayo", "stock"],
    ["Mahina no hisab taiyar", "Gaya mahina na bill generate thai gaya", "billing"],
  ].map(([title, message, type]) => ({
    user_id: admin.id,
    title: `${TAG} ${title}`,
    message,
    type,
    is_read: chance(0.5),
  }));
  die("notifications", (await db.from("notifications").insert(notes)).error);
  console.log(`notifications    : ${notes.length}`);

  const logs = [
    ["create", "customers"],
    ["update", "milk_entries"],
    ["update", "customers"],
    ["confirm", "payment_requests"],
    ["resolve", "reports"],
  ].map(([action, mod]) => ({
    user_id: admin.id,
    action,
    module: `${TAG} ${mod}`,
    new_data: { note: "demo entry" },
  }));
  die("audit_logs", (await db.from("audit_logs").insert(logs)).error);
  console.log(`audit_logs       : ${logs.length}`);
} else {
  console.log(
    "\n(Koi admin user nathi malyo — report_replies, notifications ane\n audit_logs skip karya. Pehla scripts/create-admin.mjs chalavo.)",
  );
}

console.log("\nThai gayu. Admin panel refresh karo.");
