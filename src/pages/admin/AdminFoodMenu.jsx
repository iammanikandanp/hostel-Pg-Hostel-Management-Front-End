import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Save, Edit3, X, UtensilsCrossed } from 'lucide-react';
import hstApi from '../../api/hstAxios';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MEALS = ['breakfast','lunch','dinner'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MEAL_COLORS = { breakfast: 'bg-amber-50 border-amber-100', lunch: 'bg-green-50 border-green-100', dinner: 'bg-indigo-50 border-indigo-100' };

const LS_KEY = meal => `hst_food_suggestions_${meal}`;

const DEFAULT_SUGGESTIONS = {
  breakfast: ['Idly', 'Dosa', 'Poori', 'Chapati', 'Pongal', 'Upma', 'Parotta', 'Rava Dosa', 'Vada', 'Sambar', 'Chutney', 'Egg Curry', 'Omelette', 'Bread', 'Puttu'],
  lunch:     ['White Rice', 'Sambar', 'Rasam', 'Curd', 'Papad', 'Pickle', 'Dal', 'Mixed Veg', 'Fish Curry', 'Chicken Curry', 'Buttermilk', 'Kootu', 'Poriyal', 'Appalam'],
  dinner:    ['Chapati', 'Parotta', 'Rice', 'Dal', 'Egg Curry', 'Chicken Curry', 'Veg Kurma', 'Sambar', 'Rasam', 'Curd Rice', 'Idly', 'Dosa', 'Fried Rice', 'Noodles'],
};

function getSuggestions(meal) {
  try {
    const stored = localStorage.getItem(LS_KEY(meal));
    if (stored) return JSON.parse(stored);
    // First time: seed with defaults
    localStorage.setItem(LS_KEY(meal), JSON.stringify(DEFAULT_SUGGESTIONS[meal]));
    return DEFAULT_SUGGESTIONS[meal];
  } catch { return DEFAULT_SUGGESTIONS[meal] || []; }
}

function saveSuggestions(meal, items) {
  const existing = getSuggestions(meal);
  const merged = [...new Set([...existing, ...items.map(s => s.trim()).filter(Boolean)])];
  localStorage.setItem(LS_KEY(meal), JSON.stringify(merged));
}

// Returns Monday of the current week + offset weeks, as YYYY-MM-DD string (local date, no UTC shift)
function getWeekStartStr(offset = 0) {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon + offset * 7);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const d = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Add days to a YYYY-MM-DD string and return a Date (local)
function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d + days);
}

function fmt(d) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Gets the last word/phrase being typed (after last comma)
function getActiveToken(value) {
  const parts = value.split(',');
  return parts[parts.length - 1].trim().toLowerCase();
}

