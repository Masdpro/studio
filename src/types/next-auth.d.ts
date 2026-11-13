import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'customer' | 'vendor' | 'delivery_agent' | 'admin';
    roles?: ('customer' | 'vendor' | 'delivery_agent' | 'admin' | 'branch')[];
    /** The store this account sells for (its own, or the one its branch login belongs to). */
    ownVendorId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: 'customer' | 'vendor' | 'delivery_agent' | 'admin';
    roles?: ('customer' | 'vendor' | 'delivery_agent' | 'admin' | 'branch')[];
    /** The store this account sells for (its own, or the one its branch login belongs to). */
    ownVendorId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'customer' | 'vendor' | 'delivery_agent' | 'admin';
    roles?: ('customer' | 'vendor' | 'delivery_agent' | 'admin' | 'branch')[];
    /** The store this account sells for (its own, or the one its branch login belongs to). */
    ownVendorId?: string;
  }
}
