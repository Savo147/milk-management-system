import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InventoryIcon from "@mui/icons-material/Inventory";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import SettingsIcon from "@mui/icons-material/Settings";

/** Admin — 8 main pages. */
export const adminNav = [
  { href: "/admin", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/customers", label: "Customers", icon: PeopleIcon },
  { href: "/admin/daily-milk", label: "Daily Milk", icon: LocalShippingIcon },
  { href: "/admin/stock", label: "Stock", icon: InventoryIcon },
  { href: "/admin/hisab", label: "Hisab", icon: ReceiptLongIcon },
  { href: "/admin/reports", label: "Reports", icon: AssessmentIcon },
  { href: "/admin/problems", label: "Problems", icon: ReportProblemIcon },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
];
