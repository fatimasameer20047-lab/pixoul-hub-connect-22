import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Mail, Phone, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface Registration {
  id: string;
  participant_name: string;
  participant_email: string;
  party_size: number;
  status: string;
  notes?: string;
  created_at: string;
}

interface EventRegistrationsProps {
  eventId: string;
  eventTitle: string;
  onBack: () => void;
}

export function EventRegistrations({ eventId, eventTitle, onBack }: EventRegistrationsProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRegistrations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('event-registrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchRegistrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading registrations',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationStatus = async (registrationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: newStatus })
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Registration status changed to ${newStatus}`,
      });

      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteRegistration = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: 'Registration deleted',
        description: 'The registration has been removed',
      });

      fetchRegistrations();
    } catch (error: any) {
      toast({
        title: 'Error deleting registration',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registrations for {eventTitle}
          </CardTitle>
          <p className="text-muted-foreground">
            Total registrations: {registrations.length}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No registrations yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Party Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell className="font-medium">
                      {registration.participant_name}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${registration.participant_email}`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {registration.participant_email}
                      </a>
                    </TableCell>
                    <TableCell>{registration.party_size}</TableCell>
                    <TableCell>{getStatusBadge(registration.status)}</TableCell>
                    <TableCell>
                      {format(parseISO(registration.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {registration.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {registration.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRegistrationStatus(registration.id, 'confirmed')}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        {registration.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRegistrationStatus(registration.id, 'cancelled')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Registration</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this registration? This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteRegistration(registration.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
