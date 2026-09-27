import DashboardIcon from "@mui/icons-material/Dashboard";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import PersonIcon from "@mui/icons-material/Person";
import { requireCustomer, getBusinessSettings } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { getChat } from "@/lib/chat";
import AppShell from "@/components/AppShell";

/** Customer — 5 main pages, in the same grouped shape the admin nav uses. */
const customerNav = [
  {
    section: "Overview",
    items: [{ href: "/customer", label: "Dashboard", icon: DashboardIcon }],
  },
  {
    section: "My dairy",
    items: [
      { href: "/customer/my-milk", label: "My Milk", icon: LocalDrinkIcon },
      {
        href: "/customer/my-hisab",
        label: "My Billing",
        icon: ReceiptLongIcon,
      },
    ],
  },
  {
    section: "Account",
    items: [
      {
        href: "/customer/report-problem",
        label: "Report Problem",
        icon: ReportProblemIcon,
      },
      { href: "/customer/profile", label: "Profile", icon: PersonIcon },
    ],
  },
];

export default async function CustomerLayout({ children }) {
  const user = await requireCustomer();
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
      navItems={customerNav}
      accountHref="/customer/profile"
      chatHref="/customer/chat"
      rootHref="/customer"
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
