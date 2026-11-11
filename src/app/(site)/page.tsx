import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bike,
  CheckCircle2,
  Lock,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Wallet,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Reveal } from '@/components/site/Reveal';
import { SITE, SHOP_PATH } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Closebuy | Shop from trusted vendors close to you',
  description:
    'Closebuy connects you with verified vendors and markets near you in Nigeria. Order food, groceries, fashion and more, pay securely, and get it delivered by local riders or pick it up yourself.',
};

const shopSearch = (q: string) => `${SHOP_PATH}?q=${encodeURIComponent(q)}`;

const POPULAR = ['Jollof rice', 'Ankara', 'Yam', 'Phones'];

const STRIP = [
  { name: 'Jollof rice', img: '/products/jollof.jpg' },
  { name: 'Suya', img: '/products/suya.jpg' },
  { name: 'Ankara fabric', img: '/products/ankara.jpg' },
  { name: 'Yam', img: '/products/yam.jpg' },
  { name: 'Plantain chips', img: '/products/plantain.jpg' },
  { name: 'Palm oil', img: '/products/palmoil.jpg' },
  { name: 'Fresh bread', img: '/products/bread.jpg' },
  { name: 'Smartphones', img: '/products/phone.jpg' },
];

const FAQS = [
  {
    q: 'How does delivery work?',
    a: 'When you check out, choose delivery and a verified local delivery agent picks up your order from the shop and brings it to your door. You can follow its progress from your orders page.',
  },
  {
    q: 'Can I pick up my order myself?',
    a: 'Yes. Choose self-pickup at checkout and collect your order straight from the shop.',
  },
  {
    q: 'How do I pay?',
    a: 'Top up your Closebuy wallet by card or bank transfer through Paystack, then pay for orders and errands from your wallet in one tap. Closebuy never sees your card details.',
  },
  {
    q: 'What happens if my order is cancelled?',
    a: 'The full amount, including delivery, goes straight back to your Closebuy wallet, ready for your next order.',
  },
  {
    q: 'How are vendors and riders checked?',
    a: 'Before anyone can sell or deliver, our team reviews their ID and, for vendors, business documents. Delivery agents also complete a live selfie check.',
  },
  {
    q: 'What is an errand?',
    a: 'Need something from the market that isn’t listed? Write a shopping list, and delivery agents send you quotes for the items and delivery. Accept the one you like and they’ll shop for you.',
  },
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
      {/* ───────── Hero ───────── */}
      <section className="relative -mt-16 overflow-hidden pt-16 md:-mt-[72px] md:pt-[72px]">
        {/* Background: dotted texture fading out, plus warm glows */}
        <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-[hsl(var(--coral)/0.28)] blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute -right-24 top-20 h-[420px] w-[420px] rounded-full bg-[hsl(var(--sun)/0.35)] blur-[110px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--ink)/0.1)] bg-white/70 py-1.5 pl-2 pr-4 text-sm font-semibold shadow-sm backdrop-blur">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-soft-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              Now serving Lagos
            </span>

            <h1 className="font-display mt-6 text-[2.75rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.6rem]">
              Shop trusted vendors{' '}
              <span className="relative inline-block whitespace-nowrap">
                <span className="text-coral-gradient">close to you.</span>
                <svg aria-hidden viewBox="0 0 300 18" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[hsl(var(--sun))] md:-bottom-3 md:h-4">
                  <path d="M3 13 C 70 3, 150 3, 297 10" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[hsl(var(--ink)/0.7)] md:text-xl">
              Your neighbourhood shops and markets, online. Order food, groceries, fashion and everyday items, pay securely, and get them delivered by a local rider.
            </p>

            {/* Search goes straight into the marketplace */}
            <form action={SHOP_PATH} method="get" className="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-[hsl(var(--ink)/0.1)] bg-white p-1.5 pl-5 shadow-[0_20px_50px_-20px_hsl(var(--ink)/0.35)]">
              <Search className="h-5 w-5 shrink-0 text-[hsl(var(--ink)/0.45)]" aria-hidden />
              <label htmlFor="hero-search" className="sr-only">Search products</label>
              <input
                id="hero-search"
                name="q"
                type="search"
                placeholder="Search jollof, ankara, yam…"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-[hsl(var(--ink)/0.4)]"
              />
              <button type="submit" className="bg-coral-gradient inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-md shadow-[hsl(var(--coral)/0.4)] transition-transform hover:-translate-y-0.5 sm:px-6">
                <span className="hidden sm:inline">Search</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[hsl(var(--ink)/0.55)]">Popular:</span>
              {POPULAR.map((p) => (
                <Link key={p} href={shopSearch(p)} className="rounded-full border border-[hsl(var(--ink)/0.1)] bg-white/60 px-3 py-1 font-medium transition-colors hover:border-[hsl(var(--coral))] hover:text-[hsl(var(--coral-deep))]">
                  {p}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={SHOP_PATH} className="group inline-flex items-center gap-2 rounded-full bg-[hsl(var(--ink))] px-6 py-3.5 font-semibold text-white shadow-xl shadow-[hsl(var(--ink)/0.25)] transition-transform hover:-translate-y-0.5">
                Browse the marketplace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/auth/register/vendor" className="group inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline">
                <Store className="h-5 w-5 text-[hsl(var(--coral-deep))]" /> Sell on Closebuy
              </Link>
            </div>
          </div>

          {/* Collage of real products with floating status cards */}
          <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
            <div className="relative aspect-[1/1] w-full">
              <div className="absolute left-0 top-0 h-[68%] w-[66%] overflow-hidden rounded-[2rem] shadow-2xl shadow-[hsl(var(--ink)/0.25)] ring-1 ring-black/5">
                <Image src="/products/jollof.jpg" alt="A plate of jollof rice with chicken" fill priority sizes="(max-width: 1024px) 66vw, 360px" className="object-cover" />
              </div>
              <div className="absolute bottom-0 right-0 h-[56%] w-[58%] overflow-hidden rounded-[2rem] shadow-2xl shadow-[hsl(var(--ink)/0.25)] ring-4 ring-[hsl(var(--cream))]">
                <Image src="/products/suya.jpg" alt="Grilled suya with fresh vegetables" fill sizes="(max-width: 1024px) 58vw, 320px" className="object-cover" />
              </div>
              <div className="absolute right-[4%] top-[6%] h-[30%] w-[30%] overflow-hidden rounded-3xl bg-white shadow-xl ring-4 ring-[hsl(var(--cream))]">
                <Image src="/products/ankara.jpg" alt="Folded Ankara fabric" fill sizes="180px" className="object-cover" />
              </div>
              <div className="absolute bottom-[6%] left-[3%] h-[24%] w-[24%] overflow-hidden rounded-3xl bg-white shadow-xl ring-4 ring-[hsl(var(--cream))]">
                <Image src="/products/plantain.jpg" alt="A bowl of plantain chips" fill sizes="140px" className="object-cover" />
              </div>

              {/* Floating cards (an illustration of the app, not live data) */}
              <div className="animate-float absolute left-[34%] top-[54%] w-[56%] max-w-[260px] rounded-2xl border border-white/60 bg-white/90 p-3.5 shadow-2xl shadow-[hsl(var(--ink)/0.2)] backdrop-blur-md sm:p-4">
                <div className="flex items-center gap-3">
                  <span className="bg-coral-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                    <Bike className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">Rider on the way</p>
                    <p className="truncate text-xs text-[hsl(var(--ink)/0.55)]">From a shop near you</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--ink)/0.08)]">
                  <div className="bg-coral-gradient h-full w-[72%] rounded-full" />
                </div>
              </div>

              <div className="animate-float-slow absolute -left-2 top-[60%] hidden items-center gap-2 rounded-full bg-[hsl(var(--ink))] py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-xl sm:-left-6 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500"><BadgeCheck className="h-4 w-4" /></span>
                Verified vendor
              </div>

              <div className="animate-float-slow absolute -right-2 top-[40%] flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 text-sm font-semibold shadow-xl ring-1 ring-black/5 sm:-right-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--sun))]"><Wallet className="h-4 w-4" /></span>
                Paid with wallet
              </div>
            </div>
          </div>
        </div>

        {/* Trust row */}
        <div className="relative border-y border-[hsl(var(--ink)/0.08)] bg-white/50 backdrop-blur">
          <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-3 px-4 py-5 text-sm font-semibold sm:px-6 md:grid-cols-4">
            {[
              { icon: ShieldCheck, t: 'Verified vendors & riders' },
              { icon: Lock, t: 'Secure Paystack payments' },
              { icon: Wallet, t: 'Refunds to your wallet' },
              { icon: PackageCheck, t: 'Delivery or self-pickup' },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-2.5">
                <Icon className="h-5 w-5 shrink-0 text-[hsl(var(--coral-deep))]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────── Product strip ───────── */}
      <section aria-label="Things you can buy" className="marquee overflow-hidden bg-[hsl(var(--ink))] py-6">
        <div className="animate-marquee flex w-max gap-4">
          {[...STRIP, ...STRIP].map((item, i) => (
            <Link
              key={`${item.name}-${i}`}
              href={shopSearch(item.name)}
              aria-hidden={i >= STRIP.length}
              tabIndex={i >= STRIP.length ? -1 : undefined}
              className="flex shrink-0 items-center gap-3 rounded-full border border-white/10 bg-white/5 py-2 pl-2 pr-6 text-white transition-colors hover:bg-white/15"
            >
              <span className="relative h-11 w-11 overflow-hidden rounded-full bg-white">
                <Image src={item.img} alt="" fill sizes="44px" className="object-cover" />
              </span>
              <span className="font-display text-lg font-semibold">{item.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section id="how-it-works" className="scroll-mt-20 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[hsl(var(--coral-deep))]">How it works</p>
            <h2 className="font-display mt-3 text-4xl font-bold leading-tight md:text-5xl">From your phone to your door in three steps</h2>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Step 1 */}
            <Reveal delay={0} className="group flex flex-col rounded-[2rem] border border-[hsl(var(--ink)/0.08)] bg-white p-6 shadow-[0_20px_60px_-30px_hsl(var(--ink)/0.3)] transition-transform hover:-translate-y-1">
              <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-[hsl(var(--sun)/0.25)]">
                <div className="w-[82%] rounded-full bg-white px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-2 text-sm text-[hsl(var(--ink)/0.55)]">
                    <Search className="h-4 w-4" /> Fresh yam near me
                  </div>
                </div>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {['/products/yam.jpg', '/products/bread.jpg', '/products/palmoil.jpg'].map((src) => (
                    <span key={src} className="relative h-12 w-12 overflow-hidden rounded-xl bg-white shadow-md ring-2 ring-white">
                      <Image src={src} alt="" fill sizes="48px" className="object-cover" />
                    </span>
                  ))}
                </div>
              </div>
              <span className="font-display mt-6 text-5xl font-extrabold text-[hsl(var(--ink)/0.1)]">01</span>
              <h3 className="font-display mt-1 text-2xl font-bold">Find what you need</h3>
              <p className="mt-2 leading-relaxed text-[hsl(var(--ink)/0.65)]">Browse products from verified vendors and local markets near you, by area or by shop.</p>
            </Reveal>

            {/* Step 2 */}
            <Reveal delay={120} className="group flex flex-col rounded-[2rem] border border-[hsl(var(--ink)/0.08)] bg-white p-6 shadow-[0_20px_60px_-30px_hsl(var(--ink)/0.3)] transition-transform hover:-translate-y-1">
              <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-[hsl(var(--coral)/0.18)]">
                <div className="w-[78%] rounded-2xl bg-[hsl(var(--ink))] p-4 text-white shadow-xl">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Closebuy wallet</span>
                    <Wallet className="h-4 w-4" />
                  </div>
                  <p className="font-display mt-2 text-2xl font-bold">₦ ••••••</p>
                  <div className="mt-3 flex gap-2">
                    <span className="bg-coral-gradient rounded-full px-3 py-1 text-xs font-bold">Top up</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">Pay</span>
                  </div>
                </div>
              </div>
              <span className="font-display mt-6 text-5xl font-extrabold text-[hsl(var(--ink)/0.1)]">02</span>
              <h3 className="font-display mt-1 text-2xl font-bold">Pay securely</h3>
              <p className="mt-2 leading-relaxed text-[hsl(var(--ink)/0.65)]">Top up your wallet by card or bank transfer through Paystack, then check out in one tap.</p>
            </Reveal>

            {/* Step 3 */}
            <Reveal delay={240} className="group flex flex-col rounded-[2rem] border border-[hsl(var(--ink)/0.08)] bg-white p-6 shadow-[0_20px_60px_-30px_hsl(var(--ink)/0.3)] transition-transform hover:-translate-y-1">
              <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100">
                <div className="w-[84%] space-y-2.5">
                  {[
                    { t: 'Order confirmed', done: true },
                    { t: 'Picked up from shop', done: true },
                    { t: 'Arriving soon', done: false },
                  ].map((s) => (
                    <div key={s.t} className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm">
                      <CheckCircle2 className={s.done ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-[hsl(var(--ink)/0.25)]'} />
                      <span className={s.done ? '' : 'text-[hsl(var(--ink)/0.5)]'}>{s.t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <span className="font-display mt-6 text-5xl font-extrabold text-[hsl(var(--ink)/0.1)]">03</span>
              <h3 className="font-display mt-1 text-2xl font-bold">Delivered, or pick it up</h3>
              <p className="mt-2 leading-relaxed text-[hsl(var(--ink)/0.65)]">A local delivery agent brings it to your door, or you collect it from the shop yourself.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────── Why Closebuy (bento) ───────── */}
      <section id="why" className="scroll-mt-20 pb-20 md:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[hsl(var(--coral-deep))]">Why Closebuy</p>
              <h2 className="font-display mt-3 text-4xl font-bold leading-tight md:text-5xl">Built for shopping with confidence</h2>
            </div>
            <Link href={SHOP_PATH} className="group inline-flex items-center gap-1.5 font-semibold">
              Explore the marketplace <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>

          <div className="mt-12 grid auto-rows-[minmax(200px,auto)] gap-4 md:grid-cols-6">
            {/* Market photo */}
            <Reveal className="group relative overflow-hidden rounded-[2rem] md:col-span-4 md:row-span-2">
              <Image src="/markets/lagos.jpg" alt="Shoppers and stalls at Balogun Market, Lagos" fill sizes="(max-width: 768px) 100vw, 66vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--ink)/0.95)] via-[hsl(var(--ink)/0.6)] to-[hsl(var(--ink)/0.15)] md:via-[hsl(var(--ink)/0.4)] md:to-transparent" />
              <div className="relative flex h-full min-h-[360px] flex-col justify-end p-7 text-white md:p-10">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur"><MapPin className="h-3.5 w-3.5" /> Local markets</span>
                <h3 className="font-display mt-4 max-w-md text-3xl font-bold leading-tight md:text-4xl">Your neighbourhood shops and markets, in one place</h3>
                <p className="mt-3 max-w-md text-white/80">Shops and riders in your own area, so orders arrive faster and your money supports local businesses.</p>
                <p className="mt-6 text-[10px] text-white/50">
                  Photo: Balogun Market, Lagos Island, by Yellowcrunchy,{' '}
                  <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY-SA 4.0</a>
                </p>
              </div>
            </Reveal>

            <Reveal delay={80} className="relative overflow-hidden rounded-[2rem] bg-[hsl(var(--ink))] p-7 text-white md:col-span-2">
              <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(var(--coral)/0.35)] blur-3xl" />
              <ShieldCheck className="relative h-9 w-9 text-[hsl(var(--sun))]" />
              <h3 className="font-display relative mt-5 text-2xl font-bold">Verified vendors &amp; riders</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-white/70">Everyone is checked with ID and business documents before they can trade. Riders also pass a live selfie check.</p>
            </Reveal>

            <Reveal delay={160} className="bg-coral-gradient relative overflow-hidden rounded-[2rem] p-7 text-white md:col-span-2">
              <div aria-hidden className="bg-dots-light absolute inset-0 opacity-60" />
              <Wallet className="relative h-9 w-9" />
              <h3 className="font-display relative mt-5 text-2xl font-bold">Refunds straight to your wallet</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-white/85">If an order is cancelled, the full amount, delivery included, goes back to your wallet.</p>
            </Reveal>

            <Reveal className="rounded-[2rem] border border-[hsl(var(--ink)/0.08)] bg-white p-7 md:col-span-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--ink)/0.06)]"><Lock className="h-6 w-6" /></span>
              <h3 className="font-display mt-5 text-2xl font-bold">Secure payments</h3>
              <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ink)/0.65)]">Card and bank transfer payments are processed by Paystack. We never see your card details.</p>
            </Reveal>

            <Reveal delay={80} className="rounded-[2rem] bg-[hsl(var(--sun))] p-7 md:col-span-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60"><ShoppingBasket className="h-6 w-6" /></span>
              <h3 className="font-display mt-5 text-2xl font-bold">Send a rider on an errand</h3>
              <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ink)/0.75)]">Need something from the market? Write your list, get quotes from riders, and they’ll shop for you.</p>
            </Reveal>

            <Reveal delay={160} className="rounded-[2rem] border border-[hsl(var(--ink)/0.08)] bg-white p-7 md:col-span-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--ink)/0.06)]"><PackageCheck className="h-6 w-6" /></span>
              <h3 className="font-display mt-5 text-2xl font-bold">Delivery or pickup</h3>
              <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--ink)/0.65)]">Get it brought to your door, or collect it from the shop on your way home. Your choice, every order.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────── Earn with Closebuy ───────── */}
      <section id="earn" className="scroll-mt-20 bg-[hsl(var(--ink))] py-20 text-white md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[hsl(var(--sun))]">Earn with Closebuy</p>
            <h2 className="font-display mt-3 text-4xl font-bold leading-tight md:text-5xl">Grow your business, or earn on your own schedule</h2>
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <Reveal className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[hsl(var(--ink-soft))] p-8 md:p-10">
              <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[hsl(var(--coral)/0.3)] blur-3xl" />
              <span className="bg-coral-gradient relative flex h-14 w-14 items-center justify-center rounded-2xl"><Store className="h-7 w-7" /></span>
              <h3 className="font-display relative mt-6 text-3xl font-bold">Sell on Closebuy</h3>
              <p className="relative mt-3 max-w-md leading-relaxed text-white/70">Open your online shop in minutes. List products with photos, prices, colours and sizes, and receive orders from customers nearby.</p>
              <ul className="relative mt-6 space-y-3">
                {['Set up and run your shop from your phone', 'Your own shop link to share with customers', 'Manage branches, stock, orders and sales', 'Withdraw your earnings to your bank'].map((t) => (
                  <li key={t} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--coral))]" />{t}</li>
                ))}
              </ul>
              <Link href="/auth/register/vendor" className="bg-coral-gradient group relative mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-semibold transition-transform hover:-translate-y-0.5">
                Become a vendor <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>

            <Reveal delay={120} className="relative overflow-hidden rounded-[2rem] bg-[hsl(var(--sun))] p-8 text-[hsl(var(--ink))] md:p-10">
              <div aria-hidden className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-white/40 blur-3xl" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--ink))] text-white"><Bike className="h-7 w-7" /></span>
              <h3 className="font-display relative mt-6 text-3xl font-bold">Deliver with Closebuy</h3>
              <p className="relative mt-3 max-w-md leading-relaxed text-[hsl(var(--ink)/0.75)]">Have a bike, car or keke? Pick up orders from shops in your area and deliver them to customers when it suits you.</p>
              <ul className="relative mt-6 space-y-3">
                {['Choose the deliveries and errands you want', 'Work in your own neighbourhood', 'Accept and update jobs from your phone', 'Withdraw your earnings to your bank'].map((t) => (
                  <li key={t} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />{t}</li>
                ))}
              </ul>
              <Link href="/auth/register/delivery-agent" className="group relative mt-8 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--ink))] px-6 py-3.5 font-semibold text-white transition-transform hover:-translate-y-0.5">
                Become a delivery agent <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" className="scroll-mt-20 py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[hsl(var(--coral-deep))]">FAQ</p>
            <h2 className="font-display mt-3 text-4xl font-bold leading-tight md:text-5xl">Questions, answered</h2>
            <p className="mt-4 max-w-sm leading-relaxed text-[hsl(var(--ink)/0.65)]">Can’t find what you’re looking for? Our team is happy to help.</p>
            <div className="mt-8 grid max-w-sm gap-3">
              <a href={`mailto:${SITE.supportEmail}`} className="rounded-2xl border border-[hsl(var(--ink)/0.08)] bg-white px-5 py-4 transition-colors hover:border-[hsl(var(--coral))]">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ink)/0.5)]">Email</span>
                <span className="font-semibold">{SITE.supportEmail}</span>
              </a>
              <a href={SITE.whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-[hsl(var(--ink)/0.08)] bg-white px-5 py-4 transition-colors hover:border-[hsl(var(--coral))]">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ink)/0.5)]">WhatsApp</span>
                <span className="font-semibold">{SITE.phone}</span>
              </a>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <Accordion type="single" collapsible defaultValue="faq-0" className="space-y-3">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`} className="rounded-2xl border border-[hsl(var(--ink)/0.08)] bg-white px-6 data-[state=open]:shadow-[0_20px_50px_-30px_hsl(var(--ink)/0.35)]">
                  <AccordionTrigger className="font-display py-5 text-left text-lg font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="pb-5 text-base leading-relaxed text-[hsl(var(--ink)/0.68)]">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ───────── Final call to action ───────── */}
      <section className="px-4 pb-20 sm:px-6 md:pb-28">
        <Reveal className="bg-coral-gradient relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] px-6 py-16 text-center text-white md:px-16 md:py-24">
          <div aria-hidden className="bg-dots-light absolute inset-0" />
          <div aria-hidden className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[hsl(var(--sun)/0.5)] blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[hsl(var(--ink)/0.25)] blur-3xl" />
          <div className="relative">
            <h2 className="font-display mx-auto max-w-3xl text-4xl font-extrabold leading-[1.05] md:text-6xl">Ready to shop close to home?</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/90">Sign up in minutes and support the shops in your neighbourhood.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href={SHOP_PATH} className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 font-bold text-[hsl(var(--ink))] shadow-xl transition-transform hover:-translate-y-0.5">
                Start shopping <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/auth/register/customer" className="inline-flex items-center rounded-full border-2 border-white/70 px-7 py-4 font-bold transition-colors hover:bg-white/10">
                Create an account
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
