import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Monitor, Smartphone, LogOut, Shield, Search } from 'lucide-react';
import hstApi from '../../api/hstAxios';

function ago(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function isMobile(ua = '') {
  return /mobile|android|iphone|ipad/i.test(ua);
}

function MySessionsPanel() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => hstApi.get('/auth/sessions').then(r => r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (sid) => hstApi.delete(`/auth/sessions/${sid}`),
    onSuccess: () => { toast.success('Session revoked'); qc.invalidateQueries({ queryKey: ['my-sessions'] }); },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => hstApi.delete('/auth/sessions/all'),
    onSuccess: () => { toast.success('All sessions revoked — you will be logged out'); setTimeout(() => window.location.href = '/login', 1500); },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const sessions = data?.sessions ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
        {sessions.length > 1 && (
          <button onClick={() => revokeAllMutation.mutate()}
            className="text-xs text-red-500 hover:underline font-medium">
            Revoke All
          </button>
        )}
      </div>
      {sessions.map(s => {
        const mobile = isMobile(s.userAgent);
        const Icon = mobile ? Smartphone : Monitor;
        return (
          <div key={s.sessionId} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{s.userAgent || 'Unknown device'}</p>
              <p className="text-xs text-slate-400">IP: {s.ip} · Last seen: {ago(s.lastSeen)}</p>
            </div>
            <button onClick={() => revokeMutation.mutate(s.sessionId)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ForceLogoutPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: ['all-residents-sessions'],
    queryFn: () => hstApi.get('/residents').then(r => r.data),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (userId) => hstApi.delete(`/auth/sessions/user/${userId}`),
    onSuccess: (_, userId) => {
      toast.success('User force-logged out');
      qc.invalidateQueries({ queryKey: ['all-residents-sessions'] });
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const residents = (data?.residents ?? []).filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search residents…"
          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div className="space-y-2">
        {residents.slice(0, 20).map(r => (
          <div key={r._id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {r.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
              <p className="text-xs text-slate-400">{r.email}</p>
            </div>
            <button onClick={() => {
              if (window.confirm(`Force logout ${r.name}? Their session will be invalidated.`)) {
                forceLogoutMutation.mutate(r._id);
              }
            }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors">
              <LogOut size={12} /> Force Logout
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminSessions() {
  const [tab, setTab] = useState('my');

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Session Management</h1>
        <p className="text-slate-500 text-sm mt-0.5">View and revoke active login sessions</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('my')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'my' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <Monitor size={14} /> My Sessions
        </button>
        <button onClick={() => setTab('force')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'force' ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <Shield size={14} /> Force Logout Users
        </button>
      </div>

      {tab === 'my' ? <MySessionsPanel /> : <ForceLogoutPanel />}
    </div>
  );
}
