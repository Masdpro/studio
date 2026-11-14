/**
 * Demo service businesses for the Book side: approved providers with services, hours and sample portfolio
 * photos. vendor@closebuy.ng also gets a service business of its own, to show one login running a store
 * and a service business side by side. Safe to run more than once.
 */
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import { servicePortfolio, serviceProviders, services, serviceSettings, users, verificationDocuments } from '../src/db/schema';
import { saveFile } from '../src/lib/storage';
import { hueFor } from '../src/lib/service-categories';

type Hours = Record<string, [string, string][]>;
type DemoService = { key: string; name: string; description: string; price: number; priceFrom?: boolean; durationMin: number; location: 'shop' | 'home' | 'either'; callOutFee?: number; photos: string[] };
type DemoProvider = {
  id: string; email: string; businessName: string; slug: string; category: string; tagline: string; about: string; area: string; street: string; since: number;
  instant: boolean; hours: Hours; services: DemoService[];
};

const weekdays = (open: string, close: string, sat?: [string, string]): Hours => ({
  '0': [], '1': [[open, close]], '2': [[open, close]], '3': [[open, close]], '4': [[open, close]], '5': [[open, close]], '6': sat ? [sat] : [],
});

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    id: 'provider001', email: 'provider@closebuy.ng', businessName: 'Glow Lab Studio', slug: 'glow-lab-studio', category: 'beauty', area: 'Lekki Phase 1', street: '14 Admiralty Way', since: 2019, instant: true,
    tagline: 'Braids, silk press & bridal glam',
    about: 'A calm, appointment-only studio for protective styles and event makeup. We come to you for bridal and owambe glam.',
    hours: weekdays('09:00', '19:00', ['08:00', '18:00']),
    services: [
      { key: 'knotless', name: 'Knotless braids (medium, waist length)', description: 'Hair included. Wash and blow-dry before braiding.', price: 25000, durationMin: 300, location: 'shop', photos: ['Medium knotless, waist length', 'Knotless with curly ends', 'Side part, bob length'] },
      { key: 'silkpress', name: 'Silk press', description: 'Wash, deep condition, press and trim.', price: 15000, durationMin: 90, location: 'shop', photos: ['Silk press on natural hair', 'Press and trim'] },
      { key: 'bridal', name: 'Bridal makeup', description: 'Trial look on the day, lashes included.', price: 60000, durationMin: 120, location: 'either', callOutFee: 10000, photos: ['Soft glam for a white wedding', 'Traditional wedding look', 'Bridesmaids, matching glam', 'Owambe glam'] },
    ],
  },
  {
    id: 'prov_fixit', email: 'fixit@closebuy.ng', businessName: 'FixIt Phone Clinic', slug: 'fixit-phone-clinic', category: 'repairs', area: 'Computer Village, Ikeja', street: '7 Otigba Street', since: 2016, instant: false,
    tagline: 'Same-day phone & laptop repairs',
    about: 'Genuine and high-grade parts with a 90-day warranty on screens and batteries. Most repairs done while you wait.',
    hours: weekdays('08:30', '18:30', ['09:00', '17:00']),
    services: [
      { key: 'screen', name: 'iPhone screen replacement', description: 'Price depends on the model; confirmed before we start.', price: 45000, priceFrom: true, durationMin: 60, location: 'shop', photos: ['iPhone 13 screen replaced', 'Cracked display, before and after'] },
      { key: 'battery', name: 'Battery replacement', description: 'Most Android and iPhone models.', price: 18000, durationMin: 45, location: 'shop', photos: ['Samsung battery swap'] },
      { key: 'water', name: 'Water damage check', description: 'Diagnosis and quote. Deducted if you go ahead with the repair.', price: 5000, durationMin: 30, location: 'shop', photos: [] },
    ],
  },
  {
    id: 'prov_adire', email: 'adire@closebuy.ng', businessName: 'Adire Atelier', slug: 'adire-atelier', category: 'tailoring', area: 'Yaba', street: '22 Herbert Macaulay Way', since: 2014, instant: true,
    tagline: 'Bespoke native & bridal wear',
    about: 'Hand-finished agbada, kaftans and aso-ebi. Book a fitting; we take your measurements and agree the design together.',
    hours: weekdays('10:00', '18:00', ['10:00', '16:00']),
    services: [
      { key: 'agbada', name: 'Custom agbada: fitting', description: 'Measurements and fabric consultation. Making fee agreed at the fitting.', price: 10000, durationMin: 60, location: 'shop', photos: ['Three-piece agbada, cream', 'Embroidered neckline detail', 'Groom and groomsmen'] },
      { key: 'alter', name: 'Alterations', description: 'Taking in, letting out, hemming.', price: 5000, priceFrom: true, durationMin: 30, location: 'shop', photos: [] },
      { key: 'bridalfit', name: 'Bridal fitting', description: 'For the bride and up to two others.', price: 20000, durationMin: 60, location: 'either', callOutFee: 8000, photos: ['Aso-oke bridal set', 'Reception dress'] },
    ],
  },
  {
    id: 'prov_sparkle', email: 'sparkle@closebuy.ng', businessName: 'Sparkle Home Care', slug: 'sparkle-home-care', category: 'home', area: 'Surulere', street: '3 Adeniran Ogunsanya Street', since: 2020, instant: true,
    tagline: 'Deep cleaning & fumigation',
    about: 'Vetted, uniformed cleaners with their own equipment. We cover Lagos Mainland and Island.',
    hours: weekdays('07:00', '18:00', ['08:00', '16:00']),
    services: [
      { key: 'deep', name: 'Deep clean: 3-bedroom flat', description: 'Kitchen, bathrooms, floors, windows and appliances.', price: 55000, durationMin: 300, location: 'home', photos: ['Kitchen after a deep clean', 'Bathroom tiles and grout', 'Living room, move-in clean'] },
      { key: 'post', name: 'Post-construction clean', description: 'Price depends on the size of the property.', price: 90000, priceFrom: true, durationMin: 480, location: 'home', photos: ['New duplex, before handover'] },
      { key: 'fumigation', name: 'Fumigation', description: 'Safe for children and pets after 3 hours.', price: 35000, durationMin: 120, location: 'home', photos: [] },
    ],
  },
  {
    id: 'prov_tolu', email: 'tolu@closebuy.ng', businessName: 'Chef Tolu', slug: 'chef-tolu', category: 'events', area: 'Victoria Island', street: '9 Ajose Adeogun Street', since: 2017, instant: false,
    tagline: 'Private dining & small chops',
    about: 'Modern Nigerian menus cooked in your kitchen, served restaurant-style. Ingredients included.',
    hours: { '0': [['12:00', '22:00']], '1': [], '2': [['12:00', '22:00']], '3': [['12:00', '22:00']], '4': [['12:00', '22:00']], '5': [['12:00', '23:00']], '6': [['10:00', '23:00']] },
    services: [
      { key: 'dinner', name: 'Private dinner for up to 8', description: 'Three courses, plated, with service.', price: 120000, durationMin: 240, location: 'home', callOutFee: 15000, photos: ['Pepper soup starter', 'Jollof with grilled croaker', 'Dessert: zobo panna cotta'] },
      { key: 'smallchops', name: 'Small chops for 50 guests', description: 'Puff-puff, samosa, spring rolls, gizdodo, peppered turkey.', price: 150000, durationMin: 180, location: 'home', photos: ['Small chops platter', 'Birthday table set-up'] },
    ],
  },
  {
    id: 'prov_emeka', email: 'emeka@closebuy.ng', businessName: 'Coach Emeka', slug: 'coach-emeka', category: 'fitness', area: 'Ikoyi', street: '5 Bourdillon Road', since: 2018, instant: true,
    tagline: 'Personal training that fits your week',
    about: 'Certified trainer focused on strength and fat loss. Train at the studio or at home.',
    hours: { '0': [], '1': [['06:00', '10:00'], ['16:00', '20:00']], '2': [['06:00', '10:00'], ['16:00', '20:00']], '3': [['06:00', '10:00'], ['16:00', '20:00']], '4': [['06:00', '10:00'], ['16:00', '20:00']], '5': [['06:00', '10:00']], '6': [['07:00', '12:00']] },
    services: [
      { key: 'pt', name: 'Personal training session', description: 'One-to-one, programme included.', price: 20000, durationMin: 60, location: 'either', callOutFee: 5000, photos: ['Strength session at the studio', '12-week progress'] },
      { key: 'assessment', name: 'Fitness assessment', description: 'Body composition, mobility and a 4-week plan.', price: 10000, durationMin: 45, location: 'shop', photos: [] },
    ],
  },
  {
    id: 'prov_bright', email: 'brightminds@closebuy.ng', businessName: 'Bright Minds Tutors', slug: 'bright-minds-tutors', category: 'lessons', area: 'Gbagada', street: '11 Diya Street', since: 2021, instant: true,
    tagline: 'WAEC, JAMB & coding for kids',
    about: 'Experienced graduate tutors. Lessons at your home after school and on weekends.',
    hours: { '0': [['14:00', '18:00']], '1': [['15:00', '19:00']], '2': [['15:00', '19:00']], '3': [['15:00', '19:00']], '4': [['15:00', '19:00']], '5': [['15:00', '19:00']], '6': [['09:00', '17:00']] },
    services: [
      { key: 'maths', name: 'WAEC/JAMB maths', description: 'Past questions and exam technique.', price: 8000, durationMin: 60, location: 'home', photos: [] },
      { key: 'coding', name: 'Coding for kids (8–14)', description: 'Scratch, then Python. Laptop needed.', price: 12000, durationMin: 90, location: 'home', photos: ['A first Scratch game', 'Python turtle drawing'] },
    ],
  },
  {
    id: 'prov_lens', email: 'lens@closebuy.ng', businessName: 'Lens & Light', slug: 'lens-and-light', category: 'photo', area: 'Ikeja GRA', street: '2 Oduduwa Crescent', since: 2015, instant: false,
    tagline: 'Portraits, events and products',
    about: 'Studio and on-location photography. Edited photos delivered in 5 working days.',
    hours: weekdays('09:00', '18:00', ['09:00', '18:00']),
    services: [
      { key: 'portrait', name: 'Portrait session', description: '1 look, 10 edited photos.', price: 40000, durationMin: 60, location: 'either', callOutFee: 10000, photos: ['Studio portrait, warm light', 'Outdoor family portrait', 'Graduation portrait'] },
      { key: 'event', name: 'Event coverage (4 hours)', description: '150+ edited photos and a highlights album.', price: 150000, durationMin: 240, location: 'home', photos: ['Wedding reception', 'Corporate dinner'] },
    ],
  },
];

