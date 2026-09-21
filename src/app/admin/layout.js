import { requireAdmin, getBusinessSettings } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { adminNav } from "@/lib/nav";
import AppShell from "@/components/AppShell";

export default async function AdminLayout({ children }) {
  // Every /admin/* page runs through this. Not signed in, not active, or not
  // an admin -> redirected before any page code runs.
  const user = await requireAdmin();
  const settings = await getBusinessSettings();
  const { notifications, unread } = await getNotifications(user.id);

  return (
    <AppShell
      navItems={adminNav}
      rootHref="/admin"
      dairyName={settings.dairy_name}
      logoUrl={settings.logo_url}
      user={user}
      notifications={notifications}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
