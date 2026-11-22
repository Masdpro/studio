'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, CalendarCog, ExternalLink, Images, Inbox, Loader2, Settings2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountVerification } from '@/components/account/AccountVerification';
import { BookingStatusBadge } from '@/components/services/BookingStatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useTradingStatus } from '@/hooks/use-trading-status';
import { naira, whenLabel } from '@/lib/booking-time';
import { categoryLabel } from '@/lib/service-categories';
import { InfoTip } from '@/components/ui/info-tip';

type Summary = {
  provider: { businessName: string; slug: string; category: string; area: string; city: string };
  services: number;
  pausedServices: number;
  servicesWithoutPhotos: number;
  requests: number;
  upcoming: { id: string; serviceName: string; startsAt: number; location: 'shop' | 'home'; status: string }[];
  completedThisMonth: number;
  earnedThisMonth: number;
};

/** The service business's home: what needs answering, what's coming up and how the month is going. */
export default function ProviderDashboardPage() {
  const { user, roles, loading } = useAuth();
  const { mayTrade, loaded } = useTradingStatus('provider');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !roles.includes('provider')) return;
    fetch('/api/provider/summary', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? 'Could not load your dashboard.');
        setSummary(d.summary);
      })
      .catch((e) => setError(e.message));
  }, [user, roles]);

  if (loading || (user && roles.includes('provider') && !loaded)) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user || !roles.includes('provider')) {
    return (
      <div className="container mx-auto max-w-lg space-y-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Offer your services on Closebuy</h1>
        <p className="text-muted-foreground">Register a service business to get booked by customers near you. It&apos;s separate from a product store, and you can use the same login for both.</p>
        <Button asChild><Link href="/auth/register/provider">Register your service business</Link></Button>
      </div>
    );
  }
  if (!mayTrade) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 py-4">
        <h1 className="text-2xl font-bold">{summary?.provider.businessName ?? 'Your service business'}</h1>
        <p className="text-sm text-muted-foreground">Finish verification so customers can find and book you. Once you are approved you can add your services, prices, hours and portfolio.</p>
        <AccountVerification focus="provider" />
      </div>
    );
  }
  if (error) return <p className="py-12 text-center text-muted-foreground">{error}</p>;
  if (!summary) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const p = summary.provider;
  const stat = (label: string, value: string | number, Icon: typeof Inbox, href?: string, note?: string) => {
    const inner = (
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
          </div>
          <Icon className="h-5 w-5 text-primary" />
        </CardContent>
      </Card>
    );
    return href ? <Link href={href} className="block">{inner}</Link> : inner;
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{p.businessName}</h1>
          <p className="text-sm text-muted-foreground">{categoryLabel(p.category)} · {p.area}, {p.city}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link href={`/services/p/${p.slug}`}><ExternalLink className="mr-1.5 h-4 w-4" />My page</Link></Button>
          <Button variant="outline" size="sm" asChild><Link href="/provider/profile"><Settings2 className="mr-1.5 h-4 w-4" />Profile</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat('To answer', summary.requests, Inbox, '/provider/bookings', summary.requests ? 'Answer within 4 hours' : 'All caught up')}
        {stat('Upcoming', summary.upcoming.length, CalendarCheck, '/provider/bookings')}
        {stat('Done this month', summary.completedThisMonth, CalendarCog)}
        {stat('Earned this month', naira(summary.earnedThisMonth), Wallet, '/wallet', 'After fees')}
      </div>

      {(summary.services === 0 || summary.servicesWithoutPhotos > 0) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <Images className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{summary.services === 0 ? 'Add your first service' : `${summary.servicesWithoutPhotos} ${summary.servicesWithoutPhotos === 1 ? 'service has' : 'services have'} no portfolio photos`}</p>
                <p className="text-sm text-muted-foreground">{summary.services === 0 ? 'Customers can only book you once you list a service with a price.' : 'Photos of past work help customers choose you.'}</p>
              </div>
            </div>
            <Button size="sm" asChild><Link href="/provider/services">{summary.services === 0 ? 'Add a service' : 'Add photos'}<ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Coming up<InfoTip>Your next bookings.</InfoTip></CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild><Link href="/provider/bookings">All bookings<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.upcoming.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing booked yet.</p>}
            {summary.upcoming.map((b) => (
              <Link key={b.id} href="/provider/bookings" className="flex items-center justify-between gap-3 rounded-md border p-3 hover:border-primary/40">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.serviceName}</p>
                  <p className="text-xs text-muted-foreground">{whenLabel(b.startsAt)} · {b.location === 'home' ? 'Home visit' : 'At your place of work'}</p>
                </div>
                <BookingStatusBadge status={b.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your services</CardTitle>
            <CardDescription>{summary.services} live{summary.pausedServices ? `, ${summary.pausedServices} paused` : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline" asChild><Link href="/provider/services">Services, portfolio &amp; hours</Link></Button>
            <p className="text-xs text-muted-foreground">Customers pay when they book. You&apos;re paid when they give you their 4-digit code at the end of the job.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
