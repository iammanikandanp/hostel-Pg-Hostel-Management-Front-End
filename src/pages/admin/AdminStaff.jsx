import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserCog, Plus, X } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';

const ROLE_COLORS = {
  warden:     'bg-indigo-100 text-indigo-700',
  accountant: 'bg-emerald-100 text-emerald-700',
  security:   'bg-amber-100 text-amber-700',
};

function AddStaffModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'warden' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await hstApi.post('/staff', form);
      toast.success('Staff account created. Credentials sent via WhatsApp.');
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create staff');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800">Add Staff Account</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {[
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'e.g. Ravi Kumar' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'staff@hostel.com' },
              { label: 'Phone (10 digits)', key: 'phone', type: 'tel', placeholder: '9876543210' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input type={type} required placeholder={placeholder} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="warden">Warden (out-pass, late-come, complaints)</option>
                <option value="accountant">Accountant (billing only)</option>
                <option value="security">Security (gate out-pass view only)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition">
              {saving ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminStaff() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['staffList'],
    queryFn: async () => { const { data } = await hstApi.get('/staff'); return data; },
  });

  const deactivate = useMutation({
    mutationFn: (id) => hstApi.patch(`/staff/${id}/deactivate`),
    onSuccess: () => { toast.success('Staff account deactivated'); qc.invalidateQueries(['staffList']); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCog size={22} className="text-indigo-600" /> Staff Accounts
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage warden, accountant, and security accounts.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {data?.staff?.length === 0 ? (
          <p className="text-center py-12 text-slate-400">No staff accounts yet. Add your first staff member.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Name', 'Email', 'Phone', 'Role', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.staff.map(s => (
                    <tr key={s._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-5 py-3 text-slate-500">{s.email}</td>
                      <td className="px-5 py-3 text-slate-500">{s.phone}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${ROLE_COLORS[s.role]}`}>{s.role}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {s.isActive && (
                          <button onClick={() => { if (window.confirm(`Deactivate ${s.name}?`)) deactivate.mutate(s._id); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline">
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {data.staff.map(s => (
                <div key={s._id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800">{s.name}</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${ROLE_COLORS[s.role]}`}>{s.role}</span>
                  </div>
                  <p className="text-sm text-slate-500">{s.email} · {s.phone}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {s.isActive && (
                      <button onClick={() => { if (window.confirm(`Deactivate ${s.name}?`)) deactivate.mutate(s._id); }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && <AddStaffModal onClose={() => setShowModal(false)} onAdded={() => qc.invalidateQueries(['staffList'])} />}
    </div>
  );
}
