// Business rules from the requirements doc, mirrored from the database enums.
// Keep these in step with supabase/migrations/0001_initial_schema.sql.

/** Fixed options: 0.5 L to 5 L in 0.5 L steps. The DB enforces this too. */
export const MILK_QUANTITIES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export const DELIVERY_STATUS = {
  delivered: "Delivered",
  partial: "Partial",
  extra: "Extra",
  missed: "Missed",
};

export const BILL_STATUS = {
  pending: "Pending",
  done: "Done",
};

/** A customer's claim. Only an admin confirming it moves the bill to done. */
export const PAYMENT_REQUEST_STATUS = {
  pending_verification: "Pending Verification",
  confirmed: "Confirmed",
  rejected: "Rejected",
};

export const ISSUE_TYPE = {
  wrong_quantity: "Wrong Quantity",
  milk_not_received: "Milk Not Received",
  extra_milk: "Extra Milk",
  less_milk: "Less Milk",
  other: "Other",
};

export const REPORT_STATUS = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
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
