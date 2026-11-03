/**
 * Outgoing email and SMS.
 *
 * - Email goes through Resend when RESEND_API_KEY and EMAIL_FROM are set.
 * - SMS goes through Termii when TERMII_API_KEY and TERMII_SENDER_ID are set.
 * - Otherwise (development) the message is printed in the server terminal.
 *
 * A failed send is logged, never thrown, so a provider outage can't break
 * sign-up or checkout; the user can ask for a new link/code.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM; // e.g. "Closebuy <no-reply@closebuy.ng>" (domain verified in Resend)
  if (!key || !from) {
    console.log(`\n[email → ${to}] ${subject}\n${body}\n`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });
    if (!res.ok) console.error(`[email] Resend refused the message to ${to}: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error(`[email] Could not reach Resend for ${to}:`, err);
  }
}

export async function sendSms(to: string, body: string): Promise<void> {
  const key = process.env.TERMII_API_KEY;
  const sender = process.env.TERMII_SENDER_ID; // approved sender ID, 3–11 characters
  if (!key || !sender) {
    console.log(`\n[sms → ${to}] ${body}\n`);
    return;
  }
  // Termii shows each account its own API address on the dashboard; set TERMII_BASE_URL to it.
  const base = (process.env.TERMII_BASE_URL ?? 'https://api.ng.termii.com').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        to: to.replace(/^\+/, ''), // Termii wants 234XXXXXXXXXX, no plus sign
        from: sender,
        sms: body,
        type: 'plain',
        // "dnd" reaches numbers on Do-Not-Disturb and is the route Termii recommends for codes; it must be enabled on the account.
        channel: process.env.TERMII_CHANNEL ?? 'dnd',
      }),
    });
    if (!res.ok) console.error(`[sms] Termii refused the message to ${to}: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error(`[sms] Could not reach Termii for ${to}:`, err);
  }
}

export const isProduction = process.env.NODE_ENV === 'production';

// Dev links/codes are returned to the browser only when not in production AND EXPOSE_DEV_CODES=true.
export const exposeDevCodes = !isProduction && process.env.EXPOSE_DEV_CODES === 'true';
