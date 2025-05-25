
// src/lib/mockData.ts
import type { Order, Vendor, DeliveryAgent, Product, CartItem } from '@/lib/types';

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

export const sampleDeliveryAgents: DeliveryAgent[] = [
  { id: 'agent001', name: 'Alex Rider', email: 'alex.rider@example.com', phone: '555-0201', streetAddress: '77 Delivery Lane', city: 'Transporter City', country: 'Agentland', vehicleDetails: 'Scooter - Red Vespa, Plate: RIDE01', profileManaged: true },
  { id: 'agent002', name: 'Sarah Connor', email: 'sarah.connor@example.com', phone: '555-0202', streetAddress: '88 Circuit Rd', city: 'Tech Hub', country: 'Agentland', vehicleDetails: 'Bike - Mountain Pro, Blue', profileManaged: true },
];

export const masterSampleOrders: Order[] = [
  {
    id: 'order001',
    customerId: 'cust001', // John Doe
    vendorId: 'vendor001', // Good Eats Pizzeria
    items: [mapProductToCartItem(sampleProductsForMockOrders[0], 1), mapProductToCartItem(sampleProductsForMockOrders[4], 2)],
    totalAmount: (sampleProductsForMockOrders[0].price * 1) + (sampleProductsForMockOrders[4].price * 2),
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
    status: 'ReadyForCustomerPickup', // Changed for testing
    pickupAddress: `${sampleVendors[0].streetAddress}, ${sampleVendors[0].city}, ${sampleVendors[0].country}`,
    deliveryAddress: 'Jane Smith, 202 Patron Way, Clientville, Tastyland',
    deliveryFee: 0, // No fee for self-pickup
    estimatedDistance: '2 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
    deliveryPreference: 'pickup',
  },
  {
    id: 'order003',
    customerId: 'cust003', // Alice Wonderland
    vendorId: 'vendor002', // Burger Central
    items: [mapProductToCartItem(sampleProductsForMockOrders[1], 2)],
    totalAmount: sampleProductsForMockOrders[1].price * 2,
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
    totalAmount: sampleProductsForMockOrders[3].price * 1,
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
    totalAmount: sampleProductsForMockOrders[4].price * 4,
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
    totalAmount: sampleProductsForMockOrders[0].price * 1,
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
    totalAmount: sampleProductsForMockOrders[4].price * 10,
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
    totalAmount: sampleProductsForMockOrders[1].price * 1,
    status: 'Processing',
    pickupAddress: `${sampleVendors[1].streetAddress}, ${sampleVendors[1].city}, ${sampleVendors[1].country}`,
    deliveryAddress: 'Jane Smith, 202 Patron Way, Clientville, Tastyland',
    deliveryFee: 6.50,
    estimatedDistance: '5.5 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.75), // 45 mins ago
    deliveryPreference: 'delivery', // For testing ReadyForPickup (agent)
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
    deliveryFee: 0, // No fee for self-pickup
    estimatedDistance: '3.5 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 0.1), // 6 minutes ago
    deliveryPreference: 'pickup',
  },
  {
    id: 'order010',
    customerId: 'cust003', // Alice Wonderland
    vendorId: 'vendor003', // QuickMart Groceries
    items: [mapProductToCartItem(sampleProductsForMockOrders[4], 5)],
    totalAmount: sampleProductsForMockOrders[4].price * 5,
    status: 'Processing',
    pickupAddress: `${sampleVendors[2].streetAddress}, ${sampleVendors[2].city}, ${sampleVendors[2].country}`,
    deliveryAddress: 'Alice Wonderland, 303 Buyer Ave, Metroburg, Tastyland',
    deliveryFee: 7.50,
    estimatedDistance: '6.5 km',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5), // 5 hours ago
    deliveryPreference: 'delivery',
  },
   {
    id: 'order011', // New order for testing ReadyForPickup status
    customerId: 'cust001',
    vendorId: 'vendor002', // Burger Central
    items: [mapProductToCartItem(sampleProductsForMockOrders[1], 1)],
    totalAmount: sampleProductsForMockOrders[1].price * 1,
    status: 'ReadyForPickup', // Explicitly set for agent view
    pickupAddress: `${sampleVendors[1].streetAddress}, ${sampleVendors[1].city}, ${sampleVendors[1].country}`,
    deliveryAddress: '123 Test Delivery St, Testville',
    deliveryFee: 3.00,
    estimatedDistance: "1km",
    createdAt: new Date(Date.now() - 3600 * 1000 * 1.5), // 1.5 hours ago
    deliveryPreference: 'delivery',
  },
  {
    id: 'order012', // New order for testing ReadyForCustomerPickup status for customer scan
    customerId: 'cust001', // Changed to cust001 for easier testing in "My Orders"
    vendorId: 'vendor001', // Good Eats Pizzeria
    items: [mapProductToCartItem(sampleProductsForMockOrders[2], 2)],
    totalAmount: sampleProductsForMockOrders[2].price * 2,
    status: 'ReadyForCustomerPickup', // Explicitly set
    pickupAddress: `${sampleVendors[0].streetAddress}, ${sampleVendors[0].city}, ${sampleVendors[0].country}`,
    deliveryAddress: 'John Doe, 101 Customer Rd, Clientville, Tastyland',
    deliveryFee: 0, // No delivery fee for self-pickup
    estimatedDistance: "0km",
    createdAt: new Date(Date.now() - 3600 * 1000 * 2.5), // 2.5 hours ago
    deliveryPreference: 'pickup',
  },
];

