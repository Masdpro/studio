import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Privacy Policy | Closebuy', description: 'How Closebuy collects, uses and protects your personal data.' };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={SITE.policiesUpdated}
      intro={`This policy explains what personal data ${SITE.name} collects, why we collect it, who we share it with and the choices you have. We process personal data in line with the Nigeria Data Protection Act 2023.`}
    >
      <h2>1. Who we are</h2>
      <p>{SITE.name} operates the marketplace at {SITE.url}. Contact us about privacy at <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> or {SITE.address.join(', ')}.</p>

      <h2>2. Data we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address, phone number, password (stored only in a securely hashed form) and the roles you use (shopper, vendor, delivery agent).</li>
        <li><strong>Order and delivery details:</strong> delivery addresses, items ordered, order status and messages related to your orders and errands.</li>
        <li><strong>Vendor and agent verification:</strong> identity documents, selfies, business documents and shop photos that you upload so we can verify you. These are stored privately and seen only by you and our review team.</li>
        <li><strong>Payments:</strong> wallet balance and transaction history. Card and bank details are entered directly with Paystack; we never see or store your full card details.</li>
        <li><strong>Usage data:</strong> pages viewed and basic device information, which help us understand how Closebuy is used and keep it secure.</li>
      </ul>

      <h2>3. How we use your data</h2>
      <ul>
        <li>To create and secure your account, including sign-in, email and phone verification and password resets.</li>
        <li>To process orders, payments, refunds and deliveries, and to connect shoppers, vendors and delivery agents for an order.</li>
        <li>To verify vendors and delivery agents and prevent fraud.</li>
        <li>To send you service messages by email, SMS and in-app notifications about your account and orders.</li>
        <li>To provide customer support, resolve disputes and meet our legal obligations.</li>
      </ul>
      <p>We do not sell your personal data. We will only send you marketing messages if you agree, and you can opt out at any time.</p>

      <h2>4. Who we share data with</h2>
      <ul>
        <li><strong>Other users, only as needed for an order:</strong> for example, a vendor and delivery agent see your name, phone number and delivery address for orders you place with them.</li>
        <li><strong>Service providers who run Closebuy for us:</strong> Paystack (payments), Fly.io (hosting), Cloudflare (file storage and backups), Resend (email), Termii (SMS) and Zoho (support email). They may process data outside Nigeria, under contracts that require them to protect it.</li>
        <li><strong>Authorities:</strong> where the law requires it, or to protect the safety of our users.</li>
      </ul>

      <h2>5. Cookies</h2>
      <p>We use essential cookies to keep you signed in and to keep your cart and preferences working. We do not use advertising cookies.</p>

      <h2>6. How long we keep data</h2>
      <p>We keep your data while your account is open and for as long as needed afterwards to complete transactions, resolve disputes and meet legal, tax and accounting requirements.</p>

      <h2>7. Security</h2>
      <p>Data is sent over encrypted connections, passwords are hashed, verification documents are stored privately, and our database is encrypted at rest and backed up. No system is perfectly secure, so please keep your password private and tell us straight away if you suspect misuse of your account.</p>

      <h2>8. Your rights</h2>
      <p>You can ask to access, correct or delete your personal data, object to or restrict certain processing, or receive a copy of your data. Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> and we will respond within the time required by law. You can also complain to the Nigeria Data Protection Commission.</p>

      <h2>9. Children</h2>
      <p>Closebuy is not intended for anyone under 18, and we do not knowingly collect data from children.</p>

      <h2>10. Changes to this policy</h2>
      <p>We may update this policy from time to time. We will post the new version here and, for significant changes, let you know by email or in the app.</p>
    </LegalPage>
  );
}
