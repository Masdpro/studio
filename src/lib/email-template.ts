/**
 * Builds Closebuy's transactional emails as both HTML and plain text.
 * HTML shows codes in large type and actions as a button rather than a bare URL;
 * the plain-text part is the fallback for mail apps that don't render HTML.
 */
export type EmailContent = { text: string; html: string };

type Options = {
  greetingName?: string | null;
  intro: string[];
  code?: string;
  codeNote?: string;
  button?: { label: string; url: string };
  outro?: string[];
};

const BRAND = '#E8603C';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderEmail({ greetingName, intro, code, codeNote, button, outro = [] }: Options): EmailContent {
  const greeting = greetingName?.trim() ? `Hi ${greetingName.trim()},` : 'Hi,';

  const text = [
    greeting,
    '',
    ...intro.flatMap((p) => [p, '']),
    ...(code ? [`Your code: ${code}`, ...(codeNote ? [codeNote] : []), ''] : []),
    ...(button ? [`${button.label}: ${button.url}`, ''] : []),
    ...outro.flatMap((p) => [p, '']),
    '— The Closebuy team',
  ].join('\n');

  const p = (s: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#333">${esc(s)}</p>`;

  const codeBlock = code
    ? `<div style="margin:8px 0 20px;text-align:center">
         <div style="display:inline-block;padding:14px 24px;border-radius:10px;background:#FFF3EE;border:1px solid #F6C8B8;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#222">${esc(code)}</div>
         ${codeNote ? `<p style="margin:10px 0 0;font-size:13px;color:#777">${esc(codeNote)}</p>` : ''}
       </div>`
    : '';

  const buttonBlock = button
    ? `<div style="margin:8px 0 24px;text-align:center">
         <a href="${esc(button.url)}" style="display:inline-block;padding:13px 28px;border-radius:8px;background:${BRAND};color:#fff;font-size:15px;font-weight:600;text-decoration:none">${esc(button.label)}</a>
       </div>`
    : '';

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#F4F4F5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">
        <tr><td style="background:${BRAND};padding:18px 28px;font-size:20px;font-weight:700;color:#fff">Closebuy</td></tr>
        <tr><td style="padding:28px">
          ${p(greeting)}
          ${intro.map(p).join('')}
          ${codeBlock}
          ${buttonBlock}
          ${outro.map(p).join('')}
          <p style="margin:24px 0 0;font-size:13px;color:#888">— The Closebuy team</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#999;font-family:Arial,Helvetica,sans-serif">Closebuy · Lagos, Nigeria · We will never ask for your password or card PIN.</p>
    </td></tr>
  </table>
</body></html>`;

  return { text, html };
}
