
// src/lib/mockData.ts
import type { Order, Vendor, DeliveryAgent, Product, CartItem, Review, ErrandRequest, ErrandQuote, Market } from '@/lib/types';
import placeholderImages from '@/app/lib/placeholder-images.json';

// Real product photos don't exist yet for every Lagos market stall, so new
// items fall back to a labeled placeholder (SafeImage already degrades to
// this same host on a broken/missing image, so it fits the existing look).
const ph = (label: string) => `https://placehold.co/600x400.png?text=${encodeURIComponent(label)}`;

export const sampleProductsForMockOrders: Product[] = [
  { id: 'prod_jollof_party', vendorId: 'vendor001', name: 'Party Jollof Rice', description: 'Smoky Nigerian party jollof with chicken and plantain.', price: 4500, discountPrice: 3800, isAwoof: true, imageUrl: placeholderImages.products.jollof.url, category: 'Food', aiHint: placeholderImages.products.jollof.hint },
  { id: 'prod_yam_tuber', vendorId: 'vendor003', name: 'Large Yam Tuber', description: 'Premium Abuja yam, perfect for boiling or frying.', price: 3200, imageUrl: placeholderImages.products.yam.url, category: 'Groceries', aiHint: placeholderImages.products.yam.hint },
  { id: 'prod_ankara_wax', vendorId: 'vendor002', name: '6 Yards Ankara Wax', description: 'High-quality 100% cotton Ankara fabric with vibrant patterns.', price: 12000, discountPrice: 9500, isAwoof: true, imageUrl: placeholderImages.products.ankara.url, category: 'Apparel', aiHint: placeholderImages.products.ankara.hint },
  { id: 'prod_palmoil_1l', vendorId: 'vendor003', name: '1L Pure Palm Oil', description: 'Freshly pressed red palm oil from the east.', price: 2800, imageUrl: placeholderImages.products.palmoil.url, category: 'Groceries', aiHint: placeholderImages.products.palmoil.hint },
  { id: 'prod_suya_mix', vendorId: 'vendor001', name: 'Beef Suya (Large)', description: 'Spicy grilled beef suya with cabbage and onions.', price: 3500, discountPrice: 2800, isAwoof: true, imageUrl: placeholderImages.products.suya.url, category: 'Food', aiHint: placeholderImages.products.suya.hint },
  { id: 'prod_electronics_phone', vendorId: 'vendor003', name: 'Smart Android Phone', description: 'Budget friendly smartphone with high performance.', price: 85000, imageUrl: placeholderImages.products.electronics.url, category: 'Electronics', aiHint: placeholderImages.products.electronics.hint },
  { id: 'prod_agege_bread', vendorId: 'vendor001', name: 'Agege Bread (Fresh)', description: 'Soft, fluffy, and freshly baked traditional Agege bread.', price: 800, imageUrl: placeholderImages.products.bread.url, category: 'Food', aiHint: placeholderImages.products.bread.hint },
  { id: 'prod_plantain_chips', vendorId: 'vendor003', name: 'Sweet Plantain Chips', description: 'Crunchy and delicious locally made plantain chips.', price: 500, imageUrl: placeholderImages.products.plantain.url, category: 'Groceries', aiHint: placeholderImages.products.plantain.hint },

  // --- Balogun Market (Lagos Island) — additional stalls ---
  { id: 'prod_swiss_lace', vendorId: 'vendor010', name: '5 Yards Swiss Lace', description: 'Premium Swiss voile lace, perfect for owambe and wedding aso-ebi.', price: 25000, discountPrice: 21000, isAwoof: true, imageUrl: ph('Swiss Lace'), category: 'Apparel', aiHint: 'swiss lace fabric' },
  { id: 'prod_asooke_set', vendorId: 'vendor010', name: 'Aso-Oke Wedding Set', description: 'Handwoven Aso-Oke gele, iro and buba set for traditional weddings.', price: 45000, imageUrl: ph('Aso-Oke Set'), category: 'Apparel', aiHint: 'aso oke fabric' },
  { id: 'prod_gele_headtie', vendorId: 'vendor010', name: 'Auto-Gele Head Tie', description: 'Pre-styled auto-gele, ready to wear, no tying skills needed.', price: 8000, imageUrl: ph('Auto-Gele'), category: 'Apparel', aiHint: 'gele head tie' },
  { id: 'prod_gold_chain', vendorId: 'vendor011', name: '18K Gold-Plated Chain', description: 'Durable gold-plated chain necklace, tarnish resistant.', price: 15000, discountPrice: 12500, isAwoof: true, imageUrl: ph('Gold Chain'), category: 'Jewelry', aiHint: 'gold chain jewelry' },
  { id: 'prod_coral_beads', vendorId: 'vendor011', name: 'Coral Bead Wedding Set', description: 'Traditional coral bead necklace and bracelet set for ceremonies.', price: 22000, imageUrl: ph('Coral Beads'), category: 'Jewelry', aiHint: 'coral beads necklace' },
  { id: 'prod_gold_earrings', vendorId: 'vendor011', name: 'Gold-Plated Earring Set', description: 'Elegant drop earrings, gold-plated finish.', price: 6000, imageUrl: ph('Earrings'), category: 'Jewelry', aiHint: 'gold earrings' },

  // --- Mile 12 International Market (Lagos Mainland) ---
  { id: 'prod_tomatoes_basket', vendorId: 'vendor020', name: 'Basket of Fresh Tomatoes', description: 'A full basket of farm-fresh tomatoes, sourced daily from the north.', price: 18000, imageUrl: ph('Fresh Tomatoes'), category: 'Groceries', aiHint: 'fresh tomatoes basket' },
  { id: 'prod_pepper_mix', vendorId: 'vendor020', name: 'Basket of Fresh Pepper Mix', description: 'Mixed tatashe, ata rodo and onion basket, ready for stew.', price: 15000, discountPrice: 12500, isAwoof: true, imageUrl: ph('Pepper Mix'), category: 'Groceries', aiHint: 'fresh pepper mix' },
  { id: 'prod_onions_50kg', vendorId: 'vendor020', name: '50kg Bag of Onions', description: 'Wholesale bag of fresh onions, great for restaurants and resellers.', price: 32000, imageUrl: ph('Onions 50kg'), category: 'Groceries', aiHint: 'bag of onions' },
  { id: 'prod_rice_50kg', vendorId: 'vendor021', name: '50kg Bag of Rice (Mama Gold)', description: 'Long grain parboiled rice, sold in bulk 50kg bags.', price: 68000, imageUrl: ph('Rice 50kg'), category: 'Groceries', aiHint: 'bag of rice' },
  { id: 'prod_beans_50kg', vendorId: 'vendor021', name: '50kg Bag of Brown Beans', description: 'Honey beans (oloyin), sold wholesale by the bag.', price: 55000, imageUrl: ph('Brown Beans'), category: 'Groceries', aiHint: 'bag of beans' },
  { id: 'prod_garri_25kg', vendorId: 'vendor021', name: '25kg Bag of Garri', description: 'Ijebu garri, finely sifted and ready to swallow.', price: 18000, discountPrice: 15500, isAwoof: true, imageUrl: ph('Garri 25kg'), category: 'Groceries', aiHint: 'bag of garri' },
  { id: 'prod_smoked_catfish', vendorId: 'vendor022', name: 'Bundle of Smoked Catfish', description: 'Well-smoked catfish bundle, perfect for soups and stews.', price: 12000, imageUrl: ph('Smoked Catfish'), category: 'Groceries', aiHint: 'smoked catfish' },
  { id: 'prod_fresh_croaker', vendorId: 'vendor022', name: '5kg Fresh Croaker Fish', description: 'Fresh croaker fish, iced and ready for pepper soup or grilling.', price: 20000, discountPrice: 17000, isAwoof: true, imageUrl: ph('Fresh Croaker'), category: 'Groceries', aiHint: 'fresh fish' },
  { id: 'prod_jumbo_prawns', vendorId: 'vendor022', name: '2kg Jumbo Prawns', description: 'Fresh jumbo prawns, cleaned and deveined.', price: 16000, imageUrl: ph('Jumbo Prawns'), category: 'Groceries', aiHint: 'jumbo prawns seafood' },

  // --- Computer Village (Ikeja, Lagos Mainland) ---
  { id: 'prod_android_midrange', vendorId: 'vendor030', name: 'Mid-Range Android Smartphone', description: '128GB/6GB smartphone, great camera, 1-year warranty.', price: 150000, discountPrice: 135000, isAwoof: true, imageUrl: ph('Android Phone'), category: 'Electronics', aiHint: 'android smartphone' },
  { id: 'prod_wireless_earbuds', vendorId: 'vendor030', name: 'Wireless Earbuds', description: 'Bluetooth 5.0 earbuds with charging case.', price: 12000, imageUrl: ph('Earbuds'), category: 'Electronics', aiHint: 'wireless earbuds' },
  { id: 'prod_powerbank_20k', vendorId: 'vendor030', name: '20000mAh Power Bank', description: 'Fast-charging power bank, dual USB output.', price: 15000, imageUrl: ph('Power Bank'), category: 'Electronics', aiHint: 'power bank' },
  { id: 'prod_laptop_i5', vendorId: 'vendor031', name: 'Refurbished Core i5 Laptop', description: '8GB RAM, 256GB SSD, UK-used, tested and graded.', price: 280000, imageUrl: ph('Core i5 Laptop'), category: 'Electronics', aiHint: 'laptop computer' },
  { id: 'prod_laptop_bag', vendorId: 'vendor031', name: 'Padded Laptop Bag', description: 'Water-resistant laptop bag, fits up to 15.6-inch laptops.', price: 9000, imageUrl: ph('Laptop Bag'), category: 'Electronics', aiHint: 'laptop bag' },
  { id: 'prod_screen_repair', vendorId: 'vendor031', name: 'Phone Screen Repair Service', description: 'Same-day screen replacement, most Android and iPhone models.', price: 10000, discountPrice: 8000, isAwoof: true, imageUrl: ph('Screen Repair'), category: 'Electronics', aiHint: 'phone screen repair' },

  // --- Alaba International Market (Ojo, Lagos Mainland) ---
  { id: 'prod_led_tv_43', vendorId: 'vendor040', name: '43-Inch LED Smart TV', description: 'Full HD smart TV with built-in Wi-Fi and streaming apps.', price: 175000, discountPrice: 155000, isAwoof: true, imageUrl: ph('43in Smart TV'), category: 'Electronics', aiHint: 'led smart tv' },
  { id: 'prod_home_theatre', vendorId: 'vendor040', name: 'Home Theatre Sound System', description: '5.1 channel home theatre system with subwoofer.', price: 95000, imageUrl: ph('Home Theatre'), category: 'Electronics', aiHint: 'home theatre sound system' },
  { id: 'prod_dvd_player', vendorId: 'vendor040', name: 'DVD/Bluetooth Player', description: 'DVD player with Bluetooth and USB playback support.', price: 18000, imageUrl: ph('DVD Player'), category: 'Electronics', aiHint: 'dvd player' },
  { id: 'prod_generator_2kva', vendorId: 'vendor041', name: '2KVA Petrol Generator', description: 'Reliable tiger-head 2KVA generator for home backup power.', price: 210000, imageUrl: ph('2KVA Generator'), category: 'Appliances', aiHint: 'petrol generator' },
  { id: 'prod_ac_1hp', vendorId: 'vendor041', name: '1HP Split Air Conditioner', description: 'Energy-saving split unit AC with remote control.', price: 220000, discountPrice: 195000, isAwoof: true, imageUrl: ph('Split AC'), category: 'Appliances', aiHint: 'split air conditioner' },
  { id: 'prod_industrial_blender', vendorId: 'vendor041', name: 'Industrial Blender', description: 'Heavy-duty blender for pepper, tomatoes, and smoothies.', price: 45000, imageUrl: ph('Industrial Blender'), category: 'Appliances', aiHint: 'industrial blender' },

  // --- Tejuosho Market (Yaba, Lagos Mainland) ---
  { id: 'prod_ankara_dress', vendorId: 'vendor050', name: 'Ready-to-Wear Ankara Dress', description: 'Stylish Ankara print dress, available in multiple sizes.', price: 15000, discountPrice: 12000, isAwoof: true, imageUrl: ph('Ankara Dress'), category: 'Apparel', aiHint: 'ankara dress' },
  { id: 'prod_canvas_sneakers', vendorId: 'vendor050', name: 'Unisex Canvas Sneakers', description: 'Comfortable everyday canvas sneakers, multiple colors.', price: 9500, imageUrl: ph('Canvas Sneakers'), category: 'Apparel', aiHint: 'canvas sneakers' },
  { id: 'prod_leather_handbag', vendorId: 'vendor050', name: 'Leather Handbag', description: 'Genuine leather handbag with adjustable strap.', price: 13000, imageUrl: ph('Leather Handbag'), category: 'Apparel', aiHint: 'leather handbag' },
  { id: 'prod_guipure_lace', vendorId: 'vendor051', name: 'Guipure Lace Fabric (5 Yards)', description: 'French guipure lace, ideal for blouses and wrappers.', price: 28000, imageUrl: ph('Guipure Lace'), category: 'Apparel', aiHint: 'guipure lace fabric' },
  { id: 'prod_zipper_pack', vendorId: 'vendor051', name: 'Assorted Zipper & Thread Pack', description: 'Tailoring essentials pack: zippers, thread spools, and buttons.', price: 3500, imageUrl: ph('Zipper Pack'), category: 'Apparel', aiHint: 'tailoring supplies' },
  { id: 'prod_tailoring_consult', vendorId: 'vendor051', name: 'Custom Tailoring Consultation', description: 'Book a fitting session for a custom-made outfit.', price: 5000, imageUrl: ph('Tailoring Consult'), category: 'Apparel', aiHint: 'tailor measuring fabric' },
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
  { id: 'vendor002', businessName: 'Balogun Fabrics Hub', streetAddress: 'Balogun Market, Idumota', city: 'Lagos Island, Lagos', country: 'Nigeria', contactEmail: 'sales@balogunfabrics.com', phone: '08098765432', status: 'Open', operatingHours: '9 AM - 6 PM, Mon-Sat', locationTag: 'Lagos Island', marketId: 'm1', latitude: 6.4550, longitude: 3.3841 },
  { id: 'vendor003', businessName: 'Wuse Grocery Store', streetAddress: 'Wuse Zone 5', city: 'Abuja', country: 'Nigeria', contactEmail: 'support@wusegrocery.com', phone: '09011223344', status: 'Open', operatingHours: '7 AM - 10 PM, Daily', locationTag: 'Abuja Central', latitude: 9.0667, longitude: 7.4833 },

  // --- Balogun Market (m1) — additional stalls ---
  { id: 'vendor010', businessName: 'Alhaja Kudirat Lace & Aso-Oke', streetAddress: 'Balogun Market, Martins Street', city: 'Lagos Island, Lagos', country: 'Nigeria', contactEmail: 'sales@kudiratlace.ng', phone: '08023456789', status: 'Open', operatingHours: '9 AM - 6 PM, Mon-Sat', locationTag: 'Lagos Island', marketId: 'm1', latitude: 6.4552, longitude: 3.3845 },
  { id: 'vendor011', businessName: 'Balogun Gold & Jewelry Emporium', streetAddress: 'Balogun Market, Nnamdi Azikiwe Street', city: 'Lagos Island, Lagos', country: 'Nigeria', contactEmail: 'info@baloguongold.ng', phone: '08034567890', status: 'Open', operatingHours: '9 AM - 6 PM, Mon-Sat', locationTag: 'Lagos Island', marketId: 'm1', latitude: 6.4548, longitude: 3.3838 },

  // --- Mile 12 International Market (m4) ---
  { id: 'vendor020', businessName: 'Iya Basira Fresh Produce', streetAddress: 'Mile 12 Market, Ketu', city: 'Ketu, Lagos', country: 'Nigeria', contactEmail: 'iyabasira@mile12.ng', phone: '08045678901', status: 'Open', operatingHours: '5 AM - 8 PM, Daily', locationTag: 'Lagos Mainland', marketId: 'm4', latitude: 6.5893, longitude: 3.3906 },
  { id: 'vendor021', businessName: 'Mile 12 Grains & Provisions', streetAddress: 'Mile 12 Market, Ketu', city: 'Ketu, Lagos', country: 'Nigeria', contactEmail: 'sales@mile12grains.ng', phone: '08056789012', status: 'Open', operatingHours: '6 AM - 7 PM, Daily', locationTag: 'Lagos Mainland', marketId: 'm4', latitude: 6.5896, longitude: 3.3902 },
  { id: 'vendor022', businessName: 'Coastal Fish & Seafood Depot', streetAddress: 'Mile 12 Market, Ketu', city: 'Ketu, Lagos', country: 'Nigeria', contactEmail: 'orders@coastalfish.ng', phone: '08067890123', status: 'Open', operatingHours: '6 AM - 6 PM, Daily', locationTag: 'Lagos Mainland', marketId: 'm4', latitude: 6.5890, longitude: 3.3910 },

  // --- Computer Village (m5) ---
  { id: 'vendor030', businessName: 'TechHub Phones & Accessories', streetAddress: 'Otigba Street, Computer Village', city: 'Ikeja, Lagos', country: 'Nigeria', contactEmail: 'sales@techhubng.com', phone: '08078901234', status: 'Open', operatingHours: '8 AM - 7 PM, Mon-Sat', locationTag: 'Lagos Mainland', marketId: 'm5', latitude: 6.6018, longitude: 3.3515 },
  { id: 'vendor031', businessName: 'CompuWorld Laptops & Repairs', streetAddress: 'Otigba Street, Computer Village', city: 'Ikeja, Lagos', country: 'Nigeria', contactEmail: 'support@compuworld.ng', phone: '08089012345', status: 'Open', operatingHours: '8 AM - 7 PM, Mon-Sat', locationTag: 'Lagos Mainland', marketId: 'm5', latitude: 6.6021, longitude: 3.3519 },

  // --- Alaba International Market (m6) ---
  { id: 'vendor040', businessName: 'Alaba Electronics Wholesale', streetAddress: 'Alaba International Market', city: 'Ojo, Lagos', country: 'Nigeria', contactEmail: 'wholesale@alabaelectronics.ng', phone: '08090123456', status: 'Open', operatingHours: '8 AM - 6 PM, Mon-Sat', locationTag: 'Lagos Mainland', marketId: 'm6', latitude: 6.4698, longitude: 3.1963 },
  { id: 'vendor041', businessName: 'PowerMax Generators & Appliances', streetAddress: 'Alaba International Market', city: 'Ojo, Lagos', country: 'Nigeria', contactEmail: 'info@powermaxng.com', phone: '08001234567', status: 'Open', operatingHours: '8 AM - 6 PM, Mon-Sat', locationTag: 'Lagos Mainland', marketId: 'm6', latitude: 6.4695, longitude: 3.1959 },

  // --- Tejuosho Market (m7) ---
  { id: 'vendor050', businessName: 'Tejuosho Trendy Fashion House', streetAddress: 'Tejuosho Market Complex', city: 'Yaba, Lagos', country: 'Nigeria', contactEmail: 'hello@tejuoshofashion.ng', phone: '08012349876', status: 'Open', operatingHours: '9 AM - 7 PM, Mon-Sat', locationTag: 'Lagos Mainland', marketId: 'm7', latitude: 6.5117, longitude: 3.3707 },
  { id: 'vendor051', businessName: 'Yaba Fabric & Tailoring Corner', streetAddress: 'Tejuosho Market Complex', city: 'Yaba, Lagos', country: 'Nigeria', contactEmail: 'orders@yabafabric.ng', phone: '08023459876', status: 'Open', operatingHours: '9 AM - 7 PM, Mon-Sat', locationTag: 'Lagos Mainland', marketId: 'm7', latitude: 6.5120, longitude: 3.3711 },
];

