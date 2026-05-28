import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Save, UserPlus } from 'lucide-react';
import hstApi from '../../api/hstAxios';

const STATUS_COLORS = {
  waiting:   'bg-amber-50 text-amber-700 border-amber-200',
  offered:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
};

const STATUSES = ['waiting', 'offered', 'converted', 'cancelled'];
const ROOM_TYPES = ['any', 'single', 'double', 'triple'];

function AddModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', roomType: 'any', notes: '' });

  const mutation = useMutation({
    mutationFn: () => hstApi.post('/waitlist', form),
    onSuccess: () => { toast.success('Added to waitlist'); qc.invalidateQueries({ queryKey: ['waitlist'] }); onClose(); },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Add to Waitlist</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: 'name',  label: 'Full Name',     type: 'text' },
            { key: 'email', label: 'Email',          type: 'email' },
            { key: 'phone', label: 'Phone (10 digits)', type: 'tel' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Preferred Room Type</label>
            <select value={form.roomType} onChange={e => setForm(p => ({...p, roomType: e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 capitalize">
              {ROOM_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminWaitlist() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['waitlist', statusFilter],
    queryFn: () => hstApi.get(`/waitlist${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => hstApi.patch(`/waitlist/${id}`, { status }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['waitlist'] }); },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => hstApi.delete(`/waitlist/${id}`),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['waitlist'] }); },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const list = data?.waitlist ?? [];

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Waitlist</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage prospective residents waiting for a room</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200">
          <Plus size={16} /> Add to Waitlist
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', ...STATUSES].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <UserPlus size={32} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm">No waitlist entries.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(entry => (
            <div key={entry._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{entry.name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[entry.status]}`}>
                      {entry.status}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{entry.roomType} room</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{entry.email} · {entry.phone}</p>
                  {entry.notes && <p className="text-xs text-slate-400 mt-1 italic">{entry.notes}</p>}
                  <p className="text-[10px] text-slate-300 mt-1">
                    Added {new Date(entry.createdAt).toLocaleDateString('en-IN')}
                    {entry.offeredAt && ` · Offered ${new Date(entry.offeredAt).toLocaleDateString('en-IN')}`}
                  </p>
                </div>
                <button onClick={() => deleteMutation.mutate(entry._id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
              {entry.status !== 'converted' && entry.status !== 'cancelled' && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {STATUSES.filter(s => s !== entry.status && s !== 'converted').map(s => (
                    <button key={s} onClick={() => updateMutation.mutate({ id: entry._id, status: s })}
                      className="px-3 py-1 rounded-lg border text-xs font-medium capitalize border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      Mark {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
