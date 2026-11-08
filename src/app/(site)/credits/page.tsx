import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { ALL_CATALOG_ITEMS, CATALOG_IMAGES } from '@/lib/product-catalog';

export const metadata: Metadata = { title: 'Photo credits | Closebuy', description: 'Credits and licences for the sample product photos used on Closebuy.' };

export default function CreditsPage() {
  const seen = new Set<string>();
  const rows = ALL_CATALOG_ITEMS.filter((i) => CATALOG_IMAGES[i.slug] && !seen.has(i.slug) && seen.add(i.slug));
  return (
    <LegalPage
      title="Photo credits"
      intro="Vendors can start selling with sample product photos from our catalog. These photos come from Open Food Facts and Wikimedia Commons under free licences. Thank you to everyone who shared them. Brand names and logos belong to their owners."
    >
      <ul>
        {rows.map((i) => {
          const c = CATALOG_IMAGES[i.slug];
          return (
            <li key={i.slug}>
              <strong>{i.name}</strong>: “{c.title}” by {c.creator}, {c.license}.{' '}
              <a href={c.source} target="_blank" rel="noopener noreferrer nofollow">
                Source
              </a>
            </li>
          );
        })}
      </ul>
    </LegalPage>
  );
}
