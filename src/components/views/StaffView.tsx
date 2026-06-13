import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { Plus, Search, UserCog, Trash2, X, Check } from 'lucide-react';

export function StaffView() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'cashier' as 'owner' | 'cashier' | 'pharmacist',
  });

  useEffect(() => {
    if (user) fetchStaff();
  }, [user]);

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('*, user:users!user_roles_user_id_fkey(email)')
      .eq('owner_id', user!.id);

    setStaff(data || []);
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    // This is a simplified version - in production you'd use Supabase Auth admin API
    // or an edge function to send invitation emails
    alert('Staff invitation feature requires backend setup. In production, you would invite users via email.');
    setShowInviteModal(false);
  };

  const handleToggleActive = async (staffId: string, currentStatus: boolean) => {
    await supabase
      .from('user_roles')
      .update({ is_active: !currentStatus })
      .eq('id', staffId);
    fetchStaff();
  };

  const handleDelete = async (staffId: string) => {
    await supabase.from('user_roles').delete().eq('id', staffId);
    fetchStaff();
  };

  const roleLabels = {
    owner: { label: 'Owner', color: 'bg-purple-100 text-purple-700' },
    cashier: { label: 'Cashier', color: 'bg-blue-100 text-blue-700' },
    pharmacist: { label: 'Pharmacist', color: 'bg-green-100 text-green-700' },
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
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500">{staff.length + 1} staff members</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Invite Staff
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm text-blue-700">
          <strong>Roles:</strong> Owners have full access, Pharmacists can manage medicines and stock, Cashiers can only access billing.
        </p>
      </div>

      {/* Current User (Owner) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <UserCog className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{user?.email}</p>
            <p className="text-sm text-gray-500">Account Owner</p>
          </div>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
            Owner
          </span>
        </div>
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No staff members added yet</p>
          <p className="text-sm text-gray-400 mt-1">Invite staff to help manage your pharmacy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <div key={member.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    member.role === 'pharmacist' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <span className={`font-semibold ${
                      member.role === 'pharmacist' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {(member.user?.email?.[0] || 'S').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.user?.email || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">
                      Added {new Date(member.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    roleLabels[member.role as keyof typeof roleLabels].color
                  }`}>
                    {roleLabels[member.role as keyof typeof roleLabels].label}
                  </span>

                  <button
                    onClick={() => handleToggleActive(member.id, member.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      member.is_active
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={member.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {member.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!member.is_active && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                    Inactive
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Invite Staff Member</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="staff@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cashier">Cashier - Billing only</option>
                  <option value="pharmacist">Pharmacist - Medicines & Stock</option>
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-sm text-gray-600">
                  <strong>Cashier:</strong> Can only access billing and create invoices.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Pharmacist:</strong> Can manage medicines, stock, and billing.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
