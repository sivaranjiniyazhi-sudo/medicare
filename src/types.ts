export interface UserSettings {
  id: string;
  user_id: string;
  shop_name: string;
  shop_address: string;
  gst_number: string;
  phone: string;
  email: string;
  upi_id: string;
  logo_url: string;
  license_number: string;
  printer_size: '58mm' | '80mm';
  show_logo_on_invoice: boolean;
  shop_name_alignment: 'left' | 'center' | 'right';
  invoice_footer_message: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address: string;
  gst_number: string;
  email: string;
  created_at: string;
}

export interface Medicine {
  id: string;
  user_id: string;
  name: string;
  generic_name: string;
  brand_name: string;
  batch_number: string;
  expiry_date: string;
  mrp: number;
  purchase_rate: number;
  selling_rate: number;
  gst_percentage: number;
  current_stock: number;
  supplier_id: string | null;
  barcode: string;
  min_stock_level: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  mobile: string;
  address: string;
  email: string;
  notes: string;
  requires_regular_medicine: boolean;
  medicine_type: string;
  last_reminder_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_mobile: string;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  total: number;
  payment_method: 'cash' | 'card' | 'upi';
  payment_status: 'paid' | 'pending';
  notes: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  user_id: string;
  invoice_id: string;
  medicine_id: string | null;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  mrp: number;
  selling_rate: number;
  discount: number;
  gst_percentage: number;
  total: number;
  created_at: string;
}

export interface StockEntry {
  id: string;
  user_id: string;
  medicine_id: string;
  supplier_id: string | null;
  supplier_invoice_number: string;
  batch_number: string;
  quantity: number;
  purchase_rate: number;
  mrp: number;
  expiry_date: string;
  entry_type: 'purchase' | 'sale' | 'adjustment';
  notes: string;
  created_at: string;
}

export interface Prescription {
  id: string;
  user_id: string;
  customer_id: string | null;
  image_url: string;
  doctor_name: string;
  notes: string;
  created_at: string;
}

export interface CustomerReminder {
  id: string;
  user_id: string;
  customer_id: string;
  reminder_type: 'manual' | 'automatic';
  medicine_type: string;
  message: string;
  scheduled_date: string | null;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  owner_id: string;
  role: 'owner' | 'cashier' | 'pharmacist';
  is_active: boolean;
  created_at: string;
}

export interface CartItem {
  id: string;
  medicine: Medicine;
  quantity: number;
}

export type SubscriptionPlan = 'basic' | 'standard' | 'premium';

export interface PlanDetails {
  name: string;
  price: number;
  features: string[];
}
