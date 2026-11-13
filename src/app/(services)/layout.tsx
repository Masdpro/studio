import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import './services.css';
import { ServicesThemeOn, ServicesHeader } from '@/components/services-ui/ServicesChrome';

// Closebuy Services: booked professional services, with its own dark look. Customers switch here from the shop.
export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="svc-root min-h-svh bg-background text-foreground antialiased">
      <ServicesThemeOn />
      <ServicesHeader />
      <main className="pb-24">{children}</main>
      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Closebuy Services · Payments are held by Closebuy until the job is done
      </footer>
    </div>
  );
}
