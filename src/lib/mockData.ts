
// src/lib/mockData.ts
import type { Order, Vendor, DeliveryAgent, Product, CartItem, Review, ErrandRequest, ErrandQuote, Market } from '@/lib/types';
import placeholderImages from '@/app/lib/placeholder-images.json';

export const sampleProductsForMockOrders: Product[] = [
  { id: 'prod_jollof_party', vendorId: 'vendor001', name: 'Party Jollof Rice', description: 'Smoky Nigerian party jollof with chicken and plantain.', price: 4500, imageUrl: placeholderImages.products.jollof.url, category: 'Food', aiHint: placeholderImages.products.jollof.hint },
  { id: 'prod_yam_tuber', vendorId: 'vendor003', name: 'Large Yam Tuber', description: 'Premium Abuja yam, perfect for boiling or frying.', price: 3200, imageUrl: placeholderImages.products.yam.url, category: 'Groceries', aiHint: placeholderImages.products.yam.hint },
  { id: 'prod_ankara_wax', vendorId: 'vendor002', name: '6 Yards Ankara Wax', description: 'High-quality 100% cotton Ankara fabric with vibrant patterns.', price: 12000, imageUrl: placeholderImages.products.ankara.url, category: 'Apparel', aiHint: placeholderImages.products.ankara.hint },
  { id: 'prod_palmoil_1l', vendorId: 'vendor003', name: '1L Pure Palm Oil', description: 'Freshly pressed red palm oil from the east.', price: 2800, imageUrl: placeholderImages.products.palmoil.url, category: 'Groceries', aiHint: placeholderImages.products.palmoil.hint },
  { id: 'prod_suya_mix', vendorId: 'vendor001', name: 'Beef Suya (Large)', description: 'Spicy grilled beef suya with cabbage and onions.', price: 3500, imageUrl: placeholderImages.products.suya.url, category: 'Food', aiHint: placeholderImages.products.suya.hint },
];

const mapProductToCartItem = (product: Product, quantity: number): CartItem => ({
  productId: product.id,
  name: product.name,
  price: product.price,
  quantity,
  imageUrl: product.imageUrl,
  aiHint: product.aiHint,
});

export const sampleVendors: Vendor[] = [
  { id: 'vendor001', businessName: 'Mama Cass Kitchen', streetAddress: '15 Adeniran Ogunsanya St', city: 'Surulere, Lagos', country: 'Nigeria', contactEmail: 'info@mamacass.com', phone: '08012345678', status: 'Open', operatingHours: '8 AM - 9 PM, Daily', locationTag: 'Lagos Mainland', latitude: 6.5059, longitude: 3.3615 },
  { id: 'vendor002', businessName: 'Balogun Fabrics Hub', streetAddress: 'Balogun Market, Idumota', city: 'Lagos Island, Lagos', country: 'Nigeria', contactEmail: 'sales@balogunfabrics.com', phone: '08098765432', status: 'Open', operatingHours: '9 AM - 6 PM, Mon-Sat', locationTag: 'Lagos Island', latitude: 6.4550, longitude: 3.3841 },
  { id: 'vendor003', businessName: 'Wuse Grocery Store', streetAddress: 'Wuse Zone 5', city: 'Abuja', country: 'Nigeria', contactEmail: 'support@wusegrocery.com', phone: '09011223344', status: 'Open', operatingHours: '7 AM - 10 PM, Daily', locationTag: 'Abuja Central', latitude: 9.0667, longitude: 7.4833 },
];

export const sampleMarkets: Market[] = [
  { id: 'm1', name: 'Balogun Market', description: 'West Africa\'s largest textile hub. Famous for lace, Ankara, and gold jewelry.', locationTag: 'Lagos Island', imageUrl: placeholderImages.markets.lagos.url, aiHint: placeholderImages.markets.lagos.hint },
  { id: 'm2', name: 'Wuse Market', description: 'The primary open-air market in Abuja. Great for fresh food, clothes, and electronics.', locationTag: 'Abuja Central', imageUrl: placeholderImages.markets.abuja.url, aiHint: placeholderImages.markets.abuja.hint },
  { id: 'm3', name: 'Ogbete Main Market', description: 'The bustling heart of Enugu. Famous for fresh palm oil and agricultural produce.', locationTag: 'Enugu East', imageUrl: placeholderImages.markets.enugu.url, aiHint: placeholderImages.markets.enugu.hint },
];

export const sampleDeliveryAgents: DeliveryAgent[] = [
  { id: 'agent001', name: 'Chinedu Okeke', email: 'chinedu.o@dailybuy.ng', phone: '07033445566', streetAddress: '22 Opebi Road', city: 'Ikeja, Lagos', country: 'Nigeria', vehicleDetails: 'Boxer Motorcycle - Black, Plate: KJA-123-AB', profileManaged: true },
  { id: 'agent002', name: 'Amina Yusuf', email: 'amina.y@dailybuy.ng', phone: '07011223344', streetAddress: 'Garki District', city: 'Abuja', country: 'Nigeria', vehicleDetails: 'Scooter - White, Plate: ABJ-456-XY', profileManaged: true },
];

export let masterSampleOrders: Order[] = [
  {
    id: 'order001',
    customerId: 'cust001',
    vendorId: 'vendor001',
    items: [mapProductToCartItem(sampleProductsForMockOrders[0], 2)],
    totalAmount: 10500,
    status: 'Processing',
    pickupAddress: 'Mama Cass Kitchen, Surulere',
    deliveryAddress: 'Block 4, 1004 Estate, Victoria Island, Lagos',
    deliveryFee: 1500,
    estimatedDistance: '8 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2),
    deliveryPreference: 'delivery',
  },
  {
    id: 'order002',
    customerId: 'cust002',
    vendorId: 'vendor003',
    items: [mapProductToCartItem(sampleProductsForMockOrders[1], 1)],
    totalAmount: 3200,
    status: 'ReadyForCustomerPickup',
    pickupAddress: 'Wuse Grocery Store, Abuja',
    deliveryAddress: 'Maitama, Abuja',
    deliveryFee: 0,
    estimatedDistance: '3 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 1),
    deliveryPreference: 'pickup',
  }
];

export const sampleReviews: Review[] = [
  { id: 'review001', orderId: 'order001', reviewerId: 'cust001', revieweeType: 'vendor', revieweeId: 'vendor001', rating: 'positive', comment: 'The jollof was spicy and hot! Loved it.', createdAt: new Date(Date.now() - 3600 * 1000 * 23) }
];

export let sampleErrandRequests: ErrandRequest[] = [
  {
    id: 'errand001',
    customerId: 'cust001',
    itemsDescription: '1. 5kg pack of Mama Gold Rice\n2. 3kg of fresh tomatoes and pepper mix\n3. One crate of eggs',
    preferredStore: 'Mile 12 Market',
    deliveryAddress: 'Victoria Island, Lagos',
    status: 'AwaitingAcceptance',
    createdAt: new Date(Date.now() - 3600 * 1000 * 1),
  }
];

export let sampleErrandQuotes: ErrandQuote[] = [
  {
    id: 'quote001',
    errandRequestId: 'errand001',
    agentId: 'agent001',
    estimatedItemCost: 8500,
    deliveryFee: 2000,
    totalEstimatedCost: 10500,
    agentNotes: 'I am currently at Mile 12, can deliver within 2 hours.',
    status: 'Pending',
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.5),
  }
];
