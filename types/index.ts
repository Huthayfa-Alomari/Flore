export interface Product {
  id: string;
  name: string;
  name_en: string | null;
  category: 'bouquets' | 'preserved' | 'vases' | 'chocolates' | 'custom' | 'accessories' | 'plants';
  price: number;
  currency: string;
  image: string;
  images: string[];
  description: string | null;
  description_en: string | null;
  badge: string | null;
  badge_color: string | null;
  in_stock: boolean;
  model_url: string | null;
  ar_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customization?: {
    flowers: string[];
    wrap: string;
    vase: string;
    message?: string;
  };
}

export interface OrderItem {
  product_id: string
  name: string
  image: string
  price: number
  qty: number
  customization?: {
    flowers: string[]
    wrap: string
    vase: string
    message?: string
  } | null
}

export interface Order {
  id: string;
  user_id: string | null;
  items: OrderItem[];
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  payment_transaction_id: string | null;
  stripe_session_id: string | null;
  delivery_address: string;
  delivery_region: string | null;
  delivery_notes: string | null;
  customer_phone: string;
  customer_name: string | null;
  gift_message: string | null;
  driver_id: string | null;
  driver_lat: number | null;
  driver_lng: number | null;
  temperature: number | null;
  humidity: number | null;
  estimated_arrival: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  membership: 'classic' | 'golden' | 'vip';
  total_orders: number;
  total_spent: number;
  language: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product: Product;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'driver' | 'customer';
  created_at: string;
}