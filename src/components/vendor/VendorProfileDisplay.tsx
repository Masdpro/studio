
// src/components/vendor/VendorProfileDisplay.tsx
'use client';

import type { Vendor } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Store, Mail, Phone, MapPin, Globe, ExternalLink, Clock, Power, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';


interface VendorProfileDisplayProps {
  vendor: Vendor;
}

const getStatusBadgeVariant = (status?: Vendor['status']): React.ComponentProps<typeof Badge>['variant'] => {
  switch (status) {
    case 'Open':
      return 'default'; // Or a specific green color
    case 'Closed':
    case 'Temporarily Unavailable':
      return 'destructive';
    case 'Opening Soon':
      return 'secondary'; // Or a specific yellow/orange
    default:
      return 'outline';
  }
};

const getStatusIcon = (status?: Vendor['status']) => {
  switch (status) {
    case 'Open':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'Closed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'Temporarily Unavailable':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'Opening Soon':
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <Power className="h-4 w-4 text-muted-foreground" />;
  }
};


export function VendorProfileDisplay({ vendor }: VendorProfileDisplayProps) {
  const vendorInitials = vendor.businessName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const fullAddress = `${vendor.streetAddress}, ${vendor.city}, ${vendor.country}`;

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="p-6 border-b">
        <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16 border-2 border-primary">
            <AvatarImage src={`https://placehold.co/100x100.png?text=${vendorInitials}`} alt={vendor.businessName} data-ai-hint="store logo" />
            <AvatarFallback className="text-2xl">{vendorInitials}</AvatarFallback>
            </Avatar>
            <div>
                <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                <Store className="h-6 w-6 text-primary" />
                {vendor.businessName}
                </SheetTitle>
                <SheetDescription>
                {vendor.locationTag ? `Located in ${vendor.locationTag}` : 'Vendor Profile'}
                </SheetDescription>
            </div>
        </div>
        {vendor.status && (
          <div className="flex items-center gap-2">
            {getStatusIcon(vendor.status)}
            <Badge variant={getStatusBadgeVariant(vendor.status)} className="text-sm">
              {vendor.status}
            </Badge>
          </div>
        )}
      </SheetHeader>

      <div className="flex-grow p-6 space-y-6 overflow-y-auto">
        {vendor.operatingHours && (
            <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-md">
                <Clock className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                <p className="text-sm text-muted-foreground">Operating Hours</p>
                <p className="font-medium">{vendor.operatingHours}</p>
                </div>
            </div>
        )}
        <div className="grid grid-cols-1 gap-6">
          <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-md">
            <Mail className="h-5 w-5 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{vendor.contactEmail}</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-md">
            <Phone className="h-5 w-5 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{vendor.phone}</p>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-md">
          <MapPin className="h-5 w-5 text-primary mt-1 shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium">{fullAddress}</p>
          </div>
        </div>
        {vendor.externalStoreUrl && (
          <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-md">
            <Globe className="h-5 w-5 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">External Store</p>
              <Button variant="link" asChild className="p-0 h-auto font-medium">
                <Link href={`/vendor/${vendor.id}/store`} target="_blank" rel="noopener noreferrer">
                  Visit {vendor.businessName}'s Store Page <ExternalLink className="ml-1 h-4 w-4"/>
                </Link>
              </Button>
            </div>
          </div>
        )}
         <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">About Us (placeholder)</p>
            <p className="font-medium">
                {vendor.businessName} is committed to providing the best products and services in {vendor.city}.
                We specialize in delicious food and ensure a great customer experience.
            </p>
        </div>
      </div>
    </div>
  );
}
