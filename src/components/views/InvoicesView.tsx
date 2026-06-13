import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Invoice, InvoiceItem } from '../../types';
import {
  Search, FileText, Printer, Download, MessageCircle,
  Calendar, X, Filter
} from 'lucide-react';

export function InvoicesView() {
  const { user, settings } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (user) fetchInvoices();
  }, [user, dateFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    const now = new Date();
    if (dateFilter === 'today') {
      const today = now.toISOString().split('T')[0];
      query = query.gte('created_at', today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', monthAgo);
    } else if (dateFilter === 'custom' && customDateRange.start) {
      query = query.gte('created_at', customDateRange.start);
      if (customDateRange.end) {
        const endTime = new Date(customDateRange.end);
        endTime.setHours(23, 59, 59);
        query = query.lte('created_at', endTime.toISOString());
      }
    }

    const { data } = await query;
    setInvoices(data || []);
    setLoading(false);
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    const { data } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);
    setInvoiceItems(data || []);
  };

  const selectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    fetchInvoiceItems(invoice.id);
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer_mobile.includes(searchTerm)
  );

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

  const handlePrint = () => {
    if (!selectedInvoice || !settings) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${selectedInvoice.invoice_number}</title>
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
            <span>${selectedInvoice.invoice_number}</span>
          </div>
          <div class="row">
            <span>Date:</span>
            <span>${formatDate(selectedInvoice.created_at)}</span>
          </div>
          <div class="row">
            <span>Time:</span>
            <span>${formatTime(selectedInvoice.created_at)}</span>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>Customer:</span>
            <span>${selectedInvoice.customer_name}</span>
          </div>
          <div class="row">
            <span>Mobile:</span>
            <span>${selectedInvoice.customer_mobile || 'N/A'}</span>
          </div>
          <div class="divider"></div>
          ${invoiceItems.map((item, i) => `
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
            <span>${formatCurrency(selectedInvoice.subtotal)}</span>
          </div>
          <div class="row">
            <span>CGST:</span>
            <span>${formatCurrency(selectedInvoice.cgst)}</span>
          </div>
          <div class="row">
            <span>SGST:</span>
            <span>${formatCurrency(selectedInvoice.sgst)}</span>
          </div>
          ${selectedInvoice.discount > 0 ? `
            <div class="row">
              <span>Discount:</span>
              <span>-${formatCurrency(selectedInvoice.discount)}</span>
            </div>
          ` : ''}
          <div class="row total-row">
            <span>TOTAL:</span>
            <span>${formatCurrency(selectedInvoice.total)}</span>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>Payment:</span>
            <span>${selectedInvoice.payment_method.toUpperCase()}</span>
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
    if (!selectedInvoice || !settings) return;

    let text = `
${settings.shop_name || 'PharmaCare'}
${settings.shop_address || ''}
Phone: ${settings.phone || 'N/A'}
GST: ${settings.gst_number || 'N/A'}
----------------------------------------
Invoice: ${selectedInvoice.invoice_number}
Date: ${formatDate(selectedInvoice.created_at)}
Time: ${formatTime(selectedInvoice.created_at)}
----------------------------------------
Customer: ${selectedInvoice.customer_name}
Mobile: ${selectedInvoice.customer_mobile || 'N/A'}
----------------------------------------
`;

    invoiceItems.forEach((item, i) => {
      text += `${i + 1}. ${item.medicine_name}
   ${item.quantity} x ${formatCurrency(item.selling_rate)} = ${formatCurrency(item.total)}
`;
    });

    text += `----------------------------------------
Subtotal: ${formatCurrency(selectedInvoice.subtotal)}
CGST: ${formatCurrency(selectedInvoice.cgst)}
SGST: ${formatCurrency(selectedInvoice.sgst)}
${selectedInvoice.discount > 0 ? `Discount: -${formatCurrency(selectedInvoice.discount)}\n` : ''}
----------------------------------------
TOTAL: ${formatCurrency(selectedInvoice.total)}
----------------------------------------
Payment: ${selectedInvoice.payment_method.toUpperCase()}
----------------------------------------
Thank you for shopping with us!
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${selectedInvoice.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWhatsApp = () => {
    if (!selectedInvoice || !settings) return;

    let message = `*${settings.shop_name || 'PharmaCare'}*\n`;
    message += `${settings.shop_address || ''}\n`;
    message += `Invoice: ${selectedInvoice.invoice_number}\n`;
    message += `Date: ${formatDate(selectedInvoice.created_at)}\n\n`;
    message += `Items:\n`;
    invoiceItems.forEach((item, i) => {
      message += `${i + 1}. ${item.medicine_name} - ${item.quantity} x ${formatCurrency(item.selling_rate)} = ${formatCurrency(item.total)}\n`;
    });
    message += `\nSubtotal: ${formatCurrency(selectedInvoice.subtotal)}\n`;
    message += `GST: ${formatCurrency(selectedInvoice.cgst + selectedInvoice.sgst)}\n`;
    if (selectedInvoice.discount > 0) {
      message += `Discount: -${formatCurrency(selectedInvoice.discount)}\n`;
    }
    message += `*Total: ${formatCurrency(selectedInvoice.total)}*\n`;
    message += `Payment: ${selectedInvoice.payment_method.toUpperCase()}\n\n`;
    message += `Thank you for shopping with us!`;

    const phone = selectedInvoice.customer_mobile?.replace(/\D/g, '') || '';
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      alert('No customer mobile number');
    }
  };

  const totalSales = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice History</h1>
          <p className="text-gray-500">{filteredInvoices.length} invoices | Total: {formatCurrency(totalSales)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: 'custom', label: 'Custom' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDateFilter(key as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex gap-3">
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <button
              onClick={fetchInvoices}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
            >
              Apply
            </button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice number, customer..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Invoice List */}
        <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto">
          {filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No invoices found</p>
            </div>
          ) : (
            filteredInvoices.map((invoice) => (
              <button
                key={invoice.id}
                onClick={() => selectInvoice(invoice)}
                className={`w-full text-left p-4 rounded-xl transition-colors ${
                  selectedInvoice?.id === invoice.id
                    ? 'bg-emerald-50 border-2 border-emerald-500'
                    : 'bg-white border border-gray-100 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(Number(invoice.total))}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(invoice.created_at)}</span>
                  <span>{formatTime(invoice.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{invoice.customer_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    invoice.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                    invoice.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {invoice.payment_method.toUpperCase()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Invoice Detail */}
        <div className="lg:col-span-2">
          {selectedInvoice ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {settings?.logo_url && (
                      <img src={settings.logo_url} alt="Logo" className="h-12 mb-2" />
                    )}
                    <h2 className="text-xl font-bold text-gray-900">{settings?.shop_name || 'PharmaCare'}</h2>
                    {settings?.shop_address && (
                      <p className="text-sm text-gray-500">{settings.shop_address}</p>
                    )}
                    {settings?.gst_number && (
                      <p className="text-sm text-gray-500">GST: {settings.gst_number}</p>
                    )}
                    {settings?.phone && (
                      <p className="text-sm text-gray-500">Phone: {settings.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{selectedInvoice.invoice_number}</p>
                    <p className="text-sm text-gray-500">{formatDate(selectedInvoice.created_at)}</p>
                    <p className="text-sm text-gray-500">{formatTime(selectedInvoice.created_at)}</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg">
                  <p className="font-medium text-gray-900">{selectedInvoice.customer_name}</p>
                  <p className="text-sm text-gray-500">{selectedInvoice.customer_mobile || 'No mobile'}</p>
                </div>
              </div>

              {/* Items */}
              <div className="p-6">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                      <th className="pb-2">Item</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Rate</th>
                      <th className="pb-2 text-right">GST</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoiceItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">Loading items...</td>
                      </tr>
                    ) : (
                      invoiceItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3">
                            <p className="font-medium text-gray-900">{item.medicine_name}</p>
                            {item.batch_number && (
                              <p className="text-xs text-gray-500">Batch: {item.batch_number}</p>
                            )}
                          </td>
                          <td className="py-3 text-center">{item.quantity}</td>
                          <td className="py-3 text-right">{formatCurrency(item.selling_rate)}</td>
                          <td className="py-3 text-right text-sm text-gray-500">{item.gst_percentage}%</td>
                          <td className="py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">CGST</span>
                    <span>{formatCurrency(selectedInvoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">SGST</span>
                    <span>{formatCurrency(selectedInvoice.sgst)}</span>
                  </div>
                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-emerald-600">{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Payment Method:</span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    selectedInvoice.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                    selectedInvoice.payment_method === 'card' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {selectedInvoice.payment_method.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select an invoice to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
