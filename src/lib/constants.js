// Business rules from the requirements doc, mirrored from the database enums.
// Keep these in step with supabase/migrations/0001_initial_schema.sql.

/** Fixed options: 0.5 L to 5 L in 0.5 L steps. The DB enforces this too. */
export const MILK_QUANTITIES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export const DELIVERY_STATUS = {
  // The database enum value stays "delivered"; only the label reads "Done".
  delivered: "Done",
  partial: "Partial",
  extra: "Extra",
  missed: "Missed",
};

/**
 * What the Daily Milk row shows. "pending" is UI-only — it means no entry has
 * been saved for that customer on that date, so it has no database enum value;
 * the other four mirror delivery_status.
 */
export const DAILY_ROW_STATUS = {
  pending: "Pending",
  ...DELIVERY_STATUS,
};

export const BILL_STATUS = {
  pending: "Pending",
  done: "Done",
};

export const ISSUE_TYPE = {
  wrong_quantity: "Wrong Quantity",
  milk_not_received: "Milk Not Received",
  extra_milk: "Extra Milk",
  less_milk: "Less Milk",
  other: "Other",
};

export const ACCOUNT_STATUS = {
  active: "Active",
  inactive: "Inactive",
};

/** MUI Chip colours per status, so a status looks the same on every page. */
export const STATUS_COLOR = {
  delivered: "success",
  partial: "warning",
  extra: "info",
  missed: "error",
  pending: "warning",
  done: "success",
  pending_verification: "warning",
  confirmed: "success",
  rejected: "error",
  in_progress: "info",
  resolved: "success",
  active: "success",
  inactive: "default",
};

/**
 * Problems, as the admin thinks of them: still open, or dealt with.
 *
 * The database enum keeps four values (pending, in_progress, resolved,
 * rejected) — collapsing them here rather than migrating means old rows still
 * read correctly, and "rejected" lands under Done because it has been handled.
 */
export const PROBLEM_STATE = {
  pending: "Pending",
  done: "Done",
};

export const problemState = (status) =>
  status === "resolved" || status === "rejected" ? "done" : "pending";

/** What to write when the admin picks one of the two. */
export const PROBLEM_STATE_VALUE = {
  pending: "pending",
  done: "resolved",
};
