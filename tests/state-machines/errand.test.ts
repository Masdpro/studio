/**
 * Errand request + quote lifecycle through the API routes, written against the behaviour
 * before the state machine refactor.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { errandQuotes, errandRequests } from '@/db/schema';
import { POST as createErrand } from '@/app/api/errands/route';
import { POST as submitQuote } from '@/app/api/errands/[errandId]/quotes/route';
import { PATCH as acceptQuote } from '@/app/api/errands/[errandId]/route';
import { jsonRequest, makeAgent, makeUser, params, signInAs } from '../helpers';

const errand = (id: string) => db.select().from(errandRequests).where(eq(errandRequests.id, id)).get()!;
const quote = (id: string) => db.select().from(errandQuotes).where(eq(errandQuotes.id, id)).get()!;

let customer: string;
beforeEach(() => {
  customer = makeUser();
});

async function newErrand() {
  signInAs(customer);
  const res = await createErrand(jsonRequest('POST', { itemsDescription: '2 loaves of bread', deliveryAddress: '3 Home St' }));
  expect(res.status).toBe(201);
  return (await res.json()).id as string;
}
async function quoteAs(agentId: string, errandId: string) {
  signInAs(agentId);
  return submitQuote(jsonRequest('POST', { estimatedItemCost: 2000, deliveryFee: 500 }), params({ errandId }));
}

describe('errand request', () => {
  it('(start) → PendingQuotes when a customer creates it', async () => {
    expect(errand(await newErrand()).status).toBe('PendingQuotes');
  });

  it('PendingQuotes → AwaitingAcceptance on the first quote; the quote starts Pending', async () => {
    const id = await newErrand();
    const res = await quoteAs(makeAgent(), id);
    expect(res.status).toBe(201);
    expect(errand(id).status).toBe('AwaitingAcceptance');
    expect(quote((await res.json()).id).status).toBe('Pending');
  });

  it('AwaitingAcceptance stays AwaitingAcceptance on further quotes', async () => {
    const id = await newErrand();
    await quoteAs(makeAgent(), id);
    await quoteAs(makeAgent(), id);
    expect(errand(id).status).toBe('AwaitingAcceptance');
  });

  it('AwaitingAcceptance → AgentAssigned when the customer accepts; that quote Accepted, others Rejected', async () => {
    const id = await newErrand();
    const a1 = makeAgent();
    const q1 = (await (await quoteAs(a1, id)).json()).id;
    const q2 = (await (await quoteAs(makeAgent(), id)).json()).id;
    signInAs(customer);
    const res = await acceptQuote(jsonRequest('PATCH', { acceptedQuoteId: q1 }), params({ errandId: id }));
    expect(res.status).toBe(200);
    const e = errand(id);
    expect(e.status).toBe('AgentAssigned');
    expect(e.assignedAgentId).toBe(a1);
    expect(quote(q1).status).toBe('Accepted');
    expect(quote(q2).status).toBe('Rejected');
  });

  it('no more quotes once an agent is assigned', async () => {
    const id = await newErrand();
    const q1 = (await (await quoteAs(makeAgent(), id)).json()).id;
    signInAs(customer);
    await acceptQuote(jsonRequest('PATCH', { acceptedQuoteId: q1 }), params({ errandId: id }));
    expect((await quoteAs(makeAgent(), id)).status).toBe(400);
  });

  it('only the customer who asked can accept a quote', async () => {
    const id = await newErrand();
    const q1 = (await (await quoteAs(makeAgent(), id)).json()).id;
    signInAs(makeUser());
    expect((await acceptQuote(jsonRequest('PATCH', { acceptedQuoteId: q1 }), params({ errandId: id }))).status).toBe(403);
    expect(errand(id).status).toBe('AwaitingAcceptance');
  });

  it('an agent waiting for approval cannot quote', async () => {
    const id = await newErrand();
    expect((await quoteAs(makeAgent('pending'), id)).status).toBe(403);
    expect(errand(id).status).toBe('PendingQuotes');
  });
});

describe('errand: rules added with the state machine', () => {
  it('a second accept (another tab, double tap) cannot swap the assigned agent', async () => {
    const id = await newErrand();
    const a1 = makeAgent();
    const q1 = (await (await quoteAs(a1, id)).json()).id;
    const q2 = (await (await quoteAs(makeAgent(), id)).json()).id;
    signInAs(customer);
    expect((await acceptQuote(jsonRequest('PATCH', { acceptedQuoteId: q1 }), params({ errandId: id }))).status).toBe(200);
    expect((await acceptQuote(jsonRequest('PATCH', { acceptedQuoteId: q2 }), params({ errandId: id }))).status).toBe(400);
    expect(errand(id).assignedAgentId).toBe(a1);
    expect(quote(q1).status).toBe('Accepted');
    expect(quote(q2).status).toBe('Rejected');
  });
});