/** The demo store owner's separate service business (same login as vendor@closebuy.ng). */
const VENDOR_SIDE: DemoProvider = {
  id: 'vendor001', email: 'vendor@closebuy.ng', businessName: 'Mama Cass Catering', slug: 'mama-cass-catering', category: 'events', area: 'Surulere', street: '45 Bode Thomas Street', since: 2012, instant: true,
  tagline: 'Party jollof, private chefs & cooking classes',
  about: 'The catering side of Mama Cass Kitchen: we cook at your event or teach you our party jollof.',
  hours: weekdays('09:00', '18:00', ['10:00', '16:00']),
  services: [
    { key: 'privatechef', name: 'Private chef for a dinner', description: 'We cook a 3-course Nigerian dinner in your kitchen for up to 8 guests.', price: 45000, durationMin: 180, location: 'home', callOutFee: 5000, photos: ['Dinner for six', 'Ofada rice and ayamase'] },
    { key: 'cookingclass', name: 'Jollof cooking class', description: 'Learn our party jollof, hands-on, in our kitchen.', price: 15000, durationMin: 120, location: 'shop', photos: ['Class of four', 'Party jollof, the result'] },
  ],
};

const stableId = (...parts: string[]) => createHash('sha1').update(parts.join(':')).digest('hex').slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

