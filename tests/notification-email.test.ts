import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

const notify = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/notify', async (orig) => ({ ...(await orig<typeof import('@/lib/notify')>()), sendEmail: notify.sendEmail }));

import { createNotification } from '@/lib/services/notifications';
import { notificationButton, notificationSubject } from '@/lib/services/notification-email';
import { makeUser } from './helpers';

const flush = () => new Promise((r) => setTimeout(r, 10));

describe('notifications are also emailed', () => {
  beforeEach(() => {
    notify.sendEmail.mockReset();
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'Closebuy <no-reply@test.local>';
  });
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it('emails the account holder with the message and a link back', async () => {
    const u = makeUser();
    db.update(users).set({ emailVerifiedAt: new Date(), displayName: 'Ada Obi' }).where(eq(users.id, u)).run();
    await createNotification({ userId: u, message: 'You have a new order for ₦5,000. Accept it soon.', category: 'Activity', link: '/vendor/orders' });
    await flush();
    expect(notify.sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, content] = notify.sendEmail.mock.calls[0];
    expect(to).toBe(`${u}@test.local`);
    expect(subject).toBe('You have a new order for ₦5,000');
    expect(content.text).toContain('Hi Ada,');
    expect(content.text).toContain('View the order: ');
    expect(content.html).toContain('/vendor/orders');
  });

  it('skips unconfirmed email addresses, missing accounts and no email service', async () => {
    const u = makeUser();
    db.update(users).set({ emailVerifiedAt: null }).where(eq(users.id, u)).run();
    await createNotification({ userId: u, message: 'Hello.', category: 'Activity' });
    await createNotification({ userId: 'no-such-user', message: 'Hello.', category: 'Activity' });
    delete process.env.RESEND_API_KEY;
    const v = makeUser();
    db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, v)).run();
    await createNotification({ userId: v, message: 'Hello.', category: 'Activity' });
    await flush();
    expect(notify.sendEmail).not.toHaveBeenCalled();
  });

  it('a failing email never breaks the notification', async () => {
    const u = makeUser();
    db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, u)).run();
    notify.sendEmail.mockRejectedValue(new Error('down'));
    await expect(createNotification({ userId: u, message: 'Hi.', category: 'Activity' })).resolves.toBeUndefined();
    await flush();
  });

  it('writes short subjects and sensible buttons', () => {
    expect(notificationSubject('Your order is on the way! Track it live.')).toBe('Your order is on the way');
    expect(notificationSubject('x'.repeat(120))).toHaveLength(78);
    expect(notificationButton('/orders/abc/track').label).toBe('Track your order');
    expect(notificationButton('/wallet').label).toBe('Open your wallet');
    expect(notificationButton(undefined).url).toMatch(/\/notifications$/);
    expect(notificationButton('https://evil.example').url).toMatch(/\/notifications$/);
  });
});
