import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Pill, LayoutDashboard, Package, ShoppingCart, BarChart3,
  Users, FileText, Settings, LogOut, Bell, Menu, X,
  Calendar, CreditCard, MessageCircle, UserCog, ClipboardList, Building2
} from 'lucide-react';
import { useState } from 'react';

interface SidebarItem {
  icon: ReactNode;
  label: string;
  view: string;
  roles?: ('owner' | 'cashier' | 'pharmacist')[];
}

const sidebarItems: SidebarItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', view: 'dashboard' },
  { icon: <ShoppingCart className="w-5 h-5" />, label: 'Billing / POS', view: 'billing', roles: ['owner', 'cashier', 'pharmacist'] },
  { icon: <Package className="w-5 h-5" />, label: 'Medicines', view: 'medicines', roles: ['owner', 'pharmacist'] },
  { icon: <ClipboardList className="w-5 h-5" />, label: 'Stock', view: 'stock', roles: ['owner', 'pharmacist'] },
  { icon: <Building2 className="w-5 h-5" />, label: 'Suppliers', view: 'suppliers', roles: ['owner', 'pharmacist'] },
  { icon: <Calendar className="w-5 h-5" />, label: 'Expiry', view: 'expiry', roles: ['owner', 'pharmacist'] },
  { icon: <Users className="w-5 h-5" />, label: 'Customers', view: 'customers' },
  { icon: <FileText className="w-5 h-5" />, label: 'Invoices', view: 'invoices' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Reports', view: 'reports', roles: ['owner'] },
  { icon: <MessageCircle className="w-5 h-5" />, label: 'Reminders', view: 'reminders' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Prescriptions', view: 'prescriptions' },
  { icon: <UserCog className="w-5 h-5" />, label: 'Staff', view: 'staff', roles: ['owner'] },
  { icon: <Settings className="w-5 h-5" />, label: 'Settings', view: 'settings' },
];

interface DashboardProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  alertsCount: number;
}

export function Dashboard({ children, currentView, onNavigate, alertsCount }: DashboardProps) {
  const { user, settings, role, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = role?.role || 'owner';

  const filteredItems = sidebarItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole as 'owner' | 'cashier' | 'pharmacist');
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Pill className="w-6 h-6 text-emerald-600" />
          <span className="font-semibold text-gray-900">{settings?.shop_name || 'PharmaCare'}</span>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out z-50 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Pill className="w-8 h-8 text-emerald-600" />
          <span className="font-bold text-xl text-gray-900 ml-2">PharmaCare</span>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {filteredItems.map((item) => (
            <button
              key={item.view}
              onClick={() => {
                onNavigate(item.view);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                currentView === item.view
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.icon}
              {item.label}
              {item.view === 'expiry' && alertsCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {alertsCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-emerald-700 font-semibold">
                {user?.email?.[0].toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="h-16 bg-white border-b border-gray-200 hidden lg:flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">
              {sidebarItems.find(i => i.view === currentView)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {alertsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm">
                <Bell className="w-4 h-4" />
                <span>{alertsCount} alerts</span>
              </div>
            )}
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