/** A clearly-labelled sample photo (a soft gradient), since the demo has no real pictures. The caption is stored with it. */
async function samplePhoto(name: string, _caption: string, i: number): Promise<Buffer | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sharp: any;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    return null; // sharp isn't installed: the demo works without portfolio photos
  }
  const hue = (hueFor(name) + i * 23) % 360;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <defs>
      <radialGradient id="g" cx="${25 + i * 15}%" cy="20%" r="95%"><stop offset="0" stop-color="hsl(${hue},55%,48%)"/><stop offset="0.6" stop-color="hsl(${(hue + 30) % 360},45%,22%)"/><stop offset="1" stop-color="hsl(228,26%,8%)"/></radialGradient>
    </defs>
    <rect width="800" height="800" fill="url(#g)"/>
    <circle cx="${560 - i * 40}" cy="${300 + i * 30}" r="180" fill="white" fill-opacity="0.05"/>
    <circle cx="${230 + i * 30}" cy="${520 - i * 20}" r="120" fill="white" fill-opacity="0.04"/>
    <text x="40" y="64" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" fill="white" fill-opacity="0.75">Sample photo · ${esc(name)}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

export async function seedServices(passwordHash: string): Promise<{ providers: number; services: number; photos: number }> {
  let serviceCount = 0;
  let photoCount = 0;
  for (const p of [...DEMO_PROVIDERS, VENDOR_SIDE]) {
    if (p.id !== 'vendor001') {
      db.insert(users)
        .values({ id: p.id, email: p.email, passwordHash, role: 'provider', displayName: p.businessName, phone: '+2348000000000', createdAt: new Date(), emailVerifiedAt: new Date(), phoneVerifiedAt: new Date(), approvalStatus: 'approved' })
        .onConflictDoNothing()
        .run();
    }
    for (const kind of ['government_id', 'selfie'] as const) {
      db.insert(verificationDocuments).values({ id: `demo-${p.id}-${kind}`, userId: p.id, kind, fileName: 'demo-placeholder', contentType: 'image/png', createdAt: new Date() }).onConflictDoNothing().run();
    }
    const profile = {
      businessName: p.businessName, slug: p.slug, category: p.category, tagline: p.tagline, about: p.about, contactEmail: p.email, phone: '+2348000000000',
      streetAddress: p.street, area: p.area, city: 'Lagos', country: 'Nigeria', since: p.since, approvalStatus: 'approved' as const,
    };
    db.insert(serviceProviders).values({ id: p.id, ...profile, createdAt: new Date() }).onConflictDoUpdate({ target: serviceProviders.id, set: profile }).run();
    db.insert(serviceSettings)
      .values({ providerId: p.id, weeklyHours: JSON.stringify(p.hours), capacity: 1, instantBooking: p.instant, daysOff: '[]', updatedAt: new Date() })
      .onConflictDoNothing()
      .run();
    for (const s of p.services) {
      // vendor001's two services keep the ids they had before the split.
      const id = p.id === 'vendor001' ? (s.key === 'privatechef' ? 'svc_demo_private_chef' : 'svc_demo_cooking_class') : `svc_${p.slug}_${s.key}`;
      db.insert(services)
        .values({ id, providerId: p.id, name: s.name, description: s.description, price: s.price, priceFrom: !!s.priceFrom, durationMin: s.durationMin, location: s.location, callOutFee: s.location === 'shop' ? null : s.callOutFee ?? 0, paused: false, createdAt: new Date() })
        .onConflictDoNothing()
        .run();
      serviceCount++;
      for (let i = 0; i < s.photos.length; i++) {
        const itemId = stableId(id, String(i));
        const exists = db.select({ id: servicePortfolio.id }).from(servicePortfolio).where(eq(servicePortfolio.id, itemId)).get();
        if (exists) continue;
        const img = await samplePhoto(p.businessName, s.photos[i], i);
        if (!img) continue;
        const file = `${itemId}.jpg`;
        await saveFile('public', file, img, 'image/jpeg');
        db.insert(servicePortfolio).values({ id: itemId, serviceId: id, providerId: p.id, imageUrl: `/api/uploads/${file}`, caption: s.photos[i], position: i, createdAt: new Date() }).run();
        photoCount++;
      }
    }
  }
  return { providers: DEMO_PROVIDERS.length + 1, services: serviceCount, photos: photoCount };
}
