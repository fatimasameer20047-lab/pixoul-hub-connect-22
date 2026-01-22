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

type RecipientKey =
  | 'customer'
  | 'support_staff'
  | 'booking_staff'
  | 'orders_staff'
  | 'gallery_staff';

const ALLOWED_KINDS = new Set([
  'chat',
  'booking_room',
  'booking_package',
  'booking_party',
  'gallery_pending',
  'order',
]);

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  link_path: string | null;
  is_read: boolean;
  recipient_role: string | null;
  recipient_user_id: string | null;
  kind?: string;
};

type NotificationBellProps = {
  customerIdOverride?: string | null;
  staffRoleOverride?: string | null;
};

const LEGACY_ROLE_MAPPING: Partial<Record<RecipientKey, string>> = {
  support_staff: 'support',
  booking_staff: 'booking',
  orders_staff: 'snacks',
  gallery_staff: 'gallery',
};

export function NotificationBell({ customerIdOverride, staffRoleOverride }: NotificationBellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    canManageRooms,
    canManageSupport,
    canManageSnacks,
    canModerateGallery,
  } = useStaff();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const mode = useMemo(() => {
    let staffRole: RecipientKey | null = null;
    const explicit = staffRoleOverride?.toLowerCase();
    if (explicit === 'support' || explicit === 'support_staff') staffRole = 'support_staff';
    if (explicit === 'booking' || explicit === 'booking_staff') staffRole = 'booking_staff';
    if (explicit === 'snacks' || explicit === 'orders_staff' || explicit === 'orders') staffRole = 'orders_staff';
    if (explicit === 'gallery' || explicit === 'gallery_staff') staffRole = 'gallery_staff';

    if (!staffRole) {
      if (canManageSupport) staffRole = 'support_staff';
      else if (canManageRooms) staffRole = 'booking_staff';
      else if (canManageSnacks) staffRole = 'orders_staff';
      else if (canModerateGallery) staffRole = 'gallery_staff';
    }

    if (staffRole) {
      return { key: staffRole as RecipientKey, customerId: null };
    }

    const resolvedCustomerId = customerIdOverride || user?.id || null;
    return resolvedCustomerId ? { key: 'customer' as RecipientKey, customerId: resolvedCustomerId } : null;
  }, [
    staffRoleOverride,
    customerIdOverride,
    canManageSupport,
    canManageRooms,
    canManageSnacks,
    canModerateGallery,
    user?.id,
  ]);

  const fetchNotifications = useCallback(async () => {
    if (!mode) return;

    let roles: string[] = [];
    if (mode.key === 'customer') {
      // Customer path (unchanged)
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, created_at, link_path, is_read, recipient_role, recipient_user_id, kind')
        .eq('is_read', false)
        .eq('recipient_user_id', mode.customerId!)
        .order('created_at', { ascending: false })
        .limit(30);
      const queryAError = error ? `${error.message} (${error.code || 'no_code'})` : null;
      const rowsA = ((data as NotificationRow[]) || [])
        .map((row) => ({
          ...row,
          kind: row.kind ?? 'unknown',
        }))
        .filter((row) => ALLOWED_KINDS.has(row.kind || ''));
      const unread = rowsA.filter((n) => !n.is_read).length;
      setNotifications(rowsA);
      setUnreadCount(unread);
      return;
    }

    // Staff path: direct query using roles (booking/support/orders/gallery)
    roles = [mode.key, LEGACY_ROLE_MAPPING[mode.key]].filter(Boolean) as string[];
    if (roles.includes('gallery_staff') && !roles.includes('gallery_moderator')) {
      roles.push('gallery_moderator');
    }
    let query = supabase
      .from('notifications')
      .select('id, title, body, created_at, link_path, is_read, recipient_role, recipient_user_id, kind')
      .order('created_at', { ascending: false })
      .limit(50);

    if (roles.length > 0) {
      query = query.in('recipient_role', roles);
    }

    const { data, error } = await query;
    const queryAError = error ? `${error.message} (${error.code || 'no_code'})` : null;

    const rowsA = ((data as NotificationRow[]) || [])
      .map((row) => ({
        ...row,
        kind: row.kind ?? 'unknown',
      }))
      .filter((row) => ALLOWED_KINDS.has(row.kind || ''));

    const unread = rowsA.filter((n) => !n.is_read).length;

    // Fallback: if nothing returned, try a simple select without is_read filter then filter client-side
    let fallbackRows: NotificationRow[] = [];
    if (rowsA.length === 0) {
      const { data: fbData, error: fbError } = await supabase
        .from('notifications')
        .select('id, title, body, created_at, link_path, is_read, recipient_role, recipient_user_id, kind')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!fbError) {
        fallbackRows = ((fbData as NotificationRow[]) || [])
          .map((row) => ({
            ...row,
            kind: row.kind ?? 'unknown',
          }))
          .filter((row) => ALLOWED_KINDS.has(row.kind || ''))
          .filter((row) => roles.length === 0 || (row.recipient_role && roles.includes(row.recipient_role)))
          .filter((row) => !row.is_read);
      }
    }

    const effectiveRows = rowsA.length > 0 ? rowsA : fallbackRows;
    const effectiveUnread = effectiveRows.filter((n) => !n.is_read).length;

    setNotifications(effectiveRows);
    setUnreadCount(effectiveUnread);

    if (import.meta.env.DEV) {
      console.debug('[NotificationBell] staff fetch', {
        mode,
        roles,
        error,
        count: effectiveRows.length,
        unread: effectiveUnread,
      });
    }
  }, [mode, supabase]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!mode) return;
    if (mode.key !== 'customer') {
      // For staff we rely on RPC fetch (no realtime to avoid RLS noise)
      return;
    }
    const filter = `recipient_user_id=eq.${mode.customerId}`;
    const channel = supabase
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
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
