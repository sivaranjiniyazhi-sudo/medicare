import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Prescription, Customer } from '../../types';
import {
  Upload, Search, X, Camera, User, Calendar, FileImage, Trash2
} from 'lucide-react';

export function PrescriptionsView() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const [uploadForm, setUploadForm] = useState({
    customer_id: '',
    image_url: '',
    doctor_name: '',
    notes: '',
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: prescriptionsData } = await supabase
      .from('prescriptions')
      .select('*, customer:customers(id, name, mobile)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    const { data: customersData } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user!.id)
      .order('name');

    setPrescriptions(prescriptionsData || []);
    setCustomers(customersData || []);
    setLoading(false);
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    const customerName = (p.customer as any)?.name || '';
    return customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('prescriptions')
      .upload(fileName, file);

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(fileName);

      setUploadForm({ ...uploadForm, image_url: publicUrl });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.image_url) return;

    await supabase.from('prescriptions').insert({
      user_id: user!.id,
      customer_id: uploadForm.customer_id || null,
      image_url: uploadForm.image_url,
      doctor_name: uploadForm.doctor_name,
      notes: uploadForm.notes,
    });

    setShowUploadModal(false);
    setUploadForm({
      customer_id: '',
      image_url: '',
      doctor_name: '',
      notes: '',
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('prescriptions').delete().eq('id', id);
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
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-500">{prescriptions.length} prescriptions uploaded</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
        >
          <Upload className="w-5 h-5" />
          Upload Prescription
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
            placeholder="Search by customer or doctor name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Prescriptions Grid */}
      {filteredPrescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <FileImage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No prescriptions found</p>
          <p className="text-sm text-gray-400 mt-1">Upload your first prescription</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div
                className="aspect-[4/3] bg-gray-100 relative cursor-pointer"
                onClick={() => setSelectedPrescription(prescription)}
              >
                <img
                  src={prescription.image_url}
                  alt="Prescription"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ccc"><rect width="24" height="24"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="8">No Image</text></svg>';
                  }}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <FileImage className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {(prescription.customer as any)?.name || 'No Customer'}
                    </p>
                    {prescription.doctor_name && (
                      <p className="text-sm text-gray-500">Dr. {prescription.doctor_name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(prescription.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <Calendar className="w-3 h-3" />
                  {formatDate(prescription.created_at)}
                </div>
                {prescription.notes && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{prescription.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upload Prescription</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                <select
                  value={uploadForm.customer_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, customer_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Customer (Optional)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} - {c.mobile}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prescription Image</label>
                {uploadForm.image_url ? (
                  <div className="relative">
                    <img
                      src={uploadForm.image_url}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setUploadForm({ ...uploadForm, image_url: '' })}
                      className="absolute top-2 right-2 p-1 bg-white rounded-lg shadow"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Name</label>
                <input
                  type="text"
                  value={uploadForm.doctor_name}
                  onChange={(e) => setUploadForm({ ...uploadForm, doctor_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="Dr. Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input
                  type="text"
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadForm.image_url}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-medium"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Prescription Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPrescription(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh]">
            <button
              onClick={() => setSelectedPrescription(null)}
              className="absolute -top-10 right-0 text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedPrescription.image_url}
              alt="Prescription"
              className="w-full h-auto max-h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4 rounded-b-xl">
              <p className="text-white font-medium">
                {(selectedPrescription.customer as any)?.name || 'No Customer'}
              </p>
              {selectedPrescription.doctor_name && (
                <p className="text-gray-300 text-sm">Dr. {selectedPrescription.doctor_name}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
