import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Coffee, Sun, Moon, X, UtensilsCrossed, CalendarCheck, CheckCircle2, Clock, QrCode, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import { useHstAuthStore } from '../../store/hstAuthStore';

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MEALS = ['breakfast','lunch','dinner'];

// Cutoff hours (local time, same day): book BEFORE this hour
const MEAL_CUTOFF = { breakfast: 5, lunch: 11, dinner: 18 };
const MEAL_CUTOFF_LABEL = { breakfast: '5:00 AM', lunch: '11:00 AM', dinner: '6:00 PM' };

const MEAL_META = {
  breakfast: { label: 'Breakfast', icon: Coffee,  bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-800',   badge: 'bg-amber-100 text-amber-700' },
  lunch:     { label: 'Lunch',     icon: Sun,      bg: 'bg-green-50',   border: 'border-green-100',   text: 'text-green-800',   badge: 'bg-green-100 text-green-700' },
  dinner:    { label: 'Dinner',    icon: Moon,     bg: 'bg-indigo-50',  border: 'border-indigo-100',  text: 'text-indigo-800',  badge: 'bg-indigo-100 text-indigo-700' },
};

// ── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() { return toDateStr(new Date()); }

function getWeekStartStr(offset = 0) {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon + offset * 7);
  return toDateStr(mon);
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d + days);
}

function fmt(d) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Is the cutoff for this meal on this date already passed?
function isCutoffPassed(dateStr, meal) {
  const cutoffHour = MEAL_CUTOFF[meal];
  const [y, mo, d] = dateStr.split('-').map(Number);
  const cutoff = new Date(y, mo - 1, d, cutoffHour, 0, 0, 0);
  return new Date() >= cutoff;
}

// Is the date in the past (before today)?
function isPastDate(dateStr) {
  return dateStr < todayStr();
}

// Is now within the 2-hour self-confirm window after meal start?
const MEAL_START_HOUR = { breakfast: 5, lunch: 11, dinner: 18 };
function selfConfirmWindow(meal) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), MEAL_START_HOUR[meal], 0, 0, 0);
  const end   = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return now >= start && now <= end;
}

// ── QR Code Card ─────────────────────────────────────────────────────────────

function MyQRCard() {
  const { user } = useHstAuthStore();
  const [show, setShow] = useState(false);
  if (!user) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
            <QrCode size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">My Food QR Code</p>
            <p className="text-xs text-slate-400">Show this to staff at the meal counter</p>
          </div>
        </div>
        <button onClick={() => setShow(v => !v)}
          className="text-xs text-indigo-600 font-semibold hover:underline">
          {show ? 'Hide' : 'Show QR'}
        </button>
      </div>
      {show && (
        <div className="mt-5 flex flex-col items-center gap-3">
          <div className="p-4 bg-white border-2 border-indigo-100 rounded-2xl shadow-inner">
            <QRCodeSVG value={user._id} size={180} level="M"
              imageSettings={{ src: '', height: 0, width: 0, excavate: false }} />
          </div>
          <p className="text-xs text-slate-500 font-medium">{user.name}</p>
          <p className="text-[10px] text-slate-400">Staff will scan this when you collect your meal</p>
        </div>
      )}
    </div>
  );
}

// ── Today's Self-Confirm Section ──────────────────────────────────────────────

