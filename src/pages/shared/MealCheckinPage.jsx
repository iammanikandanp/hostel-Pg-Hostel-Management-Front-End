import { useState, useEffect, useCallback } from 'react';
import { Coffee, Sun, Moon, CheckCircle2, Clock, UtensilsCrossed, Loader2, RefreshCw, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import hstApi from '../../api/hstAxios';

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_META = {
  breakfast: {
    label: 'Breakfast', icon: Coffee,
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800',
    activeBg: 'bg-amber-500', time: '7:00 AM – 9:00 AM',
  },
  lunch: {
    label: 'Lunch', icon: Sun,
    bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800',
    activeBg: 'bg-green-500', time: '12:00 PM – 2:00 PM',
  },
  dinner: {
    label: 'Dinner', icon: Moon,
    bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800',
    activeBg: 'bg-indigo-500', time: '7:00 PM – 9:00 PM',
  },
};

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="text-2xl font-bold text-white tabular-nums">
      {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </p>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MealCheckinPage() {
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading | noauth | nomeal | ready | done
  const [data, setData]   = useState(null);       // { serving, bookings, today, user }
  const [busy, setBusy]   = useState({});
  const [confirmed, setConfirmed] = useState({}); // { bookingId: true }
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      // First verify auth
      const meRes = await hstApi.get('/auth/me');
      const user  = meRes.data.user;

      const r = await hstApi.get('/food/checkin-meals');
      const { serving, bookings, message } = r.data;

      if (serving.length === 0) {
        setState('nomeal');
        setData({ message, user });
        return;
      }

      setData({ ...r.data, user });
      setState('ready');
    } catch (err) {
      if (err.response?.status === 401) {
        setState('noauth');
      } else {
        setError(err.response?.data?.error ?? 'Something went wrong');
        setState('nomeal');
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60 seconds in case meal window opens
  useEffect(() => {
    const t = setInterval(() => {
      if (state !== 'loading') load();
    }, 60_000);
    return () => clearInterval(t);
  }, [state, load]);

  async function confirm(bookingId) {
    setBusy(b => ({ ...b, [bookingId]: true }));
    try {
      await hstApi.patch(`/food/checkin-confirm/${bookingId}`);
      setConfirmed(c => ({ ...c, [bookingId]: true }));
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Failed to confirm';
      setError(msg);
    } finally {
      setBusy(b => ({ ...b, [bookingId]: false }));
    }
  }

  const allConfirmed = data?.bookings?.length > 0 &&
    data.bookings.every(b => confirmed[b._id] || b.status === 'consumed');

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
        <div className="text-center text-white space-y-3">
          <Loader2 size={40} className="animate-spin mx-auto opacity-80" />
          <p className="text-sm opacity-70">Checking your meals…</p>
        </div>
      </div>
    );
  }

  // ── Not logged in ────────────────────────────────────────────────────────────
  if (state === 'noauth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="p-4 bg-indigo-50 rounded-2xl inline-block">
            <LogIn size={32} className="text-indigo-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Login Required</h2>
            <p className="text-sm text-slate-500 mt-1">Please login to confirm your meal collection.</p>
          </div>
          <button
            onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-indigo-200">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ── No meal being served now ─────────────────────────────────────────────────
  if (state === 'nomeal') {
    const nextMeals = [
      { meal: 'breakfast', hour: 7  },
      { meal: 'lunch',     hour: 12 },
      { meal: 'dinner',    hour: 19 },
    ];
    const nowH = new Date().getHours();
    const next = nextMeals.find(m => m.hour > nowH) ?? nextMeals[0];
    const meta = MEAL_META[next.meal];
    const Icon = meta.icon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="p-4 bg-slate-50 rounded-2xl inline-block">
            <UtensilsCrossed size={32} className="text-slate-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">No meal right now</h2>
            <p className="text-sm text-slate-500 mt-1">{error || data?.message}</p>
          </div>

          <div className={`rounded-2xl border p-4 ${meta.bg} ${meta.border}`}>
            <p className={`text-xs font-bold uppercase tracking-wide ${meta.text} mb-1`}>Next meal</p>
            <div className="flex items-center justify-center gap-2">
              <Icon size={16} className={meta.text} />
              <p className={`font-bold ${meta.text}`}>{meta.label}</p>
            </div>
            <p className={`text-xs mt-1 ${meta.text} opacity-70`}>{meta.time}</p>
          </div>

          <button onClick={load}
            className="flex items-center justify-center gap-2 w-full h-11 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
            <RefreshCw size={15} /> Check again
          </button>

          <p className="text-xs text-slate-400">
            Hi {data?.user?.name}. This page auto-refreshes every minute.
          </p>
        </div>
      </div>
    );
  }

  // ── Ready — show meals to confirm ────────────────────────────────────────────
  const { serving, bookings, user } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-10 pb-6 text-center text-white">
        <div className="flex items-center justify-center gap-2 mb-4">
          <UtensilsCrossed size={24} className="opacity-80" />
          <p className="text-sm font-semibold opacity-80 uppercase tracking-widest">Meal Collection</p>
        </div>
        <LiveClock />
        <p className="text-sm opacity-70 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <div className="mt-4 bg-white/15 rounded-2xl px-5 py-3 inline-block">
          <p className="font-bold text-lg">{user?.name}</p>
          {user?.roomNumber && <p className="text-sm opacity-80">Room {user.roomNumber}</p>}
        </div>
      </div>

      {/* Meal cards */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 py-8 space-y-4">
        {/* Success state */}
        {allConfirmed && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center mb-4">
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-emerald-800 text-lg">All meals confirmed!</p>
            <p className="text-sm text-emerald-600 mt-0.5">Enjoy your food. Have a great meal!</p>
          </div>
        )}

        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Your meals right now
        </p>

        {bookings.length === 0 ? (
          // Serving window is open but no booking for this resident
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <Clock size={28} className="text-amber-400 mx-auto mb-2" />
            <p className="font-semibold text-amber-800">No booking found</p>
            <p className="text-sm text-amber-600 mt-1">
              You haven't booked {serving.join(' or ')} for today.
            </p>
          </div>
        ) : (
          bookings.map(b => {
            const meta = MEAL_META[b.meal];
            const Icon = meta.icon;
            const isConfirmed = confirmed[b._id] || b.status === 'consumed';
            const isBusy = busy[b._id];

            return (
              <div key={b._id}
                className={`rounded-2xl border-2 p-5 transition-all
                  ${isConfirmed
                    ? 'bg-emerald-50 border-emerald-300'
                    : `${meta.bg} ${meta.border}`}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isConfirmed ? 'bg-emerald-500' : meta.activeBg}`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-lg font-bold capitalize ${isConfirmed ? 'text-emerald-800' : meta.text}`}>
                      {meta.label}
                    </p>
                    <p className={`text-xs ${isConfirmed ? 'text-emerald-600' : `${meta.text} opacity-70`}`}>
                      {meta.time}
                    </p>
                  </div>
                  {isConfirmed && (
                    <div className="flex flex-col items-center text-emerald-600">
                      <CheckCircle2 size={28} />
                      <p className="text-[10px] font-bold mt-0.5">Collected</p>
                    </div>
                  )}
                </div>

                {!isConfirmed && (
                  <button
                    onClick={() => confirm(b._id)}
                    disabled={isBusy}
                    className={`w-full mt-4 h-14 rounded-2xl text-white text-base font-bold
                      flex items-center justify-center gap-3 transition-all active:scale-[0.98]
                      ${meta.activeBg} hover:opacity-90 disabled:opacity-60 shadow-lg`}>
                    {isBusy
                      ? <><Loader2 size={20} className="animate-spin" /> Confirming…</>
                      : <><CheckCircle2 size={20} /> I collected my {meta.label}</>
                    }
                  </button>
                )}
              </div>
            );
          })
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        <button onClick={load}
          className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 text-sm hover:text-slate-600 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
    </div>
  );
}
