-- Add new columns to user_settings for enhanced pharmacy settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS license_number TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS printer_size TEXT DEFAULT '80mm',
ADD COLUMN IF NOT EXISTS show_logo_on_invoice BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS shop_name_alignment TEXT DEFAULT 'center',
ADD COLUMN IF NOT EXISTS invoice_footer_message TEXT DEFAULT 'Thank You! Visit Again';
