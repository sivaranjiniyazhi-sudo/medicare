import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Medicine } from '../../types';
import { Calendar, AlertTriangle, Clock, XCircle, Package } from 'lucide-react';

export function ExpiryView() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'30' | '60' | '90' | 'all'>('30');

  useEffect(() => {
    if (user) {
      fetchMedicines();
    }
  }, [user]);

  const fetchMedicines = async () => {
    const { data } = await supabase
      .from('medicines')
      .select('*, supplier:suppliers(id, name)')
      .eq('user_id', user!.id)
      .gt('current_stock', 0)
      .not('expiry_date', 'is', null)
      .order('expiry_date');
    setMedicines(data || []);
    setLoading(false);
  };

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const categorizedMedicines = {
    expired: medicines.filter(m => m.expiry_date && new Date(m.expiry_date) < now),
    within30Days: medicines.filter(m => {
      const exp = new Date(m.expiry_date!);
      return exp >= now && exp < thirtyDays;
    }),
    within60Days: medicines.filter(m => {
      const exp = new Date(m.expiry_date!);
      return exp >= thirtyDays && exp < sixtyDays;
    }),
    within90Days: medicines.filter(m => {
      const exp = new Date(m.expiry_date!);
      return exp >= sixtyDays && exp < ninetyDays;
    }),
  };

  const filteredMedicines = filter === 'all'
    ? medicines
    : filter === '30'
      ? [...categorizedMedicines.expired, ...categorizedMedicines.within30Days]
      : filter === '60'
        ? [...categorizedMedicines.expired, ...categorizedMedicines.within30Days, ...categorizedMedicines.within60Days]
        : medicines.filter(m => {
          const exp = new Date(m.expiry_date!);
          return exp >= now && exp < ninetyDays;
        });

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

  const getExpiryStatus = (expiryDate: string) => {
    const exp = new Date(expiryDate);
    if (exp < now) return { label: 'Expired', color: 'bg-red-100 text-red-700', days: 'Already expired' };
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return { label: 'Critical', color: 'bg-red-100 text-red-700', days: `${diffDays} days left` };
    if (diffDays <= 60) return { label: 'Warning', color: 'bg-amber-100 text-amber-700', days: `${diffDays} days left` };
    return { label: 'Attention', color: 'bg-blue-100 text-blue-700', days: `${diffDays} days left` };
  };

  const totalExpiredValue = categorizedMedicines.expired.reduce((sum, m) =>
    sum + (m.purchase_rate * m.current_stock), 0);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Expiry Dashboard</h1>
        <p className="text-gray-500">Track and manage medicine expiry dates</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Expired</span>
          </div>
          <p className="text-2xl font-bold text-red-800">{categorizedMedicines.expired.length}</p>
          <p className="text-sm text-red-600 mt-1">{formatCurrency(totalExpiredValue)} worth</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">30 Days</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{categorizedMedicines.within30Days.length}</p>
          <p className="text-sm text-amber-600 mt-1">medicines expiring</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">60 Days</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">{categorizedMedicines.within60Days.length}</p>
          <p className="text-sm text-blue-600 mt-1">medicines expiring</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="font-semibold">Total Tracked</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{medicines.length}</p>
          <p className="text-sm text-green-600 mt-1">medicines with expiry</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter('30')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === '30' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Expiring Soon
          </button>
          <button
            onClick={() => setFilter('60')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === '60' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Next 60 Days
          </button>
          <button
            onClick={() => setFilter('90')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === '90' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Next 90 Days
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filter === 'all' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Medicines List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredMedicines.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No medicines in this category</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Medicine</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Batch</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Expiry</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Stock</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Value</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMedicines.map((medicine) => {
                  const status = getExpiryStatus(medicine.expiry_date!);
                  return (
                    <tr key={medicine.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{medicine.name}</div>
                        <div className="text-sm text-gray-500">{formatCurrency(medicine.selling_rate)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{medicine.batch_number || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{formatDate(medicine.expiry_date!)}</div>
                        <div className="text-sm text-gray-500">{status.days}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{medicine.current_stock}</td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {formatCurrency(medicine.purchase_rate * medicine.current_stock)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Return Report */}
      {categorizedMedicines.expired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h2 className="font-semibold text-red-800 mb-4">Return to Supplier Report</h2>
          <div className="space-y-2">
            {categorizedMedicines.expired.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm">
                <span className="text-gray-900">{m.name} ({m.batch_number || 'No batch'})</span>
                <span className="text-gray-600">{m.current_stock} units - {formatCurrency(m.purchase_rate * m.current_stock)}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Print Return List
          </button>
        </div>
      )}
    </div>
  );
}
