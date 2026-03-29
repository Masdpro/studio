
'use client';

import Image from 'next/image';
import type { Market } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, ArrowRight } from 'lucide-react';

interface MarketCardProps {
  market: Market;
  storeCount: number;
  onClick: (market: Market) => void;
}

export function MarketCard({ market, storeCount, onClick }: MarketCardProps) {
  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group"
      onClick={() => onClick(market)}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <Image 
          src={market.imageUrl} 
          alt={market.name} 
          fill 
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          data-ai-hint="local market"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-90">Local Market</p>
            <CardTitle className="text-xl md:text-2xl text-white">{market.name}</CardTitle>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <CardDescription className="line-clamp-2 mb-4 h-10">
          {market.description}
        </CardDescription>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{market.locationTag}</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-primary">
            <span>{storeCount} Stores</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