function MealInput({ meal, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [suggestions] = useState(() => getSuggestions(meal));
  const wrapRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const token = getActiveToken(value);
  const alreadyUsed = value.split(',').map(s => s.trim().toLowerCase());
  const filtered = suggestions.filter(s =>
    !alreadyUsed.includes(s.toLowerCase()) &&
    (token.length === 0 || s.toLowerCase().includes(token))
  );

  function pickSuggestion(item) {
    const parts = value.split(',');
    parts[parts.length - 1] = ' ' + item;
    onChange(parts.join(',').replace(/^,\s*/, ''));
    setOpen(false);
  }

  function handleChange(e) {
    onChange(e.target.value);
    setOpen(true);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        placeholder="e.g. Idly, Sambar, Chutney"
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-40 overflow-y-auto">
          {filtered.map(item => (
            <li
              key={item}
              onMouseDown={e => { e.preventDefault(); pickSuggestion(item); }}
              className="px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditDayModal({ weekStart, dayIndex, dayName, existing, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    breakfast: { items: existing?.breakfast?.items ?? '', note: existing?.breakfast?.note ?? '' },
    lunch:     { items: existing?.lunch?.items     ?? '', note: existing?.lunch?.note     ?? '' },
    dinner:    { items: existing?.dinner?.items    ?? '', note: existing?.dinner?.note    ?? '' },
  });

  const dayDate = addDays(weekStart, dayIndex);
  const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`;

  const mutation = useMutation({
    mutationFn: () => hstApi.patch(`/food-menu/day/${dateStr}`, form),
    onSuccess: () => {
      // Learn new items for each meal
      for (const meal of MEALS) {
        const items = form[meal].items.split(',').map(s => s.trim()).filter(Boolean);
        if (items.length) saveSuggestions(meal, items);
      }
      toast.success('Menu saved');
      qc.invalidateQueries({ queryKey: ['food-menu'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Save failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 capitalize">{dayName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{fmt(dayDate)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {MEALS.map(meal => (
            <div key={meal} className={`rounded-2xl border p-4 space-y-3 ${MEAL_COLORS[meal]}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{MEAL_LABELS[meal]}</p>
                {form[meal].items && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, [meal]: { ...f[meal], items: '' } }))}
                    className="text-[10px] text-slate-400 hover:text-red-400 transition-colors">
                    ✕ clear
                  </button>
                )}
              </div>
              <MealInput
                meal={meal}
                value={form[meal].items}
                onChange={val => setForm(f => ({ ...f, [meal]: { ...f[meal], items: val } }))}
              />
              <input
                type="text"
                placeholder="Optional note (e.g. vegetarian only)"
                value={form[meal].note}
                onChange={e => setForm(f => ({ ...f, [meal]: { ...f[meal], note: e.target.value } }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Save Day'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFoodMenu() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [editDay, setEditDay] = useState(null);
  const weekStart = getWeekStartStr(weekOffset);
  const weekEnd   = addDays(weekStart, 6);

  const { data, isLoading } = useQuery({
    queryKey: ['food-menu', weekStart],
    queryFn: () => hstApi.get(`/food-menu/week/${weekStart}`).then(r => r.data),
  });

  const menu = data?.menu;

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Food Menu</h1>
          <p className="text-slate-500 text-sm mt-0.5">Set weekly meal plans for residents</p>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4">
        <button onClick={() => setWeekOffset(o => o - 1)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-slate-800">{fmt(addDays(weekStart, 0))} – {fmt(weekEnd)}</p>
          {weekOffset === 0 && <p className="text-xs text-indigo-600 font-medium">This Week</p>}
          {weekOffset === 1 && <p className="text-xs text-slate-400">Next Week</p>}
          {weekOffset === -1 && <p className="text-xs text-slate-400">Last Week</p>}
          {Math.abs(weekOffset) > 1 && <p className="text-xs text-slate-400">{weekOffset > 0 ? `+${weekOffset}` : weekOffset} weeks</p>}
        </div>
        <button onClick={() => setWeekOffset(o => o + 1)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ChevronRight size={18} className="text-slate-600" />
        </button>
      </div>

      {/* Day cards */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.map((dayName, i) => {
            const dayData  = menu?.[dayName];
            const dayDate  = addDays(weekStart, i);
            const todayStr = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();
            const dayStr   = `${dayDate.getFullYear()}-${String(dayDate.getMonth()+1).padStart(2,'0')}-${String(dayDate.getDate()).padStart(2,'0')}`;
            const isToday  = dayStr === todayStr;
            const hasMeals = dayData && MEALS.some(m => dayData[m]?.items);

            return (
              <div key={dayName} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : 'border-slate-100'}`}>
                <div className={`px-4 py-3 flex items-center justify-between ${isToday ? 'bg-indigo-600' : 'bg-slate-50'}`}>
                  <div>
                    <p className={`text-sm font-bold ${isToday ? 'text-white' : 'text-slate-800'}`}>{DAY_LABELS[i]}</p>
                    <p className={`text-xs ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>{fmt(dayDate)}</p>
                  </div>
                  <button
                    onClick={() => setEditDay({ dayIndex: i, dayName })}
                    className={`p-1.5 rounded-lg transition-colors ${isToday ? 'bg-white/20 hover:bg-white/30 text-white' : 'hover:bg-slate-200 text-slate-500'}`}
                  >
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {hasMeals ? (
                    MEALS.map(meal => {
                      const m = dayData[meal];
                      if (!m?.items) return null;
                      return (
                        <div key={meal} className={`rounded-xl px-3 py-2 ${MEAL_COLORS[meal]}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{MEAL_LABELS[meal]}</p>
                          <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{m.items}</p>
                          {m.note && <p className="text-[10px] text-slate-400 mt-0.5 italic">{m.note}</p>}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center">
                      <UtensilsCrossed size={20} className="mx-auto text-slate-200 mb-1.5" />
                      <p className="text-xs text-slate-400">No menu set</p>
                      <button onClick={() => setEditDay({ dayIndex: i, dayName })}
                        className="mt-2 text-xs text-indigo-500 hover:underline">Set menu</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
