import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVendorById } from '@/lib/services/vendors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Store, Mail, Phone, MapPin, Globe, ArrowLeft, Clock, Power, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { Vendor } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

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

export default async function VendorProfilePage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const vendor = await getVendorById(vendorId);
  if (!vendor) notFound();

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
          {vendor.marketId && (
            <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-md">
              <Store className="h-5 w-5 text-primary mt-1 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Local Market</p>
                <Button variant="link" asChild className="p-0 h-auto font-medium">
                  <Link href={`/market/${vendor.marketId}/vendor/${vendor.id}`}>
                    View this stall's products
                  </Link>
                </Button>
              </div>
            </div>
          )}
          {vendor.externalStoreUrl && (
            <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-md">
              <Globe className="h-5 w-5 text-primary mt-1 shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">External Store</p>
                <Button variant="link" asChild className="p-0 h-auto font-medium">
                  <Link href={`/vendor/${vendor.id}/store`} target="_blank" rel="noopener noreferrer">
                    Visit {vendor.businessName}'s Store on Closebuy
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
