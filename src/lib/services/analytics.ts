import { db } from '@/db';
import {
  users, orders, products, vendors, markets, deliveryAgents, reviews,
  errandRequests, errandQuotes, paymentTransactions, analyticsEvents,
} from '@/db/schema';
import type { CartItem } from '@/lib/types';

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const inRange = (d: Date, from: number, to: number) => d.getTime() >= from && d.getTime() < to;
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);
const delta = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const top = <T,>(m: Map<string, T>, score: (v: T) => number, n: number) =>
  [...m.entries()].sort((a, b) => score(b[1]) - score(a[1])).slice(0, n);

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(days: number) {
  const now = Date.now();
  const end = now + 1;
  const from = now - days * DAY;
  const prevFrom = from - days * DAY;

  const allUsers = db.select().from(users).all();
  const allOrders = db.select().from(orders).all();
  const allProducts = db.select().from(products).all();
  const allVendors = db.select().from(vendors).all();
  const allMarkets = db.select().from(markets).all();
  const allAgents = db.select().from(deliveryAgents).all();
  const allReviews = db.select().from(reviews).all();
  const allErrands = db.select().from(errandRequests).all();
  const allQuotes = db.select().from(errandQuotes).all();
  const allPayments = db.select().from(paymentTransactions).all();
  const allEvents = db.select().from(analyticsEvents).all();

  const productById = new Map(allProducts.map((p) => [p.id, p]));
  const vendorById = new Map(allVendors.map((v) => [v.id, v]));
  const marketById = new Map(allMarkets.map((m) => [m.id, m]));
  const agentById = new Map(allAgents.map((a) => [a.id, a]));

  const ordersCur = allOrders.filter((o) => inRange(o.createdAt, from, end) && o.status !== 'Cancelled');
  const ordersPrev = allOrders.filter((o) => inRange(o.createdAt, prevFrom, from) && o.status !== 'Cancelled');
  const usersCur = allUsers.filter((u) => u.role !== 'admin' && inRange(u.createdAt, from, end));
  const usersPrev = allUsers.filter((u) => u.role !== 'admin' && inRange(u.createdAt, prevFrom, from));
  const evCur = allEvents.filter((e) => inRange(e.createdAt, from, end));
  const evPrev = allEvents.filter((e) => inRange(e.createdAt, prevFrom, from));

  const sum = (rows: { totalAmount: number }[]) => rows.reduce((s, o) => s + o.totalAmount, 0);
  const gmv = sum(ordersCur), gmvPrev = sum(ordersPrev);
  const sessions = new Set(evCur.map((e) => e.sessionId)).size;
  const sessionsPrev = new Set(evPrev.map((e) => e.sessionId)).size;
  const funded = allPayments.filter((p) => p.status === 'success' && p.completedAt && inRange(p.completedAt, from, end));
  const fundedPrev = allPayments.filter((p) => p.status === 'success' && p.completedAt && inRange(p.completedAt, prevFrom, from));
  const fundedSum = funded.reduce((s, p) => s + p.amount, 0);
  const fundedPrevSum = fundedPrev.reduce((s, p) => s + p.amount, 0);
  const buyersCur = new Set(ordersCur.map((o) => o.customerId)).size;

  const kpis = {
    gmv: { value: gmv, change: delta(gmv, gmvPrev) },
    orders: { value: ordersCur.length, change: delta(ordersCur.length, ordersPrev.length) },
    aov: { value: ordersCur.length ? gmv / ordersCur.length : 0, change: delta(ordersCur.length ? gmv / ordersCur.length : 0, ordersPrev.length ? gmvPrev / ordersPrev.length : 0) },
    signups: { value: usersCur.length, change: delta(usersCur.length, usersPrev.length) },
    sessions: { value: sessions, change: delta(sessions, sessionsPrev) },
    walletFunded: { value: fundedSum, change: delta(fundedSum, fundedPrevSum) },
    buyers: { value: buyersCur, change: null as number | null },
  };

  // ---- daily trend ----
  const daily = new Map<string, { date: string; orders: number; revenue: number; signups: number; sessions: Set<string>; pageViews: number }>();
  for (let t = from; t <= now; t += DAY) {
    const k = dayKey(new Date(t));
    daily.set(k, { date: k, orders: 0, revenue: 0, signups: 0, sessions: new Set(), pageViews: 0 });
  }
  for (const o of ordersCur) { const d = daily.get(dayKey(o.createdAt)); if (d) { d.orders++; d.revenue += o.totalAmount; } }
  for (const u of usersCur) { const d = daily.get(dayKey(u.createdAt)); if (d) d.signups++; }
  for (const e of evCur) { const d = daily.get(dayKey(e.createdAt)); if (d) { d.sessions.add(e.sessionId); if (e.type === 'page_view') d.pageViews++; } }
  const trend = [...daily.values()].map((d) => ({ date: d.date, orders: d.orders, revenue: d.revenue, signups: d.signups, sessions: d.sessions.size, pageViews: d.pageViews }));

  // ---- order mix ----
  const statusMap = new Map<string, number>();
  for (const o of allOrders.filter((o) => inRange(o.createdAt, from, end))) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
  const orderStatus = [...statusMap.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
  const deliveryCount = ordersCur.filter((o) => o.deliveryPreference === 'delivery').length;
  const fulfilment = [
    { name: 'Delivery', value: deliveryCount },
    { name: 'Pickup', value: ordersCur.length - deliveryCount },
  ];

  // ---- line items: products, categories, vendors, markets ----
  const prodStats = new Map<string, { name: string; units: number; revenue: number }>();
  const catStats = new Map<string, { units: number; revenue: number }>();
  const vendorStats = new Map<string, { name: string; orders: number; revenue: number }>();
  const marketStats = new Map<string, { name: string; orders: number; revenue: number }>();
  let awoofUnits = 0, totalUnits = 0;
  for (const o of ordersCur) {
    let items: CartItem[] = [];
    try { items = JSON.parse(o.itemsJson); } catch { /* skip malformed */ }
    for (const it of items) {
      const p = productById.get(it.productId);
      const rev = it.price * it.quantity;
      const ps = prodStats.get(it.productId) ?? { name: p?.name ?? it.name, units: 0, revenue: 0 };
      ps.units += it.quantity; ps.revenue += rev; prodStats.set(it.productId, ps);
      const cat = p?.category ?? 'Other';
      const cs = catStats.get(cat) ?? { units: 0, revenue: 0 };
      cs.units += it.quantity; cs.revenue += rev; catStats.set(cat, cs);
      totalUnits += it.quantity;
      if (p?.isAwoof) awoofUnits += it.quantity;
    }
    const v = vendorById.get(o.vendorId);
    const vs = vendorStats.get(o.vendorId) ?? { name: v?.businessName ?? 'Unknown vendor', orders: 0, revenue: 0 };
    vs.orders++; vs.revenue += o.totalAmount; vendorStats.set(o.vendorId, vs);
    const mk = v?.marketId ? marketById.get(v.marketId) : undefined;
    const mkey = mk?.id ?? 'none';
    const ms = marketStats.get(mkey) ?? { name: mk?.name ?? 'Independent stalls', orders: 0, revenue: 0 };
    ms.orders++; ms.revenue += o.totalAmount; marketStats.set(mkey, ms);
  }

  // ---- events ----
  const count = (type: string) => evCur.filter((e) => e.type === type);
  const viewByProduct = new Map<string, number>();
  const cartByProduct = new Map<string, number>();
  for (const e of count('product_view')) if (e.productId) viewByProduct.set(e.productId, (viewByProduct.get(e.productId) ?? 0) + 1);
  for (const e of count('add_to_cart')) if (e.productId) cartByProduct.set(e.productId, (cartByProduct.get(e.productId) ?? 0) + 1);
  const productInterest = top(viewByProduct, (v) => v, 8).map(([id, views]) => ({
    name: productById.get(id)?.name ?? id, views, carts: cartByProduct.get(id) ?? 0,
  }));
  const searchMap = new Map<string, { n: number; sessions: Set<string> }>();
  for (const e of count('search')) if (e.term) {
    const s = searchMap.get(e.term) ?? { n: 0, sessions: new Set() };
    s.n++; s.sessions.add(e.sessionId); searchMap.set(e.term, s);
  }
  const topSearches = top(searchMap, (v) => v.n, 10).map(([term, v]) => ({ term, searches: v.n, people: v.sessions.size }));
  const pageMap = new Map<string, number>();
  for (const e of count('page_view')) if (e.path) {
    const p = e.path.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id');
    pageMap.set(p, (pageMap.get(p) ?? 0) + 1);
  }
  const topPages = top(pageMap, (v) => v, 8).map(([path, views]) => ({ path, views }));
  const sessionsWith = (type: string) => new Set(count(type).map((e) => e.sessionId)).size;
  const funnel = [
    { step: 'Visited', value: sessions },
    { step: 'Viewed a product', value: sessionsWith('product_view') },
    { step: 'Added to cart', value: sessionsWith('add_to_cart') },
    { step: 'Started checkout', value: sessionsWith('checkout_start') },
    { step: 'Placed order', value: sessionsWith('order_placed') },
  ];
  const eventTotals = ['page_view', 'product_view', 'search', 'add_to_cart', 'checkout_start', 'order_placed']
    .map((type) => ({ type, count: count(type).length }));
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, events: 0 }));
  for (const e of evCur) hourly[e.createdAt.getHours()].events++;
  const trackedSince = allEvents.length ? new Date(Math.min(...allEvents.map((e) => e.createdAt.getTime()))).toISOString() : null;

  // ---- users & verification ----
  const roles = ['customer', 'vendor', 'delivery_agent'] as const;
  const signupsByRole = roles.map((r) => ({ role: r, count: usersCur.filter((u) => u.role === r).length, total: allUsers.filter((u) => u.role === r).length }));
  const nonAdmin = allUsers.filter((u) => u.role !== 'admin');
  const needsApproval = nonAdmin.filter((u) => u.role === 'vendor' || u.role === 'delivery_agent');
  const verification = [
    { step: 'Registered', value: nonAdmin.length },
    { step: 'Email verified', value: nonAdmin.filter((u) => u.emailVerifiedAt).length },
    { step: 'Phone verified', value: nonAdmin.filter((u) => u.phoneVerifiedAt).length },
  ];
  const approval = [
    { name: 'Approved', value: needsApproval.filter((u) => u.approvalStatus === 'approved').length },
    { name: 'Pending', value: needsApproval.filter((u) => u.approvalStatus === 'pending').length },
    { name: 'Rejected', value: needsApproval.filter((u) => u.approvalStatus === 'rejected').length },
  ];

  // ---- delivery & errands ----
  const delivered = allOrders.filter((o) => o.status === 'Delivered');
  const agentStats = new Map<string, { name: string; deliveries: number; pos: number; neg: number }>();
  for (const o of delivered) if (o.deliveryAgentId) {
    const a = agentStats.get(o.deliveryAgentId) ?? { name: agentById.get(o.deliveryAgentId)?.name ?? 'Unknown agent', deliveries: 0, pos: 0, neg: 0 };
    a.deliveries++; agentStats.set(o.deliveryAgentId, a);
  }
  for (const r of allReviews) if (r.revieweeType === 'delivery_agent') {
    const a = agentStats.get(r.revieweeId) ?? { name: agentById.get(r.revieweeId)?.name ?? 'Unknown agent', deliveries: 0, pos: 0, neg: 0 };
    if (r.rating === 'positive') a.pos++; else a.neg++; agentStats.set(r.revieweeId, a);
  }
  const agents = top(agentStats, (v) => v.deliveries, 8).map(([, a]) => ({ name: a.name, deliveries: a.deliveries, positive: pct(a.pos, a.pos + a.neg) }));
  const rated = allReviews.filter((r) => inRange(r.createdAt, from, end));
  const errandsCur = allErrands.filter((e) => inRange(e.createdAt, from, end));
  const errandStatus = [...errandsCur.reduce((m, e) => m.set(e.status, (m.get(e.status) ?? 0) + 1), new Map<string, number>()).entries()].map(([status, count]) => ({ status, count }));
  const errandIds = new Set(errandsCur.map((e) => e.id));
  const quotesCur = allQuotes.filter((q) => errandIds.has(q.errandRequestId));
  const completed = allOrders.filter((o) => inRange(o.createdAt, from, end) && o.status === 'Delivered').length;
  const delivery = {
    activeDeliveries: allOrders.filter((o) => ['AcceptedByAgent', 'PickedUpByAgent', 'Out for Delivery'].includes(o.status)).length,
    awaitingAgent: allOrders.filter((o) => o.status === 'ReadyForPickup' && !o.deliveryAgentId).length,
    deliveredRate: pct(completed, ordersCur.length),
    satisfaction: pct(rated.filter((r) => r.rating === 'positive').length, rated.length),
    errands: errandsCur.length,
    quotesPerErrand: errandsCur.length ? quotesCur.length / errandsCur.length : 0,
    errandAcceptRate: pct(errandsCur.filter((e) => e.acceptedQuoteId).length, errandsCur.length),
    avgErrandValue: (() => { const v = errandsCur.filter((e) => e.finalTotalCost); return v.length ? v.reduce((s, e) => s + (e.finalTotalCost ?? 0), 0) / v.length : 0; })(),
  };

  // ---- recent activity ----
  const feed: { at: number; kind: string; text: string }[] = [];
  for (const o of allOrders.slice(-40)) feed.push({ at: o.createdAt.getTime(), kind: 'order', text: `Order of ₦${o.totalAmount.toLocaleString()} at ${vendorById.get(o.vendorId)?.businessName ?? 'a vendor'} (${o.status})` });
  for (const u of allUsers.filter((u) => u.role !== 'admin').slice(-40)) feed.push({ at: u.createdAt.getTime(), kind: 'signup', text: `New ${u.role.replace('_', ' ')} signed up: ${u.displayName ?? u.email.replace(/(.{2}).*(@.*)/, '$1***$2')}` });
  for (const e of allErrands.slice(-20)) feed.push({ at: e.createdAt.getTime(), kind: 'errand', text: `Errand requested (${e.status})` });
  for (const p of allPayments.filter((p) => p.status === 'success').slice(-20)) feed.push({ at: (p.completedAt ?? p.createdAt).getTime(), kind: 'payment', text: `Wallet funded ₦${p.amount.toLocaleString()}` });
  const activity = feed.sort((a, b) => b.at - a.at).slice(0, 12);

  return {
    days,
    generatedAt: new Date().toISOString(),
    kpis,
    totals: { markets: allMarkets.length, vendors: allVendors.length, products: allProducts.length, agents: allAgents.length, users: nonAdmin.length, pendingApprovals: approval[1].value },
    trend, orderStatus, fulfilment,
    topProducts: top(prodStats, (v) => v.revenue, 8).map(([, v]) => v),
    categories: top(catStats, (v) => v.revenue, 8).map(([name, v]) => ({ name, ...v })),
    topVendors: top(vendorStats, (v) => v.revenue, 8).map(([, v]) => v),
    topMarkets: top(marketStats, (v) => v.revenue, 8).map(([, v]) => v),
    awoofShare: pct(awoofUnits, totalUnits),
    events: { funnel, totals: eventTotals, productInterest, topSearches, topPages, hourly, trackedSince, conversion: pct(funnel[4].value, funnel[0].value) },
    users: { signupsByRole, verification, approval },
    delivery, agents, errandStatus,
    activity,
  };
}
