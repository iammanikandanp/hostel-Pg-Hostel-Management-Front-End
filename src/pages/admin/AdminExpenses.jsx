import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, X, Trash2, Download, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Filter } from 'lucide-react';
import hstApi from '../../api/hstAxios';

const CATEGORIES = ['maintenance', 'salary', 'utilities', 'supplies', 'other'];
const CAT_COLORS = {
  maintenance: 'bg-orange-100 text-orange-700',
  salary:      'bg-blue-100 text-blue-700',
  utilities:   'bg-yellow-100 text-yellow-700',
  supplies:    'bg-green-100 text-green-700',
  other:       'bg-slate-100 text-slate-600',
};
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const now = new Date();

function fmt(n) { return `₹${Number(n ?? 0).toLocaleString('en-IN')}`; }

function SummaryCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        {Icon && <Icon size={18} className="text-slate-400" />}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function AddExpenseModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ category: 'maintenance', amount: '', date: now.toISOString().split('T')[0], description: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) => hstApi.post('/expenses', data),
    onSuccess: () => {
      toast.success('Expense logged');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['exp-summary'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed to log expense'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) return toast.error('Fill all required fields');
    mutation.mutate({ ...form, amount: parseFloat(form.amount) });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Log Expense</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize">
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Amount (₹) *</label>
                <input type="number" min="0" step="0.01" value={form.amount} required
                  onChange={e => set('amount', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Date *</label>
                <input type="date" value={form.date} required onChange={e => set('date', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Description *</label>
              <input type="text" value={form.description} required placeholder="e.g. AC servicing Room 201"
                onChange={e => set('description', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OverdueTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['overdue-residents'],
    queryFn: () => hstApi.get('/expenses/report/overdue').then(r => r.data),
  });

  if (isLoading) return <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>;
  const overdue = data?.overdue ?? [];

  return (
    <div className="space-y-3">
      {overdue.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <AlertTriangle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No overdue balances</p>
        </div>
      ) : (
        overdue.map((r, i) => (
          <div key={r.resident?._id ?? i} className="bg-white rounded-2xl border border-red-100 p-4 flex items-start justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{r.resident?.name ?? '—'}</p>
              <p className="text-xs text-slate-400 mt-0.5">{r.resident?.phone} · {r.bills.length} bill{r.bills.length > 1 ? 's' : ''} unpaid</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {r.bills.map(b => (
                  <span key={b.id} className="text-[10px] font-medium bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                    {MONTHS_SHORT[b.month - 1]} {b.year} · {fmt(b.remaining)}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-lg font-bold text-red-600 flex-shrink-0">{fmt(r.totalDue)}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default function AdminExpenses() {
  const [showAdd, setShowAdd] = useState(false);
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState('expenses'); // expenses | summary | overdue
  const qc = useQueryClient();

  const { data: expData, isLoading } = useQuery({
    queryKey: ['expenses', filterMonth, filterYear],
    queryFn: () => hstApi.get(`/expenses?month=${filterMonth}&year=${filterYear}&limit=100`).then(r => r.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['exp-summary', filterMonth, filterYear],
    queryFn: () => hstApi.get(`/expenses/summary/${filterYear}/${filterMonth}`).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => hstApi.delete(`/expenses/${id}`),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['exp-summary'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const downloadCSV = async (type) => {
    try {
      const url = type === 'expenses'
        ? `/expenses/report/csv?month=${filterMonth}&year=${filterYear}`
        : `/expenses/report/bills-csv?month=${filterMonth}&year=${filterYear}`;
      const res = await hstApi.get(url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${type}-${filterYear}-${String(filterMonth).padStart(2,'0')}.csv`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch { toast.error('Download failed'); }
  };

  const expenses = expData?.expenses ?? [];
  const summary  = summaryData;
  const years    = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expenses & Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track hostel expenses and view financial reports</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus size={16} /> Log Expense
        </button>
      </div>

      {/* Month/Year filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={15} className="text-slate-400" />
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => downloadCSV('expenses')}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <Download size={13} /> Expenses CSV
          </button>
          <button onClick={() => downloadCSV('bills')}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <Download size={13} /> Bills CSV
          </button>
        </div>
      </div>

      {/* Summary cards — always visible */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total Billed"    value={fmt(summary.revenue.totalBilled)}    icon={TrendingUp}   color="border-indigo-100" />
          <SummaryCard label="Collected"       value={fmt(summary.revenue.totalReceived)}  icon={DollarSign}   color="border-emerald-100" sub={`${summary.revenue.unpaidCount} unpaid`} />
          <SummaryCard label="Total Expenses"  value={fmt(summary.expenses.total)}         icon={TrendingDown} color="border-red-100" sub={`${summary.expenses.count} entries`} />
          <SummaryCard label="Net Profit"      value={fmt(summary.netProfit)}              icon={DollarSign}   color={`border-${summary.netProfit >= 0 ? 'emerald' : 'red'}-100`} sub={summary.netProfit >= 0 ? 'Surplus' : 'Deficit'} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[['expenses','Expenses'], ['summary','Revenue Breakdown'], ['overdue','Overdue']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Expenses tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : expenses.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <DollarSign size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No expenses logged for this period</p>
              <p className="text-sm mt-1">Click "Log Expense" to add one.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400">{expenses.length} entries · Total: <span className="font-semibold text-slate-700">{fmt(expData?.totalAmount)}</span></p>
              {expenses.map(e => (
                <div key={e._id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3 shadow-sm">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 mt-0.5 ${CAT_COLORS[e.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {e.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{e.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · Added by {e.addedBy?.name ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-base font-bold text-slate-800">{fmt(e.amount)}</p>
                    <button onClick={() => { if (window.confirm('Delete this expense?')) deleteMutation.mutate(e._id); }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Revenue breakdown tab */}
      {activeTab === 'summary' && summary && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Revenue — {MONTHS_FULL[filterMonth - 1]} {filterYear}</h3>
            <div className="space-y-3">
              {[
                ['Total Billed',         fmt(summary.revenue.totalBilled),     'text-slate-800'],
                ['Fully Collected',      fmt(summary.revenue.totalCollected),  'text-emerald-700'],
                ['Partial Payments',     fmt(summary.revenue.partialPaid),     'text-amber-700'],
                ['Total Received',       fmt(summary.revenue.totalReceived),   'text-indigo-700 font-bold'],
                ['Outstanding Balance',  fmt(summary.revenue.totalOutstanding),'text-red-600'],
              ].map(([label, value, cls]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className={`text-sm ${cls}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {Object.keys(summary.expenses.byCategory).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Expenses by Category</h3>
              <div className="space-y-2">
                {Object.entries(summary.expenses.byCategory).map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${CAT_COLORS[cat] ?? 'bg-slate-100 text-slate-600'}`}>{cat}</span>
                    <span className="text-sm font-semibold text-slate-700">{fmt(amt)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-sm font-bold text-slate-700">Total Expenses</span>
                  <span className="text-sm font-bold text-red-600">{fmt(summary.expenses.total)}</span>
                </div>
              </div>
            </div>
          )}

          <div className={`rounded-2xl border p-5 ${summary.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">Net Profit / Loss</p>
              <p className={`text-xl font-bold ${summary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {summary.netProfit >= 0 ? '+' : ''}{fmt(summary.netProfit)}
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-1">Revenue received minus total expenses</p>
          </div>
        </div>
      )}

      {/* Overdue tab */}
      {activeTab === 'overdue' && <OverdueTab />}

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
