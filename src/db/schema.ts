// Drizzle ORM schema — this file is the single source of truth for the
// database structure. Run `npm run db:push` after changing it to apply
// the change to dev.db (see package.json).

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['customer', 'vendor', 'delivery_agent'] }).notNull(),
  displayName: text('display_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const markets = sqliteTable('markets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  locationTag: text('location_tag').notNull(),
  imageUrl: text('image_url').notNull(),
  aiHint: text('ai_hint'),
  isTrending: integer('is_trending', { mode: 'boolean' }).default(false),
});

export const vendors = sqliteTable('vendors', {
  id: text('id').primaryKey(), // matches users.id for the vendor's account
  businessName: text('business_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  phone: text('phone').notNull(),
  streetAddress: text('street_address').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  locationTag: text('location_tag'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  operatingHours: text('operating_hours'),
  status: text('status', { enum: ['Open', 'Closed', 'Opening Soon', 'Temporarily Unavailable'] }).default('Open'),
  externalStoreUrl: text('external_store_url'),
  profileManaged: integer('profile_managed', { mode: 'boolean' }).default(false),
});

export const deliveryAgents = sqliteTable('delivery_agents', {
  id: text('id').primaryKey(), // matches users.id for the agent's account
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  streetAddress: text('street_address').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  vehicleDetails: text('vehicle_details'),
  profileManaged: integer('profile_managed', { mode: 'boolean' }).default(false),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: real('price').notNull(),
  discountPrice: real('discount_price'),
  imageUrl: text('image_url').notNull(),
  category: text('category'),
  aiHint: text('ai_hint'),
  isAwoof: integer('is_awoof', { mode: 'boolean' }).default(false),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  vendorId: text('vendor_id').notNull(),
  itemsJson: text('items_json').notNull(), // serialized CartItem[]
  totalAmount: real('total_amount').notNull(),
  status: text('status').notNull(),
  pickupAddress: text('pickup_address').notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  deliveryFee: real('delivery_fee').notNull(),
  estimatedDistance: text('estimated_distance'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  deliveryAgentId: text('delivery_agent_id'),
  deliveryPreference: text('delivery_preference', { enum: ['delivery', 'pickup'] }).notNull(),
});

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  reviewerId: text('reviewer_id').notNull(),
  revieweeType: text('reviewee_type', { enum: ['vendor', 'delivery_agent'] }).notNull(),
  revieweeId: text('reviewee_id').notNull(),
  rating: text('rating', { enum: ['positive', 'negative'] }).notNull(),
  comment: text('comment'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const errandRequests = sqliteTable('errand_requests', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  itemsDescription: text('items_description').notNull(),
  preferredStore: text('preferred_store'),
  deliveryAddress: text('delivery_address').notNull(),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  assignedAgentId: text('assigned_agent_id'),
  acceptedQuoteId: text('accepted_quote_id'),
  estimatedTotalItemCost: real('estimated_total_item_cost'),
  finalTotalItemCost: real('final_total_item_cost'),
  deliveryFee: real('delivery_fee'),
  finalTotalCost: real('final_total_cost'),
});

export const errandQuotes = sqliteTable('errand_quotes', {
  id: text('id').primaryKey(),
  errandRequestId: text('errand_request_id').notNull(),
  agentId: text('agent_id').notNull(),
  estimatedItemCost: real('estimated_item_cost').notNull(),
  deliveryFee: real('delivery_fee').notNull(),
  totalEstimatedCost: real('total_estimated_cost').notNull(),
  agentNotes: text('agent_notes'),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  message: text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  read: integer('read', { mode: 'boolean' }).default(false),
  link: text('link'),
  iconName: text('icon_name'),
  category: text('category', { enum: ['Order', 'Account', 'Promotion', 'System'] }),
});

export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('NGN'),
});
