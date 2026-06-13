import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Store, MapPin, Phone, Mail, CreditCard, Save, Check, Camera, Trash2,
  FileText, Printer, AlignLeft, AlignCenter, AlignRight, MessageSquare
} from 'lucide-react';

export function SettingsView() {
  const { settings, updateSettings } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    shop_name: '',
    shop_address: '',
    gst_number: '',
    phone: '',
    email: '',
    upi_id: '',
    logo_url: '',
    license_number: '',
    printer_size: '80mm' as '58mm' | '80mm',
    show_logo_on_invoice: true,
    shop_name_alignment: 'center' as 'left' | 'center' | 'right',
    invoice_footer_message: 'Thank You! Visit Again',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        shop_name: settings.shop_name || '',
        shop_address: settings.shop_address || '',
        gst_number: settings.gst_number || '',
        phone: settings.phone || '',
        email: settings.email || '',
        upi_id: settings.upi_id || '',
        logo_url: settings.logo_url || '',
        license_number: (settings as any).license_number || '',
        printer_size: (settings as any).printer_size || '80mm',
        show_logo_on_invoice: (settings as any).show_logo_on_invoice ?? true,
        shop_name_alignment: (settings as any).shop_name_alignment || 'center',
        invoice_footer_message: (settings as any).invoice_footer_message || 'Thank You! Visit Again',
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logos/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('pharmacy')
        .upload(fileName, file, { upsert: true });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('pharmacy')
          .getPublicUrl(fileName);

        setFormData({ ...formData, logo_url: publicUrl });
      } else {
        alert('Failed to upload logo. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload logo.');
    }

    setUploading(false);
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo_url: '' });
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateSettings(formData);
    setSaving(false);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert('Failed to save settings. Please try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pharmacy Settings</h1>
        <p className="text-gray-500">Configure your pharmacy details - these will appear on all invoices</p>
      </div>

      {/* Logo Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pharmacy Logo</h2>

        <div className="flex items-center gap-6">
          {formData.logo_url ? (
            <div className="relative">
              <img
                src={formData.logo_url}
                alt="Pharmacy Logo"
                className="w-24 h-24 object-contain rounded-xl border border-gray-200 bg-gray-50"
              />
              <button
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Camera className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Upload</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              Upload your pharmacy logo. This will appear on printed invoices and bills.
            </p>
            <p className="text-xs text-gray-400 mt-1">Recommended: Square image, 200x200px or larger</p>
          </div>
        </div>
      </div>

      {/* Shop Details */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Pharmacy Details</h2>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Store className="w-4 h-4" />
              Pharmacy Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.shop_name}
              onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Your Pharmacy Name"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              Pharmacy Address
            </label>
            <textarea
              value={formData.shop_address}
              onChange={(e) => setFormData({ ...formData, shop_address: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              placeholder="Complete address with shop number, street, city, state, pincode"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">GST Number</label>
              <input
                type="text"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">License Number</label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="DL License Number"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Contact Details</h2>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="pharmacy@email.com"
            />
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Settings</h2>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="w-4 h-4" />
            UPI ID (for QR Code on invoices)
          </label>
          <input
            type="text"
            value={formData.upi_id}
            onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="pharmacy@upi"
          />
          <p className="text-sm text-gray-500 mt-2">
            This UPI ID will be displayed on invoices for quick payments via QR code
          </p>
        </div>
      </div>

      {/* Thermal Printer Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Thermal Printer Settings
        </h2>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Paper Size</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, printer_size: '58mm' })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-center font-medium transition-colors ${
                  formData.printer_size === '58mm'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, printer_size: '80mm' })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-center font-medium transition-colors ${
                  formData.printer_size === '80mm'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                80mm
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Select your thermal printer paper width</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Shop Name Alignment</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, shop_name_alignment: 'left' })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-colors ${
                  formData.shop_name_alignment === 'left'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
                Left
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, shop_name_alignment: 'center' })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-colors ${
                  formData.shop_name_alignment === 'center'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <AlignCenter className="w-4 h-4" />
                Center
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, shop_name_alignment: 'right' })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-colors ${
                  formData.shop_name_alignment === 'right'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <AlignRight className="w-4 h-4" />
                Right
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 block">Show Logo on Invoice</label>
              <p className="text-xs text-gray-500 mt-1">Display pharmacy logo on printed bills</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, show_logo_on_invoice: !formData.show_logo_on_invoice })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.show_logo_on_invoice ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formData.show_logo_on_invoice ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4" />
              Invoice Footer Message
            </label>
            <input
              type="text"
              value={formData.invoice_footer_message}
              onChange={(e) => setFormData({ ...formData, invoice_footer_message: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Thank You! Visit Again"
            />
            <p className="text-xs text-gray-500 mt-1">This message will appear at the bottom of printed invoices</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : saved ? (
          <>
            <Check className="w-5 h-5" />
            Saved Successfully
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Save Settings
          </>
        )}
      </button>
    </div>
  );
}
