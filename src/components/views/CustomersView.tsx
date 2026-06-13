import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Customer, Invoice, InvoiceItem } from '../../types';
import {
  Plus, Search, Edit2, Trash2, X, Phone, Mail, MapPin,
  User, Receipt, Calendar, ShoppingBag
} from 'lucide-react';

export function CustomersView() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [customerItems, setCustomerItems] = useState<{ name: string; count: number }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    email: '',
    notes: '',
    requires_regular_medicine: false,
    medicine_type: '',
  });

  const medicineTypes = ['BP Tablets', 'Diabetes Tablets', 'Thyroid Tablets', 'Heart Medicine', 'Other'];

  useEffect(() => {
    if (user) fetchCustomers();
  }, [user]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  const fetchCustomerDetails = async (customerId: string) => {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user!.id)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setCustomerInvoices(invoices || []);

    const { data: items } = await supabase
      .from('invoice_items')
      .select('medicine_name')
      .eq('user_id', user!.id)
      .in('invoice_id', invoices?.map(i => i.id) || []);

    if (items) {
      const itemCounts = new Map<string, number>();
      items.forEach(item => {
        itemCounts.set(item.medicine_name, (itemCounts.get(item.medicine_name) || 0) + 1);
      });
      setCustomerItems(
        Array.from(itemCounts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile.includes(searchTerm)
  );

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        mobile: customer.mobile,
        address: customer.address || '',
        email: customer.email || '',
        notes: customer.notes || '',
        requires_regular_medicine: customer.requires_regular_medicine,
        medicine_type: customer.medicine_type || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        mobile: '',
        address: '',
        email: '',
        notes: '',
        requires_regular_medicine: false,
        medicine_type: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) return;

    const customerData = {
      user_id: user!.id,
      name: formData.name,
      mobile: formData.mobile,
      address: formData.address,
      email: formData.email,
      notes: formData.notes,
      requires_regular_medicine: formData.requires_regular_medicine,
      medicine_type: formData.medicine_type,
    };

    if (editingCustomer) {
      await supabase
        .from('customers')
        .update(customerData)
        .eq('id', editingCustomer.id);
    } else {
      await supabase.from('customers').insert(customerData);
    }

    setShowModal(false);
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('customers').delete().eq('id', id);
    fetchCustomers();
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerDetails(customer.id);
  };

  const totalSpent = customerInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-500">{customers.length} customers</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or mobile..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1 space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No customers found</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => selectCustomer(customer)}
                className={`w-full text-left p-4 rounded-xl transition-colors ${
                  selectedCustomer?.id === customer.id
                    ? 'bg-emerald-50 border-2 border-emerald-500'
                    : 'bg-white border border-gray-100 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="text-emerald-700 font-semibold">
                      {customer.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.mobile}</p>
                  </div>
                </div>
                {customer.requires_regular_medicine && (
                  <div className="mt-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {customer.medicine_type || 'Regular Medicine'}
                    </span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Customer Details */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="space-y-6">
              {/* Customer Info Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-700 font-bold text-2xl">
                        {selectedCustomer.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{selectedCustomer.name}</h2>
                      <p className="text-gray-500">{selectedCustomer.mobile}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openModal(selectedCustomer)}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{selectedCustomer.address}</span>
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{selectedCustomer.email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Purchases</p>
                    <p className="text-2xl font-bold text-gray-900">{customerInvoices.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Visit</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {customerInvoices[0] ? formatDate(customerInvoices[0].created_at) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Frequently Purchased */}
              {customerItems.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Frequently Purchased</h3>
                  <div className="space-y-2">
                    {customerItems.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-900">{item.name}</span>
                        <span className="text-gray-500 text-sm">{item.count} times</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase History */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Purchase History</h3>
                </div>
                {customerInvoices.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No purchases yet</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {customerInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                            <p className="text-sm text-gray-500">{formatDate(invoice.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(Number(invoice.total))}</p>
                          <p className="text-sm text-gray-500 capitalize">{invoice.payment_method}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile *</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medicine Type</label>
                <select
                  value={formData.medicine_type}
                  onChange={(e) => setFormData({ ...formData, medicine_type: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">None</option>
                  {medicineTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="regular"
                  checked={formData.requires_regular_medicine}
                  onChange={(e) => setFormData({ ...formData, requires_regular_medicine: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="regular" className="text-sm text-gray-700">
                  Requires regular medicine (eligible for reminders)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
                >
                  {editingCustomer ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
