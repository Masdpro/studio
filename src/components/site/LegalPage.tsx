// Shared layout for the About and policy pages: a readable column with styled headings, lists and links.
export function LegalPage({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>}
      {intro && <p className="mt-6 text-lg text-muted-foreground">{intro}</p>}
      <div className="mt-8 space-y-4 leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
