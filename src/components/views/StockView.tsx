import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Medicine, Supplier, StockEntry } from '../../types';
import {
  Package, Plus, Search, TrendingUp, TrendingDown, AlertTriangle,
  X, ArrowUpCircle, ArrowDownCircle, Building2
} from 'lucide-react';

export function StockView() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<string | null>(null);

  const [purchaseForm, setPurchaseForm] = useState({
    medicine_id: '',
    supplier_id: '',
    supplier_invoice_number: '',
    batch_number: '',
    quantity: '',
    purchase_rate: '',
    mrp: '',
    selling_rate: '',
    expiry_date: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const [medicinesRes, suppliersRes, entriesRes] = await Promise.all([
      supabase.from('medicines').select('*').eq('user_id', user!.id).order('name'),
      supabase.from('suppliers').select('*').eq('user_id', user!.id).order('name'),
      supabase.from('stock_entries')
        .select('*, medicine:medicines(name), supplier:suppliers(name)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    setMedicines(medicinesRes.data || []);
    setSuppliers(suppliersRes.data || []);
    setStockEntries(entriesRes.data || []);
    setLoading(false);
  };

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockMedicines = medicines.filter(m => m.current_stock <= m.min_stock_level);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantity = parseInt(purchaseForm.quantity);
    const purchaseRate = parseFloat(purchaseForm.purchase_rate);
    const mrp = parseFloat(purchaseForm.mrp);
    const sellingRate = parseFloat(purchaseForm.selling_rate) || mrp;

    // Check if medicine already exists with same batch
    const existingMedicine = medicines.find(m =>
      m.id === purchaseForm.medicine_id ||
      (m.name.toLowerCase() === purchaseForm.medicine_id.toLowerCase() && m.batch_number === purchaseForm.batch_number)
    );

    let medicineId = purchaseForm.medicine_id;

    // If adding new medicine through purchase
    if (!purchaseForm.medicine_id && purchaseForm.medicine_id === '') {
      // Create new medicine
      const { data: newMedicine } = await supabase
        .from('medicines')
        .insert({
          user_id: user!.id,
          name: purchaseForm.medicine_id || 'New Medicine',
          batch_number: purchaseForm.batch_number,
          quantity,
          purchase_rate: purchaseRate,
          mrp,
          selling_rate: sellingRate,
          expiry_date: purchaseForm.expiry_date || null,
          current_stock: quantity,
        })
        .select()
        .single();

      if (newMedicine) {
        medicineId = newMedicine.id;
      }
    }

    // Create stock entry
    await supabase.from('stock_entries').insert({
      user_id: user!.id,
      medicine_id: medicineId,
      supplier_id: purchaseForm.supplier_id || null,
      supplier_invoice_number: purchaseForm.supplier_invoice_number,
      batch_number: purchaseForm.batch_number,
      quantity,
      purchase_rate: purchaseRate,
      mrp,
      expiry_date: purchaseForm.expiry_date || null,
      entry_type: 'purchase',
    });

    // Update medicine stock
    const medToUpdate = medicines.find(m => m.id === medicineId);
    if (medToUpdate) {
      const updateData: Partial<Medicine> = {
        current_stock: medToUpdate.current_stock + quantity,
        purchase_rate: purchaseRate,
        mrp,
        selling_rate: sellingRate,
      };
      if (purchaseForm.batch_number) updateData.batch_number = purchaseForm.batch_number;
      if (purchaseForm.expiry_date) updateData.expiry_date = purchaseForm.expiry_date;

      await supabase
        .from('medicines')
        .update(updateData)
        .eq('id', medicineId);
    }

    setShowPurchaseModal(false);
    setPurchaseForm({
      medicine_id: '',
      supplier_id: '',
      supplier_invoice_number: '',
      batch_number: '',
      quantity: '',
      purchase_rate: '',
      mrp: '',
      selling_rate: '',
      expiry_date: '',
    });
    fetchData();
  };

  const handleAdjust = async (medicineId: string, type: 'in' | 'out') => {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine) return;

    const qty = parseInt(adjustForm.quantity);
    if (isNaN(qty) || qty <= 0) return;

    const newStock = type === 'in'
      ? medicine.current_stock + qty
      : medicine.current_stock - qty;

    if (newStock < 0) return;

    // Create stock entry
    await supabase.from('stock_entries').insert({
      user_id: user!.id,
      medicine_id: medicineId,
      quantity: type === 'in' ? qty : -qty,
      purchase_rate: medicine.purchase_rate,
      mrp: medicine.mrp,
      expiry_date: medicine.expiry_date,
      entry_type: 'adjustment',
      notes: adjustForm.notes || (type === 'in' ? 'Stock In' : 'Stock Out'),
    });

    // Update medicine stock
    await supabase
      .from('medicines')
      .update({ current_stock: newStock })
      .eq('id', medicineId);

    setShowAdjustModal(null);
    setAdjustForm({ quantity: '', notes: '' });
    fetchData();
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-500">{medicines.length} medicines in inventory</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Purchase Entry
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockMedicines.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Low Stock Alert ({lowStockMedicines.length} items)</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStockMedicines.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm">
                <span className="text-gray-900">{m.name}</span>
                <span className="font-medium text-amber-600">{m.current_stock} left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicines..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Medicine</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Batch</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Expiry</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Purchase</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">MRP</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Stock</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMedicines.map((medicine) => (
                <tr key={medicine.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{medicine.name}</div>
                    {medicine.generic_name && (
                      <div className="text-sm text-gray-500">{medicine.generic_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{medicine.batch_number || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {medicine.expiry_date ? formatDate(medicine.expiry_date) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(medicine.purchase_rate)}</td>
                  <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(medicine.mrp)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-semibold ${
                      medicine.current_stock <= medicine.min_stock_level ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {medicine.current_stock}
                    </span>
                    <span className="text-gray-400 text-sm"> / min {medicine.min_stock_level}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setShowAdjustModal(`${medicine.id}-in`)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Stock In"
                      >
                        <ArrowUpCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setShowAdjustModal(`${medicine.id}-out`)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Stock Out"
                      >
                        <ArrowDownCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Stock Entries */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Stock Entries</h2>
        <div className="space-y-3">
          {stockEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No stock entries yet</p>
          ) : (
            stockEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    entry.quantity > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {entry.quantity > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{(entry.medicine as any)?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">
                      {entry.entry_type} | {formatDate(entry.created_at)}
                      {entry.batch_number && ` | Batch: ${entry.batch_number}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${entry.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                  </p>
                  <p className="text-sm text-gray-500">{formatCurrency(entry.purchase_rate)}/unit</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Purchase Entry Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Purchase Entry</h2>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePurchase} className="p-6 space-y-4">
              {/* Quick Add Medicine or Select Existing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Medicine</label>
                <select
                  value={purchaseForm.medicine_id}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, medicine_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select Medicine</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} (Stock: {m.current_stock})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={purchaseForm.supplier_id}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Invoice Number</label>
                <input
                  type="text"
                  value={purchaseForm.supplier_invoice_number}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_invoice_number: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="Invoice number from supplier"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                  <input
                    type="number"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    required
                    min="1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number *</label>
                  <input
                    type="text"
                    value={purchaseForm.batch_number}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, batch_number: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    required
                    placeholder="Batch No."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Rate *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseForm.purchase_rate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_rate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    required
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">MRP *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseForm.mrp}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, mrp: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    required
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selling Rate (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseForm.selling_rate}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, selling_rate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="Leave empty to use MRP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                <input
                  type="date"
                  value={purchaseForm.expiry_date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, expiry_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Purchase Summary */}
              {purchaseForm.quantity && purchaseForm.purchase_rate && (
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Total Purchase Value:</span>
                    <span className="font-semibold text-emerald-700">
                      {formatCurrency(parseInt(purchaseForm.quantity || '0') * parseFloat(purchaseForm.purchase_rate || '0'))}
                    </span>
                  </div>
                  {purchaseForm.mrp && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total MRP Value:</span>
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(parseInt(purchaseForm.quantity || '0') * parseFloat(purchaseForm.mrp || '0'))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                >
                  Save Purchase Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Stock {showAdjustModal.includes('-in') ? 'In' : 'Out'}
              </h2>
              <button
                onClick={() => setShowAdjustModal(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  min="1"
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input
                  type="text"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="Reason for adjustment"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdjustModal(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const [medicineId, type] = showAdjustModal.split('-');
                    handleAdjust(medicineId, type as 'in' | 'out');
                  }}
                  className={`flex-1 py-2.5 text-white rounded-xl font-medium transition-colors ${
                    showAdjustModal.includes('-in')
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {showAdjustModal.includes('-in') ? 'Add Stock' : 'Remove Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
