
// src/app/(app)/notifications/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AppNotification } from '@/lib/types';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BellRing, CheckCheck, Trash2, ArrowLeft, Loader2, Receipt, Activity, Sparkles } from 'lucide-react';
import Link from 'next/link';

type Category = NonNullable<AppNotification['category']>;

const TABS: { value: Category; label: string; icon: typeof Receipt }[] = [
  { value: 'Transaction', label: 'Transactions', icon: Receipt },
  { value: 'Activity', label: 'Activities', icon: Activity },
  { value: 'Promotion', label: 'Promotions', icon: Sparkles },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(() => {
    setIsLoading(true);
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : { notifications: [] }))
      .then((data) => {
        setNotifications((data.notifications ?? []).map((n: AppNotification) => ({ ...n, createdAt: new Date(n.createdAt) })));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    fetch(`/api/notifications/${id}`, { method: 'PATCH' }).catch(() => {});
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetch('/api/notifications', { method: 'PATCH' }).catch(() => {});
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleDeleteAllNotifications = () => {
    setNotifications([]);
    fetch('/api/notifications', { method: 'DELETE' }).catch(() => {});
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

  const renderList = (items: AppNotification[]) =>
    items.length === 0 ? (
      <p className="text-center text-muted-foreground py-10">Nothing here yet.</p>
    ) : (
      <div className="space-y-1">
        {items.map(notification => (
          <div key={notification.id} className="group relative pr-10">
            <NotificationItem notification={notification} onMarkAsRead={handleMarkAsRead} />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => handleDeleteNotification(notification.id)}
              aria-label="Delete notification"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    );

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
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              <BellRing className="h-8 w-8 text-primary" />
              All Notifications
            </CardTitle>
            <CardDescription>View and manage all your notifications.</CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark All Read
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteAllNotifications} disabled={notifications.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6 pb-4 border-b">
            You have {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}.
          </p>

          <Tabs defaultValue="Transaction" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              {TABS.map(({ value, label, icon: Icon }) => {
                const hasUnread = notifications.some((n) => n.category === value && !n.read);
                return (
                  <TabsTrigger key={value} value={value} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" /> {label}
                    {hasUnread && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-label="Unread notifications" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {TABS.map(({ value }) => (
              <TabsContent key={value} value={value}>
                {renderList(notifications.filter((n) => n.category === value))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
