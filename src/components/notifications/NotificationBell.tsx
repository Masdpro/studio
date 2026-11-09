
// src/components/notifications/NotificationBell.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AppNotification } from '@/lib/types';
import { NotificationItem } from './NotificationItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.notifications) {
          setNotifications(data.notifications.map((n: AppNotification) => ({ ...n, createdAt: new Date(n.createdAt) })));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    setIsClient(true);
    fetchNotifications();
    window.addEventListener('notifications:updated', fetchNotifications);
    return () => window.removeEventListener('notifications:updated', fetchNotifications);
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    fetch(`/api/notifications/${id}`, { method: 'PATCH' }).catch(() => {});
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetch('/api/notifications', { method: 'PATCH' }).catch(() => {});
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.link) {
        setIsOpen(false);
    }
  };

  if (!isClient) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) fetchNotifications(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 min-w-min p-0.5 text-xs flex items-center justify-center rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">View notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
                 <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs text-primary">
                    <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
                </Button>
            )}
            <PopoverClose asChild>
                 <Button variant="ghost" size="icon" className="h-7 w-7">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </Button>
            </PopoverClose>
          </div>
        </div>
        <ScrollArea className="h-[250px] sm:h-[350px]">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-center text-muted-foreground">No new notifications.</p>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onNotificationClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="p-3">
          <Button variant="link" size="sm" asChild className="text-primary w-full">
            <Link href="/notifications" onClick={() => setIsOpen(false)}>View All Notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
