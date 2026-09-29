import Alert from "@mui/material/Alert";
import { requireCustomer } from "@/lib/auth";
import {
  getAllNotifications,
  NOTIFICATIONS_PER_PAGE,
} from "@/lib/notifications";
import { DAIRY_TZ, errorText } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import NotificationList from "@/components/NotificationList";

export const metadata = { title: "Notifications" };

/** Today in the dairy's timezone, so the day headings do not follow the
 * reader's laptop clock. */
function dairyToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAIRY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function CustomerNotificationsPage({ searchParams }) {
  const user = await requireCustomer();
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  // Unread is what you came to deal with, so it is the one that opens.
  const tab = params?.tab === "read" ? "read" : "unread";

  const { notifications, total, unread, read, error } =
    await getAllNotifications(user.id, page, tab);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Replies to what you have raised, newest first"
      />

      {error ? (
        <Alert severity="error">Could not load: {errorText(error)}</Alert>
      ) : (
        <NotificationList
          notifications={notifications}
          unread={unread}
          read={read}
          total={total}
          page={page}
          perPage={NOTIFICATIONS_PER_PAGE}
          tab={tab}
          today={dairyToday()}
          basePath="/customer/notifications"
        />
      )}
    </>
  );
}
