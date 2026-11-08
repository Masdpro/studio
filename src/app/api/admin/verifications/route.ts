import { getUserRoles } from '@/lib/roles';
import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { requireAdminSession } from '@/lib/admin-guard';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getVerificationState } from '@/lib/verification';
import { latestPassedCheck } from '@/lib/services/liveness';

/** Every vendor and delivery agent with their verification progress (pending first). */
export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  const rows = db.select().from(users).all().filter((u) => { const r = getUserRoles(u.id); return r.includes('vendor') || r.includes('delivery_agent'); });
  const order = { pending: 0, rejected: 1, approved: 2 } as const;
  // One entry per role to review: a vendor who also became an agent shows up twice, each with its own status.
  const list = rows
    .flatMap((u) => {
      const state = getVerificationState(u.id)!;
      const liveCheck = latestPassedCheck(u.id);
      return state.tradingRoles.map((r) => ({
        ...state,
        id: u.id,
        name: u.displayName ?? u.email,
        createdAt: u.createdAt,
        reviewRole: r.role,
        role: r.role,
        approvalStatus: r.approvalStatus,
        approvalNote: r.approvalNote,
        requiredDocuments: r.requiredDocuments,
        documentsComplete: r.documentsComplete,
        readyForReview: r.readyForReview,
        otherRoles: state.tradingRoles.filter((o) => o.role !== r.role).map((o) => ({ role: o.role, label: o.label, approvalStatus: o.approvalStatus })),
        liveCheck: r.role === 'delivery_agent' ? liveCheck : null,
      }));
    })
    .sort((a, b) => order[a.approvalStatus] - order[b.approvalStatus] || b.createdAt.getTime() - a.createdAt.getTime());
  return NextResponse.json({ accounts: list });
}
