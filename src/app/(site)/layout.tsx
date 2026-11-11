import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import './site.css';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

// The public website (landing, about, contact, policies): no app sidebar, wallet or cart.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-root flex min-h-screen flex-col bg-[hsl(var(--cream))] text-[hsl(var(--ink))] antialiased">
      {/* Without JavaScript, sections that normally fade in are simply shown. */}
      <noscript>
        <style>{'.reveal{opacity:1!important;transform:none!important}'}</style>
      </noscript>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
