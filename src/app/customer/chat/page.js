import Box from "@mui/material/Box";
import { requireCustomer, getBusinessSettings } from "@/lib/auth";
import { getChat } from "@/lib/chat";
import ChatWorkspace from "@/components/ChatWorkspace";

export const metadata = { title: "Chat" };

export default async function CustomerChatPage() {
  const user = await requireCustomer();
  const [settings, chat] = await Promise.all([
    getBusinessSettings(),
    getChat(user),
  ]);

  // The same workspace the dairy sees, minus everything a customer has no
  // business doing: one direct thread with the dairy, plus the channels they
  // are in. No page heading — the thread carries the name at the top of it.
  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
      <ChatWorkspace
        isAdmin={false}
        dairyName={settings.dairy_name}
        logoUrl={settings.logo_url}
        meName={user.name}
        mePhoto={user.profile_photo}
        threads={chat.threads}
        channels={chat.channels}
      />
    </Box>
  );
}
