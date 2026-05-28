import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Coffee, Sun, Moon, X, Users, ChevronRight, CalendarDays, BarChart3, ChefHat, UtensilsCrossed, ChevronLeft, Save, Edit3 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';

// ── Shared constants ──────────────────────────────────────────────────────────

const MEALS = ['breakfast', 'lunch', 'dinner'];

const MEAL_META = {
  breakfast: { icon: Coffee, bg: 'bg-amber-50',  border: 'border-amber-100',  text: 'text-amber-700',   bar: 'bg-amber-400',   label: 'Breakfast', editColor: 'bg-amber-50 border-amber-100' },
  lunch:     { icon: Sun,    bg: 'bg-emerald-50', border: 'border-emerald-100',text: 'text-emerald-700', bar: 'bg-emerald-400', label: 'Lunch',     editColor: 'bg-green-50 border-green-100'  },
  dinner:    { icon: Moon,   bg: 'bg-indigo-50',  border: 'border-indigo-100', text: 'text-indigo-700',  bar: 'bg-indigo-400',  label: 'Dinner',    editColor: 'bg-indigo-50 border-indigo-100'},
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function addDaysToStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDateStr(new Date(y, m - 1, d + days));
}

function addDaysToDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d + days);
}

function getWeekStartStr(offset = 0) {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon + offset * 7);
  return localDateStr(mon);
}

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function showTomorrow() { return new Date().getHours() >= 21; }

// ── Set Menu Panel (AdminFoodMenu embedded) ───────────────────────────────────

