import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Home, AlertTriangle } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import { useHstLangStore } from '../../store/hstLangStore';

const STATUS_CLS = {
  pending:  { cls: 'bg-amber-100 text-amber-700',    icon: Clock },
  approved: { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { cls: 'bg-red-100 text-red-600',         icon: XCircle },
  arrived:  { cls: 'bg-blue-100 text-blue-700',        icon: Home },
};

const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminLatecome() {
  const { t } = useHstLangStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [notes, setNotes]       = useState({});
  const [acting, setActing]     = useState({});

  const fetchRequests = () =>
    hstApi.get('/latecome')
      .then(r => setRequests(r.data.requests))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { fetchRequests(); }, []);

  const updateStatus = async (id, status) => {
    setActing(a => ({ ...a, [id]: true }));
    try {
      await hstApi.patch(`/latecome/${id}/status`, { status, adminNote: notes[id] || '' });
      toast.success(`Request ${status}`);
      fetchRequests();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setActing(a => ({ ...a, [id]: false })); }
  };

  if (loading) return <PageLoader />;

  const now     = new Date();
  const pending = requests.filter(r => r.status === 'pending');
  const active  = requests.filter(r => r.status === 'approved');
  const others  = requests.filter(r => !['pending', 'approved'].includes(r.status));

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('latecome_title')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          <span className="text-amber-600 font-semibold">{pending.length} {t('latecome_pending_count')}</span>
          {active.length > 0 && (
            <span className="text-emerald-600 font-semibold"> · {active.length} {t('latecome_out_late')}</span>
          )}
          {' '}&bull; {others.length} {t('latecome_resolved_count')}
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('latecome_awaiting')}</h2>
          <div className="space-y-4">
            {pending.map(r => (
              <RequestCard key={r._id} r={r} now={now} t={t}
                note={notes[r._id] || ''} onNote={v => setNotes(n => ({ ...n, [r._id]: v }))}
                onApprove={() => updateStatus(r._id, 'approved')}
                onReject={() => updateStatus(r._id, 'rejected')}
                acting={!!acting[r._id]} />
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">{t('latecome_currently_out')}</h2>
          <div className="space-y-3">
            {active.map(r => (
              <RequestCard key={r._id} r={r} now={now} t={t}
                note={notes[r._id] || ''} onNote={v => setNotes(n => ({ ...n, [r._id]: v }))}
                onApprove={() => {}} onReject={() => {}} acting={false} readOnly />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('latecome_resolved')}</h2>
          <div className="space-y-3">
            {others.map(r => (
              <RequestCard key={r._id} r={r} now={now} t={t}
                note={notes[r._id] || ''} onNote={v => setNotes(n => ({ ...n, [r._id]: v }))}
                onApprove={() => {}} onReject={() => {}} acting={false} readOnly />
            ))}
          </div>
        </section>
      )}

      {requests.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Home size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('latecome_no_requests')}</p>
        </div>
      )}
    </div>
  );
}

function RequestCard({ r, now, note, onNote, onApprove, onReject, acting, readOnly, t }) {
  const s      = STATUS_CLS[r.status] ?? STATUS_CLS.pending;
  const Icon   = s.icon;
  const isLate = r.status === 'approved' && new Date(r.expectedArrival) < now;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
      isLate ? 'border-red-200' :
      r.status === 'pending' ? 'border-amber-100' : 'border-slate-100'
    } ${readOnly && r.status !== 'approved' ? 'opacity-75' : ''}`}>

      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {r.userId?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{r.userId?.name}</p>
            <p className="text-xs text-slate-400">{t('latecome_submitted')} {fmt(r.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
            <Icon size={12} /> {t(r.status)}
          </span>
          {isLate && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle size={9} /> {t('latecome_not_arrived')}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={`rounded-xl px-3 py-2.5 ${isLate ? 'bg-red-50' : 'bg-slate-50'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('latecome_expected_arrival')}</p>
          <p className={`text-sm font-bold mt-0.5 ${isLate ? 'text-red-600' : 'text-slate-700'}`}>{fmt(r.expectedArrival)}</p>
        </div>
        {r.actualArrival ? (
          <div className="bg-blue-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400">{t('latecome_arrived_at')}</p>
            <p className="text-sm font-bold text-blue-700 mt-0.5">{fmt(r.actualArrival)}</p>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('latecome_arrived_at')}</p>
            <p className="text-sm text-slate-400 mt-0.5 italic">{t('latecome_not_yet')}</p>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600 mb-3 pl-1">{r.reason}</p>

      {r.adminNote && (
        <p className="text-xs text-slate-500 italic mb-3 pl-1">{t('latecome_admin_note')}: {r.adminNote}</p>
      )}

      {!readOnly && r.status === 'pending' && (
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100">
          <input
            placeholder={t('latecome_note_resident')}
            value={note}
            onChange={e => onNote(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <button onClick={onApprove} disabled={acting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
              <CheckCircle size={15} /> {t('approve')}
            </button>
            <button onClick={onReject} disabled={acting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
              <XCircle size={15} /> {t('reject')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
