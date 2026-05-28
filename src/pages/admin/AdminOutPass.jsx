import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, RotateCcw, MapPin, MessageSquare, Timer, AlertTriangle, X } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import Spinner from '../../components/Spinner';
import { useHstLangStore } from '../../store/hstLangStore';

const STATUS = {
  pending:  { cls: 'bg-amber-100 text-amber-700',    icon: Clock },
  approved: { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { cls: 'bg-red-100 text-red-600',         icon: XCircle },
  returned: { cls: 'bg-blue-100 text-blue-700',        icon: RotateCcw },
};

const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminOutPass() {
  const { t } = useHstLangStore();
  const [passes, setPasses]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote]       = useState({});
  const [extModal, setExtModal] = useState(null);  // { op } — extension decision modal
  const [extNote, setExtNote]   = useState('');
  const [extDeciding, setExtDeciding] = useState(false);

  const fetchPasses = () =>
    hstApi.get('/outpass')
      .then(r => setPasses(r.data.passes))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { fetchPasses(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await hstApi.patch(`/outpass/${id}/status`, { status, adminNote: note[id] || '' });
      toast.success(`Out-pass ${status}`);
      fetchPasses();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openExtModal = (op) => {
    setExtModal(op);
    setExtNote('');
  };

  const decideExtension = async (status) => {
    setExtDeciding(true);
    try {
      await hstApi.patch(`/outpass/${extModal._id}/extension/status`, { status, adminNote: extNote });
      toast.success(`Extension ${status}`);
      setExtModal(null);
      fetchPasses();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setExtDeciding(false); }
  };

  if (loading) return <PageLoader />;

  const now        = new Date();
  const pending    = passes.filter(p => p.status === 'pending');
  const extPending = passes.filter(p => p.extensionRequested && p.extensionStatus === 'pending');
  const others     = passes.filter(p => p.status !== 'pending');

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('outpass_title')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          <span className="text-amber-600 font-semibold">{pending.length} {t('pending')}</span>
          {extPending.length > 0 && (
            <span className="text-orange-600 font-semibold"> · {extPending.length} {t('outpass_extensions').toLowerCase()}</span>
          )}
          {' '}&bull; {others.length} {t('outpass_resolved').toLowerCase()}
        </p>
      </div>

      {/* ── Pending approval ── */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('outpass_awaiting')}</h2>
          <div className="space-y-4">
            {pending.map(op => (
              <PassCard key={op._id} op={op} note={note} setNote={setNote}
                updateStatus={updateStatus} now={now} onExtension={openExtModal} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* ── Extension requests ── */}
      {extPending.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Timer size={13} /> {t('outpass_extensions')}
          </h2>
          <div className="space-y-3">
            {extPending.map(op => (
              <ExtensionCard key={op._id} op={op} now={now} onDecide={() => openExtModal(op)} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* ── Resolved ── */}
      {others.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('outpass_resolved')}</h2>
          <div className="space-y-3">
            {others.map(op => (
              <PassCard key={op._id} op={op} note={note} setNote={setNote}
                updateStatus={updateStatus} now={now} onExtension={openExtModal} resolved t={t} />
            ))}
          </div>
        </section>
      )}

      {passes.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="font-medium">{t('outpass_no_requests')}</p>
        </div>
      )}

      {/* ── Extension Decision Modal ── */}
      {extModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setExtModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Timer size={18} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Extension Request</p>
                  <p className="text-xs text-slate-400">{extModal.userId?.name} · {extModal.destination}</p>
                </div>
              </div>
              <button onClick={() => setExtModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{t('outpass_expected_return')}</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{fmt(extModal.expectedReturn)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wide">{t('outpass_new_return_time')}</p>
                  <p className="text-sm font-bold text-amber-700 mt-0.5">{fmt(extModal.extendedReturn)}</p>
                </div>
              </div>

              {/* Extension reason */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700">
                <p className="text-xs text-slate-400 font-semibold mb-1">{t('outpass_extension_reason')}</p>
                {extModal.extensionReason}
              </div>

              {/* Admin note */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('outpass_note_to_resident')}</label>
                <input
                  placeholder={t('outpass_note_to_resident')}
                  value={extNote}
                  onChange={e => setExtNote(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => decideExtension('rejected')} disabled={extDeciding}
                  className="flex-1 flex items-center justify-center gap-1.5 border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-600 h-11 rounded-xl text-sm font-semibold transition-all">
                  <XCircle size={15} /> {t('reject')}
                </button>
                <button onClick={() => decideExtension('approved')} disabled={extDeciding}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white h-11 rounded-xl text-sm font-semibold transition-all">
                  {extDeciding
                    ? <Spinner size="sm" className="border-emerald-200 border-t-white" />
                    : <><CheckCircle size={15} /> {t('approve')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pass Card ────────────────────────────────────────────────────────────────
function PassCard({ op, note, setNote, updateStatus, now, onExtension, resolved, t }) {
  const s        = STATUS[op.status] ?? STATUS.pending;
  const Icon     = s.icon;
  const isOverdue = op.status === 'approved' && new Date(op.expectedReturn) < now;
  const extPending = op.extensionRequested && op.extensionStatus === 'pending';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
      isOverdue ? 'border-red-200' : resolved ? 'border-slate-100 opacity-80' : 'border-amber-100'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {op.userId?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{op.userId?.name}</p>
            <p className="text-xs text-slate-400">Submitted {fmt(op.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
            <Icon size={12} /> {t(op.status)}
          </span>
          {isOverdue && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              {t('outpass_overdue')}
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-3 pl-1">
        <p className="text-sm text-slate-600 flex items-start gap-2">
          <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <span><span className="font-medium text-slate-700">{t('outpass_destination')}:</span> {op.destination}</span>
        </p>
        <p className="text-sm text-slate-600 flex items-start gap-2">
          <MessageSquare size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <span><span className="font-medium text-slate-700">{t('reason')}:</span> {op.reason}</span>
        </p>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        {op.plannedOutTime && !op.outTime && (
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">{t('outpass_planned_out')}</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{fmt(op.plannedOutTime)}</p>
          </div>
        )}
        {op.outTime && (
          <div className="bg-indigo-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-indigo-400 font-semibold uppercase">{t('outpass_actual_out')}</p>
            <p className="text-xs font-semibold text-indigo-700 mt-0.5">{fmt(op.outTime)}</p>
          </div>
        )}
        <div className={`rounded-xl px-3 py-2 ${isOverdue ? 'bg-red-50' : 'bg-slate-50'}`}>
          <p className="text-[10px] font-semibold uppercase text-slate-400">{t('outpass_expected_return')}</p>
          <p className={`text-xs font-semibold mt-0.5 ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
            {fmt(op.expectedReturn)}
          </p>
        </div>
        {op.actualReturnTime && (
          <div className="bg-blue-50 rounded-xl px-3 py-2">
            <p className="text-[10px] text-blue-400 font-semibold uppercase">{t('outpass_actual_return')}</p>
            <p className="text-xs font-semibold text-blue-700 mt-0.5">{fmt(op.actualReturnTime)}</p>
          </div>
        )}
      </div>

      {op.adminNote && (
        <p className="text-xs text-slate-500 italic mb-3 pl-1">Note: {op.adminNote}</p>
      )}

      {/* Extension badge */}
      {extPending && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-orange-700">
            <Timer size={13} />
            <span>{t('outpass_extensions')} → <strong>{fmt(op.extendedReturn)}</strong></span>
          </div>
          <button onClick={() => onExtension(op)}
            className="text-xs font-bold text-orange-600 hover:text-orange-800 underline">
            {t('approve')}
          </button>
        </div>
      )}

      {/* Approve/Reject actions */}
      {op.status === 'pending' && (
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100">
          <input
            placeholder={t('outpass_note_to_resident')}
            value={note[op._id] || ''}
            onChange={e => setNote({ ...note, [op._id]: e.target.value })}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex gap-2">
            <button onClick={() => updateStatus(op._id, 'approved')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
              <CheckCircle size={15} /> {t('approve')}
            </button>
            <button onClick={() => updateStatus(op._id, 'rejected')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
              <XCircle size={15} /> {t('reject')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Extension Card (summary in its own section) ───────────────────────────────
function ExtensionCard({ op, now, onDecide, t }) {
  const isOverdue = new Date(op.expectedReturn) < now;
  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {op.userId?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{op.userId?.name}</p>
            <p className="text-xs text-slate-400">{op.destination}</p>
          </div>
        </div>
        <button onClick={onDecide}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all">
          <Timer size={13} /> {t('approve')}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className={`rounded-xl px-3 py-2 ${isOverdue ? 'bg-red-50' : 'bg-slate-50'}`}>
          <p className="text-[10px] font-semibold uppercase text-slate-400">{t('outpass_expected_return')}</p>
          <p className={`text-xs font-bold mt-0.5 ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
            {fmt(op.expectedReturn)}
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl px-3 py-2">
          <p className="text-[10px] font-semibold uppercase text-amber-500">{t('outpass_new_return_time')}</p>
          <p className="text-xs font-bold text-amber-700 mt-0.5">{fmt(op.extendedReturn)}</p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2 pl-1">{op.extensionReason}</p>
    </div>
  );
}
