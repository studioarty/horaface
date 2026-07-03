import { useState, useEffect, useRef } from 'react';
import { Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';

interface ChatPanelProps {
  otherUserId: string;
  otherUserName: string;
  onClose: () => void;
}

export default function ChatPanel({ otherUserId, otherUserName, onClose }: ChatPanelProps) {
  const { user } = useAuth();
  const { messages, sendMessage, isSending, markAsRead } = useChat(otherUserId);
  const [message, setMessage] = useState('');
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark messages as read when panel opens
    markAsRead();
  }, [messages.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage({ message: message.trim(), receiverId: otherUserId });
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-border transition-all ${
      minimized ? 'w-80 h-14' : 'w-96 h-[600px]'
    } flex flex-col z-50`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <h3 className="font-semibold">{otherUserName}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMinimized(!minimized)}
            className="text-white hover:bg-primary-dark"
          >
            {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-primary-dark"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                Nenhuma mensagem ainda. Inicie a conversa!
              </p>
            ) : (
              messages.map((msg) => {
                const isSender = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isSender
                          ? 'bg-primary text-white'
                          : 'bg-white border border-border text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        isSender ? 'text-blue-100' : 'text-muted-foreground'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-white rounded-b-lg">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={isSending}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isSending}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
