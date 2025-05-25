
// src/components/notifications/NotificationBell.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, CheckCheck, Settings2, X, Zap } from 'lucide-react'; // Added Zap
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AppNotification } from '@/lib/types';
import { NotificationItem } from './NotificationItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast'; // Added useToast

const generateMockNotifications = (): AppNotification[] => [
  { id: '1', userId: 'user1', message: 'Your order #ORD123 has been placed.', createdAt: new Date(Date.now() - 1000 * 60 * 5), read: false, link: '/orders', iconName: 'ShoppingBag', category: 'Order' },
  { id: '2', userId: 'user1', message: 'Vendor "Pizza Place" has confirmed your order.', createdAt: new Date(Date.now() - 1000 * 60 * 30), read: false, link: '/orders', iconName: 'PackageCheck', category: 'Order' },
  { id: '3', userId: 'user1', message: 'Delivery agent Alex is on the way with your order!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), read: true, link: '/orders', iconName: 'Truck', category: 'Order' },
  { id: '4', userId: 'user1', message: 'Weekly Special: 20% off all burgers today!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), read: false, iconName: 'Percent', category: 'Promotion' },
  { id: '5', userId: 'user1', message: 'Your profile information was updated.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), read: true, link: '/profile', iconName: 'UserCircle', category: 'Account' },
];


export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast(); // Initialize toast

  useEffect(() => {
    setNotifications(generateMockNotifications().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    setIsClient(true);
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  
  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.link) {
        setIsOpen(false);
    }
  };

  const showBrowserNotification = (title: string, body: string, iconUrl?: string) => {
    if (!('Notification' in window)) {
      toast({ title: 'Error', description: 'This browser does not support desktop notification.', variant: 'destructive' });
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, { body, icon: iconUrl || '/logo-192.png' });
      notification.onclick = () => {
        window.focus(); // Bring window to focus
        // Optionally navigate to a specific link or close popover
        setIsOpen(false); 
      };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const notification = new Notification(title, { body, icon: iconUrl || '/logo-192.png' });
           notification.onclick = () => {
            window.focus();
            setIsOpen(false);
          };
        } else {
          toast({ title: 'Permission Denied', description: 'Desktop notifications were not granted.', variant: 'destructive'});
        }
      });
    } else {
       toast({ title: 'Permission Denied', description: 'Desktop notifications are currently denied. Please check your browser settings.', variant: 'destructive' });
    }
  };

  const handleTestDesktopNotification = () => {
    showBrowserNotification(
      'Dailybuy Test Notification', 
      'This is a test desktop notification from Dailybuy!',
      '/logo-192.png' // Placeholder icon
    );
  };


  if (!isClient) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
        <div className="p-3 space-y-2">
           <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            onClick={handleTestDesktopNotification}
          >
            <Zap className="mr-2 h-4 w-4" /> Test Desktop Notification
          </Button>
          <Button variant="link" size="sm" asChild className="text-primary w-full">
            <Link href="/notifications" onClick={() => setIsOpen(false)}>View All Notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
