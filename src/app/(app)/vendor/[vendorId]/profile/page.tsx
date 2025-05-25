
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Store, Mail, Phone, MapPin, Globe, ArrowLeft, AlertTriangle, Clock, Power, CheckCircle, XCircle } from 'lucide-react';
import type { Vendor } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

// Mock function to get vendor data - replace with actual data fetching in a real app
const getVendorById = (id: string): Vendor | undefined => {
  const sampleVendorsForPage: Vendor[] = [
    { id: 'v1', businessName: 'Pizza Place', streetAddress: '1 Main St', city: 'Pizza City', country: 'Foodland', contactEmail:'v1@example.com', phone:'123-0001', locationTag: 'Downtown', latitude: 34.0522, longitude: -118.2437, externalStoreUrl: 'https://example.com/pizzapalace', operatingHours: '11 AM - 10 PM, Mon-Sun', status: 'Open' },
    { id: 'v2', businessName: 'Burger Bonanza', streetAddress: '2 Burger Ave', city: 'Burger Town', country: 'Foodland', contactEmail:'v2@example.com', phone:'123-0002', locationTag: 'Suburbia', latitude: 34.0000, longitude: -118.3000, externalStoreUrl: 'https://example.com/burgerbonanza', operatingHours: '10 AM - 9 PM, Tue-Sun', status: 'Open' },
    { id: 'v3', businessName: 'Salad Supreme', streetAddress: '3 Salad Rd', city: 'Green Ville', country: 'Foodland', contactEmail:'v3@example.com', phone:'123-0003', locationTag: 'Downtown', latitude: 34.0500, longitude: -118.2400, operatingHours: '9 AM - 7 PM, Mon-Fri', status: 'Closed' },
    { id: 'v4', businessName: 'Drinks & Co.', streetAddress: '4 Drink Dr', city: 'Beverage City', country: 'Foodland', contactEmail:'v4@example.com', phone:'123-0004', locationTag: 'Uptown', latitude: 40.7831, longitude: -73.9712, externalStoreUrl: 'https://example.com/drinksco', operatingHours: '24/7', status: 'Open' },
    { id: 'v5', businessName: 'Dessert Dreams', streetAddress: '5 Sweet St', city: 'Cakeburg', country: 'Foodland', contactEmail:'v5@example.com', phone:'123-0005', locationTag: 'Suburbia', latitude: 33.9500, longitude: -118.3500, operatingHours: '12 PM - 8 PM, Wed-Sun', status: 'Opening Soon' },
    { id: 'v6', businessName: 'Sushi Central', streetAddress: '6 Fish Ln', city: 'Sushi City', country: 'Foodland', contactEmail:'v6@example.com', phone:'123-0006', locationTag: 'Uptown', latitude: 40.7800, longitude: -73.9700, externalStoreUrl: 'https://example.com/sushicentral', operatingHours: '5 PM - 11 PM, Daily', status: 'Temporarily Unavailable' },
  ];
  return sampleVendorsForPage.find(v => v.id === id);
};

const getStatusBadgeVariant = (status?: Vendor['status']): React.ComponentProps<typeof Badge>['variant'] => {
  switch (status) {
    case 'Open': return 'default';
    case 'Closed': case 'Temporarily Unavailable': return 'destructive';
    case 'Opening Soon': return 'secondary';
    default: return 'outline';
  }
};

const getStatusIcon = (status?: Vendor['status']) => {
  switch (status) {
    case 'Open': return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'Closed': return <XCircle className="h-5 w-5 text-red-600" />;
    case 'Temporarily Unavailable': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'Opening Soon': return <Clock className="h-5 w-5 text-blue-500" />;
    default: return <Power className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function VendorProfilePage() {
  const params = useParams();
  const vendorId = typeof params.vendorId === 'string' ? params.vendorId : undefined;
  const [vendor, setVendor] = useState<Vendor | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (vendorId) {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const foundVendor = getVendorById(vendorId);
        setVendor(foundVendor);
        setIsLoading(false);
      }, 300); // Short delay for simulated loading
    } else {
      setVendor(null);
      setIsLoading(false);
    }
  }, [vendorId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg">Loading Vendor Profile...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Vendor not found or ID is missing.</AlertDescription>
        </Alert>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>
    );
  }

  const vendorInitials = vendor.businessName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const fullAddress = `${vendor.streetAddress}, ${vendor.city}, ${vendor.country}`;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-primary">
            <AvatarImage src={`https://placehold.co/100x100.png?text=${vendorInitials}`} alt={vendor.businessName} data-ai-hint="store logo" />
            <AvatarFallback className="text-3xl">{vendorInitials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <Store className="h-8 w-8 text-primary" />
            {vendor.businessName}
          </CardTitle>
          <CardDescription className="mb-2">
            {vendor.locationTag ? `Located in ${vendor.locationTag}` : 'Vendor Profile'}
          </CardDescription>
          {vendor.status && (
            <div className="flex items-center justify-center gap-2">
              {getStatusIcon(vendor.status)}
              <Badge variant={getStatusBadgeVariant(vendor.status)} className="text-md">
                {vendor.status}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {vendor.operatingHours && (
            <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-md">
              <Clock className="h-5 w-5 text-primary mt-1 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Operating Hours</p>
                <p className="font-medium">{vendor.operatingHours}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Visit {vendor.businessName}'s Store on Dailybuy
                  </Link>
                </Button>
              </div>
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button variant="outline" disabled>Edit Profile (Vendor Dashboard)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
