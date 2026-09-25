import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'customer' | 'vendor' | 'delivery_agent' | 'admin';
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: 'customer' | 'vendor' | 'delivery_agent' | 'admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'customer' | 'vendor' | 'delivery_agent' | 'admin';
  }
}
