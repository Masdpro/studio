import { db } from '@/db';
import { deliveryAgents as agentsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { DeliveryAgent } from '@/lib/types';
import { sampleDeliveryAgents } from '@/lib/mockData';

export async function getDeliveryAgents(): Promise<DeliveryAgent[]> {
  const rows = db.select().from(agentsTable).all();
  if (rows.length === 0) return sampleDeliveryAgents;
  return rows.map(rowToAgent);
}

export async function getDeliveryAgentById(agentId: string): Promise<DeliveryAgent | undefined> {
  const row = db.select().from(agentsTable).where(eq(agentsTable.id, agentId)).get();
  if (row) return rowToAgent(row);
  return sampleDeliveryAgents.find((a) => a.id === agentId);
}

/** Creates/updates a delivery agent profile. `agentId` should match the signed-in user's id. */
export async function upsertDeliveryAgent(agentId: string, data: Partial<DeliveryAgent>): Promise<void> {
  const existing = db.select().from(agentsTable).where(eq(agentsTable.id, agentId)).get();
  if (existing) {
    db.update(agentsTable).set(data as any).where(eq(agentsTable.id, agentId)).run();
  } else {
    db.insert(agentsTable)
      .values({ id: agentId, profileManaged: true, ...(data as any) })
      .run();
  }
}

function rowToAgent(row: typeof agentsTable.$inferSelect): DeliveryAgent {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    streetAddress: row.streetAddress,
    city: row.city,
    country: row.country,
    vehicleDetails: row.vehicleDetails ?? undefined,
    profileManaged: !!row.profileManaged,
  };
}
