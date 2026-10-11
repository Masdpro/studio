import Link from 'next/link';
import { ChevronRight, MapPin, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SafeImage } from '@/components/ui/safe-image';
import type { Vendor, VendorBranch } from '@/lib/types';

/** A store shown in search results: links to its page, lists every branch. */
export function VendorResultCard({ vendor, branches, productCount, marketName }: { vendor: Vendor; branches: VendorBranch[]; productCount: number; marketName?: string }) {
  const places = [vendor.city, ...branches.map((b) => b.city)].filter(Boolean);
  const uniquePlaces = Array.from(new Set(places));
  return (
    <Link href={`/vendor/${vendor.id}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-lg group-hover:border-primary">
        <CardContent className="p-4 flex gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
            {vendor.imageUrl ? (
              <SafeImage src={vendor.imageUrl} alt={vendor.businessName} fill sizes="64px" className="object-cover" />
            ) : (
              <Store className="h-7 w-7 text-primary" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight break-words">{vendor.businessName}</h3>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0" />{vendor.streetAddress}, {vendor.city}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {vendor.status && <Badge variant={vendor.status === 'Open' ? 'default' : 'secondary'}>{vendor.status}</Badge>}
              {branches.length > 0 && (
                <Badge variant="outline">{branches.length + 1} branches · {uniquePlaces.slice(0, 3).join(', ')}{uniquePlaces.length > 3 ? ` +${uniquePlaces.length - 3}` : ''}</Badge>
              )}
              {marketName && <Badge variant="outline">{marketName}</Badge>}
              <span className="text-xs text-muted-foreground">{productCount} product{productCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
