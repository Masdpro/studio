'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserCircle, LogIn, LogOut, UserPlus, Wallet } from 'lucide-react';
import { openWallet, useWalletBalance } from '@/hooks/use-wallet-balance';
import { useNavGroups } from '@/components/layout/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';

/**
 * The header's account icon. Signed out, it opens a small menu with Sign in and Create an account;
 * signed in, a dropdown with the user's email/role and a sign-out action.
 */
export function AccountMenu({ onOpenProfile }: { onOpenProfile: () => void }) {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();
  // Phones have no side menu, so the vendor, delivery, branch and "Grow with Closebuy" sections live here.
  const isMobile = useIsMobile();
  const roleGroups = useNavGroups().filter((g) => g.label !== 'Customer' && g.label !== 'Admin');
  const balance = useWalletBalance(!!user && role !== 'admin');

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <UserCircle className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

  // Signed out: the same profile icon; tapping it offers sign-in (and sign-up).
  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <UserCircle className="h-5 w-5" />
            <span className="sr-only">Account</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal text-muted-foreground">Welcome to Closebuy</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/auth/login" className="cursor-pointer">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/auth/register/customer" className="cursor-pointer">
              <UserPlus className="mr-2 h-4 w-4" />
              Create an account
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <UserCircle className="h-5 w-5" />
          <span className="sr-only">Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[75vh] w-60 overflow-y-auto">
        <DropdownMenuLabel className="truncate">
          {user.email}
          {role && <span className="block text-xs font-normal text-muted-foreground capitalize">{role.replace('_', ' ')}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenProfile}>
          <UserCircle className="mr-2 h-4 w-4" />Profile
        </DropdownMenuItem>
        {role !== 'admin' && (
          <DropdownMenuItem onClick={() => openWallet()}>
            <Wallet className="mr-2 h-4 w-4" />Wallet
            <span className="ml-auto font-semibold">{balance === null ? '' : `₦${balance.toLocaleString()}`}</span>
          </DropdownMenuItem>
        )}
        {isMobile &&
          roleGroups.map((g) => (
            <div key={g.label}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{g.label}</DropdownMenuLabel>
              {g.items.map((item) => (
                <DropdownMenuItem key={item.href} onClick={() => router.push(item.href)}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push('/auth/login');
            router.refresh();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
