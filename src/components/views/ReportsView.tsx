import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  TrendingUp, DollarSign, Receipt, Package, Calendar,
  BarChart3, Download
} from 'lucide-react';

export function ReportsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [stats, setStats] = useState<{
    totalSales: number;
    totalProfit: number;
    totalBills: number;
    totalItems: number;
    avgBillValue: number;
    topMedicines: { name: string; quantity: number; revenue: number }[];
    salesByDate: { date: string; amount: number }[];
    salesByPayment: { cash: number; card: number; upi: number };
  }>({
    totalSales: 0,
    totalProfit: 0,
    totalBills: 0,
    totalItems: 0,
    avgBillValue: 0,
    topMedicines: [],
    salesByDate: [],
    salesByPayment: { cash: 0, card: 0, upi: 0 },
  });

  useEffect(() => {
    if (user) fetchReport();
  }, [user, dateRange]);

  const fetchReport = async () => {
    setLoading(true);

    let startDate = new Date();
    const now = new Date();

    if (dateRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === 'month') {
      startDate.setDate(now.getDate() - 30);
    } else if (dateRange === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (dateRange === 'custom') {
      startDate = new Date(customRange.start || now);
    }

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user!.id)
      .gte('created_at', startDate.toISOString());

    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('user_id', user!.id)
      .gte('created_at', startDate.toISOString());

    // Calculate stats
    const totalSales = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
    const totalBills = invoices?.length || 0;
    const totalItems = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const avgBillValue = totalBills > 0 ? totalSales / totalBills : 0;

    // Calculate actual profit
  const totalProfit = items?.reduce((sum, item) => {
  const sellingRate = Number(item.selling_rate || 0);
  const purchaseRate = Number(item.purchase_rate || 0);
  const quantity = Number(item.quantity || 1);

  const profit = (sellingRate - purchaseRate) * quantity;

  return sum + profit;
}, 0) || 0;

    // Top medicines
    const medicineStats = new Map<string, { quantity: number; revenue: number }>();
    items?.forEach(item => {
      const existing = medicineStats.get(item.medicine_name) || { quantity: 0, revenue: 0 };
      medicineStats.set(item.medicine_name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + Number(item.total),
      });
    });

    const topMedicines = Array.from(medicineStats.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Sales by date
    const salesByDateMap = new Map<string, number>();
    invoices?.forEach(inv => {
      const date = new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      salesByDateMap.set(date, (salesByDateMap.get(date) || 0) + Number(inv.total));
    });

    const salesByDate = Array.from(salesByDateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .reverse();

    // Sales by payment method
    const salesByPayment = {
      cash: invoices?.filter(i => i.payment_method === 'cash').reduce((s, i) => s + Number(i.total), 0) || 0,
      card: invoices?.filter(i => i.payment_method === 'card').reduce((s, i) => s + Number(i.total), 0) || 0,
      upi: invoices?.filter(i => i.payment_method === 'upi').reduce((s, i) => s + Number(i.total), 0) || 0,
    };

    setStats({
      totalSales,
      totalProfit,
      totalBills,
      totalItems,
      avgBillValue,
      topMedicines,
      salesByDate,
      salesByPayment,
    });
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportReport = () => {
    let text = 'SALES REPORT\n';
    text += '================\n';
    text += `Period: ${dateRange.toUpperCase()}\n\n`;
    text += `Total Sales: ${formatCurrency(stats.totalSales)}\n`;
    text += `Total Profit: ${formatCurrency(stats.totalProfit)}\n`;
    text += `Total Bills: ${stats.totalBills}\n`;
    text += `Total Items: ${stats.totalItems}\n`;
    text += `Avg Bill Value: ${formatCurrency(stats.avgBillValue)}\n\n`;
    text += `PAYMENT BREAKDOWN\n`;
    text += `Cash: ${formatCurrency(stats.salesByPayment.cash)}\n`;
    text += `Card: ${formatCurrency(stats.salesByPayment.card)}\n`;
    text += `UPI: ${formatCurrency(stats.salesByPayment.upi)}\n\n`;
    text += `TOP MEDICINES\n`;
    stats.topMedicines.forEach((m, i) => {
      text += `${i + 1}. ${m.name}: ${formatCurrency(m.revenue)} (${m.quantity} units)\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxSales = Math.max(...stats.salesByDate.map(d => d.amount), 1);

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
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Sales insights and performance metrics</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors"
        >
          <Download className="w-5 h-5" />
          Export
        </button>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month', 'year', 'custom'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === range ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : range === 'year' ? 'This Year' : 'Custom'}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex gap-3 mt-4">
            <input
              type="date"
              value={customRange.start}
              onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg"
            />
            <input
              type="date"
              value={customRange.end}
              onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg"
            />
            <button
              onClick={fetchReport}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-gray-500">Total Sales</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSales)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Estimated Profit</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalProfit)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total Bills</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalBills}</p>
          <p className="text-sm text-gray-500">Avg: {formatCurrency(stats.avgBillValue)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Items Sold</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Sales Trend</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
              <span className="text-sm text-gray-600">Daily Sales</span>
            </div>
          </div>
        </div>

        <div className="h-64 flex items-end gap-2">
          {stats.salesByDate.slice(-30).map((day, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end group relative min-w-[8px]"
            >
              <div
                className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t transition-colors min-h-[2px]"
                style={{ height: `${Math.max((day.amount / maxSales) * 100, 1)}%` }}
              />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {day.date}: {formatCurrency(day.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Breakdown</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">C</span>
                </div>
                <span className="font-medium text-gray-900">Cash</span>
              </div>
              <span className="font-bold text-gray-900">{formatCurrency(stats.salesByPayment.cash)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">CC</span>
                </div>
                <span className="font-medium text-gray-900">Card</span>
              </div>
              <span className="font-bold text-gray-900">{formatCurrency(stats.salesByPayment.card)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">U</span>
                </div>
                <span className="font-medium text-gray-900">UPI</span>
              </div>
              <span className="font-bold text-gray-900">{formatCurrency(stats.salesByPayment.upi)}</span>
            </div>
          </div>
        </div>

        {/* Top Medicines */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Top Selling Medicines</h2>
          {stats.topMedicines.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.topMedicines.map((med, i) => (
                <div key={med.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{med.name}</p>
                    <p className="text-sm text-gray-500">{med.quantity} units</p>
                  </div>
                  <p className="font-semibold text-emerald-600">{formatCurrency(med.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
