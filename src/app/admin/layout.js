import { requireAdmin, getBusinessSettings } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { getChat } from "@/lib/chat";
import { adminNav } from "@/lib/nav";
import AppShell from "@/components/AppShell";

export default async function AdminLayout({ children }) {
  // Every /admin/* page runs through this. Not signed in, not active, or not
  // an admin -> redirected before any page code runs.
  const user = await requireAdmin();
  // Together, not one after the other. None of the three needs anything from
  // the others, and the database is a few hundred milliseconds away — run in
  // turn they cost three of those on every single navigation.
  const [settings, { notifications, unread }, chat] = await Promise.all([
    getBusinessSettings(),
    getNotifications(user.id),
    getChat(user),
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
