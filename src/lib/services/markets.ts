
import { db } from '@/db';
import { markets as marketsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Market } from '@/lib/types';
import { sampleMarkets } from '@/lib/mockData';

/** Reads all markets. Falls back to bundled sample data if the table is empty (e.g. before `npm run db:seed`). */
export async function getMarkets(): Promise<Market[]> {
  const rows = db.select().from(marketsTable).all();
  if (rows.length === 0) return sampleMarkets;
  return rows.map(rowToMarket);
}

export async function getMarketsByLocationTag(locationTag: string): Promise<Market[]> {
  const rows = db.select().from(marketsTable).where(eq(marketsTable.locationTag, locationTag)).all();
  if (rows.length === 0) return sampleMarkets.filter((m) => m.locationTag === locationTag);
  return rows.map(rowToMarket);
}

function rowToMarket(row: typeof marketsTable.$inferSelect): Market {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    locationTag: row.locationTag,
    imageUrl: row.imageUrl,
    aiHint: row.aiHint ?? undefined,
    isTrending: !!row.isTrending,
  };
}
