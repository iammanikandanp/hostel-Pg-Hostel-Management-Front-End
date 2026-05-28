import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, X, CheckCircle, Clock, Wrench, XCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import hstApi from '../../api/hstAxios';
import { useHstLangStore } from '../../store/hstLangStore';
import { PageLoader } from '../../components/Spinner';

const STATUS_FLOW = ['open', 'acknowledged', 'fixed', 'closed'];

const STATUS_STYLE = {
  open:         { bg: 'bg-red-100',    text: 'text-red-700',    icon: AlertTriangle, label: 'Open' },
  acknowledged: { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Clock,         label: 'Acknowledged' },
  fixed:        { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Wrench,        label: 'Fixed' },
  closed:       { bg: 'bg-emerald-100',text: 'text-emerald-700',icon: CheckCircle,   label: 'Closed' },
};

const CATEGORY_LABEL = {
  electrical: 'Electrical', plumbing: 'Plumbing', cleanliness: 'Cleanliness',
  furniture: 'Furniture', security: 'Security', other: 'Other',
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.open;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <Icon size={11} /> {s.label}
    </span>
  );
}

function PhotoViewer({ photos, onClose }) {
  const [idx, setIdx] = useState(0);
  if (!photos.length) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-9 right-0 text-white hover:text-slate-300">
          <X size={24} />
        </button>
        <img src={photos[idx].url} alt="complaint" className="w-full rounded-xl object-contain max-h-[70vh]" />
        {photos.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`h-2 w-2 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-slate-500'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UpdateModal({ complaint, onClose, onUpdated }) {
  const [status, setStatus] = useState(complaint.status);
  const [note, setNote] = useState(complaint.adminNote || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await hstApi.patch(`/complaints/${complaint._id}`, { status, adminNote: note });
      toast.success('Status updated');
      onUpdated(data);
      onClose();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-slate-800">Update Complaint Status</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Complaint</p>
          <p className="text-sm text-slate-700 font-medium">{complaint.title}</p>
          <p className="text-xs text-slate-400">Room {complaint.roomNumber} · {CATEGORY_LABEL[complaint.category]}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map(s => {
              const style = STATUS_STYLE[s];
              return (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                    ${status === s ? `${style.bg} ${style.text} border-current` : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'}`}>
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Admin Note (optional)</label>
          <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add a note for the resident…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminComplaints() {
  const { t } = useHstLangStore();
  const [complaints, setComplaints] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [viewing, setViewing] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [photoViewer, setPhotoViewer] = useState(null);

  const fetchComplaints = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const { data } = await hstApi.get('/complaints', { params });
      setComplaints(data);
    } catch {
      toast.error('Failed to load complaints');
    }
  };

  useEffect(() => { fetchComplaints(); }, [filterStatus, filterCategory]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this complaint permanently?')) return;
    try {
      await hstApi.delete(`/complaints/${id}`);
      toast.success('Complaint deleted');
      setComplaints(prev => prev.filter(c => c._id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleUpdated = (updated) => {
    setComplaints(prev => prev.map(c => c._id === updated._id ? updated : c));
  };

  if (!complaints) return <PageLoader />;

  const counts = STATUS_FLOW.reduce((acc, s) => {
    acc[s] = complaints.filter(c => c.status === s).length;
    return acc;
  }, {});

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      {photoViewer && <PhotoViewer photos={photoViewer} onClose={() => setPhotoViewer(null)} />}
      {updating && (
        <UpdateModal complaint={updating} onClose={() => setUpdating(null)} onUpdated={handleUpdated} />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('complaints_title')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t('complaints_subtitle')}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_FLOW.map(s => {
          const style = STATUS_STYLE[s];
          const Icon = style.icon;
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={`rounded-xl border p-4 text-left transition-all ${filterStatus === s ? `${style.bg} border-current` : 'bg-white border-slate-100 hover:border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={style.text} />
                <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
              </div>
              <p className={`text-2xl font-bold ${style.text}`}>{counts[s]}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
            <option value="">All Statuses</option>
            {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
        </div>
        {(filterStatus || filterCategory) && (
          <button onClick={() => { setFilterStatus(''); setFilterCategory(''); }}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* List */}
      {complaints.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No complaints found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <div key={c._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatusBadge status={c.status} />
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {CATEGORY_LABEL[c.category]}
                    </span>
                    <span className="text-xs text-slate-400">Room {c.roomNumber}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">{c.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {c.resident?.name} · {c.resident?.email}
                  </p>
                  {c.adminNote && (
                    <p className="text-xs text-indigo-600 mt-1 italic">Note: {c.adminNote}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.photos?.length > 0 && (
                    <button onClick={() => setPhotoViewer(c.photos)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg">
                      <Eye size={12} /> {c.photos.length} photo{c.photos.length > 1 ? 's' : ''}
                    </button>
                  )}
                  <button onClick={() => setUpdating(c)}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                    Update
                  </button>
                  <button onClick={() => handleDelete(c._id)}
                    className="text-xs text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50">
                    <XCircle size={16} />
                  </button>
                </div>
              </div>

              {/* Status history */}
              {c.statusHistory?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-50">
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {c.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5 shrink-0">
                        {i > 0 && <div className="w-4 h-px bg-slate-200" />}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[h.status]?.bg} ${STATUS_STYLE[h.status]?.text}`}>
                          {STATUS_STYLE[h.status]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer placeholder — inline detail */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 z-40 grid place-items-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-slate-800">{viewing.title}</h3>
              <button onClick={() => setViewing(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-line">{viewing.description}</p>
            {viewing.photos?.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {viewing.photos.map((p, i) => (
                  <img key={i} src={p.url} alt="" onClick={() => setPhotoViewer(viewing.photos)}
                    className="rounded-lg object-cover w-full h-32 cursor-pointer hover:opacity-90" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
