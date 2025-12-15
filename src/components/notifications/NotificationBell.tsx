import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useStaff } from '@/contexts/StaffContext';

type RecipientKey = 'customer' | 'support' | 'booking' | 'snacks';

type NotificationRow = {
  id: number;
  title: string;
  body: string | null;
  created_at: string;
  link_path: string | null;
  is_read: boolean;
  recipient_role: string | null;
  recipient_user_id: string | null;
  kind: string;
};

type NotificationBellProps = {
  customerIdOverride?: string | null;
  staffRoleOverride?: string | null;
};

export function NotificationBell({ customerIdOverride, staffRoleOverride }: NotificationBellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canManageRooms, canManageSupport, canManageSnacks } = useStaff();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const mode = useMemo(() => {
    let staffRole: RecipientKey | null = null;
    const explicit = staffRoleOverride?.toLowerCase();
    if (explicit === 'support' || explicit === 'support_staff') staffRole = 'support';
    if (explicit === 'booking' || explicit === 'booking_staff') staffRole = 'booking';
    if (explicit === 'snacks' || explicit === 'orders_staff' || explicit === 'orders') staffRole = 'snacks';

    if (!staffRole) {
      if (canManageSupport) staffRole = 'support';
      else if (canManageRooms) staffRole = 'booking';
      else if (canManageSnacks) staffRole = 'snacks';
    }

    if (staffRole) {
      return { key: staffRole as RecipientKey, customerId: null };
    }

    const customerId = customerIdOverride || user?.id || null;
    return customerId ? { key: 'customer' as RecipientKey, customerId } : null;
  }, [staffRoleOverride, customerIdOverride, canManageSupport, canManageRooms, canManageSnacks, user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!mode) return;

    let query = supabase
      .from('notifications')
      .select('id, title, body, created_at, link_path, is_read, recipient_role, recipient_user_id, kind')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(30);

    if (mode.key === 'customer') {
      query = query.eq('recipient_user_id', mode.customerId!);
    } else {
      query = query.eq('recipient_role', mode.key);
    }

    const { data, error } = await query;
    if (import.meta.env.DEV) {
      console.debug('[NotificationBell] fetch', { mode, filter: mode.key === 'customer' ? mode.customerId : mode.key, error, count: data?.length });
    }
    if (error) return;

    const rows = (data as NotificationRow[]) || [];
    setNotifications(rows);
    setUnreadCount(rows.filter((n) => !n.is_read).length);
  }, [mode]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!mode) return;
    const filters =
      mode.key === 'customer' && mode.customerId
        ? [`recipient_user_id=eq.${mode.customerId}`]
        : [`recipient_role=eq.${mode.key}`];

    const channels = filters.map((filter) =>
      supabase
        .channel(`notifications-${mode.key}-${filter}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter },
          (payload) => {
            if (import.meta.env.DEV) {
              console.debug('[NotificationBell] realtime', { mode, filter, payload });
            }
            fetchNotifications();
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [mode, fetchNotifications]);

  const markAsRead = async (notificationId: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    const { error } = await supabase.rpc('mark_notification_read', { p_id: notificationId });
    if (error) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
    }
  };

  const handleNotificationClick = async (notification: NotificationRow) => {
    setIsOpen(false);
    if (notification.link_path) {
      navigate(notification.link_path);
    }
    await markAsRead(notification.id);
  };

  if (!mode) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full p-0 flex items-center justify-center text-[11px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
        </div>
        <ScrollArea className="h-[420px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-1 flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <span className="truncate">{notification.title}</span>
                      </p>
                      {notification.body && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      aria-label="Mark notification as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
