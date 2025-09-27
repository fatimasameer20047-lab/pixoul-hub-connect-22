import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const tickets = [
  {
    id: 'T-001',
    title: 'WiFi connection issues in Room 3',
    status: 'open',
    priority: 'high',
    date: '2024-01-15',
    category: 'Technical'
  },
  {
    id: 'T-002', 
    title: 'Request for additional chairs',
    status: 'in-progress',
    priority: 'medium',
    date: '2024-01-14',
    category: 'Facilities'
  },
  {
    id: 'T-003',
    title: 'Feedback on breakfast menu',
    status: 'resolved',
    priority: 'low',
    date: '2024-01-12',
    category: 'Feedback'
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'open': return <AlertCircle className="h-4 w-4" />;
    case 'in-progress': return <Clock className="h-4 w-4" />;
    case 'resolved': return <CheckCircle className="h-4 w-4" />;
    default: return <MessageSquare className="h-4 w-4" />;
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'open': return 'destructive';
    case 'in-progress': return 'default';
    case 'resolved': return 'secondary';
    default: return 'outline';
  }
};

const getPriorityVariant = (priority: string) => {
  switch (priority) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
};

export default function Support() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Support & Feedback</h1>
          <p className="text-muted-foreground">
            Get help or share your feedback with our team
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{ticket.title}</CardTitle>
                    <Badge variant="outline">{ticket.id}</Badge>
                  </div>
                  <CardDescription>
                    {ticket.category} • {ticket.date}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityVariant(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant={getStatusVariant(ticket.status)} className="flex items-center gap-1">
                    {getStatusIcon(ticket.status)}
                    {ticket.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}