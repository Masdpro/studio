// Shapes returned by the Closebuy APIs (mirrors src/lib/types.ts on the server).
export type Role = 'customer' | 'vendor' | 'delivery_agent' | 'provider' | 'admin' | 'branch';

export type User = { id: string; email: string; name: string; role: string; roles: Role[]; ownVendorId: string | null };

export type Market = { id: string; name: string; description: string; locationTag: string; imageUrl: string; isTrending?: boolean };

export type Vendor = {
  id: string;
  slug?: string;
  businessName: string;
  phone: string;
  streetAddress: string;
  city: string;
  country: string;
  imageUrl?: string;
  locationTag?: string;
  marketId?: string;
  latitude?: number;
  longitude?: number;
  operatingHours?: string;
  status?: 'Open' | 'Closed' | 'Opening Soon' | 'Temporarily Unavailable';
};

export type Branch = {
  id: string;
  vendorId: string;
  name: string;
  streetAddress: string;
  city: string;
  country: string;
  locationTag?: string;
  marketId?: string;
  phone?: string;
  operatingHours?: string;
  status?: Vendor['status'];
  imageUrl?: string;
};

export type Product = {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  imageUrl: string;
  category?: string;
  isAwoof?: boolean;
  branchId?: string;
  galleryImages?: string[];
  videoUrl?: string;
  colors?: string[];
  sizes?: string[];
  stock?: number;
  paused?: boolean;
  lowStockAt?: number;
  variantStock?: { color: string; size: string; quantity: number }[];
};

export type CartItem = {
  productId: string;
  vendorId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  color?: string;
  size?: string;
  maxQuantity?: number;
};

export type Order = {
  id: string;
  customerId: string;
  vendorId: string;
  items: CartItem[];
  totalAmount: number;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  deliveryFee: number;
  createdAt: string;
  deliveryAgentId?: string;
  deliveryPreference: 'delivery' | 'pickup';
  agentLatitude?: number;
  agentLongitude?: number;
  branchId?: string;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceFrom: boolean;
  durationMin: number;
  location: 'shop' | 'home' | 'either';
  callOutFee: number | null;
  portfolioCount: number;
  cover: string | null;
};

export type PublicProvider = {
  id: string;
  slug: string;
  businessName: string;
  category: string;
  tagline: string | null;
  about: string | null;
  area: string;
  city: string;
  imageUrl: string | null;
  since: number | null;
  instantBooking: boolean;
  weeklyHours: unknown;
  nextFree: { at: number; label: string; today: boolean } | null;
  services: PublicService[];
};

export type Catalog = { products: Product[]; vendors: Vendor[]; markets: Market[]; branches: Branch[]; providers: PublicProvider[] };

export type Notification = { id: string; message: string; createdAt: string; read: boolean; link?: string; category?: string };

export type Errand = { id: string; itemsDescription: string; preferredStore?: string; deliveryAddress: string; status: string; createdAt: string; finalTotalCost?: number; estimatedTotalItemCost?: number; deliveryFee?: number };


export type ProService = { id: string; name: string; description: string | null; price: number; priceFrom: boolean; durationMin: number; location: 'shop' | 'home' | 'either'; callOutFee: number | null; paused: boolean; portfolio: { id: string; imageUrl: string; caption: string | null }[] };

