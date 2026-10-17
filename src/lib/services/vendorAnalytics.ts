import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { orders, vendorBranches } from '@/db/schema';

const DONE = new Set(['Delivered', 'PickedUpByCustomer']);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Orders and revenue for a vendor, split by branch ('main' = the main store). Pass a branch id to see only that branch. */
export function getVendorAnalytics(vendorId: string, onlyBranchId?: string) {
  const branches = db.select().from(vendorBranches).where(eq(vendorBranches.vendorId, vendorId)).all();
  const names: Record<string, string> = { main: 'Main store' };
  for (const b of branches) names[b.id] = b.name;
  const rows = db.select().from(orders).where(eq(orders.vendorId, vendorId)).all().filter((r) => !onlyBranchId || r.branchId === onlyBranchId);
  const keys = onlyBranchId ? [onlyBranchId] : ['main', ...branches.map((b) => b.id)];
  const stat = (id: string) => ({ id, name: names[id] ?? 'Removed branch', orders: 0, revenue: 0, completed: 0, cancelled: 0 });
  const byKey: Record<string, ReturnType<typeof stat>> = Object.fromEntries(keys.map((k) => [k, stat(k)]));

  const days = 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const trend: Record<string, number | string>[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: ymd(d) };
  });
  const index = new Map(trend.map((t, i) => [t.date as string, i]));

  for (const r of rows) {
    const key = r.branchId ?? 'main';
    if (!byKey[key]) { byKey[key] = stat(key); keys.push(key); }
    const s = byKey[key];
    s.orders += 1;
    if (r.status === 'Cancelled') { s.cancelled += 1; continue; }
    s.revenue += r.totalAmount;
    if (DONE.has(r.status)) s.completed += 1;
    const i = index.get(ymd(r.createdAt));
    if (i !== undefined) trend[i][key] = ((trend[i][key] as number) ?? 0) + r.totalAmount;
  }
  const list = Object.values(byKey);
  const total = list.reduce((a, s) => ({ orders: a.orders + s.orders, revenue: a.revenue + s.revenue, completed: a.completed + s.completed, cancelled: a.cancelled + s.cancelled }), { orders: 0, revenue: 0, completed: 0, cancelled: 0 });
  return { rows: list, total, trend, series: list.map((s) => ({ id: s.id, name: s.name })) };
}
