import { VendorProfileForm } from '@/components/vendor/VendorProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ListPlus, Settings } from 'lucide-react';
import { VendorWalletWidget } from '@/components/wallet/VendorWalletWidget';

// Placeholder vendor data, in a real app this would come from auth/DB
const sampleVendor = {
  id: 'v123',
  businessName: 'Awesome Eats',
  contactEmail: 'contact@awesomeeats.com',
  phone: '555-1234',
  address: '123 Food Lane, Culinary City',
};

export default function VendorDashboardPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <VendorWalletWidget />
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Manage Your Profile
          </CardTitle>
          <CardDescription>Keep your business information up to date.</CardDescription>
        </CardHeader>
        <CardContent>
          <VendorProfileForm vendor={sampleVendor} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ListPlus className="h-6 w-6 text-primary" />
            Product Management
          </CardTitle>
          <CardDescription>Add, edit, or remove your products.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Manage all your product listings from one place.</p>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/vendor/dashboard/products">
              Go to Product Management
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
