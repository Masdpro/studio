import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-guard';
import { getMarkets, createMarket } from '@/lib/services/markets';

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }
  const markets = await getMarkets();
  return NextResponse.json({ markets });
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 });
  }

  const data = await request.json();
  if (!data.name || !data.description || !data.locationTag) {
    return NextResponse.json({ error: 'Name, description and location are required.' }, { status: 400 });
  }

  const id = await createMarket({
    ...data,
    imageUrl: data.imageUrl || 'https://placehold.co/600x400.png',
    isTrending: data.isTrending ?? false,
  });
  return NextResponse.json({ id }, { status: 201 });
}
