-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Settings (Shop details)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_name TEXT NOT NULL DEFAULT 'My Pharmacy',
  shop_address TEXT DEFAULT '',
  gst_number TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  gst_number TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medicines
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  generic_name TEXT DEFAULT '',
  brand_name TEXT DEFAULT '',
  batch_number TEXT DEFAULT '',
  expiry_date DATE,
  mrp DECIMAL(10,2) NOT NULL DEFAULT 0,
  purchase_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  barcode TEXT DEFAULT '',
  min_stock_level INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  requires_regular_medicine BOOLEAN DEFAULT FALSE,
  medicine_type TEXT DEFAULT '', -- BP, Diabetes, Thyroid, etc.
  last_reminder_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT DEFAULT '',
  customer_mobile TEXT DEFAULT '',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  cgst DECIMAL(10,2) NOT NULL DEFAULT 0,
  sgst DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- cash, card, upi
  payment_status TEXT NOT NULL DEFAULT 'paid', -- paid, pending
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, invoice_number)
);

-- Invoice Items
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  batch_number TEXT DEFAULT '',
  expiry_date DATE,
  quantity INTEGER NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  selling_rate DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  gst_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Entries (Purchase entries)
CREATE TABLE stock_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_invoice_number TEXT DEFAULT '',
  batch_number TEXT DEFAULT '',
  quantity INTEGER NOT NULL,
  purchase_rate DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  expiry_date DATE,
  entry_type TEXT NOT NULL DEFAULT 'purchase', -- purchase, sale, adjustment
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  doctor_name TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Reminders
CREATE TABLE customer_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL, -- manual, automatic
  medicine_type TEXT DEFAULT '',
  message TEXT DEFAULT '',
  scheduled_date DATE,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles (for multi-user support)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- The pharmacy owner
  role TEXT NOT NULL DEFAULT 'cashier', -- owner, cashier, pharmacist
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, owner_id)
);

-- Enable RLS on all tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for suppliers
CREATE POLICY "select_own_suppliers" ON suppliers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_suppliers" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_suppliers" ON suppliers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_suppliers" ON suppliers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for medicines
CREATE POLICY "select_own_medicines" ON medicines FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_medicines" ON medicines FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_medicines" ON medicines FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_medicines" ON medicines FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for customers
CREATE POLICY "select_own_customers" ON customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_customers" ON customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_customers" ON customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for invoices
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for invoice_items
CREATE POLICY "select_own_invoice_items" ON invoice_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_invoice_items" ON invoice_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_invoice_items" ON invoice_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for stock_entries
CREATE POLICY "select_own_stock_entries" ON stock_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_stock_entries" ON stock_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS Policies for prescriptions
CREATE POLICY "select_own_prescriptions" ON prescriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_prescriptions" ON prescriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_prescriptions" ON prescriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for customer_reminders
CREATE POLICY "select_own_reminders" ON customer_reminders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_reminders" ON customer_reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_reminders" ON customer_reminders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_reminders" ON customer_reminders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "select_own_roles" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = owner_id);
CREATE POLICY "insert_own_roles" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_roles" ON user_roles FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_roles" ON user_roles FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Create indexes for better performance
CREATE INDEX idx_medicines_user_id ON medicines(user_id);
CREATE INDEX idx_medicines_barcode ON medicines(barcode);
CREATE INDEX idx_medicines_expiry ON medicines(expiry_date);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_mobile ON customers(mobile);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_date ON invoices(created_at);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_stock_entries_medicine ON stock_entries(medicine_id);
CREATE INDEX idx_customer_reminders_customer ON customer_reminders(customer_id);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'INV';
  today DATE := CURRENT_DATE;
  count INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO count
  FROM invoices
  WHERE user_id = user_uuid AND DATE(created_at) = today;
  
  invoice_num := prefix || '-' || TO_CHAR(today, 'YYYYMMDD') || '-' || LPAD(count::TEXT, 4, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;