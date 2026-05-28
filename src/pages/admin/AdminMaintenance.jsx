import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Wrench, CheckCircle, X, Save, Trash2, AlertCircle } from 'lucide-react';
import hstApi from '../../api/hstAxios';

const FREQ_COLORS = {
  daily:     'bg-red-50 text-red-700 border-red-200',
  weekly:    'bg-amber-50 text-amber-700 border-amber-200',
  monthly:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  quarterly: 'bg-purple-50 text-purple-700 border-purple-200',
  yearly:    'bg-slate-50 text-slate-600 border-slate-200',
};

function AddModal({ onClose }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    taskName: '', description: '', frequency: 'monthly', nextDueDate: today, assignedTo: '',
  });

  const mutation = useMutation({
    mutationFn: () => hstApi.post('/maintenance', form),
    onSuccess: () => { toast.success('Task created'); qc.invalidateQueries({ queryKey: ['maintenance'] }); onClose(); },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">New Maintenance Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Task Name</label>
            <input value={form.taskName} onChange={e => setForm(p => ({...p, taskName: e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Frequency</label>
              <select value={form.frequency} onChange={e => setForm(p => ({...p, frequency: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 capitalize">
                {['daily','weekly','monthly','quarterly','yearly'].map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Next Due Date</label>
              <input type="date" value={form.nextDueDate} onChange={e => setForm(p => ({...p, nextDueDate: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Assigned To (optional)</label>
            <input value={form.assignedTo} onChange={e => setForm(p => ({...p, assignedTo: e.target.value}))}
              placeholder="e.g. Maintenance Staff, Electrician"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMaintenance() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', overdueOnly],
    queryFn: () => hstApi.get(`/maintenance${overdueOnly ? '?overdue=true' : ''}`).then(r => r.data),
  });

  const completeMutation = useMutation({
    mutationFn: (id) => hstApi.post(`/maintenance/${id}/complete`),
    onSuccess: () => { toast.success('Marked complete — next due date updated'); qc.invalidateQueries({ queryKey: ['maintenance'] }); },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => hstApi.delete(`/maintenance/${id}`),
    onSuccess: () => { toast.success('Task deactivated'); qc.invalidateQueries({ queryKey: ['maintenance'] }); },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const tasks = data?.tasks ?? [];
  const today = new Date();

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Maintenance Schedule</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track preventive maintenance tasks and schedules</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOverdueOnly(o => !o)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${overdueOnly ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <AlertCircle size={14} /> Overdue
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200">
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Wrench size={32} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm">{overdueOnly ? 'No overdue tasks.' : 'No maintenance tasks. Create one!'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const dueDate = new Date(task.nextDueDate);
            const isOverdue = dueDate < today;
            const isDueSoon = !isOverdue && (dueDate - today) < 2 * 24 * 60 * 60 * 1000;
            const lastDone = task.completionHistory?.[task.completionHistory.length - 1];
            return (
              <div key={task._id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isOverdue ? 'border-red-200' : isDueSoon ? 'border-amber-200' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{task.taskName}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border capitalize ${FREQ_COLORS[task.frequency]}`}>
                        {task.frequency}
                      </span>
                      {isOverdue && <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Overdue</span>}
                    </div>
                    {task.description && <p className="text-sm text-slate-500 mt-0.5">{task.description}</p>}
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                        Due: {dueDate.toLocaleDateString('en-IN')}
                      </span>
                      {task.assignedTo && <span className="text-xs text-slate-400">Assigned: {task.assignedTo}</span>}
                      {lastDone && <span className="text-xs text-emerald-600">Last done: {new Date(lastDone.completedAt).toLocaleDateString('en-IN')}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => completeMutation.mutate(task._id)} disabled={completeMutation.isPending}
                      title="Mark Complete"
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                      <CheckCircle size={16} />
                    </button>
                    <button onClick={() => deleteMutation.mutate(task._id)}
                      title="Deactivate"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
