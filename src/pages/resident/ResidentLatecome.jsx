import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, X, MessageSquare, Clock, CheckCircle, XCircle, Home, AlertTriangle } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import Spinner from '../../components/Spinner';
import { useHstLangStore } from '../../store/hstLangStore';

const STATUS_CLS = {
  pending:  { cls: 'bg-amber-100 text-amber-700',    icon: Clock },
  approved: { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { cls: 'bg-red-100 text-red-600',         icon: XCircle },
  arrived:  { cls: 'bg-blue-100 text-blue-700',        icon: Home },
};

const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function ResidentLatecome() {
  const { t } = useHstLangStore();
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]             = useState({ reason: '', expectedArrival: '' });

  const fetchRequests = () =>
    hstApi.get('/latecome')
      .then(r => setRequests(r.data.requests))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { fetchRequests(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await hstApi.post('/latecome', form);
      toast.success('Late come request submitted');
      setShowForm(false);
      setForm({ reason: '', expectedArrival: '' });
      fetchRequests();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const markArrived = async (id) => {
    try {
      await hstApi.patch(`/latecome/${id}/arrived`);
      toast.success('Marked as arrived');
      fetchRequests();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <PageLoader />;

  const now     = new Date();
  const pending = requests.filter(r => r.status === 'pending');
  const active  = requests.filter(r => r.status === 'approved');

  // min datetime = now rounded up to next minute
  const minDt = new Date(now.getTime() + 60000).toISOString().slice(0, 16);

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('latecome_title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('latecome_subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 active:scale-[0.97]">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? t('cancel') : t('latecome_new')}
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-indigo-700 leading-relaxed">{t('latecome_info')}</p>
      </div>

      {/* ── Request Form ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 animate-fade-up">
          <h2 className="font-semibold text-slate-700 mb-5">{t('latecome_new')}</h2>
          <form onSubmit={submit} className="space-y-4">

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {t('latecome_expected_arrival')}
              </label>
              <div className="relative">
                <Clock size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="datetime-local"
                  value={form.expectedArrival}
                  onChange={e => setForm({ ...form, expectedArrival: e.target.value })}
                  min={minDt}
                  required
                  className="w-full pl-10 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{t('latecome_when_arrive')}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('reason')}</label>
              <div className="relative">
                <MessageSquare size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <textarea
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  required rows={3}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]">
              {submitting
                ? <><Spinner size="sm" className="border-indigo-200 border-t-white" /> {t('submitting')}</>
                : t('submit')}
            </button>
          </form>
        </div>
      )}

      {/* ── Active approved ── */}
      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">{t('latecome_active')}</h2>
          <div className="space-y-3">
            {active.map(r => <LatecomeCard key={r._id} r={r} now={now} onArrived={markArrived} t={t} />)}
          </div>
        </section>
      )}

      {/* ── All requests ── */}
      {requests.length > 0 ? (
        <section>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('latecome_all_requests')}</h2>
          <div className="space-y-3">
            {requests.map(r => <LatecomeCard key={r._id} r={r} now={now} onArrived={markArrived} t={t} />)}
          </div>
        </section>
      ) : (
        !showForm && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
            <Home size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t('latecome_no_requests')}</p>
          </div>
        )
      )}
    </div>
  );
}

function LatecomeCard({ r, now, onArrived, t }) {
  const s       = STATUS_CLS[r.status] ?? STATUS_CLS.pending;
  const Icon    = s.icon;
  const isLate  = r.status === 'approved' && new Date(r.expectedArrival) < now;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${isLate ? 'border-red-200' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-slate-400">{t('latecome_submitted')} {fmt(r.createdAt)}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${s.cls}`}>
          <Icon size={11} /> {t(r.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className={`rounded-xl px-3 py-2.5 ${isLate ? 'bg-red-50' : 'bg-slate-50'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('latecome_expected_arrival')}</p>
          <p className={`text-sm font-bold mt-0.5 ${isLate ? 'text-red-600' : 'text-slate-700'}`}>
            {fmt(r.expectedArrival)}
            {isLate && <span className="ml-1.5 text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{t('outpass_overdue')}</span>}
          </p>
        </div>
        {r.actualArrival && (
          <div className="bg-blue-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400">{t('latecome_arrived_at')}</p>
            <p className="text-sm font-bold text-blue-700 mt-0.5">{fmt(r.actualArrival)}</p>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-500 mb-3">{r.reason}</p>

      {r.adminNote && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3 text-xs text-slate-600">
          <span className="font-semibold">{t('latecome_admin_note')}:</span> {r.adminNote}
        </div>
      )}

      {r.status === 'approved' && (
        <button onClick={() => onArrived(r._id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isLate ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}>
          <Home size={15} />
          {isLate ? t('latecome_im_back_overdue') : t('latecome_im_back')}
        </button>
      )}
    </div>
  );
}
