import Link from 'next/link';
import { AdminGate } from '@/components/admin/AdminGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, ShoppingBag, MapPin, ArrowRight } from 'lucide-react';
import { getMarkets } from '@/lib/services/markets';
import { getVendors } from '@/lib/services/vendors';
import { getProducts } from '@/lib/services/products';

export default async function AdminDashboardPage() {
  const [markets, vendors, products] = await Promise.all([getMarkets(), getVendors(), getProducts()]);

  const sections = [
    { href: '/admin/markets', label: 'Markets', count: markets.length, icon: MapPin, description: 'Local markets shown on the home page.' },
    { href: '/admin/vendors', label: 'Vendors', count: vendors.length, icon: Store, description: 'Vendor stalls, including which market they belong to.' },
    { href: '/admin/products', label: 'Products', count: products.length, icon: ShoppingBag, description: 'Every product listed across all vendors.' },
  ];

  return (
    <AdminGate>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-2">Admin</h1>
        <p className="text-muted-foreground mb-8">Manage the markets, vendor stalls, and products shown across Closebuy.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="h-full hover:border-primary hover:shadow-md transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <s.icon className="h-6 w-6 text-primary" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl mt-2">{s.count}</CardTitle>
                  <CardDescription className="text-base font-medium text-foreground">{s.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminGate>
  );
}
