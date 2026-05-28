import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';

const ACTION_COLORS = {
  create:      'bg-emerald-100 text-emerald-700',
  update:      'bg-blue-100 text-blue-700',
  delete:      'bg-red-100 text-red-700',
  approve:     'bg-green-100 text-green-700',
  reject:      'bg-orange-100 text-orange-700',
  login:       'bg-indigo-100 text-indigo-700',
  logout:      'bg-slate-100 text-slate-600',
  generate:    'bg-violet-100 text-violet-700',
  mark_paid:   'bg-teal-100 text-teal-700',
  moveout:     'bg-amber-100 text-amber-700',
  reallocate:  'bg-cyan-100 text-cyan-700',
};

const MODULES = ['', 'Auth', 'Resident', 'Room', 'Bill', 'Food', 'Laundry', 'OutPass', 'LateArrive', 'Complaint', 'Settings'];
const ACTIONS = ['', 'create', 'update', 'delete', 'approve', 'reject', 'login', 'logout', 'generate', 'mark_paid', 'moveout', 'reallocate'];

export default function AdminAuditLog() {
  const [page, setPage]           = useState(1);
  const [module, setModule]       = useState('');
  const [action, setAction]       = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', page, module, action, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 30 });
      if (module)    params.append('module', module);
      if (action)    params.append('action', action);
      if (startDate) params.append('startDate', startDate);
      if (endDate)   params.append('endDate', endDate);
      const { data } = await hstApi.get(`/audit?${params}`);
      return data;
    },
    keepPreviousData: true,
  });

  const handleFilter = () => setPage(1);

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck size={22} className="text-indigo-600" /> Audit Log
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Read-only record of every critical system action.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <select value={module} onChange={e => { setModule(e.target.value); handleFilter(); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          {MODULES.map(m => <option key={m} value={m}>{m || 'All Modules'}</option>)}
        </select>
        <select value={action} onChange={e => { setAction(e.target.value); handleFilter(); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          {ACTIONS.map(a => <option key={a} value={a}>{a || 'All Actions'}</option>)}
        </select>
        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); handleFilter(); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); handleFilter(); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        {(module || action || startDate || endDate) && (
          <button onClick={() => { setModule(''); setAction(''); setStartDate(''); setEndDate(''); setPage(1); }}
            className="text-sm text-red-500 hover:text-red-700 px-3 py-2 rounded-xl hover:bg-red-50 transition">
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Time</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">User</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Module</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Action</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Target</th>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.logs?.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">No audit logs found.</td></tr>
                  )}
                  {data?.logs?.map(log => (
                    <tr key={log._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{log.performedByName}</p>
                        <p className="text-xs text-slate-400 capitalize">{log.role}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-lg">{log.module}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{log.targetLabel ?? log.targetId ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{log.ipAddress ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {data?.logs?.length === 0 && (
                <p className="text-center py-12 text-slate-400">No audit logs found.</p>
              )}
              {data?.logs?.map(log => (
                <div key={log._id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{log.performedByName} <span className="text-slate-400 font-normal text-xs">({log.role})</span></p>
                  <p className="text-xs text-slate-500">{log.module} — {log.targetLabel ?? log.targetId ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {data?.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {data.page} of {data.pages} · {data.total} total entries
              </p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  <ChevronLeft size={16} />
                </button>
                <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
