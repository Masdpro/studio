/**
 * Sample service providers for the design preview of Closebuy Services.
 * Replaced by real service businesses once registration and switching are built.
 */
export type ServiceCategoryId = 'beauty' | 'repairs' | 'home' | 'tailoring' | 'events' | 'fitness' | 'lessons' | 'photo';

export const SERVICE_CATEGORIES: { id: ServiceCategoryId; label: string; blurb: string }[] = [
  { id: 'beauty', label: 'Beauty & hair', blurb: 'Braids, barbers, makeup, nails' },
  { id: 'repairs', label: 'Repairs & tech', blurb: 'Phones, laptops, appliances' },
  { id: 'home', label: 'Home services', blurb: 'Cleaning, fumigation, plumbing' },
  { id: 'tailoring', label: 'Tailoring & fashion', blurb: 'Custom outfits, alterations' },
  { id: 'events', label: 'Events & catering', blurb: 'Private chefs, small chops, decor' },
  { id: 'fitness', label: 'Health & fitness', blurb: 'Trainers, massage, wellness' },
  { id: 'lessons', label: 'Lessons & tutoring', blurb: 'Exam prep, coding, music' },
  { id: 'photo', label: 'Photography', blurb: 'Portraits, events, products' },
];

export type PreviewService = { name: string; description: string; price: number; priceFrom?: boolean; durationMin: number; location: 'shop' | 'home' | 'either'; callOutFee?: number };
export type PreviewProvider = {
  slug: string;
  name: string;
  tagline: string;
  category: ServiceCategoryId;
  area: string;
  city: string;
  hue: number; // for the initials badge and cover
  instant: boolean; // confirms bookings straight away
  since: number;
  about: string;
  hours: Record<number, [string, string][]>; // 0 = Sunday
  services: PreviewService[];
};

const weekdays = (open: string, close: string, sat?: [string, string]): Record<number, [string, string][]> => ({
  0: [], 1: [[open, close]], 2: [[open, close]], 3: [[open, close]], 4: [[open, close]], 5: [[open, close]], 6: sat ? [sat] : [],
});

