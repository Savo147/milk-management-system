import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { problemState } from "@/lib/constants";
import { todayLocal } from "@/lib/range";
import { formatDate } from "@/lib/format";
import ProblemsView from "./ProblemsView";

export const metadata = { title: "Problems" };

export default async function ProblemsPage({ searchParams }) {
  const params = await searchParams;
  // One day at a time, picked the same way Daily Milk picks it.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params?.date ?? "")
    ? params.date
    : todayLocal();

  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      "id, issue_type, expected_quantity, received_quantity, message, status, created_at, resolved_at, customers(name, mobile)",
    )
    // created_at is a timestamp, so the day has to run to its last moment
    // rather than stopping at midnight.
    .gte("created_at", `${date}T00:00:00`)
    .lte("created_at", `${date}T23:59:59.999`)
    .order("created_at", { ascending: false });

  const problems = (reports ?? []).map((r) => ({
    ...r,
    customer_name: r.customers?.name ?? "—",
    customer_mobile: r.customers?.mobile ?? "",
  }));

  // One query for every thread rather than one per row — a handful of replies
  // per problem, and the count is wanted in the list anyway.
  const { data: replies } = problems.length
    ? await supabase
        .from("report_replies")
        .select("id, report_id, message, created_at, users(name, role)")
        .in(
          "report_id",
          problems.map((p) => p.id),
        )
        .order("created_at")
    : { data: [] };

  const repliesByReport = {};
  for (const r of replies ?? []) {
    (repliesByReport[r.report_id] ??= []).push({
      id: r.id,
      message: r.message,
      created_at: r.created_at,
      sender_name: r.users?.name ?? "—",
      from_admin: r.users?.role === "admin",
    });
  }

  // The customer's own latest word on each complaint. Their replies come
  // after the one they opened it with, so the last of those wins; with no
  // replies it is still the complaint itself. The dairy's answers are left
  // out — the list is for seeing what the customer is saying.
  const lastFromCustomer = (id, fallback) => {
    const mine = (repliesByReport[id] ?? []).filter((r) => !r.from_admin);
    return mine.length ? mine[mine.length - 1].message : fallback;
  };

  const rows = problems.map((p) => ({
    ...p,
    last_message: lastFromCustomer(p.id, p.message),
  }));

  const open = problems.filter(
    (p) => problemState(p.status) === "pending",
  ).length;

  return (
    <>
      <PageHeader
        title="Problems"
        subtitle={
          open > 0
            ? `${formatDate(date)} — ${open} complaints still open`
            : formatDate(date)
        }
      />

      {error ? (
        <Alert severity="error">
          Could not load complaints: {error.message}
        </Alert>
      ) : (
        <ProblemsView
          problems={rows}
          repliesByReport={repliesByReport}
          date={date}
        />
      )}
    </>
  );
}
