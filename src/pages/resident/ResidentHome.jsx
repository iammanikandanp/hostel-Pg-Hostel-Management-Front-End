import { useNavigate } from 'react-router-dom';
import { FileText, UtensilsCrossed, WashingMachine, KeySquare, ChevronRight, Megaphone, AlertCircle, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import hstApi from '../../api/hstAxios';
import { useHstAuthStore } from '../../store/hstAuthStore';

const QUICK_LINKS = [
  { to: '/resident/bills',   label: 'My Bills',     sub: 'View and pay your bills',    icon: FileText,       color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  { to: '/resident/food',    label: 'Food Booking', sub: 'Book tomorrow\'s meals',      icon: UtensilsCrossed, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { to: '/resident/laundry', label: 'Laundry',      sub: 'Reserve a washing machine',  icon: WashingMachine, color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  { to: '/resident/outpass', label: 'Out-Pass',     sub: 'Request permission to leave', icon: KeySquare,      color: 'bg-violet-50 text-violet-600 border-violet-100' },
];

const NOTICE_STYLES = {
  urgent: { wrap: 'bg-red-50 border-red-200',    icon: AlertCircle, iconColor: 'text-red-500',   text: 'text-red-800',  sub: 'text-red-600' },
  normal: { wrap: 'bg-blue-50 border-blue-200',  icon: Megaphone,   iconColor: 'text-blue-500',  text: 'text-blue-800', sub: 'text-blue-600' },
  info:   { wrap: 'bg-slate-50 border-slate-200', icon: Info,       iconColor: 'text-slate-400', text: 'text-slate-700', sub: 'text-slate-500' },
};

export default function ResidentHome() {
  const { user } = useHstAuthStore();
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: noticesData } = useQuery({
    queryKey: ['active-notices'],
    queryFn: async () => { const { data } = await hstApi.get('/notices'); return data; },
    staleTime: 5 * 60 * 1000,
  });

  const notices = (noticesData?.notices ?? []).sort((a, b) => {
    const order = { urgent: 0, normal: 1, info: 2 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="p-5 md:p-8 space-y-8 animate-fade-up">
      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium">{greeting} 👋</p>
          <h1 className="text-2xl font-bold mt-1 mb-2">{user?.name}</h1>
          <p className="text-indigo-200 text-sm">
            Welcome to HostelMS. Use the menu to manage your hostel services.
          </p>
        </div>
      </div>

      {/* Active notices */}
      {notices.length > 0 && (
        <div className="space-y-2">
          {notices.map(n => {
            const s = NOTICE_STYLES[n.priority];
            const Icon = s.icon;
            return (
              <div key={n._id} className={`rounded-2xl border p-4 flex gap-3 ${s.wrap}`}>
                <Icon size={18} className={`flex-shrink-0 mt-0.5 ${s.iconColor}`} />
                <div className="min-w-0">
                  <p className={`font-semibold text-sm ${s.text}`}>{n.title}</p>
                  <p className={`text-xs mt-0.5 whitespace-pre-wrap ${s.sub}`}>{n.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick access */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map(({ to, label, sub, icon: Icon, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`flex flex-col items-start gap-3 p-4 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all active:scale-[0.97] text-left ${color}`}
            >
              <div className={`p-2 rounded-xl border ${color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-tight">{sub}</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 self-end" />
            </button>
          ))}
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700">
        <p className="font-semibold mb-1">Reminders</p>
        <ul className="space-y-1 text-amber-600 text-xs list-disc list-inside">
          <li>Book meals by 9 PM the previous day.</li>
          <li>Laundry slots are limited — book early.</li>
          <li>Out-pass requests must be approved by admin before you leave.</li>
        </ul>
      </div>
    </div>
  );
}