export const PREVIEW_PROVIDERS: PreviewProvider[] = [
  {
    slug: 'glow-lab-studio', name: 'Glow Lab Studio', tagline: 'Braids, silk press & bridal glam', category: 'beauty', area: 'Lekki Phase 1', city: 'Lagos', hue: 330, instant: true, since: 2019,
    about: 'A calm, appointment-only studio for protective styles and event makeup. We come to you for bridal and owambe glam.',
    hours: weekdays('09:00', '19:00', ['08:00', '18:00']),
    services: [
      { name: 'Knotless braids (medium, waist length)', description: 'Hair included. Wash and blow-dry before braiding.', price: 25000, durationMin: 300, location: 'shop' },
      { name: 'Silk press', description: 'Wash, deep condition, press and trim.', price: 15000, durationMin: 90, location: 'shop' },
      { name: 'Bridal makeup', description: 'Trial look on the day, lashes included.', price: 60000, durationMin: 120, location: 'either', callOutFee: 10000 },
    ],
  },
  {
    slug: 'fixit-phone-clinic', name: 'FixIt Phone Clinic', tagline: 'Same-day phone & laptop repairs', category: 'repairs', area: 'Computer Village, Ikeja', city: 'Lagos', hue: 200, instant: false, since: 2016,
    about: 'Genuine and high-grade parts with a 90-day warranty on screens and batteries. Most repairs done while you wait.',
    hours: weekdays('08:30', '18:30', ['09:00', '17:00']),
    services: [
      { name: 'iPhone screen replacement', description: 'Price depends on the model; confirmed before we start.', price: 45000, priceFrom: true, durationMin: 60, location: 'shop' },
      { name: 'Battery replacement', description: 'Most Android and iPhone models.', price: 18000, durationMin: 45, location: 'shop' },
      { name: 'Water damage check', description: 'Diagnosis and quote. Deducted if you go ahead with the repair.', price: 5000, durationMin: 30, location: 'shop' },
    ],
  },
  {
    slug: 'adire-atelier', name: 'Adire Atelier', tagline: 'Bespoke native & bridal wear', category: 'tailoring', area: 'Yaba', city: 'Lagos', hue: 24, instant: true, since: 2014,
    about: 'Hand-finished agbada, kaftans and aso-ebi. Book a fitting; we take your measurements and agree the design together.',
    hours: weekdays('10:00', '18:00', ['10:00', '16:00']),
    services: [
      { name: 'Custom agbada: fitting', description: 'Measurements and fabric consultation. Making fee agreed at the fitting.', price: 10000, durationMin: 60, location: 'shop' },
      { name: 'Alterations', description: 'Taking in, letting out, hemming.', price: 5000, priceFrom: true, durationMin: 30, location: 'shop' },
      { name: 'Bridal fitting', description: 'For the bride and up to two others.', price: 20000, durationMin: 60, location: 'either', callOutFee: 8000 },
    ],
  },
  {
    slug: 'sparkle-home-care', name: 'Sparkle Home Care', tagline: 'Deep cleaning & fumigation', category: 'home', area: 'Surulere', city: 'Lagos', hue: 160, instant: true, since: 2020,
    about: 'Vetted, uniformed cleaners with their own equipment. We cover Lagos Mainland and Island.',
    hours: weekdays('07:00', '18:00', ['08:00', '16:00']),
    services: [
      { name: 'Deep clean: 3-bedroom flat', description: 'Kitchen, bathrooms, floors, windows and appliances.', price: 55000, durationMin: 300, location: 'home' },
      { name: 'Post-construction clean', description: 'Price depends on the size of the property.', price: 90000, priceFrom: true, durationMin: 480, location: 'home' },
      { name: 'Fumigation', description: 'Safe for children and pets after 3 hours.', price: 35000, durationMin: 120, location: 'home' },
    ],
  },
  {
    slug: 'chef-tolu', name: 'Chef Tolu', tagline: 'Private dining & small chops', category: 'events', area: 'Victoria Island', city: 'Lagos', hue: 12, instant: false, since: 2017,
    about: 'Modern Nigerian menus cooked in your kitchen, served restaurant-style. Ingredients included.',
    hours: { 0: [['12:00', '22:00']], 1: [], 2: [['12:00', '22:00']], 3: [['12:00', '22:00']], 4: [['12:00', '22:00']], 5: [['12:00', '23:00']], 6: [['10:00', '23:00']] },
    services: [
      { name: 'Private dinner for up to 8', description: 'Three courses, plated, with service.', price: 120000, durationMin: 240, location: 'home', callOutFee: 15000 },
      { name: 'Small chops for 50 guests', description: 'Puff-puff, samosa, spring rolls, gizdodo, peppered turkey.', price: 150000, durationMin: 180, location: 'home' },
    ],
  },
  {
    slug: 'coach-emeka', name: 'Coach Emeka', tagline: 'Personal training that fits your week', category: 'fitness', area: 'Ikoyi', city: 'Lagos', hue: 260, instant: true, since: 2018,
    about: 'Certified trainer focused on strength and fat loss. Train at the studio or at home.',
    hours: { 0: [], 1: [['06:00', '10:00'], ['16:00', '20:00']], 2: [['06:00', '10:00'], ['16:00', '20:00']], 3: [['06:00', '10:00'], ['16:00', '20:00']], 4: [['06:00', '10:00'], ['16:00', '20:00']], 5: [['06:00', '10:00']], 6: [['07:00', '12:00']] },
    services: [
      { name: 'Personal training session', description: 'One-to-one, programme included.', price: 20000, durationMin: 60, location: 'either', callOutFee: 5000 },
      { name: 'Fitness assessment', description: 'Body composition, mobility and a 4-week plan.', price: 10000, durationMin: 45, location: 'shop' },
    ],
  },
  {
    slug: 'bright-minds-tutors', name: 'Bright Minds Tutors', tagline: 'WAEC, JAMB & coding for kids', category: 'lessons', area: 'Gbagada', city: 'Lagos', hue: 220, instant: true, since: 2021,
    about: 'Experienced graduate tutors. Lessons at your home after school and on weekends.',
    hours: { 0: [['14:00', '18:00']], 1: [['15:00', '19:00']], 2: [['15:00', '19:00']], 3: [['15:00', '19:00']], 4: [['15:00', '19:00']], 5: [['15:00', '19:00']], 6: [['09:00', '17:00']] },
    services: [
      { name: 'WAEC/JAMB maths', description: 'Past questions and exam technique.', price: 8000, durationMin: 60, location: 'home' },
      { name: 'Coding for kids (8–14)', description: 'Scratch, then Python. Laptop needed.', price: 12000, durationMin: 90, location: 'home' },
    ],
  },
  {
    slug: 'lens-and-light', name: 'Lens & Light', tagline: 'Portraits, events and products', category: 'photo', area: 'Ikeja GRA', city: 'Lagos', hue: 45, instant: false, since: 2015,
    about: 'Studio and on-location photography. Edited photos delivered in 5 working days.',
    hours: weekdays('09:00', '18:00', ['09:00', '18:00']),
    services: [
      { name: 'Portrait session', description: '1 look, 10 edited photos.', price: 40000, durationMin: 60, location: 'either', callOutFee: 10000 },
      { name: 'Event coverage (4 hours)', description: '150+ edited photos and a highlights album.', price: 150000, durationMin: 240, location: 'home' },
    ],
  },
];

export const providerBySlug = (slug: string) => PREVIEW_PROVIDERS.find((p) => p.slug === slug);
export const fromPrice = (p: PreviewProvider) => Math.min(...p.services.map((s) => s.price));
export const categoryLabel = (id: ServiceCategoryId) => SERVICE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
export const initials = (name: string) => name.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0] ?? '')).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const where = (p: PreviewProvider) => {
  const kinds = new Set(p.services.map((s) => s.location));
  if (kinds.has('either') || (kinds.has('home') && kinds.has('shop'))) return 'Studio or home visits';
  return kinds.has('home') ? 'Comes to you' : 'At their studio';
};
