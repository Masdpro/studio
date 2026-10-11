import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { getDashboardData } from '@/lib/services/analytics';

export async function GET(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const raw = Number(new URL(request.url).searchParams.get('days'));
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  return NextResponse.json(await getDashboardData(days));
}
