import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

// Deliberately outside the (app) route group: login/signup pages shouldn't
// show the main app's sidebar, wallet balance, cart, or notifications —
// none of that makes sense before someone is signed in.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-xl font-bold text-primary">
        <ShoppingBag className="h-6 w-6" />
        Dailybuy
      </Link>
      {children}
    </div>
  );
}
