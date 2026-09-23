import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { requireCustomerAccount } from "@/lib/auth";
import { resolveRange, todayLocal } from "@/lib/range";
import { problemState } from "@/lib/constants";
import PageHeader from "@/components/PageHeader";
import NotLinked from "@/components/NotLinked";
import ProblemsView from "./ProblemsView";

export const metadata = { title: "Report Problem — Krishna Dairy" };

export default async function ReportProblemPage({ searchParams }) {
  const { customer } = await requireCustomerAccount();
  const params = await searchParams;
  const { mode, from, to, label, monthFrom, monthTo } = resolveRange(params);

  if (!customer) {
    return (
      <>
        <PageHeader title="Report Problem" />
        <NotLinked />
      </>
    );
  }

  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      "id, issue_type, expected_quantity, received_quantity, message, status, created_at, resolved_at",
    )
    .eq("customer_id", customer.id)
    // created_at is a timestamp, so the end of the span has to include its
    // whole last day rather than stopping at midnight.
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59.999`)
    .order("created_at", { ascending: false });

  const problems = reports ?? [];

  // One query for every thread rather than one per row — there are a handful
  // of replies per problem, and the count is wanted in the list anyway.
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

  const open = problems.filter(
    (p) => problemState(p.status) === "pending",
  ).length;

  return (
    <>
      <PageHeader
        title="Report Problem"
        subtitle={
          open > 0
            ? `${label} — ${open} complaints awaiting a reply`
            : `${label} — tell us if anything was wrong with your milk`
        }
      />

      {error ? (
        <Alert severity="error">
          Could not load complaints: {error.message}
        </Alert>
      ) : (
        <ProblemsView
          problems={problems}
          repliesByReport={repliesByReport}
          customer={customer}
          today={todayLocal()}
          mode={mode}
          from={from}
          to={to}
          monthFrom={monthFrom}
          monthTo={monthTo}
        />
      )}
    </>
  );
}
