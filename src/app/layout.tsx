
import type { Metadata } from 'next';
// Removed Geist font imports
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { ServiceWorkerRegister } from '@/components/analytics/ServiceWorkerRegister';

// Removed geistSans and geistMono initializations

export const metadata: Metadata = {
  title: 'Closebuy',
  description: 'Your on-demand delivery solution.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Removed font variables from body className */}
      <body className="antialiased">
        <AuthProvider>
          <CartProvider>
            <PageViewTracker />
            <ServiceWorkerRegister />
            {children}
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
