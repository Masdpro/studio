export type Vendor = {
  id: string;
  businessName: string;
  contactEmail: string;
  phone: string;
  address: string;
  profileManaged?: boolean; // To track if profile is filled
};

export type Product = {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category?: string;
  aiHint?: string; // For more specific image hints
};

export type CartItem = {
  productId: string;
  name:string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export type Order = {
  id: string;
  customerId: string;
  vendorId: string; // To know where to pick up from
  items: CartItem[];
  totalAmount: number;
  status:
    | 'Pending'
    | 'Processing'
    | 'ReadyForPickup' // Vendor has prepared it
    | 'AcceptedByAgent' // Agent has accepted the task
    | 'PickedUpByAgent' // Agent scanned at vendor
    | 'Out for Delivery' // After pickup, or synonymous with PickedUpByAgent
    | 'Delivered' // Agent scanned at customer, or after customer confirms
    | 'Cancelled';
  pickupAddress: string; // Vendor's address
  deliveryAddress: string; // Customer's address
  deliveryFee: number; // Payment for the delivery agent
  estimatedDistance?: string; // e.g., "5 km"
  createdAt: Date;
  deliveryAgentId?: string; // Who took the delivery
};

export type TimeWindow = {
  location: string;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
};

export type Wallet = {
  id: string;
  userId: string; // Could be buyer, seller, or delivery agent ID
  balance: number;
  currency: string; // e.g., 'USD'
};

export type DeliveryAgent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  vehicleDetails?: string; // e.g., "Motorcycle - Plate XYZ123"
  walletId?: string;
  profileManaged?: boolean;
};