const DAYS_LIST  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function EditDayModal({ weekStart, dayIndex, dayName, existing, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    breakfast: { items: existing?.breakfast?.items ?? '', note: existing?.breakfast?.note ?? '' },
    lunch:     { items: existing?.lunch?.items     ?? '', note: existing?.lunch?.note     ?? '' },
    dinner:    { items: existing?.dinner?.items    ?? '', note: existing?.dinner?.note    ?? '' },
  });

  const dayDate = addDaysToDate(weekStart, dayIndex);
  const dateStr = localDateStr(dayDate);

  const mutation = useMutation({
    mutationFn: () => hstApi.patch(`/food-menu/day/${dateStr}`, form),
    onSuccess: () => {
      toast.success('Menu saved');
      qc.invalidateQueries({ queryKey: ['food-menu'] });
      qc.invalidateQueries({ queryKey: ['today-menu'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800 capitalize">{dayName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{fmtShort(dateStr)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto max-h-[55vh]">
          {MEALS.map(meal => (
            <div key={meal} className={`rounded-2xl border p-4 space-y-3 ${MEAL_META[meal].editColor}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{MEAL_META[meal].label}</p>
              <input type="text" placeholder="e.g. Idli, Sambar, Chutney"
                value={form[meal].items}
                onChange={e => setForm(f => ({ ...f, [meal]: { ...f[meal], items: e.target.value } }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
              <input type="text" placeholder="Optional note (e.g. vegetarian only)"
                value={form[meal].note}
                onChange={e => setForm(f => ({ ...f, [meal]: { ...f[meal], note: e.target.value } }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Save Day'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SetMenuPage({ onClose }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [editDay, setEditDay] = useState(null);
  const weekStart = getWeekStartStr(weekOffset);
  const weekEnd   = addDaysToDate(weekStart, 6);

  const { data, isLoading } = useQuery({
    queryKey: ['food-menu', weekStart],
    queryFn: () => hstApi.get(`/food-menu/week/${weekStart}`).then(r => r.data),
  });
  const menu = data?.menu;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
            <ChefHat size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Set Weekly Menu</h2>
            <p className="text-xs text-slate-400">Click the pencil on any day to edit its meals</p>
          </div>
        </div>
        <button onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-600 transition-colors">
          <X size={16} />
          Close
        </button>
      </div>

      {/* Week navigation */}
      <div className="sticky top-[69px] z-10 flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
        <button onClick={() => setWeekOffset(o => o - 1)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-slate-800">
            {fmtShort(weekStart)} – {fmtShort(localDateStr(weekEnd))}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekOffset === -1 ? 'Last Week' : `${weekOffset > 0 ? '+' : ''}${weekOffset} weeks`}
          </p>
        </div>
        <button onClick={() => setWeekOffset(o => o + 1)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronRight size={18} className="text-slate-600" />
        </button>
      </div>

      {/* Day cards */}
      <div className="px-6 py-6 pb-16">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {DAYS_LIST.map((dayName, i) => {
              const dayDate  = addDaysToDate(weekStart, i);
              const dayStr   = localDateStr(dayDate);
              const isToday  = dayStr === localDateStr();
              const dayData  = menu?.[dayName];
              const hasMeals = dayData && MEALS.some(m => dayData[m]?.items);

              return (
                <div key={dayName}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden
                    ${isToday ? 'ring-2 ring-indigo-400 ring-offset-2' : 'border-slate-100'}`}>
                  <div className={`px-4 py-3 flex items-center justify-between ${isToday ? 'bg-indigo-600' : 'bg-slate-50'}`}>
                    <div>
                      <p className={`text-sm font-bold ${isToday ? 'text-white' : 'text-slate-800'}`}>{DAY_LABELS[i]}</p>
                      <p className={`text-xs ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>{fmtShort(dayStr)}</p>
                    </div>
                    <button onClick={() => setEditDay({ dayIndex: i, dayName })}
                      className={`p-1.5 rounded-lg transition-colors ${isToday ? 'bg-white/20 hover:bg-white/30 text-white' : 'hover:bg-slate-200 text-slate-500'}`}>
                      <Edit3 size={14} />
                    </button>
                  </div>
                  <div className="p-3 space-y-2">
                    {hasMeals ? MEALS.map(meal => {
                      const m = dayData[meal];
                      if (!m?.items) return null;
                      return (
                        <div key={meal} className={`rounded-xl px-3 py-2 ${MEAL_META[meal].editColor}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{MEAL_META[meal].label}</p>
                          <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{m.items}</p>
                          {m.note && <p className="text-[10px] text-slate-400 mt-0.5 italic">{m.note}</p>}
                        </div>
                      );
                    }) : (
                      <div className="py-5 text-center">
                        <UtensilsCrossed size={20} className="mx-auto text-slate-200 mb-1.5" />
                        <p className="text-xs text-slate-400">No menu set</p>
                        <button onClick={() => setEditDay({ dayIndex: i, dayName })}
                          className="mt-1.5 text-xs text-indigo-500 hover:underline">Set menu</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editDay && (
        <EditDayModal
          weekStart={weekStart}
          dayIndex={editDay.dayIndex}
          dayName={editDay.dayName}
          existing={menu?.[editDay.dayName]}
          onClose={() => setEditDay(null)}
        />
      )}
    </div>
  );
}

// ── Today's Menu Section ──────────────────────────────────────────────────────

function TodayMenuSection() {
  const today = new Date();
  const dow = today.getDay();
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayName = dayNames[dow];

  const { data, isLoading } = useQuery({
    queryKey: ['today-menu'],
    queryFn: () => hstApi.get('/food-menu/current').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const dayMenu = data?.menu?.[dayName];
  const hasMenu = dayMenu && MEALS.some(m => dayMenu[m]?.items);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <UtensilsCrossed size={16} className="text-slate-400" />
        <h3 className="font-semibold text-slate-700">Today's Menu</h3>
        <span className="text-xs text-slate-400 capitalize">({dayName})</span>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading…</p>
      ) : !hasMenu ? (
        <p className="text-sm text-slate-400 text-center py-4">No menu set for today.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MEALS.map(meal => {
            const m = dayMenu[meal];
            if (!m?.items) return null;
            const s = MEAL_META[meal];
            return (
              <div key={meal} className={`rounded-xl border p-3 ${s.bg} ${s.border}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide ${s.text} mb-1.5`}>{s.label}</p>
                <p className={`text-sm leading-relaxed ${s.text}`}>{m.items}</p>
                {m.note && <p className={`text-xs mt-1 italic opacity-70 ${s.text}`}>{m.note}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Resident Drill-down Modal ─────────────────────────────────────────────────

function ResidentListModal({ date, meal, onClose }) {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const meta = MEAL_META[meal];
  const Icon = meta.icon;

  useEffect(() => {
    hstApi.get(`/food/date/${date}/meal/${meal}`)
      .then(r => setList(r.data.bookings))
      .catch(() => toast.error('Failed to load list'))
      .finally(() => setLoading(false));
  }, [date, meal]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${meta.bg} ${meta.border}`}>
              <Icon size={16} className={meta.text} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 capitalize">{meta.label} Bookings</h2>
              <p className="text-xs text-slate-400">{fmtDate(date)} · {list.length} resident{list.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No bookings found.</p>
          ) : (
            <div className="space-y-1">
              {list.map((b, i) => (
                <div key={b._id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-400 w-5">{i+1}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{b.userId?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{b.userId?.phone ?? ''}{b.userId?.roomNumber ? ` · Room ${b.userId.roomNumber}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Meal Stat Card ────────────────────────────────────────────────────────────

function MealCard({ meal, count, total, subtitle, onClick }) {
  const meta = MEAL_META[meal];
  const Icon = meta.icon;
  const pct  = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-2xl border p-5 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${meta.bg} ${meta.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={15} className={meta.text} />
          <span className={`text-xs font-bold uppercase tracking-wide ${meta.text}`}>{meta.label}</span>
        </div>
        <ChevronRight size={14} className={`${meta.text} opacity-50`} />
      </div>
      <p className={`text-3xl font-bold ${meta.text}`}>{count}</p>
      <p className={`text-xs mt-0.5 opacity-70 ${meta.text}`}>{subtitle}</p>
      {total > 0 && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-white/60">
            <div className={`h-1.5 rounded-full ${meta.bar} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <p className={`text-[10px] mt-1 opacity-60 ${meta.text}`}>{pct}% of total</p>
        </div>
      )}
    </button>
  );
}

// ── Breakdown Table ───────────────────────────────────────────────────────────

function BreakdownTable({ breakdown, onCellClick }) {
  if (!breakdown || breakdown.length === 0)
    return <p className="text-sm text-slate-400 text-center py-8">No data for this period.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</th>
            {MEALS.map(m => (
              <th key={m} className={`text-center pb-3 text-xs font-semibold uppercase tracking-wide ${MEAL_META[m].text}`}>
                {MEAL_META[m].label}
              </th>
            ))}
            <th className="text-center pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {breakdown.map(row => (
            <tr key={row.date} className="hover:bg-slate-50/60">
              <td className="py-3 pr-4 text-slate-600 text-xs font-medium whitespace-nowrap">{fmtShort(row.date)}</td>
              {MEALS.map(meal => (
                <td key={meal} className="py-3 text-center">
                  <button onClick={() => onCellClick(row.date, meal)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80
                      ${row[meal] > 0 ? `${MEAL_META[meal].bg} ${MEAL_META[meal].text}` : 'text-slate-300'}`}>
                    {row[meal]}
                    {row[meal] > 0 && <Users size={9} />}
                  </button>
                </td>
              ))}
              <td className="py-3 text-center">
                <span className="text-xs font-bold text-slate-600">{row.breakfast + row.lunch + row.dinner}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main AdminFood ────────────────────────────────────────────────────────────

export default function AdminFood() {
  const today = localDateStr();

  const [showSetMenu, setShowSetMenu] = useState(false);
  const [range, setRange]             = useState('daily');
  const [refDate, setRefDate]         = useState(today);
  const [stats, setStats]             = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [tomorrow, setTomorrow]       = useState(null);
  const [drill, setDrill]             = useState(null); // { date, meal }

  const fetchStats = useCallback(() => {
    setLoadingStats(true);
    hstApi.get(`/food/stats?range=${range}&date=${refDate}`)
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoadingStats(false));
  }, [range, refDate]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    hstApi.get('/food/tomorrow/count')
      .then(r => setTomorrow(r.data))
      .catch(() => {});
  }, []);

  const totalBookings = stats ? stats.breakfast + stats.lunch + stats.dinner : 0;

  const RANGES = [
    { key: 'daily',   label: 'Daily'   },
    { key: 'weekly',  label: 'Weekly'  },
    { key: 'monthly', label: 'Monthly' },
  ];

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Food Bookings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track daily, weekly and monthly meal bookings</p>
        </div>
        <button
          onClick={() => setShowSetMenu(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200"
        >
          <ChefHat size={16} />
          Set Menu
        </button>
      </div>

      {/* Tomorrow's count — from 9 PM only */}
      {showTomorrow() && tomorrow && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-200">Tomorrow's Bookings</p>
              <p className="text-sm font-semibold mt-0.5">{fmtDate(tomorrow.date)}</p>
            </div>
            <span className="text-3xl font-bold">{tomorrow.breakfast + tomorrow.lunch + tomorrow.dinner}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {MEALS.map(meal => {
              const Icon = MEAL_META[meal].icon;
              return (
                <button key={meal} onClick={() => setDrill({ date: tomorrow.date, meal })}
                  className="bg-white/15 hover:bg-white/25 rounded-xl p-3 text-left transition-colors">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className="text-indigo-100" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-100">{MEAL_META[meal].label}</span>
                  </div>
                  <p className="text-2xl font-bold">{tomorrow[meal]}</p>
                  <p className="text-[10px] text-indigo-200 mt-0.5">tap to see list</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Range tabs + date picker */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all
                ${range === r.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <input
          type={range === 'monthly' ? 'month' : 'date'}
          value={range === 'monthly' ? refDate.slice(0, 7) : refDate}
          onChange={e => {
            const val = e.target.value;
            setRefDate(range === 'monthly' ? val + '-01' : val);
          }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {/* Stats */}
      {loadingStats ? (
        <div className="py-10 text-center text-slate-400 text-sm">Loading…</div>
      ) : (
        <>
          {stats && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {stats.from === stats.to ? fmtDate(stats.from) : `${fmtShort(stats.from)} – ${fmtShort(stats.to)}`}
              </p>
              <p className="text-sm font-bold text-slate-800">{totalBookings} total</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MEALS.map(meal => (
              <MealCard key={meal} meal={meal} count={stats?.[meal] ?? 0} total={totalBookings}
                subtitle={`booked · ${range}`}
                onClick={() => {
                  if (range === 'daily') setDrill({ date: refDate, meal });
                  else document.getElementById('breakdown-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            ))}
          </div>

          {(range === 'weekly' || range === 'monthly') && stats?.breakdown && (
            <div id="breakdown-section" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-700 mb-4">
                Day-by-day breakdown
                <span className="ml-2 text-xs text-slate-400 font-normal">click a count to see residents</span>
              </h3>
              <BreakdownTable breakdown={stats.breakdown} onCellClick={(date, meal) => setDrill({ date, meal })} />
            </div>
          )}
        </>
      )}

      {/* Today's menu */}
      <TodayMenuSection />

      {/* Set Menu full-screen page */}
      {showSetMenu && <SetMenuPage onClose={() => setShowSetMenu(false)} />}

      {/* Resident drill-down modal */}
      {drill && <ResidentListModal date={drill.date} meal={drill.meal} onClose={() => setDrill(null)} />}
    </div>
  );
}
