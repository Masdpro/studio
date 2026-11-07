import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Contact Closebuy', description: `Contact Closebuy support by email, phone or WhatsApp. ${SITE.address.join(', ')}.` };

const CHANNELS = [
  { icon: Mail, label: 'Email', value: SITE.supportEmail, href: `mailto:${SITE.supportEmail}`, note: 'Best for order issues, refunds and account questions.' },
  { icon: Phone, label: 'Phone', value: SITE.phone, href: SITE.phoneHref, note: 'Call us for urgent help with an order in progress.' },
  { icon: MessageCircle, label: 'WhatsApp', value: SITE.phone, href: SITE.whatsappHref, note: 'Send us a message any time.' },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      <h1 className="text-3xl font-bold md:text-4xl">Contact us</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        We&apos;re here to help shoppers, vendors and delivery agents. If your message is about an order, please include the order number from <Link href="/orders" className="text-primary underline">My Orders</Link> so we can help faster.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {CHANNELS.map((c) => (
          <a key={c.label} href={c.href} className="rounded-2xl border bg-card p-6 transition-colors hover:border-primary" target={c.label === 'WhatsApp' ? '_blank' : undefined} rel={c.label === 'WhatsApp' ? 'noopener noreferrer' : undefined}>
            <c.icon className="h-6 w-6 text-primary" />
            <div className="mt-3 text-sm font-semibold">{c.label}</div>
            <div className="mt-1 break-all font-medium">{c.value}</div>
            <p className="mt-2 text-sm text-muted-foreground">{c.note}</p>
          </a>
        ))}
      </div>
      <div className="mt-6 flex gap-3 rounded-2xl border bg-card p-6">
        <MapPin className="h-6 w-6 shrink-0 text-primary" />
        <div>
          <div className="text-sm font-semibold">Office address</div>
          <address className="mt-1 not-italic">{SITE.address.map((l) => <div key={l}>{l}</div>)}</address>
        </div>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Questions about payments or refunds? See our <Link href="/refunds" className="text-primary underline">Refund &amp; Cancellation Policy</Link>.
      </p>
    </div>
  );
}
