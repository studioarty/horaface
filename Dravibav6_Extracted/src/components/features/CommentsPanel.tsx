import { useState } from 'react';
import { MessageCircle, Send, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CommentsPanelProps {
  fileId: string;
}

export default function CommentsPanel({ fileId }: CommentsPanelProps) {
  const { user } = useAuth();
  const { comments, addComment, deleteComment, isAdding, isDeleting } = useComments(fileId);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    addComment({
      fileId,
      content: newComment.trim(),
    });

    setNewComment('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <MessageCircle className="w-5 h-5" />
          Comentários ({comments.length})
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum comentário ainda</p>
            <p className="text-xs mt-1">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-secondary/30 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                  {comment.user?.avatar ? (
                    <img src={comment.user.avatar} alt="" className="w-full h-full rounded-full" />
                  ) : (
                    comment.user?.username.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {comment.user?.username}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                      {comment.user_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-destructive hover:text-destructive"
                          onClick={() => deleteComment(comment.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            className="resize-none"
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isAdding || !newComment.trim()} className="gap-2">
              <Send className="w-4 h-4" />
              {isAdding ? 'Enviando...' : 'Comentar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
