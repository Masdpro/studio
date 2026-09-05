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
import { UserCircle, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Replaces the header's account icon: shows a "Sign In" button when signed
 * out, or a dropdown with the user's email/role and a sign-out action.
 */
export function AccountMenu({ onOpenProfile }: { onOpenProfile: () => void }) {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <UserCircle className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/login">
          <LogIn className="mr-1.5 h-4 w-4" />
          Sign In
        </Link>
      </Button>
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {user.email}
          {role && <span className="block text-xs font-normal text-muted-foreground capitalize">{role.replace('_', ' ')}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenProfile}>Profile</DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push('/');
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
