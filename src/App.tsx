import { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { HomeView } from './components/views/HomeView';
import { MedicinesView } from './components/views/MedicinesView';
import { BillingView } from './components/views/BillingView';
import { StockView } from './components/views/StockView';
import { SuppliersView } from './components/views/SuppliersView';
import { ExpiryView } from './components/views/ExpiryView';
import { CustomersView } from './components/views/CustomersView';
import { InvoicesView } from './components/views/InvoicesView';
import { ReportsView } from './components/views/ReportsView';
import { RemindersView } from './components/views/RemindersView';
import { PrescriptionsView } from './components/views/PrescriptionsView';
import { SettingsView } from './components/views/SettingsView';
import { StaffView } from './components/views/StaffView';
import { SubscriptionView } from './components/views/SubscriptionView';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [alertsCount, setAlertsCount] = useState(0);

  // Prevent repeated fetches
  const alertsFetched = useRef(false);
  const fetchingAlerts = useRef(false);

  const fetchAlerts = useCallback(async () => {
    if (!user || fetchingAlerts.current) return;

    fetchingAlerts.current = true;

    try {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      // Get all medicines data in one query
      const { data: allMedicines, error } = await supabase
        .from('medicines')
        .select('id, current_stock, min_stock_level, expiry_date')
        .eq('user_id', user.id);

      if (error) {
        console.warn('Could not fetch alerts:', error.message);
        setAlertsCount(0);
        return;
      }

      const lowStockCount = allMedicines?.filter(m => m.current_stock <= (m.min_stock_level || 10)).length || 0;

      const expiringCount = allMedicines?.filter(m => {
        if (m.current_stock <= 0) return false;
        if (!m.expiry_date) return false;
        return new Date(m.expiry_date) < thirtyDays;
      }).length || 0;

      setAlertsCount(lowStockCount + expiringCount);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlertsCount(0);
    } finally {
      fetchingAlerts.current = false;
    }
  }, [user]);

  // Only fetch alerts once when user logs in
  useEffect(() => {
    if (user && !alertsFetched.current) {
      alertsFetched.current = true;
      fetchAlerts();
    } else if (!user) {
      alertsFetched.current = false;
      setAlertsCount(0);
    }
  }, [user?.id]); // Only depend on user.id, not the user object

  // Reset to dashboard when user logs in
  useEffect(() => {
    if (user) {
      setCurrentView('dashboard');
    }
  }, [user?.id]);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth page if no user
  if (!user) {
    return <Auth />;
  }

  // Render the appropriate view based on currentView state
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <HomeView onNavigate={setCurrentView} />;
      case 'billing':
        return <BillingView />;
      case 'medicines':
        return <MedicinesView />;
      case 'stock':
        return <StockView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'expiry':
        return <ExpiryView />;
      case 'customers':
        return <CustomersView />;
      case 'invoices':
        return <InvoicesView />;
      case 'reports':
        return <ReportsView />;
      case 'reminders':
        return <RemindersView />;
      case 'prescriptions':
        return <PrescriptionsView />;
      case 'settings':
        return <SettingsView />;
      case 'staff':
        return <StaffView />;
      case 'subscription':
        return <SubscriptionView />;
      default:
        return <HomeView onNavigate={setCurrentView} />;
    }
  };

  return (
    <Dashboard currentView={currentView} onNavigate={setCurrentView} alertsCount={alertsCount}>
      {renderView()}
    </Dashboard>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
