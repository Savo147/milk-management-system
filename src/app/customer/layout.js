import DashboardIcon from "@mui/icons-material/Dashboard";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import PersonIcon from "@mui/icons-material/Person";
import { requireCustomer, getBusinessSettings } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import AppShell from "@/components/AppShell";

/** Customer — 5 main pages. */
const customerNav = [
  { href: "/customer", label: "Dashboard", icon: DashboardIcon },
  { href: "/customer/my-milk", label: "My Milk", icon: LocalDrinkIcon },
  { href: "/customer/my-hisab", label: "My Hisab", icon: ReceiptLongIcon },
  {
    href: "/customer/report-problem",
    label: "Report Problem",
    icon: ReportProblemIcon,
  },
  { href: "/customer/profile", label: "Profile", icon: PersonIcon },
];

export default async function CustomerLayout({ children }) {
  const user = await requireCustomer();
  const settings = await getBusinessSettings();
  const { notifications, unread } = await getNotifications(user.id);

  return (
    <AppShell
      navItems={customerNav}
      rootHref="/customer"
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
