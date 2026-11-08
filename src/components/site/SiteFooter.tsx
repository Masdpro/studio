import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, Phone } from 'lucide-react';
import { SITE, SHOP_PATH } from '@/lib/site';

const COLUMNS = [
  { title: 'Closebuy', links: [{ href: '/about', label: 'About us' }, { href: '/contact', label: 'Contact' }, { href: SHOP_PATH, label: 'Shop now' }] },
  { title: 'Earn with us', links: [{ href: '/auth/register/vendor', label: 'Become a vendor' }, { href: '/auth/register/delivery-agent', label: 'Become a delivery agent' }] },
  { title: 'Legal', links: [{ href: '/terms', label: 'Terms of Service' }, { href: '/privacy', label: 'Privacy Policy' }, { href: '/refunds', label: 'Refund & Cancellation Policy' }, { href: '/credits', label: 'Photo credits' }] },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3 text-sm">
          <Link href="/" className="flex items-center gap-1.5">
            <Image src="/logo-mark-orange.png" alt="" width={22} height={29} unoptimized className="block" />
            <span className="text-lg font-bold text-primary">Closebuy</span>
          </Link>
          <p className="text-muted-foreground">{SITE.tagline}</p>
          <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{SITE.address.join(', ')}</span></p>
          <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><a href={SITE.phoneHref} className="hover:text-primary">{SITE.phone}</a></p>
          <p className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><a href={`mailto:${SITE.supportEmail}`} className="hover:text-primary">{SITE.supportEmail}</a></p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title} className="text-sm">
            <h3 className="mb-3 font-semibold">{c.title}</h3>
            <ul className="space-y-2 text-muted-foreground">
              {c.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="hover:text-primary">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
          <span>Payments are processed securely by Paystack.</span>
        </div>
      </div>
    </footer>
  );
}
