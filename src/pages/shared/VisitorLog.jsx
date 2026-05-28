import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, Plus, X, LogOut as ExitIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';

const ID_TYPES = ['Aadhar', 'PAN', 'Driving Licence', 'Passport', 'Voter ID', 'Other'];

function LogVisitorModal({ onClose, onLogged }) {
  const [form, setForm] = useState({
    residentId: '', visitorName: '', visitorPhone: '',
    idProofType: 'Aadhar', idProofNumber: '', purpose: '',
  });
  const [saving, setSaving] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');
  const [residents, setResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState(null);

  const searchResidents = async (q) => {
    if (q.length < 2) { setResidents([]); return; }
    try {
      const { data } = await hstApi.get('/residents');
      const filtered = (data.residents ?? []).filter(r =>
        r.isActive && (
          r.name.toLowerCase().includes(q.toLowerCase()) ||
          (r.roomId?.roomNumber ?? '').toLowerCase().includes(q.toLowerCase())
        )
      );
      setResidents(filtered.slice(0, 6));
    } catch { setResidents([]); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.residentId) { toast.error('Select a resident'); return; }
    setSaving(true);
    try {
      await hstApi.post('/visitors', form);
      toast.success('Visitor logged. Resident notified via WhatsApp.');
      onLogged(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log visitor');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800">Log New Visitor</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Resident search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resident <span className="text-red-400">*</span></label>
              {selectedResident ? (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-indigo-800">{selectedResident.name}</p>
                    <p className="text-xs text-indigo-500">Room {selectedResident.roomId?.roomNumber ?? '—'}</p>
                  </div>
                  <button type="button" onClick={() => { setSelectedResident(null); setForm(f => ({ ...f, residentId: '' })); }}
                    className="text-indigo-400 hover:text-indigo-600"><X size={14} /></button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" placeholder="Search by name or room..." value={residentSearch}
                    onChange={e => { setResidentSearch(e.target.value); searchResidents(e.target.value); }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  {residents.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {residents.map(r => (
                        <button key={r._id} type="button"
                          onClick={() => { setSelectedResident(r); setForm(f => ({ ...f, residentId: r._id })); setResidents([]); setResidentSearch(''); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm transition-colors">
                          <span className="font-medium text-slate-800">{r.name}</span>
                          <span className="text-slate-400 ml-2 text-xs">Room {r.roomId?.roomNumber ?? '—'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {[
              { label: 'Visitor Name', key: 'visitorName', type: 'text', placeholder: 'Full name', required: true },
              { label: 'Visitor Phone', key: 'visitorPhone', type: 'tel', placeholder: '10-digit number', required: true },
              { label: 'ID Proof Number', key: 'idProofNumber', type: 'text', placeholder: 'e.g. 1234 5678 9012', required: false },
              { label: 'Purpose of Visit', key: 'purpose', type: 'text', placeholder: 'e.g. Family visit', required: false },
            ].map(({ label, key, type, placeholder, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-400"> *</span>}</label>
                <input type={type} required={required} placeholder={placeholder} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID Proof Type</label>
              <select value={form.idProofType} onChange={e => setForm(f => ({ ...f, idProofType: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition">
              {saving ? 'Logging…' : 'Log Visitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VisitorLog() {
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', page, statusFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 30 });
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter)   params.append('date', dateFilter);
      const { data } = await hstApi.get(`/visitors?${params}`);
      return data;
    },
    keepPreviousData: true,
  });

  const markExit = useMutation({
    mutationFn: (id) => hstApi.patch(`/visitors/${id}/exit`),
    onSuccess: () => { toast.success('Visitor exit logged'); qc.invalidateQueries(['visitors']); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={22} className="text-indigo-600" /> Visitor Log
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Track all visitors entering and exiting the hostel.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
          <Plus size={16} /> Log Visitor
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">All Status</option>
          <option value="inside">Currently Inside</option>
          <option value="exited">Exited</option>
        </select>
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        {(statusFilter || dateFilter) && (
          <button onClick={() => { setStatusFilter(''); setDateFilter(''); setPage(1); }}
            className="text-sm text-red-500 hover:text-red-700 px-3 py-2 rounded-xl hover:bg-red-50 transition">Clear</button>
        )}
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Visitor', 'Phone', 'ID Proof', 'Purpose', 'Resident', 'Entry', 'Exit', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.visitors?.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400">No visitor records found.</td></tr>
                  )}
                  {data?.visitors?.map(v => (
                    <tr key={v._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{v.visitorName}</td>
                      <td className="px-4 py-3 text-slate-500">{v.visitorPhone}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{v.idProofType}{v.idProofNumber ? ` · ${v.idProofNumber}` : ''}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate">{v.purpose || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-800 font-medium">{v.residentId?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400">Room {v.residentRoom ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(v.entryTime)}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(v.exitTime)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${v.status === 'inside' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {v.status === 'inside' ? 'Inside' : 'Exited'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {v.status === 'inside' && (
                          <button onClick={() => markExit.mutate(v._id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium hover:bg-red-50 px-2 py-1 rounded-lg transition">
                            <ExitIcon size={12} /> Exit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {data?.visitors?.length === 0 && (
                <p className="text-center py-12 text-slate-400">No visitor records found.</p>
              )}
              {data?.visitors?.map(v => (
                <div key={v._id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{v.visitorName}</p>
                      <p className="text-xs text-slate-400">{v.visitorPhone} · {v.idProofType}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${v.status === 'inside' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {v.status === 'inside' ? 'Inside' : 'Exited'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">Visiting: <span className="font-medium">{v.residentId?.name}</span> · Room {v.residentRoom ?? '—'}</p>
                  <p className="text-xs text-slate-400">Entry: {fmt(v.entryTime)}{v.exitTime ? ` · Exit: ${fmt(v.exitTime)}` : ''}</p>
                  {v.status === 'inside' && (
                    <button onClick={() => markExit.mutate(v._id)}
                      className="flex items-center gap-1 text-xs text-red-500 font-medium mt-1">
                      <ExitIcon size={12} /> Mark Exit
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {data?.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Page {data.page} of {data.pages} · {data.total} total</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"><ChevronLeft size={16} /></button>
                <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && <LogVisitorModal onClose={() => setShowModal(false)} onLogged={() => qc.invalidateQueries(['visitors'])} />}
    </div>
  );
}
