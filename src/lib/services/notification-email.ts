import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { renderEmail } from '@/lib/email-template';
import { sendEmail } from '@/lib/notify';

/**
 * Until the phone app's push notifications (and SMS) are live, every in-app notification is also
 * emailed, so customers, vendors, riders and pros hear about orders even with Closebuy closed.
 */

const appUrl = () => (process.env.NEXTAUTH_URL ?? 'https://cbuyapp.com').replace(/\/$/, '');

/** A short subject from the message: its first sentence, kept under ~80 characters. */
export function notificationSubject(message: string): string {
  const first = message.split(/(?<=[.!?])\s/)[0].replace(/[.!]$/, '').trim();
  return first.length > 80 ? `${first.slice(0, 77).trimEnd()}…` : first;
}

/** The button under the message, named after where the link goes. */
export function notificationButton(link: string | undefined): { label: string; url: string } {
  const path = link && link.startsWith('/') ? link : '/notifications';
  const label =
    /\/track(\b|$)/.test(path) ? 'Track your order'
    : /orders/.test(path) ? 'View the order'
    : /booking/.test(path) ? 'View the booking'
    : /errand/.test(path) ? 'View the errand'
    : /wallet|withdraw|payout/.test(path) ? 'Open your wallet'
    : /products|stock/.test(path) ? 'Open your products'
    : 'Open Closebuy';
  return { label, url: `${appUrl()}${path}` };
}

/**
 * Emails one notification. Never throws and never slows the request that raised it.
 * Skipped without an email service (local development and tests) and for accounts whose
 * email address hasn't been confirmed.
 */
export async function emailNotification(userId: string, message: string, link?: string): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || process.env.NOTIFICATION_EMAILS === 'off') return;
  try {
    const user = db.select({ email: users.email, verified: users.emailVerifiedAt, name: users.displayName }).from(users).where(eq(users.id, userId)).get();
    if (!user?.email || !user.verified) return;
    const name = user.name?.trim().split(/\s+/)[0] || null;
    await sendEmail(
      user.email,
      notificationSubject(message),
      renderEmail({
        greetingName: name,
        intro: [message],
        button: notificationButton(link),
        outro: ['You can see all your updates under Notifications in Closebuy.'],
      }),
    );
  } catch {
    // email is a courtesy copy: the in-app notification is already saved
  }
}
