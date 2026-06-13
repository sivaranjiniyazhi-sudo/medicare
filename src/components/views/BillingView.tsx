import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Medicine, Customer, CartItem, Invoice, InvoiceItem } from '../../types';
import {
  Search, Plus, Minus, X, ShoppingCart, User, CreditCard,
  Banknote, Smartphone, Trash2, Printer, Download, MessageCircle,
  Check, Barcode
} from 'lucide-react';

interface CompletedInvoice {
  invoice_number: string;
  customer_name: string;
  customer_mobile: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  total: number;
  payment_method: 'cash' | 'card' | 'upi';
  created_at: string;
}

export function BillingView() {
  const { user, settings } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<CompletedInvoice | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchMedicines();
      fetchCustomers();
    }
  }, [user]);

  const fetchMedicines = async () => {
    const { data } = await supabase
      .from('medicines')
      .select('*')
      .eq('user_id', user!.id)
      .gt('current_stock', 0)
      .order('name');
    setMedicines(data || []);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setCustomers(data || []);
  };

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.barcode?.includes(searchTerm)
  );

  const filteredCustomers = customers.filter(c =>
    c.mobile.includes(customerSearchTerm) ||
    c.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  const addToCart = (medicine: Medicine) => {
    const existing = cart.find(item => item.medicine.id === medicine.id);
    if (existing) {
      if (existing.quantity < medicine.current_stock) {
        setCart(cart.map(item =>
          item.medicine.id === medicine.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      setCart([...cart, { id: crypto.randomUUID(), medicine, quantity: 1 }]);
    }
    setSearchTerm('');
  };

  const updateQuantity = (medicineId: string, quantity: number) => {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine) return;

    if (quantity <= 0) {
      setCart(cart.filter(item => item.medicine.id !== medicineId));
    } else if (quantity <= medicine.current_stock) {
      setCart(cart.map(item =>
        item.medicine.id === medicineId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (medicineId: string) => {
    setCart(cart.filter(item => item.medicine.id !== medicineId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerMobile('');
    setDiscount(0);
    setNotes('');
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => {
      return sum + (item.medicine.selling_rate * item.quantity);
    }, 0);

    const totalGST = cart.reduce((sum, item) => {
      const itemTotal = item.medicine.selling_rate * item.quantity;
      const gstAmount = (itemTotal * item.medicine.gst_percentage) / 100;
      return sum + gstAmount;
    }, 0);

    const cgst = totalGST / 2;
    const sgst = totalGST / 2;
    const total = subtotal + totalGST - discount;

    return { subtotal, cgst, sgst, total, totalGST };
  };

  const handleProcessPayment = async () => {
    if (cart.length === 0) return;

    const totals = calculateTotals();

    // Generate invoice number
    const { data: invoiceNumberData } = await supabase.rpc('generate_invoice_number', {
      user_uuid: user!.id
    });

    // Create or get customer
    let customerId = selectedCustomer?.id || null;

    if (!customerId && (customerName || customerMobile)) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          user_id: user!.id,
          name: customerName || 'Walk-in Customer',
          mobile: customerMobile || 'N/A',
        })
        .select()
        .single();
      customerId = newCustomer?.id || null;
    }

    // Create invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        user_id: user!.id,
        invoice_number: invoiceNumberData || `INV-${Date.now()}`,
        customer_id: customerId,
        customer_name: customerName || selectedCustomer?.name || 'Walk-in Customer',
        customer_mobile: customerMobile || selectedCustomer?.mobile || '',
        subtotal: totals.subtotal,
        discount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        total: totals.total,
        payment_method: paymentMethod,
        payment_status: 'paid',
        notes,
      })
      .select()
      .single();

    if (invoice) {
      // Create invoice items with proper totals
      const invoiceItems = cart.map(item => {
        const baseTotal = item.medicine.selling_rate * item.quantity;
        const gstAmount = (baseTotal * item.medicine.gst_percentage) / 100;
        return {
          user_id: user!.id,
          invoice_id: invoice.id,
          medicine_id: item.medicine.id,
          medicine_name: item.medicine.name,
          batch_number: item.medicine.batch_number,
          expiry_date: item.medicine.expiry_date,
          quantity: item.quantity,
          mrp: item.medicine.mrp,
          selling_rate: item.medicine.selling_rate,
          discount: 0,
          gst_percentage: item.medicine.gst_percentage,
          total: baseTotal,
        };
      });

      await supabase.from('invoice_items').insert(invoiceItems);

      // Update stock
      for (const item of cart) {
        await supabase
          .from('medicines')
          .update({
            current_stock: item.medicine.current_stock - item.quantity,
          })
          .eq('id', item.medicine.id);

        // Record stock entry
        await supabase.from('stock_entries').insert({
          user_id: user!.id,
          medicine_id: item.medicine.id,
          quantity: -item.quantity,
          purchase_rate: item.medicine.purchase_rate,
          mrp: item.medicine.mrp,
          expiry_date: item.medicine.expiry_date,
          entry_type: 'sale',
          notes: `Invoice: ${invoice.invoice_number}`,
        });
      }

      // Store completed invoice for success modal
      setCompletedInvoice({
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        customer_mobile: invoice.customer_mobile,
        items: invoiceItems,
        subtotal: totals.subtotal,
        discount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        total: totals.total,
        payment_method: paymentMethod,
        created_at: invoice.created_at,
      });

      setShowPaymentModal(false);
      clearCart();
      fetchMedicines();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totals = calculateTotals();

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && completedInvoice && settings) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${completedInvoice.invoice_number}</title>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 10px; }
            .shop-name { font-size: 16px; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .item { margin: 5px 0; }
            .total-row { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${settings.shop_name || 'PharmaCare'}</div>
            <div>${settings.shop_address || ''}</div>
            <div>Phone: ${settings.phone || 'N/A'}</div>
            <div>GST: ${settings.gst_number || 'N/A'}</div>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>Invoice:</span>
            <span>${completedInvoice.invoice_number}</span>
          </div>
          <div class="row">
            <span>Date:</span>
            <span>${formatDate(completedInvoice.created_at)}</span>
          </div>
          <div class="row">
            <span>Time:</span>
            <span>${formatTime(completedInvoice.created_at)}</span>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>Customer:</span>
            <span>${completedInvoice.customer_name}</span>
          </div>
          <div class="row">
            <span>Mobile:</span>
            <span>${completedInvoice.customer_mobile || 'N/A'}</span>
          </div>
          <div class="divider"></div>
          ${completedInvoice.items.map((item, i) => `
            <div class="item">
              <div>${i + 1}. ${item.medicine_name}</div>
              <div class="row">
                <span style="padding-left: 20px;">${item.quantity} x ${formatCurrency(item.selling_rate)}</span>
                <span>${formatCurrency(item.total)}</span>
              </div>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="row">
            <span>Subtotal:</span>
            <span>${formatCurrency(completedInvoice.subtotal)}</span>
          </div>
          <div class="row">
            <span>CGST:</span>
            <span>${formatCurrency(completedInvoice.cgst)}</span>
          </div>
          <div class="row">
            <span>SGST:</span>
            <span>${formatCurrency(completedInvoice.sgst)}</span>
          </div>
          ${completedInvoice.discount > 0 ? `
            <div class="row">
              <span>Discount:</span>
              <span>-${formatCurrency(completedInvoice.discount)}</span>
            </div>
          ` : ''}
          <div class="row total-row">
            <span>TOTAL:</span>
            <span>${formatCurrency(completedInvoice.total)}</span>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>Payment:</span>
            <span>${completedInvoice.payment_method.toUpperCase()}</span>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>Visit Again</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    if (!completedInvoice || !settings) return;

    let text = `
${settings.shop_name || 'PharmaCare'}
${settings.shop_address || ''}
Phone: ${settings.phone || 'N/A'}
GST: ${settings.gst_number || 'N/A'}
----------------------------------------
Invoice: ${completedInvoice.invoice_number}
Date: ${formatDate(completedInvoice.created_at)}
Time: ${formatTime(completedInvoice.created_at)}
----------------------------------------
Customer: ${completedInvoice.customer_name}
Mobile: ${completedInvoice.customer_mobile || 'N/A'}
----------------------------------------
`;

    completedInvoice.items.forEach((item, i) => {
      text += `${i + 1}. ${item.medicine_name}
   ${item.quantity} x ${formatCurrency(item.selling_rate)} = ${formatCurrency(item.total)}
`;
    });

    text += `----------------------------------------
Subtotal: ${formatCurrency(completedInvoice.subtotal)}
CGST: ${formatCurrency(completedInvoice.cgst)}
SGST: ${formatCurrency(completedInvoice.sgst)}
${completedInvoice.discount > 0 ? `Discount: -${formatCurrency(completedInvoice.discount)}\n` : ''}
----------------------------------------
TOTAL: ${formatCurrency(completedInvoice.total)}
----------------------------------------
Payment: ${completedInvoice.payment_method.toUpperCase()}
----------------------------------------
Thank you for shopping with us!
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${completedInvoice.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWhatsApp = () => {
    if (!completedInvoice || !settings) return;

    let message = `*${settings.shop_name || 'PharmaCare'}*\n`;
    message += `${settings.shop_address || ''}\n`;
    message += `Invoice: ${completedInvoice.invoice_number}\n`;
    message += `Date: ${formatDate(completedInvoice.created_at)}\n\n`;
    message += `Items:\n`;
    completedInvoice.items.forEach((item, i) => {
      message += `${i + 1}. ${item.medicine_name} - ${item.quantity} x ${formatCurrency(item.selling_rate)} = ${formatCurrency(item.total)}\n`;
    });
    message += `\nSubtotal: ${formatCurrency(completedInvoice.subtotal)}\n`;
    message += `GST: ${formatCurrency(completedInvoice.cgst + completedInvoice.sgst)}\n`;
    if (completedInvoice.discount > 0) {
      message += `Discount: -${formatCurrency(completedInvoice.discount)}\n`;
    }
    message += `*Total: ${formatCurrency(completedInvoice.total)}*\n`;
    message += `Payment: ${completedInvoice.payment_method.toUpperCase()}\n\n`;
    message += `Thank you for shopping with us!`;

    const phone = completedInvoice.customer_mobile?.replace(/\D/g, '') || '';
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      alert('No customer mobile number');
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Left Panel - Medicine Search */}
      <div className="lg:w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm) {
                  const medicine = medicines.find(m => m.barcode === searchTerm && m.current_stock > 0);
                  if (medicine) addToCart(medicine);
                }
              }}
              placeholder="Scan barcode or search medicine..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredMedicines.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No medicines found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMedicines.map((medicine) => (
                <button
                  key={medicine.id}
                  onClick={() => addToCart(medicine)}
                  className="w-full p-3 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 rounded-xl text-left transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{medicine.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <span>{medicine.batch_number || 'No batch'}</span>
                        <span>|</span>
                        <span>Stock: {medicine.current_stock}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">{formatCurrency(medicine.selling_rate)}</p>
                      <span className="text-xs text-gray-500">GST {medicine.gst_percentage}%</span>
                    </div>
                    <Plus className="w-5 h-5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="lg:w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-gray-900">Cart</h2>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-sm rounded-full">
              {cart.length} items
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart className="w-16 h-16 mb-3" />
              <p>Cart is empty</p>
              <p className="text-sm mt-1">Scan or search to add items</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{item.medicine.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatCurrency(item.medicine.selling_rate)} x {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(item.medicine.selling_rate * item.quantity)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value);
                          if (!isNaN(qty)) updateQuantity(item.medicine.id, qty);
                        }}
                        className="w-12 text-center py-1 border border-gray-200 rounded-lg"
                        min="1"
                        max={item.medicine.current_stock}
                      />
                      <button
                        onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={item.quantity >= item.medicine.current_stock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.medicine.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Section */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setShowCustomerSearch(!showCustomerSearch)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <User className="w-4 h-4" />
            <span className="text-sm font-medium">
              {selectedCustomer ? selectedCustomer.name : (customerName || customerMobile ? customerName || 'Guest' : 'Add Customer')}
            </span>
          </button>

          {showCustomerSearch && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-3">
              <input
                type="text"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                placeholder="Search by mobile or name..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />

              {filteredCustomers.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredCustomers.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerName(c.name);
                        setCustomerMobile(c.mobile);
                        setShowCustomerSearch(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg text-sm"
                    >
                      {c.name} - {c.mobile}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Name"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="Mobile"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-gray-600">Discount:</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              min="0"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>CGST</span>
            <span>{formatCurrency(totals.cgst)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>SGST</span>
            <span>{formatCurrency(totals.sgst)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        {/* Pay Button */}
        <div className="p-4">
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Pay {formatCurrency(totals.total)}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Select Payment Method</h2>
            </div>

            <div className="p-6 space-y-3">
              {[
                { method: 'cash' as const, icon: Banknote, label: 'Cash', desc: 'Pay with cash' },
                { method: 'card' as const, icon: CreditCard, label: 'Card', desc: 'Credit / Debit card' },
                { method: 'upi' as const, icon: Smartphone, label: 'UPI', desc: 'Pay via UPI' },
              ].map(({ method, icon: Icon, label, desc }) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                    paymentMethod === method
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    paymentMethod === method ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  {paymentMethod === method && (
                    <Check className="w-5 h-5 text-emerald-600 ml-auto" />
                  )}
                </button>
              ))}

              <div className="pt-4">
                <label className="block text-sm text-gray-600 mb-2">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                Complete Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Full Invoice */}
      {completedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Payment Successful!</h2>
              <button
                onClick={() => {
                  setCompletedInvoice(null);
                  barcodeInputRef.current?.focus();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Preview */}
            <div ref={invoiceRef} className="p-6 bg-gray-50">
              {/* Header */}
              <div className="text-center mb-4 pb-4 border-b border-dashed border-gray-300">
                <h3 className="text-lg font-bold text-gray-900">{settings?.shop_name || 'PharmaCare'}</h3>
                {settings?.shop_address && (
                  <p className="text-sm text-gray-600">{settings.shop_address}</p>
                )}
                {settings?.phone && (
                  <p className="text-sm text-gray-600">Phone: {settings.phone}</p>
                )}
                {settings?.gst_number && (
                  <p className="text-sm text-gray-600">GST: {settings.gst_number}</p>
                )}
              </div>

              {/* Invoice Info */}
              <div className="border-b border-dashed border-gray-300 pb-4 mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Invoice No:</span>
                  <span className="font-semibold">{completedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Date:</span>
                  <span>{formatDate(completedInvoice.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Time:</span>
                  <span>{formatTime(completedInvoice.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer:</span>
                  <span>{completedInvoice.customer_name}</span>
                </div>
              </div>

              {/* Items */}
              <div className="border-b border-dashed border-gray-300 pb-4 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-600">
                      <th className="text-left pb-2">Item</th>
                      <th className="text-center pb-2">Qty</th>
                      <th className="text-right pb-2">Rate</th>
                      <th className="text-right pb-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedInvoice.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1">{item.medicine_name}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{formatCurrency(item.selling_rate)}</td>
                        <td className="text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatCurrency(completedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST:</span>
                  <span>{formatCurrency(completedInvoice.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST:</span>
                  <span>{formatCurrency(completedInvoice.sgst)}</span>
                </div>
                {completedInvoice.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(completedInvoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300 mt-2">
                  <span>Total:</span>
                  <span className="text-emerald-600">{formatCurrency(completedInvoice.total)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-gray-600">Payment:</span>
                  <span className="font-medium uppercase">{completedInvoice.payment_method}</span>
                </div>
              </div>

              <div className="text-center mt-4 pt-4 border-t border-dashed border-gray-300 text-sm text-gray-600">
                <p>Thank you for shopping with us!</p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 grid grid-cols-3 gap-3">
              <button
                onClick={handlePrint}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Printer className="w-5 h-5 text-gray-600" />
                <span className="text-xs text-gray-600">Print</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex flex-col items-center gap-1 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Download className="w-5 h-5 text-gray-600" />
                <span className="text-xs text-gray-600">Download</span>
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex flex-col items-center gap-1 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600">WhatsApp</span>
              </button>
            </div>

            <div className="p-4">
              <button
                onClick={() => {
                  setCompletedInvoice(null);
                  barcodeInputRef.current?.focus();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                New Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
