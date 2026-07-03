import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import ChatPanel from './ChatPanel';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatButton() {
  const { user } = useAuth();
  const { conversations, totalUnreadCount } = useChat();
  const [showList, setShowList] = useState(false);
  const [activeChat, setActiveChat] = useState<{ userId: string; userName: string } | null>(null);

  const openChat = (userId: string, userName: string) => {
    setActiveChat({ userId, userName });
    setShowList(false);
  };

  return (
    <>
      {/* Chat List Popup */}
      {showList && (
        <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-2xl border border-border z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-primary text-white flex items-center justify-between">
            <h3 className="font-semibold">Mensagens</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowList(false)}
              className="text-white hover:bg-primary-dark"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="overflow-y-auto flex-1">
            {conversations.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                Nenhuma conversa ainda
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openChat(conv.other_user!.id, conv.other_user!.username)}
                  className="w-full p-4 hover:bg-secondary/50 text-left border-b border-border transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-foreground">{conv.other_user?.username}</p>
                    {conv.unread_count > 0 && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.last_message || 'Sem mensagens'}
                  </p>
                  {conv.last_message_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(conv.last_message_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <Button
        onClick={() => setShowList(!showList)}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-xl z-40"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
          </span>
        )}
      </Button>

      {/* Active Chat Panel */}
      {activeChat && (
        <ChatPanel
          otherUserId={activeChat.userId}
          otherUserName={activeChat.userName}
          onClose={() => setActiveChat(null)}
        />
      )}
    </>
  );
}
