import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Megaphone, Plus, X, Trash2, EyeOff } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';

const PRIORITY_STYLES = {
  urgent: { badge: 'bg-red-100 text-red-700',    bar: 'border-l-4 border-red-400 bg-red-50' },
  normal: { badge: 'bg-blue-100 text-blue-700',   bar: 'border-l-4 border-blue-400 bg-blue-50' },
  info:   { badge: 'bg-slate-100 text-slate-600', bar: 'border-l-4 border-slate-300 bg-slate-50' },
};

const PRIORITY_ORDER = { urgent: 0, normal: 1, info: 2 };

function PostNoticeModal({ onClose, onPosted }) {
  const [form, setForm] = useState({ title: '', body: '', priority: 'normal', expiresAt: '', broadcast: false });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, expiresAt: form.expiresAt || null };
      await hstApi.post('/notices', payload);
      toast.success(form.broadcast ? 'Notice posted & WhatsApp sent to all residents.' : 'Notice posted.');
      onPosted(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post notice');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800">Post Notice</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-400">*</span></label>
              <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Water supply shutdown on 25th"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message <span className="text-red-400">*</span></label>
              <textarea required rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Full notice details..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expires On (optional)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={form.broadcast} onChange={e => setForm(f => ({ ...f, broadcast: e.target.checked }))}
                className="w-4 h-4 rounded accent-indigo-600" />
              <span className="text-sm text-slate-700">Send WhatsApp to all active residents</span>
            </label>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition">
              {saving ? 'Posting…' : 'Post Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminNotices() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notices-all'],
    queryFn: async () => { const { data } = await hstApi.get('/notices/all'); return data; },
  });

  const deactivate = useMutation({
    mutationFn: (id) => hstApi.patch(`/notices/${id}`, { isActive: false }),
    onSuccess: () => { toast.success('Notice hidden'); qc.invalidateQueries(['notices-all']); },
    onError: () => toast.error('Failed'),
  });

  const del = useMutation({
    mutationFn: (id) => hstApi.delete(`/notices/${id}`),
    onSuccess: () => { toast.success('Notice deleted'); qc.invalidateQueries(['notices-all']); },
    onError: () => toast.error('Failed'),
  });

  const sorted = [...(data?.notices ?? [])].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Megaphone size={22} className="text-indigo-600" /> Notice Board
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Post announcements visible to all residents.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
          <Plus size={16} /> Post Notice
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          No notices yet. Post your first announcement.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(n => {
            const s = PRIORITY_STYLES[n.priority];
            const expired = n.expiresAt && new Date(n.expiresAt) < new Date();
            return (
              <div key={n._id} className={`rounded-2xl p-5 ${!n.isActive || expired ? 'opacity-50' : ''} ${s.bar}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg capitalize ${s.badge}`}>{n.priority}</span>
                      {!n.isActive && <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">Hidden</span>}
                      {expired && <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-lg">Expired</span>}
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">{n.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{n.body}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      Posted by {n.postedBy?.name ?? 'Admin'} · {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {n.expiresAt && ` · Expires ${new Date(n.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {n.isActive && !expired && (
                      <button onClick={() => deactivate.mutate(n._id)} title="Hide notice"
                        className="p-2 rounded-xl hover:bg-white/60 text-slate-400 hover:text-slate-600 transition">
                        <EyeOff size={16} />
                      </button>
                    )}
                    <button onClick={() => { if (window.confirm('Delete this notice?')) del.mutate(n._id); }} title="Delete"
                      className="p-2 rounded-xl hover:bg-white/60 text-red-400 hover:text-red-600 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <PostNoticeModal onClose={() => setShowModal(false)} onPosted={() => qc.invalidateQueries(['notices-all'])} />}
    </div>
  );
}
