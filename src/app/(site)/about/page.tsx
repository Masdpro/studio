import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/site/LegalPage';
import { SITE, SHOP_PATH } from '@/lib/site';

export const metadata: Metadata = { title: 'About Closebuy', description: 'Closebuy is an online marketplace that connects shoppers with verified vendors, markets and delivery agents close to them.' };

export default function AboutPage() {
  return (
    <LegalPage title="About Closebuy" intro="Closebuy is an online marketplace that connects shoppers with trusted vendors, markets and delivery agents in their own neighbourhood.">
      <h2>Why we built Closebuy</h2>
      <p>
        Some of the best food, groceries, fashion and everyday goods in Nigeria are sold by small shops and market traders, but buying from them usually means going in person or
        sending messages back and forth. Closebuy puts these businesses online so you can browse, pay and arrange delivery in one place, while the money you spend stays in your community.
      </p>
      <h2>How it works</h2>
      <ul>
        <li><strong>Shoppers</strong> browse products by area, shop or market, pay from a Closebuy wallet funded through Paystack, and choose delivery or pickup.</li>
        <li><strong>Vendors</strong> set up an online shop with photos, prices, options and stock, manage branches, and receive orders from nearby customers.</li>
        <li><strong>Delivery agents</strong> pick up orders from shops and deliver them to customers in their area, and can also take on errands.</li>
      </ul>
      <h2>Trust and safety</h2>
      <p>
        Vendors and delivery agents verify their email and phone number and submit identity and business documents, which our team reviews before they can trade. Payments are
        processed by Paystack, a licensed payment provider, and Closebuy never sees or stores your card details. If an order is cancelled, the full amount is refunded to your wallet.
      </p>
      <h2>Get in touch</h2>
      <p>
        We&apos;re based at {SITE.address.join(', ')}. Reach us at <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> or{' '}
        <a href={SITE.phoneHref}>{SITE.phone}</a>, or <Link href={SHOP_PATH}>start shopping</Link> now.
      </p>
    </LegalPage>
  );
}
