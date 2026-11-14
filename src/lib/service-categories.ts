/** The kinds of service business on Closebuy. Safe to use in the browser. */
export const SERVICE_CATEGORIES = [
  { id: 'beauty', label: 'Beauty & hair', blurb: 'Braids, barbers, makeup, nails' },
  { id: 'repairs', label: 'Repairs & tech', blurb: 'Phones, laptops, appliances' },
  { id: 'home', label: 'Home services', blurb: 'Cleaning, fumigation, plumbing' },
  { id: 'tailoring', label: 'Tailoring & fashion', blurb: 'Custom outfits, alterations' },
  { id: 'events', label: 'Events & catering', blurb: 'Private chefs, small chops, decor' },
  { id: 'fitness', label: 'Health & fitness', blurb: 'Trainers, massage, wellness' },
  { id: 'lessons', label: 'Lessons & tutoring', blurb: 'Exam prep, coding, music' },
  { id: 'photo', label: 'Photography', blurb: 'Portraits, events, products' },
  { id: 'other', label: 'Other services', blurb: 'Anything else you can be booked for' },
] as const;

export type ServiceCategoryId = (typeof SERVICE_CATEGORIES)[number]['id'];

export const isServiceCategory = (v: unknown): v is ServiceCategoryId => SERVICE_CATEGORIES.some((c) => c.id === v);
export const categoryLabel = (id: string) => SERVICE_CATEGORIES.find((c) => c.id === id)?.label ?? 'Other services';

/** A stable colour for a business's badge and card covers, from its name. */
export function hueFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export const initials = (name: string) =>
  name.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0] ?? '')).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
