/**
 * Outgoing email / SMS. While Closebuy is in development nothing is actually sent:
 * the message is printed in the server terminal instead. To go live, replace the
 * bodies of these two functions with a real provider (e.g. Resend / Termii) —
 * nothing else in the app needs to change.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  console.log(`\n[email → ${to}] ${subject}\n${body}\n`);
}

export async function sendSms(to: string, body: string): Promise<void> {
  console.log(`\n[sms → ${to}] ${body}\n`);
}

export const isProduction = process.env.NODE_ENV === 'production';

// Dev links/codes are returned to the browser only when not in production AND EXPOSE_DEV_CODES=true.
export const exposeDevCodes = !isProduction && process.env.EXPOSE_DEV_CODES === 'true';
