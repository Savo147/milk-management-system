import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getBusinessSettings } from "@/lib/auth";
import { getChat } from "@/lib/chat";
import { problemState } from "@/lib/constants";
import ChatWorkspace from "@/components/ChatWorkspace";

export const metadata = { title: "Chat" };

export default async function ChatPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireAdmin();
  const [settings, chat] = await Promise.all([
    getBusinessSettings(),
    getChat(user),
  ]);

  const supabase = await createClient();

  // Every customer, not only the ones who have written: both "Find a
  // customer" and a private channel's member list need the whole book.
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, mobile, status, users(profile_photo)")
    .order("name");

  // Who has complained, so the sidebar's toggle can narrow itself down to
  // them. Newest first, so the first row seen for a customer is their latest.
  const { data: reports } = await supabase
    .from("reports")
    .select("customer_id, status, message, created_at")
    .order("created_at", { ascending: false });

  const byCustomer = new Map();
  for (const r of reports ?? []) {
    const seen = byCustomer.get(r.customer_id);

    if (!seen) {
      byCustomer.set(r.customer_id, {
        problems: 1,
        pending: problemState(r.status) === "pending" ? 1 : 0,
        last: r.message,
        lastAt: r.created_at,
      });
      continue;
    }

    seen.problems += 1;
    if (problemState(r.status) === "pending") seen.pending += 1;
  }

  const threadBy = new Map(chat.threads.map((t) => [t.customerId, t]));

  // A customer who has complained but never chatted still belongs on this
  // list — that is the whole point of the toggle — so it is built from the
  // complaints, with the conversation's preview filled in where there is one.
  const problemThreads = [...byCustomer.entries()]
    .map(([customerId, info]) => {
      const customer = (customers ?? []).find((c) => c.id === customerId);
      if (!customer) return null;

      const thread = threadBy.get(customerId);

      return {
        kind: "dm",
        id: customerId,
        customerId,
        name: customer.name,
        mobile: customer.mobile,
        last: thread?.last ?? info.last,
        lastAt: thread?.lastAt ?? info.lastAt,
        lastMine: thread?.lastMine ?? false,
        unread: thread?.unread ?? 0,
        problems: info.problems,
        pending: info.pending,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.lastAt ?? 0) - new Date(a.lastAt ?? 0));

  // ?c=<customer> opens straight on that conversation — it is how the
  // Problems page hands a complaint over to the chat. An id that matches
  // nobody is simply ignored.
  // The dialogs want a face on each row; the photo lives on the login the
  // customer row points at.
  const people = (customers ?? []).map((c) => ({
    ...c,
    photo: c.users?.profile_photo ?? null,
  }));

  const wanted = people.find((c) => c.id === params?.c);
  const initial = wanted
    ? {
        kind: "dm",
        id: wanted.id,
        name: wanted.name,
        sub: wanted.mobile,
        photo: wanted.photo,
        unread:
          chat.threads.find((t) => t.customerId === wanted.id)?.unread ?? 0,
      }
    : null;

  // A column, so the workspace still fills whatever the banner leaves.
  return (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      {error && (
        <Alert severity="error" square>
          Could not load customers: {error.message}
        </Alert>
      )}

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <ChatWorkspace
          isAdmin
          dairyName={settings.dairy_name}
          logoUrl={settings.logo_url}
          meName={user.name}
          mePhoto={user.profile_photo}
          initialSelection={initial}
          threads={chat.threads}
          problemThreads={problemThreads}
          channels={chat.channels}
          customers={people}
        />
      </Box>
    </Stack>
  );
}
