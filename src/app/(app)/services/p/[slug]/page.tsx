import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publicProvider } from '@/lib/services/providers';
import { ProviderProfile } from '@/components/services-ui/ProviderProfile';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = publicProvider((await params).slug);
  return { title: p ? `${p.businessName} · Book on Closebuy` : 'Closebuy' };
}

export default async function ProviderPage({ params }: Props) {
  const p = publicProvider((await params).slug);
  if (!p) notFound();
  return <ProviderProfile p={p} />;
}