export const sampleMarkets: Market[] = [
  { id: 'm1', name: 'Balogun Market', description: 'West Africa\'s largest textile hub. Famous for lace, Ankara, and gold jewelry.', locationTag: 'Lagos Island', imageUrl: placeholderImages.markets.lagos.url, aiHint: placeholderImages.markets.lagos.hint, isTrending: true },
  { id: 'm4', name: 'Mile 12 International Market', description: 'Lagos\' biggest wholesale market for fresh foodstuff — tomatoes, pepper, grains, and produce trucked in daily from across Nigeria.', locationTag: 'Lagos Mainland', imageUrl: placeholderImages.markets.lagos.url, aiHint: 'mile 12 market foodstuff', isTrending: true },
  { id: 'm5', name: 'Computer Village', description: 'Nigeria\'s largest ICT market. Phones, laptops, accessories, and on-the-spot repairs, all in one sprawling Ikeja hub.', locationTag: 'Lagos Mainland', imageUrl: placeholderImages.markets.lagos.url, aiHint: 'computer village electronics market', isTrending: true },
  { id: 'm6', name: 'Alaba International Market', description: 'West Africa\'s biggest electronics and home appliance market, known for wholesale TVs, sound systems, and generators.', locationTag: 'Lagos Mainland', imageUrl: placeholderImages.markets.lagos.url, aiHint: 'alaba market electronics wholesale', isTrending: false },
  { id: 'm7', name: 'Tejuosho Market', description: 'A Yaba landmark rebuilt into a modern complex, known for fashion, fabrics, and everyday essentials.', locationTag: 'Lagos Mainland', imageUrl: placeholderImages.markets.lagos.url, aiHint: 'tejuosho market fashion textiles', isTrending: false },
  { id: 'm2', name: 'Wuse Market', description: 'The primary open-air market in Abuja. Great for fresh food, clothes, and electronics.', locationTag: 'Abuja Central', imageUrl: placeholderImages.markets.abuja.url, aiHint: placeholderImages.markets.abuja.hint, isTrending: true },
  { id: 'm3', name: 'Ogbete Main Market', description: 'The bustling heart of Enugu. Famous for fresh palm oil and agricultural produce.', locationTag: 'Enugu East', imageUrl: placeholderImages.markets.enugu.url, aiHint: placeholderImages.markets.enugu.hint, isTrending: false },
];

export const sampleDeliveryAgents: DeliveryAgent[] = [
  { id: 'agent001', name: 'Chinedu Okeke', email: 'chinedu.o@closebuy.ng', phone: '07033445566', streetAddress: '22 Opebi Road', city: 'Ikeja, Lagos', country: 'Nigeria', vehicleDetails: 'Boxer Motorcycle - Black, Plate: KJA-123-AB', profileManaged: true },
  { id: 'agent002', name: 'Amina Yusuf', email: 'amina.y@closebuy.ng', phone: '07011223344', streetAddress: 'Garki District', city: 'Abuja', country: 'Nigeria', vehicleDetails: 'Scooter - White, Plate: ABJ-456-XY', profileManaged: true },
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
