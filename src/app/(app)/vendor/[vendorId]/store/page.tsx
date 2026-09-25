import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVendorById } from '@/lib/services/vendors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Globe, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function VendorExternalStorePage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const vendor = await getVendorById(vendorId);
  if (!vendor) notFound();

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
                <Link href="/">Back to Closebuy Products</Link>
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
              To add items to your Closebuy cart and complete your purchase through Closebuy,
              please <Link href="/" className="underline font-semibold hover:text-primary">return to the main Closebuy product listings</Link> and find these products there.
            </AlertDescription>
          </Alert>
          <div className="aspect-[16/9] w-full border rounded-lg overflow-hidden shadow-lg">
            <iframe
              src={vendor.externalStoreUrl}
              title={`${vendor.businessName} External Store`}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No External Storefront</AlertTitle>
          <AlertDescription>
            {vendor.businessName} has not linked an external website.
            You can <Link href="/" className="underline hover:text-primary">browse all products on Closebuy</Link>.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
