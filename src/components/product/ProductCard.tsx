
'use client';

import { SafeImage } from '@/components/ui/safe-image';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShoppingCart, Store, MapPin, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import { track } from '@/lib/track';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { ProductOptionsPicker, hasOptions, selectionComplete, stockForSelection, type ProductSelection } from '@/components/product/ProductOptionsPicker';
import { setBranchChoice } from '@/lib/branch-choice';

interface ProductCardProps {
  product: Product;
  vendorName: string;
  vendorLocation?: string;
  vendorStreetAddress: string;
  vendorCity: string;
  vendorCountry: string;
  /** The local market the vendor's stall is in; "View store" opens their page under that market. */
  vendorMarketId?: string;
  onViewVendorProfile?: (vendorId: string) => void;
  /** Set on a vendor's store page when the customer has picked a branch to collect from. */
  orderBranch?: { branchId: string; name: string; unavailable?: boolean };
}

export function ProductCard({
  product,
  vendorName,
  vendorLocation,
  vendorStreetAddress,
  vendorCity,
  vendorCountry,
  vendorMarketId,
  onViewVendorProfile,
  orderBranch
}: ProductCardProps) {
  const { toast } = useToast();
  const { addItem, items } = useCart();
  
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [selection, setSelection] = useState<ProductSelection>({});
  const needsChoice = hasOptions(product);
  const choiceMissing = needsChoice && !selectionComplete(product, selection);
  const soldOut = product.stock === 0;
  const lowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;
  // The main photo is the homepage photo; the other photos and the video only show in the details.
  const media: { type: 'image' | 'video'; src: string }[] = [
    { type: 'image', src: product.imageUrl || 'https://placehold.co/300x200.png' },
    ...(product.galleryImages ?? []).map((src) => ({ type: 'image' as const, src })),
    ...(product.videoUrl ? [{ type: 'video' as const, src: product.videoUrl }] : []),
  ];
  const current = media[Math.min(mediaIdx, media.length - 1)];
  const step = (d: number) => setMediaIdx((i) => (i + d + media.length) % media.length);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        track('product_view', { productId: product.id, vendorId: product.vendorId });
        io.disconnect();
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [product.id, product.vendorId]);

  const handleAddToCart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Products with colours/sizes need a choice first, so open the details to pick one.
    if (soldOut) return;
    if (choiceMissing) { setDetailsOpen(true); return; }
    if (product.stock !== undefined && items.filter((i) => i.productId === product.id).reduce((n, i) => n + i.quantity, 0) >= product.stock) {
      toast({ title: 'No more available', description: `All ${product.stock} of ${product.name} are already in your cart.` });
      return;
    }
    // Stock counted per colour/size: check the chosen option too.
    const optionLeft = stockForSelection(product, selection);
    if (optionLeft !== undefined) {
      const inCart = items.filter((i) => i.productId === product.id && (i.color ?? '') === (selection.color ?? '') && (i.size ?? '') === (selection.size ?? '')).reduce((n, i) => n + i.quantity, 0);
      if (inCart >= optionLeft) {
        const label = [selection.color, selection.size].filter(Boolean).join(' / ');
        toast({ title: optionLeft === 0 ? 'Sold out' : 'No more available', description: optionLeft === 0 ? `${product.name} (${label}) is sold out.` : `All ${optionLeft} of ${product.name} (${label}) are already in your cart.` });
        return;
      }
    }
    track('add_to_cart', { productId: product.id, vendorId: product.vendorId });
    addItem(product, 1, selection);
    setSelection({});
    if (orderBranch) setBranchChoice(product.vendorId, orderBranch.branchId);
    toast({
      title: "Added to cart!",
      description: orderBranch
        ? `${product.name} added. You'll collect it from ${orderBranch.name}.`
        : `${product.name} has been added to your cart.`,
    });
  };

  const fullAddress = `${vendorStreetAddress}, ${vendorCity}, ${vendorCountry}`;

  const handleVendorNameClick = (e: React.MouseEvent) => {
    if (onViewVendorProfile) {
      e.preventDefault();
      e.stopPropagation();
      onViewVendorProfile(product.vendorId);
    }
  };

  return (
    <>
    <Card ref={cardRef} role="button" tabIndex={0} aria-label={`View details for ${product.name}`} onClick={() => setDetailsOpen(true)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setDetailsOpen(true); } }} className="cursor-pointer w-full max-w-sm rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <div className="relative w-full h-48 overflow-hidden bg-muted">
        <SafeImage
          src={product.imageUrl || "https://placehold.co/300x200.png"}
          alt={product.name}
          fill={true}
          style={{ objectFit: 'cover' }}
          data-ai-hint={product.aiHint || "product item"}
          className="w-full h-full object-cover"
          priority={true} 
        />
        {(soldOut || lowStock) && (
          <span className={`absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-semibold shadow ${soldOut ? 'bg-neutral-900/85 text-white' : 'bg-amber-500 text-white'}`}>
            {soldOut ? 'Sold out' : `Only ${product.stock} left`}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2.5 pt-10 text-white">
          {onViewVendorProfile ? (
            <button type="button" onClick={handleVendorNameClick} className="flex max-w-full items-center gap-1.5 text-left text-sm font-semibold drop-shadow hover:underline">
              <Store className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{vendorName}</span>
            </button>
          ) : (
            <Link href={`/vendor/${product.vendorId}/profile`} onClick={(e) => e.stopPropagation()} className="flex max-w-full items-center gap-1.5 text-sm font-semibold drop-shadow hover:underline">
              <Store className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{vendorName}</span>
            </Link>
          )}
          {vendorLocation && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/90 drop-shadow" title={fullAddress}>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{vendorLocation}</span>
            </p>
          )}
        </div>
      </div>
      <CardContent className="p-4 pb-2 flex-grow">
        <CardTitle title={product.name} className="text-xl font-semibold mb-2 truncate">{product.name}</CardTitle>
        <p className="text-lg font-bold text-primary mt-auto">₦{product.price.toLocaleString()}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleAddToCart} disabled={orderBranch?.unavailable || soldOut}>
          <ShoppingCart className="mr-2 h-4 w-4" /> {soldOut ? 'Sold out' : orderBranch?.unavailable ? 'Branch unavailable' : needsChoice ? 'Choose options' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
    <Dialog open={detailsOpen} onOpenChange={(o) => { setDetailsOpen(o); if (!o) { setMediaIdx(0); setSelection({}); } }}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="shrink-0">
          <div className="relative w-full h-56 bg-muted">
            {current.type === 'video' ? (
              <video key={current.src} src={current.src} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
            ) : (
              <SafeImage key={current.src} src={current.src} alt={product.name} fill={true} style={{ objectFit: 'cover' }} className="w-full h-full object-cover" />
            )}
            {media.length > 1 && (
              <>
                <button type="button" aria-label="Previous" onClick={() => step(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" aria-label="Next" onClick={() => step(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {media.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-5 pt-3">
              {media.map((m, i) => (
                <button
                  key={`${i}-${m.src}`}
                  type="button"
                  aria-label={m.type === 'video' ? 'Play video' : `Photo ${i + 1}`}
                  onClick={() => setMediaIdx(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-muted ${i === mediaIdx ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'}`}
                >
                  {m.type === 'video' ? (
                    <span className="flex h-full w-full items-center justify-center bg-black text-white"><Play className="h-5 w-5" /></span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.src} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-5 space-y-3 flex flex-col min-h-0 flex-1">
          <DialogHeader className="space-y-1 text-left min-h-0 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-xl">{product.name}</DialogTitle>
              <span className="shrink-0 text-xl font-bold text-primary">₦{product.price.toLocaleString()}</span>
            </div>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line min-h-0 max-h-64 overflow-y-auto pr-2">
              {product.description || 'No description provided.'}
            </DialogDescription>
          </DialogHeader>
          {(soldOut || lowStock) && (
            <p className={`text-sm font-medium ${soldOut ? 'text-destructive' : 'text-amber-600'}`}>{soldOut ? 'Sold out' : `Only ${product.stock} left in stock`}</p>
          )}
          <ProductOptionsPicker product={product} value={selection} onChange={setSelection} />
          <div className="flex gap-3 shrink-0">
          {onViewVendorProfile && !vendorMarketId ? (
            <Button variant="outline" className="flex-1" onClick={() => { setDetailsOpen(false); onViewVendorProfile(product.vendorId); }}>View store</Button>
          ) : (
            <Button asChild variant="outline" className="flex-1"><Link href={vendorMarketId ? `/market/${vendorMarketId}/vendor/${product.vendorId}` : `/vendor/${product.vendorId}/profile`}>View store</Link></Button>
          )}
          <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => { handleAddToCart(); setDetailsOpen(false); }} disabled={orderBranch?.unavailable || choiceMissing || soldOut}>
            <ShoppingCart className="mr-2 h-4 w-4" /> {soldOut ? 'Sold out' : orderBranch?.unavailable ? 'Branch unavailable' : 'Add to Cart'}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
