import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Bike, CheckCircle2, MapPin, Search, ShieldCheck, ShoppingBag, Store, Truck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITE, SHOP_PATH } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Closebuy | Shop from trusted vendors close to you',
  description:
    'Closebuy connects you with verified vendors and markets near you in Nigeria. Order food, groceries, fashion and more, pay securely, and get it delivered by local riders or pick it up yourself.',
};

const STEPS = [
  { icon: Search, title: 'Find what you need', body: 'Browse products from verified vendors and local markets near you, by area or by shop.' },
  { icon: Wallet, title: 'Pay securely', body: 'Top up your Closebuy wallet by card or bank transfer through Paystack, then check out in one tap.' },
  { icon: Truck, title: 'Get it delivered or pick it up', body: `A local delivery agent brings it to your door (flat ₦${SITE.deliveryFee.toLocaleString()}), or collect it from the shop yourself.` },
];

const PROMISES = [
  { icon: ShieldCheck, title: 'Verified vendors', body: 'Every vendor and delivery agent is checked, with ID and business documents, before they can trade.' },
  { icon: Wallet, title: 'Refunds to your wallet', body: 'If an order is cancelled, the full amount, including delivery, goes straight back to your wallet.' },
  { icon: MapPin, title: 'Close to you', body: 'Shops, markets and riders in your own area, so orders arrive faster and support local businesses.' },
];

export default async function LandingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Links made before the marketplace moved to /shop (shared "?view=markets" links, payment returns) still land in the right place.
  const params = await searchParams;
  if (params.view || params.reference || params.trxref) {
    const qs = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])));
    redirect(`${SHOP_PATH}?${qs.toString()}`);
  }

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5" /> Now serving Lagos
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Shop from trusted vendors <span className="text-primary">close to you</span>.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Closebuy brings your neighbourhood shops and markets online. Order food, groceries, fashion and everyday items, pay securely, and get them delivered by a local rider.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild><Link href={SHOP_PATH}><ShoppingBag className="mr-2 h-5 w-5" />Start shopping</Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/auth/register/vendor"><Store className="mr-2 h-5 w-5" />Sell on Closebuy</Link></Button>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {['Verified vendors', 'Secure Paystack payments', 'Refunds to your wallet'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />{t}</li>
            ))}
          </ul>
        </div>
        <figure className="relative">
          <div className="overflow-hidden rounded-2xl border shadow-lg">
            <Image src="/markets/lagos.jpg" alt="Shoppers and traders at a busy Lagos market" width={800} height={500} priority className="h-auto w-full object-cover" />
          </div>
          <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-md">
            <Truck className="h-6 w-6 text-primary" />
            <div className="text-sm"><div className="font-semibold">Local delivery</div><div className="text-muted-foreground">by riders in your area</div></div>
          </div>
          <figcaption className="mt-12 text-right text-[11px] text-muted-foreground">
            Photo: Balogun Market, Lagos, by Yellowcrunchy,{' '}
            <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
          </figcaption>
        </figure>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">How Closebuy works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">Three simple steps from browsing to your doorstep.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border bg-background p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><s.icon className="h-5 w-5" /></span>
                  <span className="text-sm font-semibold text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Closebuy */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Shop with confidence</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {PROMISES.map((p) => (
            <div key={p.title} className="text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent"><p.icon className="h-6 w-6" /></span>
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sell / deliver */}
      <section id="sell" className="scroll-mt-20 border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2">
          <div className="rounded-2xl border bg-background p-8">
            <Store className="h-8 w-8 text-primary" />
            <h2 className="mt-4 text-2xl font-bold">Sell on Closebuy</h2>
            <p className="mt-2 text-muted-foreground">Open your online shop in minutes. List products with photos, prices, colours and sizes, manage branches and stock, and receive orders from customers nearby.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {['Set up and run your shop from your phone', 'Your own shop link to share with customers', 'Track orders and sales from your dashboard'].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />{t}</li>
              ))}
            </ul>
            <Button className="mt-6" asChild><Link href="/auth/register/vendor">Become a vendor</Link></Button>
          </div>
          <div className="rounded-2xl border bg-background p-8">
            <Bike className="h-8 w-8 text-primary" />
            <h2 className="mt-4 text-2xl font-bold">Deliver with Closebuy</h2>
            <p className="mt-2 text-muted-foreground">Have a bike, car or keke? Pick up orders from shops in your area and deliver them to customers on your own schedule.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {['Choose the deliveries and errands you want', 'Work in your own neighbourhood', 'Accept and update deliveries from your phone'].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />{t}</li>
              ))}
            </ul>
            <Button className="mt-6" variant="outline" asChild><Link href="/auth/register/delivery-agent">Become a delivery agent</Link></Button>
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-12">
          <h2 className="text-3xl font-bold">Ready to shop close to home?</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">Join Closebuy today. Sign up in minutes, and help is a message away at {SITE.supportEmail}.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" asChild><Link href={SHOP_PATH}>Start shopping</Link></Button>
            <Button size="lg" variant="outline" className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <Link href="/auth/register/customer">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