function TodaySelfConfirm({ trackingMode, bookings, onRefetch }) {
  const [busy, setBusy] = useState({});
  if (trackingMode !== 'self') return null;

  const today = todayStr();
  const todayBookings = bookings.filter(b => b.date === today && b.status === 'booked');
  const confirmedToday = bookings.filter(b => b.date === today && b.status === 'consumed');

  if (todayBookings.length === 0 && confirmedToday.length === 0) return null;

  async function selfConfirm(id, meal) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await hstApi.patch(`/food/${id}/self-confirm`);
      toast.success('Meal confirmed! Enjoy your food 🍽️');
      onRefetch();
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to confirm');
    } finally {
      setBusy(b => ({ ...b, [id]: false }));
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={16} className="text-emerald-500" />
        <h2 className="font-semibold text-slate-700">Confirm Today's Meals</h2>
      </div>
      <div className="space-y-2">
        {todayBookings.map(b => {
          const s = MEAL_META[b.meal];
          const Icon = s.icon;
          const inWindow = selfConfirmWindow(b.meal);
          return (
            <div key={b._id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.bg} ${s.border}`}>
              <Icon size={16} className={s.text} />
              <div className="flex-1">
                <p className={`font-semibold text-sm ${s.text} capitalize`}>{b.meal}</p>
                {!inWindow && (
                  <p className="text-[10px] text-slate-400">
                    Confirm opens at {MEAL_START_HOUR[b.meal]}:00 · closes 2 hrs later
                  </p>
                )}
              </div>
              <button
                onClick={() => selfConfirm(b._id, b.meal)}
                disabled={!inWindow || busy[b._id]}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                  ${inWindow
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                {busy[b._id] ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {inWindow ? 'I got my food' : 'Not yet open'}
              </button>
            </div>
          );
        })}
        {confirmedToday.map(b => {
          const s = MEAL_META[b.meal];
          const Icon = s.icon;
          return (
            <div key={b._id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <Icon size={16} className="text-emerald-600" />
              <p className="flex-1 font-semibold text-sm text-emerald-700 capitalize">{b.meal}</p>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                ✓ Confirmed
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Confirm Booking Modal ────────────────────────────────────────────────────

function ConfirmBookModal({ selections, weekStart, onConfirm, onClose, booking }) {
  const list = [];
  selections.forEach((meals, di) => {
    meals.forEach(meal => {
      const date = addDays(weekStart, di);
      list.push({ date: toDateStr(date), dateLabel: `${DAY_LABELS[di]} ${fmt(date)}`, meal });
    });
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Confirm Bookings</h2>
            <p className="text-xs text-slate-400 mt-0.5">{list.length} meal{list.length !== 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 max-h-72 overflow-y-auto space-y-2">
          {list.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No meals selected.</p>
          ) : list.map((item, i) => {
            const m = MEAL_META[item.meal];
            const Icon = m.icon;
            return (
              <div key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${m.bg} ${m.border}`}>
                <Icon size={14} className={m.text} />
                <span className={`text-sm font-medium ${m.text} capitalize flex-1`}>{item.meal}</span>
                <span className="text-xs text-slate-500">{item.dateLabel}</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onConfirm(list)} disabled={booking || list.length === 0}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <CheckCircle2 size={15} />
            {booking ? 'Booking…' : `Book ${list.length} meal${list.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Today's Menu Banner ──────────────────────────────────────────────────────

function TodayMenuBanner({ menu }) {
  const today = new Date();
  const dow = today.getDay();
  const dayName = DAYS[dow === 0 ? 6 : dow - 1];
  const dayMenu = menu?.[dayName];
  if (!dayMenu || !MEALS.some(m => dayMenu[m]?.items)) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <UtensilsCrossed size={16} className="text-indigo-500" />
        <h2 className="font-semibold text-slate-700">Today's Menu</h2>
        <span className="text-xs text-slate-400 capitalize ml-1">({dayName})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MEALS.map(meal => {
          const m = dayMenu[meal];
          if (!m?.items) return null;
          const s = MEAL_META[meal];
          const cutoffPassed = isCutoffPassed(todayStr(), meal);
          return (
            <div key={meal} className={`rounded-xl border p-3 ${s.bg} ${s.border}`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-[10px] font-bold uppercase tracking-wide ${s.text}`}>{s.label}</p>
                {cutoffPassed
                  ? <span className="text-[10px] text-red-400 font-medium">Cutoff passed</span>
                  : <span className={`text-[10px] font-medium ${s.text} opacity-70`}>Book before {MEAL_CUTOFF_LABEL[meal]}</span>
                }
              </div>
              <p className={`text-sm leading-relaxed ${s.text}`}>{m.items}</p>
              {m.note && <p className={`text-xs mt-1 italic opacity-70 ${s.text}`}>{m.note}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week Menu & Booking Grid ─────────────────────────────────────────────────

export default function ResidentFood() {
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  // selections: Map<dayIndex, Set<meal>>
  const [selections, setSelections] = useState(() => new Map());
  const [showConfirm, setShowConfirm] = useState(false);
  const [booking, setBooking]         = useState(false);

  const weekStart = getWeekStartStr(weekOffset);
  const weekEnd   = addDays(weekStart, 6);

  // Fetch this week's menu
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['food-menu', weekStart],
    queryFn: () => hstApi.get(`/food-menu/week/${weekStart}`).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch my bookings for current month (covers this week)
  const { data: myBookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['my-food-bookings', weekStart.slice(0, 7)],
    queryFn: () => hstApi.get(`/food/my?month=${weekStart.slice(0, 7)}`).then(r => r.data),
  });

  // Fetch hostel tracking mode
  const { data: trackingData } = useQuery({
    queryKey: ['food-tracking-mode'],
    queryFn: () => hstApi.get('/food/tracking-mode').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const trackingMode = trackingData?.mode ?? 'staff';

  const menu = menuData?.menu;
  const myBookings = myBookingsData?.bookings ?? [];

  // Build a set of already-booked/consumed "date|meal" for quick lookup
  const bookedSet = new Set(
    myBookings.filter(b => b.status === 'booked' || b.status === 'consumed').map(b => `${b.date}|${b.meal}`)
  );

  // Reset selections when week changes
  useEffect(() => { setSelections(new Map()); }, [weekStart]);

  function toggleMeal(dayIndex, meal) {
    const dateStr = toDateStr(addDays(weekStart, dayIndex));
    if (isPastDate(dateStr) || isCutoffPassed(dateStr, meal)) return;
    if (bookedSet.has(`${dateStr}|${meal}`)) return; // already booked

    setSelections(prev => {
      const next = new Map(prev);
      const daySet = new Set(next.get(dayIndex) ?? []);
      if (daySet.has(meal)) daySet.delete(meal); else daySet.add(meal);
      if (daySet.size === 0) next.delete(dayIndex); else next.set(dayIndex, daySet);
      return next;
    });
  }

  function selectFullWeek() {
    const next = new Map();
    DAYS.forEach((_, di) => {
      const dateStr = toDateStr(addDays(weekStart, di));
      if (isPastDate(dateStr)) return;
      const available = MEALS.filter(meal =>
        !isCutoffPassed(dateStr, meal) && !bookedSet.has(`${dateStr}|${meal}`)
      );
      if (available.length > 0) next.set(di, new Set(available));
    });
    setSelections(next);
  }

  function clearSelections() { setSelections(new Map()); }

  function totalSelected() {
    let count = 0;
    selections.forEach(s => { count += s.size; });
    return count;
  }

  async function confirmBookings(list) {
    setBooking(true);
    let successCount = 0;
    const errors = [];
    for (const item of list) {
      try {
        await hstApi.post('/food', { date: item.date, meal: item.meal });
        successCount++;
      } catch (err) {
        errors.push(`${item.meal} on ${item.dateLabel}: ${err.response?.data?.error ?? 'Failed'}`);
      }
    }
    setBooking(false);
    setShowConfirm(false);
    setSelections(new Map());
    if (successCount > 0) toast.success(`${successCount} meal${successCount !== 1 ? 's' : ''} booked!`);
    if (errors.length > 0) errors.forEach(e => toast.error(e, { duration: 4000 }));
    refetchBookings();
  }

  async function cancelBooking(id) {
    try {
      await hstApi.patch(`/food/${id}/cancel`);
      toast.success('Booking cancelled');
      refetchBookings();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  if (menuLoading || bookingsLoading) return <PageLoader />;

  const selected = totalSelected();

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Food Booking</h1>
        <p className="text-slate-500 text-sm mt-0.5">Select meals for the week and book them.</p>
      </div>

      {/* Today's menu banner */}
      {weekOffset === 0 && <TodayMenuBanner menu={menu} />}

      {/* Self-confirm section — only shown when mode=self and today has bookings */}
      {weekOffset === 0 && (
        <TodaySelfConfirm
          trackingMode={trackingMode}
          bookings={myBookings}
          onRefetch={refetchBookings}
        />
      )}

      {/* My QR code — shown when mode=qr */}
      {trackingMode === 'qr' && <MyQRCard />}

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => setWeekOffset(o => o - 1)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          ‹
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-slate-800 text-sm">{fmt(addDays(weekStart, 0))} – {fmt(weekEnd)}</p>
          {weekOffset === 0 && <p className="text-xs text-indigo-600 font-medium">This Week</p>}
          {weekOffset === 1 && <p className="text-xs text-slate-400">Next Week</p>}
          {weekOffset < 0 && <p className="text-xs text-slate-400">Past Week</p>}
        </div>
        <button onClick={() => setWeekOffset(o => o + 1)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          ›
        </button>
      </div>

      {/* Book full week button + action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={selectFullWeek}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200">
          <CalendarCheck size={15} />
          Book Full Week
        </button>
        {selected > 0 && (
          <>
            <button onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-200">
              <CheckCircle2 size={15} />
              Confirm {selected} meal{selected !== 1 ? 's' : ''}
            </button>
            <button onClick={clearSelections}
              className="text-sm text-slate-500 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
              Clear
            </button>
          </>
        )}
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS.map((dayName, di) => {
          const dayDate  = addDays(weekStart, di);
          const dateStr  = toDateStr(dayDate);
          const isToday  = dateStr === todayStr();
          const isPast   = isPastDate(dateStr);
          const dayMenu  = menu?.[dayName];
          const daySelections = selections.get(di) ?? new Set();

          return (
            <div key={dayName} className={`bg-white rounded-2xl border shadow-sm overflow-hidden
              ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : 'border-slate-100'}
              ${isPast ? 'opacity-60' : ''}`}>
              <div className={`px-4 py-3 ${isToday ? 'bg-indigo-600' : 'bg-slate-50'}`}>
                <p className={`text-sm font-bold ${isToday ? 'text-white' : 'text-slate-800'}`}>{DAY_LABELS[di]}</p>
                <p className={`text-xs ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>{fmt(dayDate)}</p>
              </div>

              <div className="p-3 space-y-2">
                {MEALS.map(meal => {
                  const mealMenu = dayMenu?.[meal];
                  const isBooked = bookedSet.has(`${dateStr}|${meal}`);
                  const cutoffPassed = isCutoffPassed(dateStr, meal);
                  const unavailable  = isPast || (cutoffPassed && !isBooked);
                  const isSelected   = daySelections.has(meal);
                  const s = MEAL_META[meal];
                  const Icon = s.icon;

                  return (
                    <button
                      key={meal}
                      disabled={unavailable || isBooked}
                      onClick={() => toggleMeal(di, meal)}
                      className={`w-full text-left rounded-xl border px-3 py-2 transition-all
                        ${isBooked
                          ? `${s.bg} ${s.border} opacity-80 cursor-default`
                          : isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : unavailable
                              ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                              : `${s.bg} ${s.border} hover:ring-2 hover:ring-indigo-300 cursor-pointer`
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={12} className={isSelected && !isBooked ? 'text-white' : s.text} />
                        <span className={`text-[11px] font-bold uppercase tracking-wide
                          ${isSelected && !isBooked ? 'text-white' : s.text}`}>{s.label}</span>
                        {isBooked && (
                          <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Booked</span>
                        )}
                        {!isBooked && cutoffPassed && !isPast && (
                          <span className="ml-auto">
                            <Clock size={10} className="text-red-400" />
                          </span>
                        )}
                      </div>
                      {mealMenu?.items && (
                        <p className={`text-[10px] mt-1 leading-relaxed truncate
                          ${isSelected && !isBooked ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {mealMenu.items}
                        </p>
                      )}
                      {!mealMenu?.items && !unavailable && !isBooked && (
                        <p className="text-[10px] mt-0.5 text-slate-400 italic">Menu not set</p>
                      )}
                      {!isBooked && !cutoffPassed && !isPast && (
                        <p className={`text-[10px] mt-0.5 ${isSelected && !isBooked ? 'text-indigo-200' : 'text-slate-400'}`}>
                          Book before {MEAL_CUTOFF_LABEL[meal]}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active bookings list */}
      {myBookings.filter(b => ['booked','consumed','no_show'].includes(b.status)).length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-700 mb-3">
            This Month's Bookings
            <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {myBookings.filter(b => b.status === 'booked').length} pending
            </span>
          </h2>
          <div className="space-y-2">
            {myBookings
              .filter(b => ['booked','consumed','no_show'].includes(b.status))
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(b => {
                const s = MEAL_META[b.meal] ?? MEAL_META.breakfast;
                const Icon = s.icon;
                const canCancel = b.status === 'booked' && !isCutoffPassed(b.date, b.meal) && !isPastDate(b.date);
                const statusChip = {
                  booked:   'bg-slate-100 text-slate-500',
                  consumed: 'bg-emerald-100 text-emerald-700',
                  no_show:  'bg-red-100 text-red-600',
                }[b.status];
                const statusLabel = { booked: 'Booked', consumed: '✓ Collected', no_show: 'No show' }[b.status];
                return (
                  <div key={b._id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${s.bg} ${s.border}`}>
                      <Icon size={14} className={s.text} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 capitalize text-sm">{b.meal}</p>
                      <p className="text-xs text-slate-400">{b.date}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusChip}`}>
                      {statusLabel}
                    </span>
                    {canCancel && (
                      <button onClick={() => cancelBooking(b._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        title="Cancel booking">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {showConfirm && (
        <ConfirmBookModal
          selections={selections}
          weekStart={weekStart}
          onConfirm={confirmBookings}
          onClose={() => setShowConfirm(false)}
          booking={booking}
        />
      )}
    </div>
  );
}
