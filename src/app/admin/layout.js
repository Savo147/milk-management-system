import { requireAdmin, getBusinessSettings } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { getChat } from "@/lib/chat";
import { withDeadline, HEADER_DEADLINE_MS } from "@/lib/deadline";
import { adminNav } from "@/lib/nav";
import AppShell from "@/components/AppShell";

export default async function AdminLayout({ children }) {
  // Every /admin/* page runs through this. Not signed in, not active, or not
  // an admin -> redirected before any page code runs.
  const user = await requireAdmin();
  // Together, not one after the other: none of the three needs anything from
  // the others, and the database is a few hundred milliseconds away.
  //
  // The bell and the chat preview are decoration; they get a short
  // deadline of their own. A connection that has dropped costs a missing
  // badge for one page load instead of holding back a page whose real data
  // is already here.
  const [settings, { notifications, unread }, chat] = await Promise.all([
    getBusinessSettings(),
    withDeadline(getNotifications(user.id), HEADER_DEADLINE_MS, {
      notifications: [],
      unread: 0,
    }),
    withDeadline(getChat(user), HEADER_DEADLINE_MS, {
      isAdmin: true,
      customerId: null,
      threads: [],
      channels: [],
    }),
  ]);

  return (
    <AppShell
      navItems={adminNav}
      accountHref="/admin/settings"
      chatHref="/admin/chat"
      rootHref="/admin"
      dairyName={settings.dairy_name}
      logoUrl={settings.logo_url}
      user={user}
      notifications={notifications}
      unread={unread}
      chat={chat}
    >
      {children}
    </AppShell>
  );
}
