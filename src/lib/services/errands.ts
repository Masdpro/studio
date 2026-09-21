import { db } from '@/db';
import { errandRequests as errandRequestsTable, errandQuotes as errandQuotesTable } from '@/db/schema';
import { eq, and, desc, isNull, ne } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { ErrandRequest, ErrandQuote } from '@/lib/types';
import { createNotification } from '@/lib/services/notifications';

export async function getErrandRequestsForCustomer(customerId: string): Promise<ErrandRequest[]> {
  const rows = db
    .select()
    .from(errandRequestsTable)
    .where(eq(errandRequestsTable.customerId, customerId))
    .orderBy(desc(errandRequestsTable.createdAt))
    .all();
  return rows.map(rowToErrandRequest);
}

/** Errands an agent can still quote on: open for quotes, unassigned, and not already quoted by this agent. */
export async function getOpenErrandRequestsForAgent(agentId: string): Promise<ErrandRequest[]> {
  const rows = db
    .select()
    .from(errandRequestsTable)
    .where(and(isNull(errandRequestsTable.assignedAgentId), ne(errandRequestsTable.status, 'CancelledByCustomer')))
    .orderBy(desc(errandRequestsTable.createdAt))
    .all();

  const openStatuses = new Set(['PendingQuotes', 'AwaitingAcceptance']);
  const errands = rows.filter((r) => openStatuses.has(r.status)).map(rowToErrandRequest);

  const agentQuotes = db
    .select()
    .from(errandQuotesTable)
    .where(eq(errandQuotesTable.agentId, agentId))
    .all();
  const alreadyQuotedIds = new Set(agentQuotes.map((q) => q.errandRequestId));

  return errands.filter((e) => !alreadyQuotedIds.has(e.id));
}

export async function getErrandRequestById(errandId: string): Promise<ErrandRequest | undefined> {
  const row = db.select().from(errandRequestsTable).where(eq(errandRequestsTable.id, errandId)).get();
  return row ? rowToErrandRequest(row) : undefined;
}

export async function createErrandRequest(data: {
  customerId: string;
  itemsDescription: string;
  preferredStore?: string;
  deliveryAddress: string;
}): Promise<string> {
  const id = randomUUID();
  db.insert(errandRequestsTable)
    .values({
      id,
      customerId: data.customerId,
      itemsDescription: data.itemsDescription,
      preferredStore: data.preferredStore,
      deliveryAddress: data.deliveryAddress,
      status: 'PendingQuotes',
      createdAt: new Date(),
    })
    .run();
  return id;
}

export async function getQuotesForErrand(errandId: string): Promise<ErrandQuote[]> {
  const rows = db
    .select()
    .from(errandQuotesTable)
    .where(eq(errandQuotesTable.errandRequestId, errandId))
    .orderBy(desc(errandQuotesTable.createdAt))
    .all();
  return rows.map(rowToErrandQuote);
}

export async function createErrandQuote(data: {
  errandRequestId: string;
  agentId: string;
  estimatedItemCost: number;
  deliveryFee: number;
  agentNotes?: string;
}): Promise<string> {
  const id = randomUUID();
  db.insert(errandQuotesTable)
    .values({
      id,
      errandRequestId: data.errandRequestId,
      agentId: data.agentId,
      estimatedItemCost: data.estimatedItemCost,
      deliveryFee: data.deliveryFee,
      totalEstimatedCost: data.estimatedItemCost + data.deliveryFee,
      agentNotes: data.agentNotes,
      status: 'Pending',
      createdAt: new Date(),
    })
    .run();

  db.update(errandRequestsTable)
    .set({ status: 'AwaitingAcceptance' })
    .where(and(eq(errandRequestsTable.id, data.errandRequestId), eq(errandRequestsTable.status, 'PendingQuotes')))
    .run();

  const errand = db.select().from(errandRequestsTable).where(eq(errandRequestsTable.id, data.errandRequestId)).get();
  if (errand) {
    await createNotification({
      userId: errand.customerId,
      message: 'You received a new quote for your errand request.',
      category: 'Activity',
      link: '/errands',
      iconName: 'FileText',
    });
  }

  return id;
}

/** Customer accepts one quote: assigns the agent, rejects the other quotes, and locks in the estimated cost. */
export async function acceptErrandQuote(errandId: string, quoteId: string): Promise<void> {
  const quote = db.select().from(errandQuotesTable).where(eq(errandQuotesTable.id, quoteId)).get();
  if (!quote || quote.errandRequestId !== errandId) {
    throw new Error('Quote not found for this errand.');
  }

  db.update(errandRequestsTable)
    .set({
      status: 'AgentAssigned',
      assignedAgentId: quote.agentId,
      acceptedQuoteId: quote.id,
      estimatedTotalItemCost: quote.estimatedItemCost,
      deliveryFee: quote.deliveryFee,
    })
    .where(eq(errandRequestsTable.id, errandId))
    .run();

  db.update(errandQuotesTable).set({ status: 'Accepted' }).where(eq(errandQuotesTable.id, quoteId)).run();
  db.update(errandQuotesTable)
    .set({ status: 'Rejected' })
    .where(and(eq(errandQuotesTable.errandRequestId, errandId), ne(errandQuotesTable.id, quoteId)))
    .run();

  await createNotification({
    userId: quote.agentId,
    message: 'Your quote was accepted! You have been assigned to an errand.',
    category: 'Activity',
    link: '/delivery-agent/dashboard',
    iconName: 'CheckCircle',
  });
}

function rowToErrandRequest(row: typeof errandRequestsTable.$inferSelect): ErrandRequest {
  return {
    id: row.id,
    customerId: row.customerId,
    itemsDescription: row.itemsDescription,
    preferredStore: row.preferredStore ?? undefined,
    deliveryAddress: row.deliveryAddress,
    status: row.status as ErrandRequest['status'],
    createdAt: row.createdAt,
    assignedAgentId: row.assignedAgentId ?? undefined,
    acceptedQuoteId: row.acceptedQuoteId ?? undefined,
    estimatedTotalItemCost: row.estimatedTotalItemCost ?? undefined,
    finalTotalItemCost: row.finalTotalItemCost ?? undefined,
    deliveryFee: row.deliveryFee ?? undefined,
    finalTotalCost: row.finalTotalCost ?? undefined,
  };
}

function rowToErrandQuote(row: typeof errandQuotesTable.$inferSelect): ErrandQuote {
  return {
    id: row.id,
    errandRequestId: row.errandRequestId,
    agentId: row.agentId,
    estimatedItemCost: row.estimatedItemCost,
    deliveryFee: row.deliveryFee,
    totalEstimatedCost: row.totalEstimatedCost,
    agentNotes: row.agentNotes ?? undefined,
    status: row.status as ErrandQuote['status'],
    createdAt: row.createdAt,
  };
}
