
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
              className="absolute right-0 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground transition-opacity hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
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
    <div className="container mx-auto py-2 md:py-8">
      <div className="mb-6 hidden md:block">
        <Button variant="outline" asChild>
          <Link href="/shop">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
      {/* On phones the page itself is the card: no box around the list. */}
      <Card className="mx-auto w-full max-w-2xl max-md:border-0 max-md:bg-transparent max-md:shadow-none md:shadow-xl">
        <CardHeader className="flex flex-col gap-3 max-md:px-0 max-md:pt-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
              <BellRing className="h-6 w-6 text-primary md:h-8 md:w-8" />
              Notifications
            </CardTitle>
            <CardDescription>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</CardDescription>
          </div>
          <div className="flex shrink-0 gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDeleteAllNotifications} disabled={notifications.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-md:px-0">

          <Tabs defaultValue="Transaction" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              {TABS.map(({ value, label, icon: Icon }) => {
                const hasUnread = notifications.some((n) => n.category === value && !n.read);
                return (
                  <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 px-1 text-xs sm:gap-2 sm:text-sm">
                    <Icon className="hidden h-4 w-4 sm:block" /> {label}
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
