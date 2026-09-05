
'use client'; // Ensure this is a client component for useState and event handlers

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, UserCircle, ShoppingBag } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserWalletDisplay } from '@/components/wallet/UserWalletDisplay';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription, // Added for potential use
  SheetClose,      // Added for explicit close buttons if needed
} from '@/components/ui/sheet';
import { ShoppingCartView } from '@/components/cart/ShoppingCartView';
import CustomerProfilePage from '@/app/(app)/profile/page'; // Import the default export
import { AccountMenu } from '@/components/auth/AccountMenu';

export function AppHeader() {
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <span className="sr-only">Dailybuy</span>
          <h1 className="text-xl font-bold text-primary">Dailybuy</h1>
        </Link>
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          {/* Desktop Nav items can be added here if needed, or rely on sidebar */}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <UserWalletDisplay />
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={() => setIsCartSheetOpen(true)}>
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only">Shopping Cart</span>
          </Button>
          <AccountMenu onOpenProfile={() => setIsProfileSheetOpen(true)} />
        </div>
      </header>

      {/* Cart Sheet */}
      <Sheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
        <SheetContent className="w-full max-w-md sm:max-w-lg p-0 flex flex-col" side="right">
          <SheetHeader className="p-6 pb-2 border-b">
            <SheetTitle className="text-2xl flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" /> Your Cart
            </SheetTitle>
          </SheetHeader>
          {/* ShoppingCartView will take remaining space and handle its own scrolling */}
          <ShoppingCartView />
        </SheetContent>
      </Sheet>

      {/* Profile Sheet */}
      <Sheet open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
        <SheetContent className="w-full max-w-md sm:max-w-lg p-0 flex flex-col" side="right">
           <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10"> {/* Added sticky header */}
            <SheetTitle className="text-2xl flex items-center gap-2">
              <UserCircle className="h-6 w-6 text-primary" /> Your Profile
            </SheetTitle>
          </SheetHeader>
          <div className="flex-grow overflow-y-auto">
            {/* 
              The CustomerProfilePage component might have its own container with padding.
              If the layout looks off, we might need to wrap its content or adjust its root element.
              For now, we'll render it directly.
            */}
            <CustomerProfilePage />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
