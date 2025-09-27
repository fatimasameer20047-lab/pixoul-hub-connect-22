import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface InlineCommentFormProps {
  onSubmit: (comment: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function InlineCommentForm({ onSubmit, onCancel, isSubmitting = false }: InlineCommentFormProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      onSubmit(comment.trim());
      setComment('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment..."
        className="min-h-[60px] text-sm"
        rows={2}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!comment.trim() || isSubmitting}>
          <Send className="h-4 w-4 mr-1" />
          Comment
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}