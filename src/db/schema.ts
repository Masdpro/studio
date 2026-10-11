// Drizzle ORM schema — this file is the single source of truth for the
// database structure. Run `npm run db:push` after changing it to apply
// the change to dev.db (see package.json).

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['customer', 'vendor', 'delivery_agent', 'admin'] }).notNull(),
  displayName: text('display_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  emailVerifiedAt: integer('email_verified_at', { mode: 'timestamp' }),
  phone: text('phone'), // E.164, e.g. +2348012345678
  phoneVerifiedAt: integer('phone_verified_at', { mode: 'timestamp' }),
  // Vendors and delivery agents start 'pending' until an admin reviews their documents.
  approvalStatus: text('approval_status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('approved'),
  approvalNote: text('approval_note'),
});

// One-time email links and phone codes. Only a hash of the secret is stored.
export const verificationCodes = sqliteTable('verification_codes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  channel: text('channel', { enum: ['email', 'phone'] }).notNull(),
  target: text('target').notNull(), // the email address or phone number being verified
  codeHash: text('code_hash').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ID / business documents. Files are stored privately (see src/lib/uploads.ts) and only
// the owner and admins can open them.
export const verificationDocuments = sqliteTable('verification_documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  kind: text('kind', { enum: ['business_proof', 'store_photo', 'government_id', 'selfie'] }).notNull(),
  fileName: text('file_name').notNull(), // name on disk inside the private folder
  contentType: text('content_type').notNull(),
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
  marketId: text('market_id'), // which local market this vendor's stall belongs to, if any
  latitude: real('latitude'),
  longitude: real('longitude'),
  operatingHours: text('operating_hours'),
  status: text('status', { enum: ['Open', 'Closed', 'Opening Soon', 'Temporarily Unavailable'] }).default('Open'),
  externalStoreUrl: text('external_store_url'),
  imageUrl: text('image_url'), // store photo/logo, uploaded by an admin
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
  imageUrl: text('image_url'), // profile photo, uploaded by an admin
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
  agentLatitude: real('agent_latitude'),
  agentLongitude: real('agent_longitude'),
  agentLocationUpdatedAt: integer('agent_location_updated_at', { mode: 'timestamp' }),
  branchId: text('branch_id'), // which vendor branch the order is collected from (null = main address)
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
  category: text('category', { enum: ['Transaction', 'Activity', 'Promotion'] }),
});

export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('NGN'),
});

// One row per Paystack transaction we initialize. Lets the verify step be
// idempotent (Paystack's redirect can fire more than once for one payment)
// and gives an audit trail of what was actually paid for.
export const paymentTransactions = sqliteTable('payment_transactions', {
  id: text('id').primaryKey(), // the Paystack transaction reference
  userId: text('user_id').notNull(),
  purpose: text('purpose', { enum: ['wallet_funding'] }).notNull(),
  amount: real('amount').notNull(), // Naira
  status: text('status', { enum: ['pending', 'success', 'failed'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// First-party usage events (page views, searches, add-to-cart, checkout…).
// Written by POST /api/events and read by the admin analytics dashboard.
export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  sessionId: text('session_id').notNull(), // anonymous per-browser-tab id
  userId: text('user_id'),
  path: text('path'),
  productId: text('product_id'),
  vendorId: text('vendor_id'),
  term: text('term'), // search text
  demo: integer('demo', { mode: 'boolean' }).notNull().default(false), // generated by seed-analytics
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Extra locations of a vendor brand. The vendor's own address (in `vendors`) is
// its main branch; rows here are additional branches sharing the same catalogue.
export const vendorBranches = sqliteTable('vendor_branches', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id').notNull(),
  name: text('name').notNull(), // e.g. "Wuse 2 branch"
  streetAddress: text('street_address').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  locationTag: text('location_tag'),
  marketId: text('market_id'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  phone: text('phone'),
  operatingHours: text('operating_hours'),
  status: text('status', { enum: ['Open', 'Closed', 'Opening Soon', 'Temporarily Unavailable'] }).default('Open'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
