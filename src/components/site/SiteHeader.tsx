import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { SHOP_PATH } from '@/lib/site';

const NAV = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#sell', label: 'Sell on Closebuy' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-1.5">
          <Image src="/logo-mark-orange.png" alt="" width={26} height={34} unoptimized className="block" />
          <span className="text-xl font-bold text-primary">Closebuy</span>
        </Link>
        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium text-foreground/80 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-primary">{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={SHOP_PATH}>Start shopping</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
