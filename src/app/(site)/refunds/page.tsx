import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/site/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Refund & Cancellation Policy | Closebuy', description: 'How cancellations and refunds work on Closebuy.' };

export default function RefundsPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated={SITE.policiesUpdated} intro="We want every order to go smoothly. This policy explains when an order can be cancelled and how you get your money back.">
      <h2>1. Your Closebuy wallet</h2>
      <p>
        Orders on Closebuy are paid from your Closebuy wallet, which you top up by card or bank transfer through Paystack. Refunds for cancelled orders are returned to the same wallet
        so you can use them straight away on your next order.
      </p>

      <h2>2. Cancelling an order yourself</h2>
      <ul>
        <li>You can cancel an order from <Link href="/orders">My Orders</Link> while it is <strong>Pending</strong> (not yet accepted by the vendor) or <strong>Processing</strong> (being prepared).</li>
        <li>When you cancel, the <strong>full amount</strong>, including any delivery fee, is refunded to your wallet immediately.</li>
        <li>Once an order is ready for pickup or has been collected by a delivery agent, it can no longer be cancelled in the app. Contact us and we will do our best to help.</li>
      </ul>

      <h2>3. Orders cancelled by a vendor or by Closebuy</h2>
      <p>
        A vendor may cancel an order they cannot fulfil, for example if an item is out of stock, and Closebuy support may cancel an order where something has gone wrong. In both cases you
        receive a <strong>full refund to your wallet</strong>, and we notify you with the reason.
      </p>

      <h2>4. Problems with a delivered order</h2>
      <p>
        If an item is missing, damaged, not as described or not what you ordered, contact us at <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> within{' '}
        <strong>48 hours</strong> of delivery or pickup. Include your order number and photos where possible. We review each case with the vendor and, where the complaint is valid,
        arrange a replacement or a refund to your wallet for the affected items and, where appropriate, the delivery fee.
      </p>
      <p>For hygiene and safety reasons, perishable food items can only be refunded if the problem is reported promptly on delivery.</p>

      <h2>5. Wallet top-ups</h2>
      <ul>
        <li>If you were charged for a top-up but your wallet was not credited, email us with the Paystack reference from your receipt and we will credit it after checking with Paystack.</li>
        <li>If you need money returned to your bank account instead of your wallet, contact support. We review these requests individually; approved bank refunds are processed through Paystack and usually reach you within 5 to 10 working days, depending on your bank.</li>
      </ul>

      <h2>6. Errands</h2>
      <p>For errands, the price is agreed with the delivery agent before work starts. If an errand cannot be completed, contact us and we will review the case with the agent.</p>

      <h2>7. Contact</h2>
      <p>
        Refund questions: <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> · <a href={SITE.phoneHref}>{SITE.phone}</a> · {SITE.address.join(', ')}.
      </p>
    </LegalPage>
  );
}
