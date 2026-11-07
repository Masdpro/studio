import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/site/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Terms of Service | Closebuy', description: 'The terms that apply when you use Closebuy as a shopper, vendor or delivery agent.' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={SITE.policiesUpdated} intro={`These terms apply when you use ${SITE.name} (${SITE.url}) as a shopper, vendor or delivery agent. By creating an account or placing an order, you agree to them.`}>
      <h2>1. What Closebuy is</h2>
      <p>
        Closebuy is an online marketplace. We provide the platform that lets shoppers buy from independent vendors and arrange delivery through independent delivery agents. Unless we say
        otherwise, the vendor is the seller of the goods and is responsible for them, and the delivery agent is responsible for the delivery they accept.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be at least 18 years old and give accurate information, including a working email address and phone number.</li>
        <li>Keep your password private. You are responsible for activity on your account; tell us at once if you think someone else has used it.</li>
        <li>We may suspend or close accounts that break these terms, provide false information or put other users at risk.</li>
      </ul>

      <h2>3. Orders and prices</h2>
      <ul>
        <li>Prices are set by vendors and shown in Naira. Any delivery charge is shown at checkout before you pay.</li>
        <li>An order is placed when you check out and the total is taken from your wallet. The vendor then accepts and prepares it, or cancels it if they cannot fulfil it.</li>
        <li>Cancellations and refunds follow our <Link href="/refunds">Refund &amp; Cancellation Policy</Link>.</li>
      </ul>

      <h2>4. Wallet and payments</h2>
      <ul>
        <li>You fund your Closebuy wallet by card or bank transfer through Paystack. Paystack&apos;s own terms also apply to those payments.</li>
        <li>Wallet funds can be used to pay for orders and errands on Closebuy. The wallet is not a bank account and does not earn interest.</li>
        <li>We may hold or reverse a transaction we reasonably believe is fraudulent or made in error.</li>
      </ul>

      <h2>5. Vendors</h2>
      <ul>
        <li>Vendors must complete verification and be approved before trading, and must keep their business and contact details up to date.</li>
        <li>Vendors are responsible for the accuracy of their listings, prices and stock, for the quality and legality of what they sell, and for preparing orders promptly.</li>
        <li>Vendors must not list prohibited items, including illegal goods, weapons, drugs, counterfeit products, or anything that requires a licence they do not hold.</li>
      </ul>

      <h2>6. Delivery agents</h2>
      <ul>
        <li>Delivery agents must complete verification and be approved before accepting deliveries or errands.</li>
        <li>Agents must handle goods with care, deliver to the address given, follow traffic laws, and keep customers&apos; information private.</li>
        <li>Delivery agents are independent and are not employees of Closebuy.</li>
      </ul>

      <h2>7. Acceptable use</h2>
      <p>You must not use Closebuy to break the law, harass other users, post false reviews, interfere with the platform&apos;s security, or try to take transactions off the platform to avoid its protections.</p>

      <h2>8. Liability</h2>
      <p>
        We work hard to keep Closebuy available and secure, but we provide it &quot;as is&quot; and cannot guarantee it will always be free of errors or interruptions. To the extent the law
        allows, Closebuy is not liable for indirect losses, and our total liability for any claim relating to an order is limited to the amount you paid for that order. Nothing in these
        terms limits rights you have under Nigerian consumer protection law.
      </p>

      <h2>9. Changes</h2>
      <p>We may update these terms. We will post the new version here and, for significant changes, let you know by email or in the app. If you keep using Closebuy after a change, the new terms apply.</p>

      <h2>10. Governing law and contact</h2>
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria. If you have a complaint, please contact us first at <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>,{' '}
        <a href={SITE.phoneHref}>{SITE.phone}</a>, or {SITE.address.join(', ')}, and we will try to resolve it.
      </p>
    </LegalPage>
  );
}
