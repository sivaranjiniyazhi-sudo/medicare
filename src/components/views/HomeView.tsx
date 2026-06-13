import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, ShoppingCart, Package, Users, AlertTriangle, DollarSign, Calendar, ArrowUpRight } from 'lucide-react';

interface DashboardStats {
  todaySales: number;
  todayBills: number;
  monthSales: number;
  monthProfit: number;
  totalCustomers: number;
  lowStockCount: number;
  expiringCount: number;
  topMedicines: { name: string; quantity: number; revenue: number }[];
}

export function HomeView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayBills: 0,
    monthSales: 0,
    monthProfit: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    expiringCount: 0,
    topMedicines: [],
  });
  const [salesData, setSalesData] = useState<{ date: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent multiple fetches
  const dataFetched = useRef(false);
  const fetchingRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!user || fetchingRef.current) return;

    fetchingRef.current = true;
    setError(null);

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    try {
      // Run all queries in parallel for efficiency
      const [
        todayInvoicesRes,
        monthInvoicesRes,
        monthItemsRes,
        customersRes,
        medicinesRes,
        expiringRes,
        topItemsRes,
      ] = await Promise.allSettled([
        supabase.from('invoices').select('total, created_at').eq('user_id', user.id).gte('created_at', today),
        supabase.from('invoices').select('total').eq('user_id', user.id).gte('created_at', monthStart),
        supabase.from('invoice_items').select('quantity, selling_rate, purchase_rate, total').eq('user_id', user.id).gte('created_at', monthStart),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('medicines').select('id, current_stock, min_stock_level').eq('user_id', user.id),
        supabase.from('medicines').select('id').eq('user_id', user.id).lt('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()).gt('current_stock', 0),
        supabase.from('invoice_items').select('medicine_name, quantity, total').eq('user_id', user.id).gte('created_at', monthStart).order('total', { ascending: false }).limit(5),
      ]);

      // Process results safely
      const todayInvoices = todayInvoicesRes.status === 'fulfilled' ? todayInvoicesRes.value.data : [];
      const monthInvoices = monthInvoicesRes.status === 'fulfilled' ? monthInvoicesRes.value.data : [];
      const monthItems = monthItemsRes.status === 'fulfilled' ? monthItemsRes.value.data : [];
      const totalCustomers = customersRes.status === 'fulfilled' ? customersRes.value.count : 0;
      const allMedicines = medicinesRes.status === 'fulfilled' ? medicinesRes.value.data : [];
      const expiring = expiringRes.status === 'fulfilled' ? expiringRes.value.data : [];
      const topItems = topItemsRes.status === 'fulfilled' ? topItemsRes.value.data : [];

      const todaySales = todayInvoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;
      const todayBills = todayInvoices?.length || 0;
      const monthSales = monthInvoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;
      const monthProfit = monthItems?.reduce((sum, item) => {
  const salesAmount = Number(item.total || 0);
  const purchaseCost = Number(item.purchase_rate || 0) * Number(item.quantity || 1);

  const profit = salesAmount - purchaseCost;

  return sum + profit;
}, 0) || 0;
      const lowStockCount = allMedicines?.filter(m => m.current_stock <= (m.min_stock_level || 10)).length || 0;
      const expiringCount = expiring?.length || 0;

      const topMedicinesMap = new Map<string, { quantity: number; revenue: number }>();
      topItems?.forEach(item => {
        const existing = topMedicinesMap.get(item.medicine_name) || { quantity: 0, revenue: 0 };
        topMedicinesMap.set(item.medicine_name, {
          quantity: existing.quantity + (item.quantity || 0),
          revenue: existing.revenue + Number(item.total || 0),
        });
      });

      const topMedicines = Array.from(topMedicinesMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        todaySales,
        todayBills,
        monthSales,
        monthProfit,
        totalCustomers: totalCustomers || 0,
        lowStockCount,
        expiringCount,
        topMedicines,
      });

    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Could not load dashboard data');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user]);

  const fetchSalesChart = useCallback(async () => {
    if (!user) return;

    const days = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('created_at, total')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Could not fetch sales chart:', error.message);
      }

      if (invoices) {
        const byDate = new Map<string, number>();
        invoices.forEach(inv => {
          const date = new Date(inv.created_at).toLocaleDateString('en-IN');
          byDate.set(date, (byDate.get(date) || 0) + Number(inv.total || 0));
        });

        const chartData = [];
        for (let i = days; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-IN');
          chartData.push({
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            amount: byDate.get(dateStr) || 0,
          });
        }
        setSalesData(chartData);
      }
    } catch (err) {
      console.error('Error fetching sales chart:', err);
    }
  }, [user]);

  useEffect(() => {
    // Only fetch once per user
    if (user && !dataFetched.current) {
      dataFetched.current = true;
      fetchStats();
      fetchSalesChart();
    }
  }, [user, fetchStats, fetchSalesChart]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const maxSales = Math.max(...salesData.map(d => d.amount), 1);

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-amber-800">{error}</span>
          <button onClick={() => { setError(null); fetchStats(); }} className="text-amber-700 underline">
            Retry
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todaySales)}</p>
          <p className="text-sm text-gray-500 mt-1">{stats.todayBills} bills</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthSales)}</p>
          <p className="text-sm text-emerald-600 mt-1">+{formatCurrency(stats.monthProfit)} profit</p>
        </div>

        <div
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => onNavigate('customers')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
          <p className="text-sm text-gray-500 mt-1">Total Customers</p>
        </div>

        <div
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md cursor-pointer transition-shadow"
          onClick={() => onNavigate('expiry')}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.lowStockCount + stats.expiringCount}</p>
          <p className="text-sm text-red-600 mt-1">Alerts</p>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sales Trend</h2>
            <p className="text-sm text-gray-500">Last 30 days</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
            <span className="text-sm text-gray-600">Daily Sales</span>
          </div>
        </div>

        {salesData.length > 0 ? (
          <div className="h-64 flex items-end gap-1">
            {salesData.map((day, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end group relative"
              >
                <div
                  className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-colors min-h-[4px]"
                  style={{ height: `${(day.amount / maxSales) * 100}%` }}
                />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {day.date}: {formatCurrency(day.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            {loading ? 'Loading chart...' : 'No sales data yet'}
          </div>
        )}

        {salesData.length > 0 && (
          <div className="flex justify-between mt-4 text-xs text-gray-500">
            <span>{salesData[0]?.date}</span>
            <span>{salesData[salesData.length - 1]?.date}</span>
          </div>
        )}
      </div>

      {/* Quick Actions & Top Medicines */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('billing')}
              className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
              <span className="font-medium text-emerald-700">New Bill</span>
            </button>
            <button
              onClick={() => onNavigate('medicines')}
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <Package className="w-6 h-6 text-blue-600" />
              <span className="font-medium text-blue-700">Medicines</span>
            </button>
            <button
              onClick={() => onNavigate('stock')}
              className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
            >
              <Package className="w-6 h-6 text-purple-600" />
              <span className="font-medium text-purple-700">Stock Entry</span>
            </button>
            <button
              onClick={() => onNavigate('invoices')}
              className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
            >
              <Calendar className="w-6 h-6 text-orange-600" />
              <span className="font-medium text-orange-700">Invoice History</span>
            </button>
          </div>
        </div>

        {/* Top Medicines */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Medicines</h2>
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
                    <p className="text-sm text-gray-500">{med.quantity} units sold</p>
                  </div>
                  <p className="font-semibold text-emerald-600">{formatCurrency(med.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(stats.lowStockCount > 0 || stats.expiringCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Attention Required
          </h3>
          <div className="flex flex-wrap gap-4">
            {stats.lowStockCount > 0 && (
              <button
                onClick={() => onNavigate('stock')}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors"
              >
                {stats.lowStockCount} medicines low on stock
              </button>
            )}
            {stats.expiringCount > 0 && (
              <button
                onClick={() => onNavigate('expiry')}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors"
              >
                {stats.expiringCount} medicines expiring soon
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
