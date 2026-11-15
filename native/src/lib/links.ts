/** Turns a website link from a notification into the matching app screen. */
export function appRouteFor(link?: string): string | null {
  if (!link) return null;
  const path = link.replace(/^https?:\/\/[^/]+/, '');
  const m = (re: RegExp) => path.match(re);
  let x;
  if ((x = m(/^\/orders\/?\?.*order=([\w-]+)/)) || (x = m(/^\/orders\/([\w-]+)/))) return `/order/${x[1]}`;
  if (path.startsWith('/orders')) return '/activity';
  if (path.startsWith('/bookings')) return '/activity';
  if (path.startsWith('/wallet')) return '/wallet';
  if (path.startsWith('/errands')) return '/errands';
  if (path.startsWith('/account/verification')) return '/verification';
  if (path.startsWith('/vendor/orders') || path.startsWith('/vendor/dashboard')) return '/vendor';
  if (path.startsWith('/provider')) return '/pro';
  if (path.startsWith('/delivery-agent')) return '/agent';
  if (path.startsWith('/admin')) return '/admin';
  if ((x = m(/^\/services\/p\/([\w-]+)/))) return `/provider/${x[1]}`;
  return null;
}

