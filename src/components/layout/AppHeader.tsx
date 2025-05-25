
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart, UserCircle, ShoppingBag } from 'lucide-react'; // Changed Package to ShoppingBag
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserWalletDisplay } from '@/components/wallet/UserWalletDisplay';
import { NotificationBell } from '@/components/notifications/NotificationBell'; // Added

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
        <ShoppingBag className="h-6 w-6 text-primary" /> {/* Changed Package to ShoppingBag */}
        <span className="sr-only">Dailybuy</span>
        <h1 className="text-xl font-bold text-primary">Dailybuy</h1> {/* Changed Swiftbuy to Dailybuy */}
      </Link>
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        {/* Desktop Nav items can be added here if needed, or rely on sidebar */}
      </nav>
      <div className="ml-auto flex items-center gap-1 md:gap-2"> {/* Reduced gap for smaller screens */}
        <UserWalletDisplay />
        <NotificationBell /> {/* Added NotificationBell */}
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cart">
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only">Shopping Cart</span>
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profile">
            <UserCircle className="h-5 w-5" />
            <span className="sr-only">Customer Profile</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
