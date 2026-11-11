import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { SITE, SHOP_PATH } from '@/lib/site';

const COLUMNS = [
  { title: 'Closebuy', links: [{ href: SHOP_PATH, label: 'Shop now' }, { href: '/about', label: 'About us' }, { href: '/contact', label: 'Contact' }, { href: '/#faq', label: 'FAQ' }] },
  { title: 'Earn with us', links: [{ href: '/auth/register/vendor', label: 'Become a vendor' }, { href: '/auth/register/delivery-agent', label: 'Become a delivery agent' }] },
  { title: 'Legal', links: [{ href: '/terms', label: 'Terms of Service' }, { href: '/privacy', label: 'Privacy Policy' }, { href: '/refunds', label: 'Refund & Cancellation Policy' }, { href: '/credits', label: 'Photo credits' }] },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[hsl(var(--ink))] text-white">
      <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[720px] -translate-x-1/2 rounded-full bg-[hsl(var(--coral)/0.18)] blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 pb-12 pt-16 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)] md:gap-12">
        <div className="col-span-2 space-y-4 text-sm md:col-span-1">
          <Link href="/" className="flex items-center gap-1.5">
            <Image src="/logo-mark-orange.png" alt="" width={24} height={31} unoptimized className="block" />
            <span className="font-display text-2xl font-bold text-[hsl(var(--coral))]">Closebuy</span>
          </Link>
          <p className="max-w-xs text-white/60">{SITE.tagline}</p>
          <ul className="space-y-2.5 text-white/80">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--coral))]" /><span>{SITE.address.join(', ')}</span></li>
            <li className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--coral))]" /><a href={SITE.phoneHref} className="hover:text-white">{SITE.phone}</a></li>
            <li className="flex gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--coral))]" /><a href={`mailto:${SITE.supportEmail}`} className="hover:text-white">{SITE.supportEmail}</a></li>
            <li className="flex gap-2.5"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--coral))]" /><a href={SITE.whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-white">Chat on WhatsApp</a></li>
          </ul>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title} className="text-sm">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-white/45">{c.title}</h3>
            <ul className="space-y-3 text-white/80">
              {c.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="transition-colors hover:text-[hsl(var(--coral))]">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <p aria-hidden className="font-display select-none text-[22vw] font-extrabold leading-[0.8] tracking-tighter text-white/[0.04] md:text-[15rem]">Closebuy</p>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-xs text-white/50 sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
          <span>Payments are processed securely by Paystack.</span>
        </div>
      </div>
    </footer>
  );
}
