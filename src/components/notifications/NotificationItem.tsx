
// src/components/notifications/NotificationItem.tsx
'use client';

import type { AppNotification } from '@/lib/types';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react'; // Import all icons
import { AlertCircle, CheckCircle, Info, ShoppingBag } from 'lucide-react'; // Default icons

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onNotificationClick }: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });

  let IconComponent: React.ElementType = ShoppingBag; // Default icon

  if (notification.iconName) {
    const SpecificIcon = LucideIcons[notification.iconName] as React.ElementType | undefined;
    if (SpecificIcon) {
      IconComponent = SpecificIcon;
    } else {
      console.warn(`Icon ${notification.iconName} not found in lucide-react. Falling back to default.`);
      // Fallback based on category or type if needed
      switch (notification.category) {
        case 'Order': IconComponent = ShoppingBag; break;
        case 'Account': IconComponent = CheckCircle; break;
        case 'Promotion': IconComponent = Info; break;
        case 'System': IconComponent = AlertCircle; break;
        default: IconComponent = Info;
      }
    }
  }


  const content = (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-muted/50 rounded-md cursor-pointer transition-colors",
        notification.read ? 'opacity-70' : 'font-semibold'
      )}
      onClick={() => {
        onMarkAsRead(notification.id);
        if (onNotificationClick) {
          onNotificationClick(notification);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onMarkAsRead(notification.id);
          if (onNotificationClick) {
            onNotificationClick(notification);
          }
        }
      }}
    >
      <IconComponent className={cn("h-5 w-5 mt-0.5 shrink-0", notification.read ? "text-muted-foreground" : "text-primary")} />
      <div className="flex-grow">
        <p className={cn("text-sm", notification.read ? 'font-normal' : 'font-medium')}>{notification.message}</p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
      {!notification.read && (
        <div className="h-2.5 w-2.5 rounded-full bg-primary self-center shrink-0" aria-label="Unread notification"></div>
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} passHref legacyBehavior>
        <a>{content}</a>
      </Link>
    );
  }

  return content;
}
