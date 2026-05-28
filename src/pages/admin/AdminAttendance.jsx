import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Plane, Moon, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import hstApi from '../../api/hstAxios';

const STATUS_META = {
  present:    { label: 'Present',    icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  absent:     { label: 'Absent',     icon: XCircle,     color: 'text-red-500 bg-red-50 border-red-200' },
  on_outpass: { label: 'Out-Pass',   icon: Plane,       color: 'text-amber-600 bg-amber-50 border-amber-200' },
  on_leave:   { label: 'On Leave',   icon: Moon,        color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
};

function dateStr(d) { return d.toISOString().split('T')[0]; }

function MonthlyReport() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year,  setYear]  = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-report', month, year],
    queryFn: () => hstApi.get(`/attendance/report?month=${month}&year=${year}`).then(r => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={month} onChange={e => setMonth(+e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          {Array.from({length:12},(_,i)=>i+1).map(m=>(
            <option key={m} value={m}>{new Date(2000,m-1).toLocaleString('en-IN',{month:'long'})}</option>
          ))}
        </select>
        <input type="number" value={year} onChange={e => setYear(+e.target.value)}
          min={2020} max={2030}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      {isLoading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Resident</th>
                <th className="px-4 py-3 text-center">Room</th>
                <th className="px-4 py-3 text-center text-emerald-600">Present</th>
                <th className="px-4 py-3 text-center text-red-500">Absent</th>
                <th className="px-4 py-3 text-center text-amber-600">Out-Pass</th>
                <th className="px-4 py-3 text-center text-indigo-600">Leave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.report ?? []).map(row => (
                <tr key={row.resident._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.resident.name}</td>
                  <td className="px-4 py-3 text-center text-slate-500">{row.resident.room}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-600">{row.present}</td>
                  <td className="px-4 py-3 text-center font-semibold text-red-500">{row.absent}</td>
                  <td className="px-4 py-3 text-center font-semibold text-amber-600">{row.on_outpass}</td>
                  <td className="px-4 py-3 text-center font-semibold text-indigo-600">{row.on_leave}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.report?.length && (
            <div className="py-10 text-center text-slate-400 text-sm">No attendance data for this period.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAttendance() {
  const qc = useQueryClient();
  const [date, setDate] = useState(dateStr(new Date()));
  const [tab,  setTab]  = useState('daily');
  const [pendingChanges, setPendingChanges] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', date],
    queryFn: () => hstApi.get(`/attendance?date=${date}`).then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (records) => hstApi.post('/attendance/mark', { date, records }),
    onSuccess: () => {
      toast.success('Attendance saved');
      setPendingChanges({});
      qc.invalidateQueries({ queryKey: ['attendance', date] });
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  const changeDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(dateStr(d));
    setPendingChanges({});
  };

  const setStatus = (residentId, status) => {
    setPendingChanges(p => ({ ...p, [residentId]: { ...(p[residentId] || {}), status } }));
  };

  const saveAll = () => {
    const records = Object.entries(pendingChanges).map(([residentId, v]) => ({ residentId, ...v }));
    if (!records.length) { toast('No changes to save'); return; }
    saveMutation.mutate(records);
  };

  const attendance = data?.attendance ?? [];
  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
          <p className="text-slate-500 text-sm mt-0.5">Mark daily attendance for all residents</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('daily')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'daily' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            Daily
          </button>
          <button onClick={() => setTab('report')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'report' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <BarChart2 size={14} /> Monthly Report
          </button>
        </div>
      </div>

      {tab === 'report' ? <MonthlyReport /> : (
        <>
          {/* Date navigation */}
          <div className="flex items-center gap-4">
            <button onClick={() => changeDate(-1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setPendingChanges({}); }}
              className="flex-1 text-center border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button onClick={() => changeDate(1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50">
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>

          {/* Summary chips */}
          {!isLoading && (
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_META).map(([key, meta]) => {
                const count = attendance.filter(a => (pendingChanges[a.resident._id]?.status ?? a.status) === key).length;
                return (
                  <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${meta.color}`}>
                    <meta.icon size={12} />
                    {meta.label}: {count}
                  </div>
                );
              })}
            </div>
          )}

          {/* Attendance list */}
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
              No active residents found.
            </div>
          ) : (
            <div className="space-y-2">
              {attendance.map(a => {
                const currentStatus = pendingChanges[a.resident._id]?.status ?? a.status;
                const changed = !!pendingChanges[a.resident._id];
                return (
                  <div key={a.resident._id} className={`bg-white rounded-xl border shadow-sm px-4 py-3 flex items-center gap-3 ${changed ? 'border-indigo-200' : 'border-slate-100'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{a.resident.name}</p>
                      <p className="text-xs text-slate-400">
                        {a.resident.room ? `Room ${a.resident.room.roomNumber}` : 'No room'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {Object.entries(STATUS_META).map(([key, meta]) => {
                        const Icon = meta.icon;
                        const active = currentStatus === key;
                        return (
                          <button key={key} onClick={() => setStatus(a.resident._id, key)}
                            title={meta.label}
                            className={`p-1.5 rounded-lg border text-xs font-medium transition-all ${active ? meta.color + ' border-current' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                            <Icon size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasChanges && (
            <div className="sticky bottom-4">
              <button onClick={saveAll} disabled={saveMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200 transition-all">
                {saveMutation.isPending ? 'Saving…' : `Save Attendance (${Object.keys(pendingChanges).length} changes)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
