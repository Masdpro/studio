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
  items: CartItem[];
  totalAmount: number;
  status: 'Pending' | 'Processing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  deliveryAddress: string;
  createdAt: Date;
};

export type TimeWindow = {
  location: string;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
};

export type Wallet = {
  id: string;
  userId: string; // Could be buyer or seller ID
  balance: number;
  currency: string; // e.g., 'USD'
};
