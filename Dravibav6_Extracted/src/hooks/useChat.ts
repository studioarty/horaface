import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count_user1: number;
  unread_count_user2: number;
  created_at: string;
  updated_at: string;
  other_user?: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
    role: string;
  };
}

export function useChat(otherUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get or create conversation
  const conversationQuery = useQuery({
    queryKey: ['chat-conversation', user?.id, otherUserId],
    queryFn: async () => {
      if (!otherUserId) return null;

      // Check if conversation exists
      const { data: existing } = await supabase
        .from('chat_conversations')
        .select('*')
        .or(`and(user1_id.eq.${user!.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user!.id})`)
        .single();

      if (existing) return existing;

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('chat_conversations')
        .insert({
          user1_id: user!.id,
          user2_id: otherUserId,
        })
        .select()
        .single();

      if (error) throw error;
      return newConv;
    },
    enabled: !!user && !!otherUserId,
  });

  // Get all conversations with user details
  const conversationsQuery = useQuery({
    queryKey: ['chat-conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          user1:user_profiles!chat_conversations_user1_id_fkey(id, username, email, avatar, role),
          user2:user_profiles!chat_conversations_user2_id_fkey(id, username, email, avatar, role)
        `)
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Format conversations with other user info
      return (data || []).map((conv: any) => {
        const isUser1 = conv.user1_id === user!.id;
        const otherUser = isUser1 ? conv.user2 : conv.user1;
        const unreadCount = isUser1 ? conv.unread_count_user1 : conv.unread_count_user2;

        return {
          ...conv,
          other_user: otherUser,
          unread_count: unreadCount,
        };
      }) as ChatConversation[];
    },
    enabled: !!user,
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Get messages for conversation
  const messagesQuery = useQuery({
    queryKey: ['chat-messages', conversationQuery.data?.id],
    queryFn: async () => {
      if (!conversationQuery.data?.id) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationQuery.data.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationQuery.data?.id,
    refetchInterval: 2000, // Poll every 2 seconds for real-time effect
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, receiverId }: { message: string; receiverId: string }) => {
      if (!conversationQuery.data?.id) throw new Error('No conversation');

      // Insert message
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationQuery.data.id,
          sender_id: user!.id,
          receiver_id: receiverId,
          message,
        });

      if (msgError) throw msgError;

      // Update conversation
      const isUser1 = conversationQuery.data.user1_id === user!.id;
      const unreadField = isUser1 ? 'unread_count_user2' : 'unread_count_user1';
      const currentUnread = isUser1 
        ? conversationQuery.data.unread_count_user2 
        : conversationQuery.data.unread_count_user1;

      await supabase
        .from('chat_conversations')
        .update({
          last_message: message,
          last_message_at: new Date().toISOString(),
          [unreadField]: currentUnread + 1,
        })
        .eq('id', conversationQuery.data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar mensagem');
      console.error(error);
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!conversationQuery.data?.id) return;

      // Mark all messages from other user as read
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('conversation_id', conversationQuery.data.id)
        .eq('receiver_id', user!.id);

      // Reset unread count
      const isUser1 = conversationQuery.data.user1_id === user!.id;
      const unreadField = isUser1 ? 'unread_count_user1' : 'unread_count_user2';

      await supabase
        .from('chat_conversations')
        .update({ [unreadField]: 0 })
        .eq('id', conversationQuery.data.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  // Get total unread count
  const totalUnreadCount = conversationsQuery.data?.reduce(
    (sum, conv) => sum + (conv.unread_count || 0),
    0
  ) || 0;

  return {
    conversation: conversationQuery.data,
    conversations: conversationsQuery.data || [],
    messages: messagesQuery.data || [],
    isLoading: conversationQuery.isLoading || messagesQuery.isLoading,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
    totalUnreadCount,
  };
}
