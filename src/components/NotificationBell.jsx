import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import hstAxios from '../api/hstAxios';

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const TYPE_COLOR = {
  bill_generated:   'bg-blue-100 text-blue-700',
  outpass_approved: 'bg-green-100 text-green-700',
  outpass_rejected: 'bg-red-100 text-red-700',
  extension_approved: 'bg-green-100 text-green-700',
  extension_rejected: 'bg-red-100 text-red-700',
  complaint_updated: 'bg-yellow-100 text-yellow-700',
  notice_posted:    'bg-indigo-100 text-indigo-700',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => hstAxios.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: listData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => hstAxios.get('/notifications?limit=20').then(r => r.data),
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const markOne = useMutation({
    mutationFn: (id) => hstAxios.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => hstAxios.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = data?.count ?? 0;
  const notifications = listData?.notifications ?? [];

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-h-[420px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span>All read</span>
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={14} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm gap-2">
                <Bell size={28} className="opacity-30" />
                <span>No notifications</span>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  className={`flex gap-3 px-4 py-3 border-b border-slate-50 transition-colors ${n.isRead ? '' : 'bg-indigo-50/60'}`}
                >
                  <span className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${n.isRead ? 'bg-slate-200' : 'bg-indigo-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLOR[n.type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {n.type?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => markOne.mutate(n._id)}
                      className="mt-0.5 flex-shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Mark as read"
                    >
                      <Check size={13} className="text-indigo-500" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
              Showing latest 20 · Auto-expires after 30 days
            </div>
          )}
        </div>
      )}
    </div>
  );
}
