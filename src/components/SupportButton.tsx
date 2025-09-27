import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SupportButton = () => {
  const navigate = useNavigate();

  return (
    <Button
      onClick={() => navigate('/support')}
      className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
      size="icon"
    >
      <MessageSquare className="h-6 w-6" />
    </Button>
  );
};