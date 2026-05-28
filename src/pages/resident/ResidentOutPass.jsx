import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, X, MapPin, MessageSquare, Clock, CheckCircle, XCircle, RotateCcw, Navigation, Timer, AlertTriangle } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import Spinner from '../../components/Spinner';

const STATUS = {
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700',    icon: Clock },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-600',         icon: XCircle },
  returned: { label: 'Returned', cls: 'bg-blue-100 text-blue-700',        icon: RotateCcw },
};

const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function ResidentOutPass() {
  const [passes, setPasses]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]           = useState({ reason: '', destination: '', plannedOutTime: '', expectedReturn: '' });
  const [showForm, setShowForm]   = useState(false);
  const [extModal, setExtModal]   = useState(null); // outpass being extended
  const [extForm, setExtForm]     = useState({ extendedReturn: '', extensionReason: '' });
  const [extSubmitting, setExtSubmitting] = useState(false);

  const fetchPasses = () =>
    hstApi.get('/outpass')
      .then(r => setPasses(r.data.passes))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { fetchPasses(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await hstApi.post('/outpass', form);
      toast.success('Out-pass request submitted');
      setShowForm(false);
      setForm({ reason: '', destination: '', plannedOutTime: '', expectedReturn: '' });
      fetchPasses();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const markReturn = async (id) => {
    try {
      await hstApi.patch(`/outpass/${id}/return`);
      toast.success('Marked as returned');
      fetchPasses();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openExtModal = (op) => {
    setExtModal(op);
    setExtForm({ extendedReturn: '', extensionReason: '' });
  };

  const submitExtension = async (e) => {
    e.preventDefault();
    setExtSubmitting(true);
    try {
      await hstApi.post(`/outpass/${extModal._id}/extension`, extForm);
      toast.success('Extension request sent to admin');
      setExtModal(null);
      fetchPasses();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setExtSubmitting(false); }
  };

  if (loading) return <PageLoader />;

  const now = new Date();

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Out-Pass</h1>
          <p className="text-slate-500 text-sm mt-0.5">{passes.length} total requests</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 active:scale-[0.97]">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Request Pass'}
        </button>
      </div>

      {/* ── New request form ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 animate-fade-up">
          <h2 className="font-semibold text-slate-700 mb-5">New Out-Pass Request</h2>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Destination</label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input placeholder="e.g. Home, Hospital, Market" value={form.destination}
                  onChange={e => setForm({ ...form, destination: e.target.value })} required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Reason</label>
              <div className="relative">
                <MessageSquare size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <textarea placeholder="Briefly describe why you need to leave…" value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })} required rows={2}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Planned Out Date & Time
                </label>
                <div className="relative">
                  <Clock size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input type="datetime-local" value={form.plannedOutTime}
                    onChange={e => setForm({ ...form, plannedOutTime: e.target.value })} required
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full pl-10 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">When do you plan to leave?</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Expected Return Date & Time
                </label>
                <div className="relative">
                  <RotateCcw size={15} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input type="datetime-local" value={form.expectedReturn}
                    onChange={e => setForm({ ...form, expectedReturn: e.target.value })} required
                    min={form.plannedOutTime || new Date().toISOString().slice(0, 16)}
                    className="w-full pl-10 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">When will you be back?</p>
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]">
              {submitting
                ? <><Spinner size="sm" className="border-indigo-200 border-t-white" /> Submitting…</>
                : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      {/* ── Pass list ── */}
      {passes.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Navigation size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No out-pass requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {passes.map(op => {
            const s       = STATUS[op.status] ?? STATUS.pending;
            const Icon    = s.icon;
            const isOverdue = op.status === 'approved' && new Date(op.expectedReturn) < now;
            const extPending = op.extensionRequested && op.extensionStatus === 'pending';
            const extApproved = op.extensionRequested && op.extensionStatus === 'approved';
            const extRejected = op.extensionRequested && op.extensionStatus === 'rejected';

            return (
              <div key={op._id} className={`bg-white rounded-2xl border shadow-sm p-5 ${isOverdue ? 'border-red-200' : 'border-slate-100'}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{op.destination}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Requested: {fmt(op.createdAt)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${s.cls}`}>
                    <Icon size={11} /> {s.label}
                  </span>
                </div>

                {/* Times */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {op.plannedOutTime && !op.outTime && (
                    <div className="bg-slate-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Planned Out</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{fmt(op.plannedOutTime)}</p>
                    </div>
                  )}
                  {op.outTime && (
                    <div className="bg-indigo-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wide">Actual Out</p>
                      <p className="text-sm font-semibold text-indigo-700 mt-0.5">{fmt(op.outTime)}</p>
                    </div>
                  )}
                  <div className={`rounded-xl px-3 py-2 ${isOverdue ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Return By</p>
                    <p className={`text-sm font-semibold mt-0.5 ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                      {fmt(op.expectedReturn)}
                      {isOverdue && <span className="ml-1 text-[10px] font-bold">OVERDUE</span>}
                    </p>
                  </div>
                  {op.actualReturnTime && (
                    <div className="bg-blue-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">Returned At</p>
                      <p className="text-sm font-semibold text-blue-700 mt-0.5">{fmt(op.actualReturnTime)}</p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-500 mb-3">{op.reason}</p>

                {op.adminNote && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-3 text-xs text-slate-600">
                    <span className="font-semibold">Admin note:</span> {op.adminNote}
                  </div>
                )}

                {/* Extension status banner */}
                {extPending && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3 flex items-center gap-2 text-xs text-amber-700">
                    <Timer size={13} />
                    <span>Extension request pending admin approval — new time: <strong>{fmt(op.extendedReturn)}</strong></span>
                  </div>
                )}
                {extApproved && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-3 flex items-center gap-2 text-xs text-emerald-700">
                    <CheckCircle size={13} />
                    <span>Extension approved! New return time: <strong>{fmt(op.expectedReturn)}</strong></span>
                    {op.extensionAdminNote && <span>· {op.extensionAdminNote}</span>}
                  </div>
                )}
                {extRejected && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3 flex items-center gap-2 text-xs text-red-600">
                    <XCircle size={13} />
                    <span>Extension rejected — return by original time: <strong>{fmt(op.expectedReturn)}</strong></span>
                    {op.extensionAdminNote && <span>· {op.extensionAdminNote}</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {op.status === 'approved' && (
                    <button onClick={() => markReturn(op._id)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                      <RotateCcw size={14} /> Mark as Returned
                    </button>
                  )}
                  {/* Show Request Extension if approved, overdue or within 30 min, and no pending extension */}
                  {op.status === 'approved' && !extPending && (
                    <button onClick={() => openExtModal(op)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                        isOverdue
                          ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                          : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700'
                      }`}>
                      <Timer size={14} />
                      {isOverdue ? 'Request Extension (Overdue)' : 'Request Extension'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Extension Request Modal ── */}
      {extModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setExtModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Timer size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Request Extension</p>
                  <p className="text-xs text-slate-400">{extModal.destination}</p>
                </div>
              </div>
              <button onClick={() => setExtModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submitExtension} className="p-5 space-y-4">
              {/* Current return time */}
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-red-600 font-semibold">Current return time</p>
                  <p className="text-sm font-bold text-red-700">{fmt(extModal.expectedReturn)}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">New Return Date & Time</label>
                <input type="datetime-local" required
                  min={new Date(extModal.expectedReturn).toISOString().slice(0, 16)}
                  value={extForm.extendedReturn}
                  onChange={e => setExtForm(f => ({ ...f, extendedReturn: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Reason for Extension</label>
                <textarea required rows={3}
                  placeholder="Why do you need more time?"
                  value={extForm.extensionReason}
                  onChange={e => setExtForm(f => ({ ...f, extensionReason: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setExtModal(null)}
                  className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={extSubmitting}
                  className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {extSubmitting
                    ? <><Spinner size="sm" className="border-amber-200 border-t-white" /> Sending…</>
                    : <><Timer size={14} /> Send Request</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
