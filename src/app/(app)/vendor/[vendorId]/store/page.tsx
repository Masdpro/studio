
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Globe, AlertTriangle, Info } from 'lucide-react';
import type { Vendor } from '@/lib/types'; // Assuming Vendor type is defined
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Mock function to get vendor data - replace with actual data fetching
const getVendorById = (id: string): Vendor | undefined => {
  const sampleVendorsForPage: Vendor[] = [
    { id: 'v1', businessName: 'Pizza Place', contactEmail: 'v1@example.com', phone:'111', streetAddress: '1 Main St', city: 'Pizza City', country: 'Foodland', externalStoreUrl: 'https://example.com/pizzapalace' },
    { id: 'v2', businessName: 'Burger Bonanza', contactEmail: 'v2@example.com', phone:'222', streetAddress: '2 Burger Ave', city: 'Burger Town', country: 'Foodland', externalStoreUrl: 'https://example.com/burgerbonanza' },
    { id: 'v3', businessName: 'Salad Supreme', contactEmail: 'v3@example.com', phone:'333', streetAddress: '3 Salad Rd', city: 'Green Ville', country: 'Foodland' }, // No external URL
    { id: 'v4', businessName: 'Drinks & Co.', contactEmail: 'v4@example.com', phone:'444', streetAddress: '4 Drink Dr', city: 'Beverage City', country: 'Foodland', externalStoreUrl: 'https://example.com/drinksco' },
    { id: 'v5', businessName: 'Dessert Dreams', contactEmail: 'v5@example.com', phone:'555', streetAddress: '5 Sweet St', city: 'Cakeburg', country: 'Foodland', externalStoreUrl: 'https://example.com/dessertdreams' },
    { id: 'v6', businessName: 'Sushi Central', contactEmail: 'v6@example.com', phone:'666', streetAddress: '6 Fish Ln', city: 'Sushi City', country: 'Foodland' },
  ];
  return sampleVendorsForPage.find(v => v.id === id);
};


export default function VendorExternalStorePage() {
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
      }, 500);
    } else {
      setVendor(null); // No vendorId found
      setIsLoading(false);
    }
  }, [vendorId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-lg">Loading Vendor Storefront...</p>
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
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8 text-primary" />
            {vendor.businessName}'s Storefront
          </CardTitle>
          <CardDescription>
            You are viewing content from {vendor.businessName}.
            {vendor.externalStoreUrl && " Their external website is displayed below."}
          </CardDescription>
        </CardHeader>
         <CardContent>
            <Button asChild variant="outline">
                <Link href="/">Back to Dailybuy Products</Link>
            </Button>
        </CardContent>
      </Card>

      {vendor.externalStoreUrl ? (
        <>
          <Alert variant="default" className="mb-4 bg-accent/20 border-accent">
            <Info className="h-4 w-4 !text-accent-foreground" />
            <AlertTitle className="text-accent-foreground">Important Notice</AlertTitle>
            <AlertDescription className="text-accent-foreground/90">
              You are viewing an external website hosted by {vendor.businessName}.
              Products browsed here are for informational purposes.
              To add items to your Dailybuy cart and complete your purchase through Dailybuy,
              please <Link href="/" className="underline font-semibold hover:text-primary">return to the main Dailybuy product listings</Link> and find these products there.
            </AlertDescription>
          </Alert>
          <div className="aspect-[16/9] w-full border rounded-lg overflow-hidden shadow-lg">
            <iframe
              src={vendor.externalStoreUrl}
              title={`${vendor.businessName} External Store`}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Adjust sandbox attributes as needed
            />
          </div>
        </>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No External Storefront</AlertTitle>
          <AlertDescription>
            {vendor.businessName} has not linked an external website.
            You can <Link href="/" className="underline hover:text-primary">browse all products on Dailybuy</Link>.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
