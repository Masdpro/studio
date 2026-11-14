import Link from 'next/link';
import { CalendarCheck, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "What does your business do?" A store sells products; a service business is booked. They are
 * registered separately: someone who does both registers each one (with the same login).
 */
export function BusinessKindPicker({ active }: { active: 'products' | 'services' }) {
  const option = (kind: 'products' | 'services', href: string, title: string, blurb: string, Icon: typeof ShoppingBag) => (
    <Link
      href={href}
      aria-current={active === kind ? 'page' : undefined}
      className={cn(
        'flex flex-1 items-start gap-3 rounded-xl border p-3 text-left transition-colors',
        active === kind ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', active === kind ? 'text-primary' : 'text-muted-foreground')} />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{blurb}</span>
      </span>
    </Link>
  );
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">What does your business do?</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {option('products', '/auth/register/vendor', 'I sell products', 'Customers buy from your store', ShoppingBag)}
        {option('services', '/auth/register/provider', 'I offer services', 'Customers book your time', CalendarCheck)}
      </div>
      <p className="text-xs text-muted-foreground">Do both? Register each one separately. You can use the same login for both.</p>
    </div>
  );
}
