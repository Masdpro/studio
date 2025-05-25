
// src/app/(app)/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { AppNotification } from '@/lib/types';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BellRing, CheckCheck, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Re-using mockNotifications from NotificationBell for consistency
const generateMockNotificationsPageData = (): AppNotification[] => [
  { id: '1', userId: 'user1', message: 'Your order #ORD123 has been placed.', createdAt: new Date(Date.now() - 1000 * 60 * 5), read: false, link: '/orders', iconName: 'ShoppingBag', category: 'Order' },
  { id: '2', userId: 'user1', message: 'Vendor "Pizza Place" has confirmed your order.', createdAt: new Date(Date.now() - 1000 * 60 * 30), read: false, link: '/orders', iconName: 'PackageCheck', category: 'Order' },
  { id: '3', userId: 'user1', message: 'Delivery agent Alex is on the way with your order!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), read: true, link: '/orders', iconName: 'Truck', category: 'Order' },
  { id: '4', userId: 'user1', message: 'Weekly Special: 20% off all burgers today!', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), read: false, iconName: 'Percent', category: 'Promotion' },
  { id: '5', userId: 'user1', message: 'Your profile information was updated.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), read: true, link: '/profile', iconName: 'UserCircle', category: 'Account' },
  { id: '6', userId: 'user1', message: 'System maintenance scheduled for tomorrow at 2 AM.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72), read: true, iconName: 'Settings2', category: 'System' },
  { id: '7', userId: 'user1', message: 'Your review for order #ORD007 has been published.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96), read: true, link: '/orders', iconName: 'Star', category: 'Account' },
];


export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching all notifications
    setNotifications(generateMockNotificationsPageData().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    setIsLoading(false);
  }, []);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const handleDeleteAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <BellRing className="h-8 w-8 text-primary" />
            All Notifications
          </CardTitle>
          <CardDescription>View and manage all your notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 pb-4 border-b">
            <p className="text-sm text-muted-foreground">
              You have {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
                <CheckCheck className="mr-2 h-4 w-4" /> Mark All Read
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteAllNotifications} disabled={notifications.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete All
              </Button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">You have no notifications.</p>
          ) : (
            <div className="space-y-1">
              {notifications.map(notification => (
                <div key={notification.id} className="group relative pr-10">
                    <NotificationItem
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteNotification(notification.id)}
                        aria-label="Delete notification"
                    >
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
