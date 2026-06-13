import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Customer, CustomerReminder } from '../../types';
import {
  MessageCircle, Plus, Search, Send, Clock, Check, X, RefreshCw
} from 'lucide-react';

export function RemindersView() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reminders, setReminders] = useState<CustomerReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');

  const defaultMessage = 'Sir/Madam, your regular medicine refill time has arrived. Please visit our pharmacy at your convenience.';

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: customersData } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user!.id)
      .eq('requires_regular_medicine', true)
      .order('name');

    const { data: remindersData } = await supabase
      .from('customer_reminders')
      .select('*, customer:customers(name, mobile)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setCustomers(customersData || []);
    setReminders(remindersData || []);
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile.includes(searchTerm)
  );

  const handleSendReminder = async () => {
    if (!selectedCustomer) return;

    const message = reminderMessage || defaultMessage;

    // Save reminder
    await supabase.from('customer_reminders').insert({
      user_id: user!.id,
      customer_id: selectedCustomer.id,
      reminder_type: 'manual',
      medicine_type: selectedCustomer.medicine_type,
      message,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // Update customer's last reminder date
    await supabase
      .from('customers')
      .update({ last_reminder_date: new Date().toISOString().split('T')[0] })
      .eq('id', selectedCustomer.id);

    // Open WhatsApp
    const phone = selectedCustomer.mobile.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');

    setShowModal(false);
    setSelectedCustomer(null);
    setReminderMessage('');
    fetchData();
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
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Reminders</h1>
          <p className="text-gray-500">{customers.length} customers with regular medicine</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">WhatsApp Reminder System</p>
            <p className="text-sm text-blue-600 mt-1">
              Send medicine refill reminders to customers who purchase regular medicines like BP Tablets, Diabetes Tablets, or Thyroid Tablets.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Customers List */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <p className="text-gray-500">No customers marked for regular medicine</p>
              <p className="text-sm text-gray-400 mt-1">Mark customers in Customer Management</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.mobile}</p>
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full mt-2">
                        {customer.medicine_type || 'Regular Medicine'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setReminderMessage(defaultMessage);
                        setShowModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                  {customer.last_reminder_date && (
                    <p className="text-xs text-gray-400 mt-2">
                      Last reminder: {formatDate(customer.last_reminder_date)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reminder History */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Reminders</h2>
          {reminders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No reminders sent yet</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">
                      {(reminder.customer as any)?.name || 'Unknown'}
                    </p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      reminder.status === 'sent' ? 'bg-green-100 text-green-700' :
                      reminder.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {reminder.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{reminder.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatDate(reminder.created_at)}
                    {reminder.medicine_type && (
                      <>
                        <span>|</span>
                        <span>{reminder.medicine_type}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Send Reminder Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Send Reminder</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedCustomer(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                <p className="text-sm text-gray-500">{selectedCustomer.mobile}</p>
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full mt-2">
                  {selectedCustomer.medicine_type || 'Regular Medicine'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedCustomer(null);
                  }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendReminder}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send via WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
