/** Builds docs/state-machines.md from the machine definitions (run `npm run machines:docs`). */
import { toMermaid, type Machine } from './machine';
import { ALL_MACHINES } from './index';

const list = <T>(v: T | readonly T[]) => (Array.isArray(v) ? (v as readonly T[]) : [v as T]);

function section(m: Machine<string, string, unknown>): string {
  const rows = m.stateNames.map((s) => {
    const i = m.states[s];
    const tags = [i.final && 'final', i.legacy && 'legacy', i.planned && 'planned'].filter(Boolean).join(', ');
    return `| \`${s}\` | ${i.meaning}${tags ? ` _(${tags})_` : ''} |`;
  });
  const moves = m.transitions.map((t) => {
    const rules = [...(t.guards ?? []).map((g) => g.name), ...(t.checkedElsewhere ?? [])];
    return `| ${list(t.from).map((f) => `\`${f}\``).join(', ')} | \`${t.to}\` | ${t.event} | ${t.by ? t.by.join(', ') : 'system'} | ${rules.join('; ') || '—'} |`;
  });
  return [
    `## ${m.name}`,
    '',
    m.description,
    '',
    `Stored in \`${m.storedIn}\`. Starts as ${list(m.initial).map((s) => `\`${s}\``).join(' or ')}.`,
    '',
    '```mermaid',
    toMermaid(m),
    '```',
    '',
    '| Status | Meaning |',
    '| --- | --- |',
    ...rows,
    '',
    '| From | To | When | Who | Rules |',
    '| --- | --- | --- | --- | --- |',
    ...moves,
  ].join('\n');
}

export function renderStateMachineDocs(): string {
  return [
    '# State machines',
    '',
    '<!-- Generated from src/lib/state-machines by `npm run machines:docs`. Do not edit by hand. -->',
    '',
    'Every status workflow in Closebuy is defined once in `src/lib/state-machines/`. The API refuses any move',
    'not listed here, the screens use the same definitions to decide which buttons to show, and',
    '`tests/state-machines/` has a test for every move. To change a workflow: edit the machine, run',
    '`npm test`, then `npm run machines:docs`.',
    '',
    ...ALL_MACHINES.map((m) => section(m as Machine<string, string, unknown>) + '\n'),
    '## Smaller rules that are not modelled as machines',
    '',
    'These have only two or three states and live next to the code that uses them:',
    '',
    '- **Vendor store status** (`vendors.status`: Open, Closed, Opening Soon, Temporarily Unavailable): the vendor picks any value at any time; it only affects what customers see.',
    '- **Delivery code** (`orders.delivery_code`, `delivery_code_attempts`): created when an agent collects the order, checked when it is delivered, locked after 5 wrong tries. See `src/lib/services/delivery-codes.ts`.',
    '- **Account suspension** (`users.suspended_at`): active ↔ suspended, set by an admin. Suspended accounts cannot sign in, trade or withdraw.',
    '- **Bank account change hold**: withdrawals pause for 24 hours after a payout bank account is changed. See `withdrawalBlockReason` in `src/lib/services/withdrawals.ts`.',
    '- **Sign-in throttle**: too many wrong passwords lock the email for a while. See `src/lib/login-throttle.ts`.',
    '- **Email and phone codes** (`verification_codes`): issued → used or expired. See `src/lib/verification.ts`.',
    '- **Screens with steps** (Quick add: business type → groups → products → prices; sign-up: form → email code): local UI state inside each component.',
    '',
  ].join('\n');
}
