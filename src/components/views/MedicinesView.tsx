import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Medicine, Supplier } from '../../types';
import {
  Plus, Search, Edit2, Trash2, Package, X, Barcode,
  AlertTriangle, ChevronDown, Filter
} from 'lucide-react';

export function MedicinesView() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    brand_name: '',
    batch_number: '',
    expiry_date: '',
    mrp: '',
    purchase_rate: '',
    selling_rate: '',
    gst_percentage: '12',
    current_stock: '',
    supplier_id: '',
    barcode: '',
    min_stock_level: '10',
  });

  useEffect(() => {
    if (user) {
      fetchMedicines();
      fetchSuppliers();
    }
  }, [user]);

  const fetchMedicines = async () => {
    const { data } = await supabase
      .from('medicines')
      .select('*, supplier:suppliers(id, name)')
      .eq('user_id', user!.id)
      .order('name');
    setMedicines(data || []);
    setLoading(false);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', user!.id)
      .order('name');
    setSuppliers(data || []);
  };

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.barcode?.includes(searchTerm)
  );

  const openModal = (medicine?: Medicine) => {
    if (medicine) {
      setEditingMedicine(medicine);
      setFormData({
        name: medicine.name,
        generic_name: medicine.generic_name || '',
        brand_name: medicine.brand_name || '',
        batch_number: medicine.batch_number || '',
        expiry_date: medicine.expiry_date || '',
        mrp: medicine.mrp.toString(),
        purchase_rate: medicine.purchase_rate.toString(),
        selling_rate: medicine.selling_rate.toString(),
        gst_percentage: medicine.gst_percentage.toString(),
        current_stock: medicine.current_stock.toString(),
        supplier_id: medicine.supplier_id || '',
        barcode: medicine.barcode || '',
        min_stock_level: medicine.min_stock_level.toString(),
      });
    } else {
      setEditingMedicine(null);
      setFormData({
        name: '',
        generic_name: '',
        brand_name: '',
        batch_number: '',
        expiry_date: '',
        mrp: '',
        purchase_rate: '',
        selling_rate: '',
        gst_percentage: '12',
        current_stock: '',
        supplier_id: '',
        barcode: '',
        min_stock_level: '10',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mrp || !formData.selling_rate) return;

    const medicineData = {
      user_id: user!.id,
      name: formData.name,
      generic_name: formData.generic_name,
      brand_name: formData.brand_name,
      batch_number: formData.batch_number,
      expiry_date: formData.expiry_date || null,
      mrp: parseFloat(formData.mrp),
      purchase_rate: parseFloat(formData.purchase_rate) || 0,
      selling_rate: parseFloat(formData.selling_rate),
      gst_percentage: parseFloat(formData.gst_percentage) || 0,
      current_stock: parseInt(formData.current_stock) || 0,
      supplier_id: formData.supplier_id || null,
      barcode: formData.barcode,
      min_stock_level: parseInt(formData.min_stock_level) || 10,
    };

    if (editingMedicine) {
      await supabase
        .from('medicines')
        .update(medicineData)
        .eq('id', editingMedicine.id);
    } else {
      await supabase.from('medicines').insert(medicineData);
    }

    setShowModal(false);
    fetchMedicines();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('medicines').delete().eq('id', id);
    setShowDeleteConfirm(null);
    fetchMedicines();
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return new Date(expiryDate) < thirtyDays;
  };

  const isLowStock = (medicine: Medicine) => {
    return medicine.current_stock <= medicine.min_stock_level;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
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
          <h1 className="text-2xl font-bold text-gray-900">Medicine Master</h1>
          <p className="text-gray-500">{medicines.length} medicines in inventory</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Medicine
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
            placeholder="Search by name, generic name, brand, or barcode..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Medicines Grid */}
      <div className="grid gap-4">
        {filteredMedicines.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No medicines found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try a different search term' : 'Add your first medicine to get started'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => openModal()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                Add Medicine
              </button>
            )}
          </div>
        ) : (
          filteredMedicines.map((medicine) => (
            <div
              key={medicine.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{medicine.name}</h3>
                    {isLowStock(medicine) && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                        Low Stock
                      </span>
                    )}
                    {isExpiringSoon(medicine.expiry_date) && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        Expiring Soon
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">Generic Name</p>
                      <p className="text-sm font-medium text-gray-900">{medicine.generic_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Batch</p>
                      <p className="text-sm font-medium text-gray-900">{medicine.batch_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Expiry</p>
                      <p className={`text-sm font-medium ${isExpiringSoon(medicine.expiry_date) ? 'text-red-600' : 'text-gray-900'}`}>
                        {medicine.expiry_date ? new Date(medicine.expiry_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Stock</p>
                      <p className={`text-sm font-medium ${isLowStock(medicine) ? 'text-amber-600' : 'text-gray-900'}`}>
                        {medicine.current_stock} units
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                    <div>
                      <span className="text-xs text-gray-500">MRP: </span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(medicine.mrp)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Sell: </span>
                      <span className="text-sm font-semibold text-emerald-600">{formatCurrency(medicine.selling_rate)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">GST: </span>
                      <span className="text-sm font-medium text-gray-900">{medicine.gst_percentage}%</span>
                    </div>
                    {medicine.barcode && (
                      <div className="flex items-center gap-1">
                        <Barcode className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{medicine.barcode}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openModal(medicine)}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(medicine.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {showDeleteConfirm === medicine.id && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm text-red-800 mb-3">Are you sure you want to delete this medicine?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(medicine.id)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium border border-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingMedicine ? 'Edit Medicine' : 'Add Medicine'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medicine Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Generic Name</label>
                  <input
                    type="text"
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand Name</label>
                  <input
                    type="text"
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Scan or enter barcode"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MRP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_rate}
                    onChange={(e) => setFormData({ ...formData, purchase_rate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selling Rate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_rate}
                    onChange={(e) => setFormData({ ...formData, selling_rate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GST (%)</label>
                  <select
                    value={formData.gst_percentage}
                    onChange={(e) => setFormData({ ...formData, gst_percentage: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock</label>
                  <input
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Stock Level</label>
                  <input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                >
                  {editingMedicine ? 'Update Medicine' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
