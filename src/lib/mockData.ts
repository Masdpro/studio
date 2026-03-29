
// src/lib/mockData.ts
import type { Order, Vendor, DeliveryAgent, Product, CartItem, Review, ErrandRequest, ErrandQuote, Market } from '@/lib/types';

export const sampleProductsForMockOrders: Product[] = [
  { id: 'prod_pizza_margherita', vendorId: 'vendor001', name: 'Margherita Pizza', description: 'Classic delight with 100% real mozzarella cheese', price: 12.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Foods', aiHint: 'pizza margherita' },
  { id: 'prod_burger_classic', vendorId: 'vendor002', name: 'Classic Beef Burger', description: 'A juicy beef patty with fresh lettuce, tomato, and our secret sauce.', price: 9.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Foods', aiHint: 'burger beef' },
  { id: 'prod_salad_caesar', vendorId: 'vendor001', name: 'Caesar Salad', description: 'Crisp romaine lettuce, Parmesan cheese, croutons, and Caesar dressing.', price: 7.99, imageUrl: 'https://placehold.co/600x400.png', category: 'Foods', aiHint: 'salad caesar' },
  { id: 'prod_pasta_carbonara', vendorId: 'vendor002', name: 'Pasta Carbonara', description: 'Creamy pasta with pancetta and Parmesan cheese.', price: 14.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Foods', aiHint: 'pasta carbonara' },
  { id: 'prod_soft_drink_cola', vendorId: 'vendor001', name: 'Cola Soft Drink', description: 'Refreshing cola beverage.', price: 2.50, imageUrl: 'https://placehold.co/600x400.png', category: 'Groceries', aiHint: 'cola drink' },
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
  { id: 'vendor001', businessName: 'Good Eats Pizzeria', streetAddress: '123 Pizza Pl', city: 'Foodville', country: 'Tastyland', contactEmail: 'contact@goodeats.com', phone: '555-0101', status: 'Open', operatingHours: '11 AM - 10 PM, Daily', locationTag: 'Downtown', latitude: 34.0522, longitude: -118.2437 },
  { id: 'vendor002', businessName: 'Burger Central', streetAddress: '456 Burger Blvd', city: 'Grillburg', country: 'Tastyland', contactEmail: 'info@burgercentral.com', phone: '555-0102', status: 'Open', operatingHours: '10 AM - 9 PM, Daily', locationTag: 'Suburbia', latitude: 34.0000, longitude: -118.3000 },
  { id: 'vendor003', businessName: 'QuickMart Groceries', streetAddress: '789 Aisle Ave', city: 'Shopsville', country: 'Tastyland', contactEmail: 'support@quickmart.com', phone: '555-0103', status: 'Open', operatingHours: '8 AM - 11 PM, Daily', locationTag: 'Uptown', latitude: 40.7831, longitude: -73.9712 },
];

export const sampleMarkets: Market[] = [
  { id: 'm1', name: 'Downtown Central Market', description: 'A historic market in the heart of the city featuring local pizzerias, artisan books, and vintage electronics.', locationTag: 'Downtown', imageUrl: 'https://placehold.co/600x400.png' },
  { id: 'm2', name: 'Suburbia Community Hub', description: 'The go-to spot for suburban families, offering fresh apparel, home comforts, and local produce.', locationTag: 'Suburbia', imageUrl: 'https://placehold.co/600x400.png' },
  { id: 'm3', name: 'Uptown Gourmet Plaza', description: 'A sophisticated collection of fine dining, specialty grocery stores, and premium sports retailers.', locationTag: 'Uptown', imageUrl: 'https://placehold.co/600x400.png' },
];

export const sampleDeliveryAgents: DeliveryAgent[] = [
  { id: 'agent001', name: 'Alex Rider', email: 'alex.rider@example.com', phone: '555-0201', streetAddress: '77 Delivery Lane', city: 'Transporter City', country: 'Agentland', vehicleDetails: 'Scooter - Red Vespa, Plate: RIDE01', profileManaged: true },
  { id: 'agent002', name: 'Sarah Connor', email: 'sarah.connor@example.com', phone: '555-0202', streetAddress: '88 Circuit Rd', city: 'Tech Hub', country: 'Agentland', vehicleDetails: 'Bike - Mountain Pro, Blue', profileManaged: true },
];

export let masterSampleOrders: Order[] = [ // Changed to let for potential in-memory updates if needed
  {
    id: 'order001',
    customerId: 'cust001', // John Doe
    vendorId: 'vendor001', // Good Eats Pizzeria
    items: [mapProductToCartItem(sampleProductsForMockOrders[0], 1), mapProductToCartItem(sampleProductsForMockOrders[4], 2)],
    totalAmount: (sampleProductsForMockOrders[0].price * 1) + (sampleProductsForMockOrders[4].price * 2) + 5.00,
    status: 'Processing',
    pickupAddress: `${sampleVendors[0].streetAddress}, ${sampleVendors[0].city}, ${sampleVendors[0].country}`,
    deliveryAddress: 'John Doe, 101 Customer Rd, Clientville, Tastyland',
    deliveryFee: 5.00,
    estimatedDistance: '3 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago
    deliveryPreference: 'delivery',
  },
  {
    id: 'order002',
    customerId: 'cust002', // Jane Smith
    vendorId: 'vendor001', // Good Eats Pizzeria
    items: [mapProductToCartItem(sampleProductsForMockOrders[2], 1)],
    totalAmount: sampleProductsForMockOrders[2].price * 1,
    status: 'ReadyForCustomerPickup',
    pickupAddress: `${sampleVendors[0].streetAddress}, ${sampleVendors[0].city}, ${sampleVendors[0].country}`,
    deliveryAddress: 'Jane Smith, 202 Patron Way, Clientville, Tastyland',
    deliveryFee: 0,
    estimatedDistance: '2 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
    deliveryPreference: 'pickup',
  },
  {
    id: 'order003',
    customerId: 'cust003', // Alice Wonderland
    vendorId: 'vendor002', // Burger Central
    items: [mapProductToCartItem(sampleProductsForMockOrders[1], 2)],
    totalAmount: (sampleProductsForMockOrders[1].price * 2) + 6.00,
    status: 'AcceptedByAgent',
    pickupAddress: `${sampleVendors[1].streetAddress}, ${sampleVendors[1].city}, ${sampleVendors[1].country}`,
    deliveryAddress: 'Alice Wonderland, 303 Buyer Ave, Metroburg, Tastyland',
    deliveryFee: 6.00,
    estimatedDistance: '5 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 3), // 3 hours ago
    deliveryAgentId: 'agent001', // Alex Rider
    deliveryPreference: 'delivery',
  },
  {
    id: 'order004',
    customerId: 'cust001', // John Doe
    vendorId: 'vendor002', // Burger Central
    items: [mapProductToCartItem(sampleProductsForMockOrders[3], 1)],
    totalAmount: (sampleProductsForMockOrders[3].price * 1) + 5.50,
    status: 'PickedUpByAgent',
    pickupAddress: `${sampleVendors[1].streetAddress}, ${sampleVendors[1].city}, ${sampleVendors[1].country}`,
    deliveryAddress: 'John Doe, 101 Customer Rd, Clientville, Tastyland',
    deliveryFee: 5.50,
    estimatedDistance: '4 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.5), // 30 mins ago
    deliveryAgentId: 'agent001', // Alex Rider
    deliveryPreference: 'delivery',
  },
  {
    id: 'order005',
    customerId: 'cust002', // Jane Smith
    vendorId: 'vendor003', // QuickMart Groceries
    items: [mapProductToCartItem(sampleProductsForMockOrders[4], 4)],
    totalAmount: (sampleProductsForMockOrders[4].price * 4) + 7.00,
    status: 'Out for Delivery',
    pickupAddress: `${sampleVendors[2].streetAddress}, ${sampleVendors[2].city}, ${sampleVendors[2].country}`,
    deliveryAddress: 'Jane Smith, 202 Patron Way, Clientville, Tastyland',
    deliveryFee: 7.00,
    estimatedDistance: '6 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.25), // 15 mins ago
    deliveryAgentId: 'agent002', // Sarah Connor
    deliveryPreference: 'delivery',
  },
  {
    id: 'order006',
    customerId: 'cust003', // Alice Wonderland
    vendorId: 'vendor001', // Good Eats Pizzeria
    items: [mapProductToCartItem(sampleProductsForMockOrders[0], 1)],
    totalAmount: (sampleProductsForMockOrders[0].price * 1) + 4.00,
    status: 'Delivered',
    pickupAddress: `${sampleVendors[0].streetAddress}, ${sampleVendors[0].city}, ${sampleVendors[0].country}`,
    deliveryAddress: 'Alice Wonderland, 303 Buyer Ave, Metroburg, Tastyland',
    deliveryFee: 4.00,
    estimatedDistance: '1.5 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24), // 1 day ago
    deliveryAgentId: 'agent002', // Sarah Connor
    deliveryPreference: 'delivery',
  },
   {
    id: 'order007',
    customerId: 'cust001', // John Doe
    vendorId: 'vendor003', // QuickMart Groceries
    items: [mapProductToCartItem(sampleProductsForMockOrders[4], 10)],
    totalAmount: (sampleProductsForMockOrders[4].price * 10) + 8.00,
    status: 'Cancelled',
    pickupAddress: `${sampleVendors[2].streetAddress}, ${sampleVendors[2].city}, ${sampleVendors[2].country}`,
    deliveryAddress: 'John Doe, 101 Customer Rd, Clientville, Tastyland',
    deliveryFee: 8.00,
    estimatedDistance: '7 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 48), // 2 days ago
    deliveryPreference: 'delivery',
  },
  {
    id: 'order008',
    customerId: 'cust002', // Jane Smith
    vendorId: 'vendor002', // Burger Central
    items: [mapProductToCartItem(sampleProductsForMockOrders[1], 1)],
    totalAmount: (sampleProductsForMockOrders[1].price * 1) + 6.50,
    status: 'Processing',
    pickupAddress: `${sampleVendors[1].streetAddress}, ${sampleVendors[1].city}, ${sampleVendors[1].country}`,
    deliveryAddress: 'Jane Smith, 202 Patron Way, Clientville, Tastyland',
    deliveryFee: 6.50,
    estimatedDistance: '5.5 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.75), // 45 mins ago
    deliveryPreference: 'delivery',
  },
  {
    id: 'order009',
    customerId: 'cust001', // John Doe
    vendorId: 'vendor001', // Good Eats Pizzeria
    items: [mapProductToCartItem(sampleProductsForMockOrders[0], 3)],
    totalAmount: (sampleProductsForMockOrders[0].price * 3),
    status: 'Pending',
    pickupAddress: `${sampleVendors[0].streetAddress}, ${sampleVendors[0].city}, ${sampleVendors[0].country}`,
    deliveryAddress: 'John Doe, 101 Customer Rd, Clientville, Tastyland',
    deliveryFee: 0,
    estimatedDistance: '3.5 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.1), // 6 minutes ago
    deliveryPreference: 'pickup',
  },
  {
    id: 'order010',
    customerId: 'cust003', // Alice Wonderland
    vendorId: 'vendor003', // QuickMart Groceries
    items: [mapProductToCartItem(sampleProductsForMockOrders[4], 5)],
    totalAmount: (sampleProductsForMockOrders[4].price * 5) + 7.50,
    status: 'Processing',
    pickupAddress: `${sampleVendors[2].streetAddress}, ${sampleVendors[2].city}, ${sampleVendors[2].country}`,
    deliveryAddress: 'Alice Wonderland, 303 Buyer Ave, Metroburg, Tastyland',
    deliveryFee: 7.50,
    estimatedDistance: '6.5 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5), // 5 hours ago
    deliveryPreference: 'delivery',
  },
   {
    id: 'order011',
    customerId: 'cust001',
    vendorId: 'vendor002', // Burger Central
    items: [mapProductToCartItem(sampleProductsForMockOrders[1], 1)],
    totalAmount: (sampleProductsForMockOrders[1].price * 1) + 3.00,
    status: 'ReadyForPickup',
    pickupAddress: `${sampleVendors[1].streetAddress}, ${sampleVendors[1].city}, ${sampleVendors[1].country}`,
    deliveryAddress: '123 Test Delivery St, Testville',
    deliveryFee: 3.00,
    estimatedDistance: "1km",
    createdAt: new Date(Date.now() - 3600 * 1000 * 1.5), // 1.5 hours ago
    deliveryPreference: 'delivery',
  },
  {
    id: 'order012',
    customerId: 'cust001',
    vendorId: 'vendor001', // Good Eats Pizzeria
    items: [mapProductToCartItem(sampleProductsForMockOrders[2], 2)],
    totalAmount: sampleProductsForMockOrders[2].price * 2,
    status: 'PickedUpByCustomer', // Changed to allow testing "Leave Review" for self-pickup
    pickupAddress: `${sampleVendors[0].streetAddress}, ${sampleVendors[0].city}, ${sampleVendors[0].country}`,
    deliveryAddress: 'John Doe, 101 Customer Rd, Clientville, Tastyland',
    deliveryFee: 0,
    estimatedDistance: "0km",
    createdAt: new Date(Date.now() - 3600 * 1000 * 26), // 26 hours ago
    deliveryPreference: 'pickup',
  },
];

export const sampleReviews: Review[] = [
  // Reviews for vendor001
  { id: 'review001', orderId: 'order006', reviewerId: 'cust003', revieweeType: 'vendor', revieweeId: 'vendor001', rating: 'positive', comment: 'Great pizza, fast delivery!', createdAt: new Date(Date.now() - 3600 * 1000 * 23) },
  { id: 'review002', orderId: 'order001', reviewerId: 'cust001', revieweeType: 'vendor', revieweeId: 'vendor001', rating: 'positive', comment: 'Always good!', createdAt: new Date(Date.now() - 3600 * 1000 * 1) },
  { id: 'review003', orderId: 'order002', reviewerId: 'cust002', revieweeType: 'vendor', revieweeId: 'vendor001', rating: 'negative', comment: 'Salad was a bit wilted.', createdAt: new Date(Date.now() - 3600 * 1000 * 0.5) },
  // Reviews for vendor002
  { id: 'review004', orderId: 'order003', reviewerId: 'cust003', revieweeType: 'vendor', revieweeId: 'vendor002', rating: 'positive', comment: 'Burgers are amazing!', createdAt: new Date(Date.now() - 3600 * 1000 * 2) },
  { id: 'review005', orderId: 'order004', reviewerId: 'cust001', revieweeType: 'vendor', revieweeId: 'vendor002', rating: 'positive', createdAt: new Date(Date.now() - 3600 * 1000 * 0.2) },
  // Reviews for vendor003
  { id: 'review006', orderId: 'order005', reviewerId: 'cust002', revieweeType: 'vendor', revieweeId: 'vendor003', rating: 'negative', comment: 'Took too long to prepare.', createdAt: new Date(Date.now() - 3600 * 1000 * 0.1) },
  // Reviews for agent001
  { id: 'review007', orderId: 'order003', reviewerId: 'cust003', revieweeType: 'delivery_agent', revieweeId: 'agent001', rating: 'positive', comment: 'Alex was very polite.', createdAt: new Date(Date.now() - 3600 * 1000 * 2) },
  { id: 'review008', orderId: 'order004', reviewerId: 'cust001', revieweeType: 'delivery_agent', revieweeId: 'agent001', rating: 'positive', createdAt: new Date(Date.now() - 3600 * 1000 * 0.2) },
  // Reviews for agent002
  { id: 'review009', orderId: 'order006', reviewerId: 'cust003', revieweeType: 'delivery_agent', revieweeId: 'agent002', rating: 'negative', comment: 'Agent seemed rushed.', createdAt: new Date(Date.now() - 3600 * 1000 * 23) },
  { id: 'review010', orderId: 'order005', reviewerId: 'cust002', revieweeType: 'delivery_agent', revieweeId: 'agent002', rating: 'positive', comment: 'Friendly and on time!', createdAt: new Date(Date.now() - 3600 * 1000 * 0.1) },
];

// Mock Errand Data
export let sampleErrandRequests: ErrandRequest[] = [
  {
    id: 'errand001',
    customerId: 'cust001', // John Doe
    itemsDescription: '1. Gallon of Milk (2%)\n2. Loaf of Sourdough Bread\n3. Dozen Eggs (Large, Grade A)\n4. Bunch of Bananas',
    preferredStore: 'QuickMart Groceries',
    deliveryAddress: 'John Doe, 101 Customer Rd, Clientville, Tastyland',
    status: 'AwaitingAcceptance', // Changed status for testing quote viewing
    createdAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
  },
  {
    id: 'errand002',
    customerId: 'cust002', // Jane Smith
    itemsDescription: 'Pick up dry cleaning from "Sparkle Cleaners" on Main St. Receipt #DC12345.',
    deliveryAddress: 'Jane Smith, 202 Patron Way, Clientville, Tastyland',
    status: 'AgentAssigned', 
    assignedAgentId: 'agent001',
    acceptedQuoteId: 'quote001_for_errand002',
    estimatedTotalItemCost: 15.00, 
    deliveryFee: 7.00, 
    createdAt: new Date(Date.now() - 3600 * 1000 * 3), 
  },
  {
    id: 'errand003',
    customerId: 'cust003',
    itemsDescription: 'Get 2 packs of AAA batteries and a birthday card (general, funny) from any convenience store.',
    deliveryAddress: 'Alice Wonderland, 303 Buyer Ave, Metroburg, Tastyland',
    status: 'Delivered',
    assignedAgentId: 'agent002',
    acceptedQuoteId: 'quote002_for_errand003',
    finalTotalItemCost: 8.50,
    deliveryFee: 5.00,
    finalTotalCost: 13.50,
    createdAt: new Date(Date.now() - 3600 * 1000 * 25), 
  },
  {
    id: 'errand004',
    customerId: 'cust001',
    itemsDescription: 'Buy a small potted plant (succulent or similar) from "Green Thumb Nursery".',
    preferredStore: 'Green Thumb Nursery',
    deliveryAddress: 'John Doe, 101 Customer Rd, Clientville, Tastyland',
    status: 'PendingQuotes', // This one has no quotes yet for agents to bid on
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.2), // 12 mins ago
  },
];

export let sampleErrandQuotes: ErrandQuote[] = [ // Changed to let
  {
    id: 'quote001_for_errand002',
    errandRequestId: 'errand002',
    agentId: 'agent001',
    estimatedItemCost: 15.00, // Dry cleaning cost
    deliveryFee: 7.00,
    totalEstimatedCost: 22.00,
    agentNotes: 'Can pick up within the hour.',
    status: 'Accepted',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2.5), 
  },
  {
    id: 'quote002_for_errand003',
    errandRequestId: 'errand003',
    agentId: 'agent002',
    estimatedItemCost: 7.00,
    deliveryFee: 5.00,
    totalEstimatedCost: 12.00,
    status: 'Accepted',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24.5),
  },
  // Quotes for errand001 (status: AwaitingAcceptance)
  {
    id: 'quote003_for_errand001',
    errandRequestId: 'errand001',
    agentId: 'agent001', // Alex Rider
    estimatedItemCost: 18.50,
    deliveryFee: 6.00,
    totalEstimatedCost: 24.50,
    agentNotes: 'I know QuickMart well, can get these quickly.',
    status: 'Pending',
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.5), 
  },
  {
    id: 'quote004_for_errand001',
    errandRequestId: 'errand001',
    agentId: 'agent002', // Sarah Connor
    estimatedItemCost: 19.00,
    deliveryFee: 5.50,
    totalEstimatedCost: 24.50,
    agentNotes: 'Happy to help with your shopping!',
    status: 'Pending',
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.4), 
  },
];
