import { redirect } from "next/navigation";
import { ChatPanel } from "@/components/admin/chat-panel";
import { listChatConversationsAction } from "@/lib/actions/chat-actions";
import { canStartChatWithAnyone, canUseChat } from "@/lib/auth/access";
import { getAuthSession } from "@/lib/auth/get-session";

export default async function ChatPage() {
  const session = await getAuthSession();
  if (!session) redirect("/admin/login");
  if (!canUseChat(session)) redirect("/admin");

  const result = await listChatConversationsAction();

  return (
    <ChatPanel
      initialConversations={result.conversations ?? []}
      initialUnreadTotal={result.unreadTotal ?? 0}
      canStartWithAnyone={canStartChatWithAnyone(session)}
    />
  );
}
