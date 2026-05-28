import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { WashingMachine, Settings, Calendar, CheckCircle, X, Clock, User } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import { useHstLangStore } from '../../store/hstLangStore';

const DAYS_EN    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_TA    = ['ஞா', 'தி', 'செ', 'பு', 'வி', 'வெ', 'ச'];
const DAY_FULL_TA = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
const DAYS_HI    = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
const DAY_FULL_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

const DAYS_MAP    = { en: DAYS_EN,    ta: DAYS_TA,    hi: DAYS_HI };
const DAY_FULL_MAP = { en: DAY_FULL_EN, ta: DAY_FULL_TA, hi: DAY_FULL_HI };

function fmt12(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function generateSlots(start, end) {
  const slots = [];
  let [sh] = start.split(':').map(Number);
  const [eh] = end.split(':').map(Number);
  while (sh < eh) {
    slots.push(`${String(sh).padStart(2, '0')}:00`);
    sh += 1;
  }
  return slots;
}

const STATUS_CLS = {
  booked:    'bg-indigo-100 text-indigo-700',
  done:      'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default function AdminLaundry() {
  const { t, lang } = useHstLangStore();
  const DAYS    = DAYS_MAP[lang]    || DAYS_EN;
  const DAY_FULL = DAY_FULL_MAP[lang] || DAY_FULL_EN;
  const [tab, setTab]           = useState('bookings'); // 'bookings' | 'settings'
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving]     = useState(false);

  // Settings form state
  const [laundryDays,      setLaundryDays]      = useState([]);
  const [startTime,        setStartTime]         = useState('06:00');
  const [endTime,          setEndTime]           = useState('21:00');
  const [machineCount,     setMachineCount]      = useState(2);

  const fetchBookings = useCallback((d) => {
    setLoading(true);
    hstApi.get(`/laundry/admin/bookings?date=${d}`)
      .then(r => setBookings(r.data.bookings))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const fetchSettings = useCallback(() => {
    hstApi.get('/laundry/admin/settings')
      .then(r => {
        const s = r.data.settings;
        setSettings(s);
        setLaundryDays(s?.laundryDays ?? [0,1,2,3,4,5,6]);
        setStartTime(s?.laundryStartTime ?? '06:00');
        setEndTime(s?.laundryEndTime ?? '21:00');
        setMachineCount(s?.machineCount ?? 2);
      })
      .catch(() => toast.error('Failed to load settings'));
  }, []);

  useEffect(() => {
    fetchBookings(date);
    fetchSettings();
  }, []);

  const handleDateChange = (d) => {
    setDate(d);
    fetchBookings(d);
  };

  const markDone = async (id) => {
    try {
      await hstApi.patch(`/laundry/${id}/done`);
      toast.success('Marked as done');
      fetchBookings(date);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const saveSettings = async () => {
    if (startTime >= endTime) return toast.error('Start time must be before end time');
    if (laundryDays.length === 0) return toast.error('Select at least one laundry day');
    setSaving(true);
    try {
      await hstApi.patch('/laundry/admin/settings', {
        laundryDays, laundryStartTime: startTime, laundryEndTime: endTime, machineCount,
      });
      toast.success(t('laundry_save_settings'));
      fetchSettings();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleDay = (d) =>
    setLaundryDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  // Build grid: slots × machines for selected date
  const slots = settings ? generateSlots(settings.laundryStartTime || '06:00', settings.laundryEndTime || '21:00') : [];
  const machines = Array.from({ length: settings?.machineCount || 2 }, (_, i) => i + 1);

  // Map bookings by slotTime-machineNo
  const bookingMap = {};
  bookings.forEach(b => {
    bookingMap[`${b.slotTime}-${b.machineNo}`] = b;
  });

  const dateDay = new Date(date + 'T00:00:00').getDay();
  const isLaundryDay = settings ? (settings.laundryDays ?? []).includes(dateDay) : true;

  const totalBooked    = bookings.filter(b => b.status === 'booked').length;
  const totalDone      = bookings.filter(b => b.status === 'done').length;
  const totalCancelled = bookings.filter(b => b.status === 'cancelled').length;

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('laundry_management')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('laundry_mgmt_subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('bookings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'bookings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <Calendar size={15} /> {t('laundry_bookings_tab')}
          </button>
          <button onClick={() => setTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <Settings size={15} /> {t('laundry_settings_tab')}
          </button>
        </div>
      </div>

      {/* ── BOOKINGS TAB ── */}
      {tab === 'bookings' && (
        <>
          {/* Date picker + stats */}
          <div className="flex flex-wrap items-center gap-4">
            <input type="date" value={date}
              onChange={e => handleDateChange(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="flex gap-3">
              <Chip label={`${totalBooked} ${t('laundry_booked_stat')}`}    cls="bg-indigo-50 text-indigo-700 border-indigo-100" />
              <Chip label={`${totalDone} ${t('laundry_done_stat')}`}         cls="bg-emerald-50 text-emerald-700 border-emerald-100" />
              <Chip label={`${totalCancelled} ${t('laundry_cancelled_stat')}`} cls="bg-slate-100 text-slate-500 border-slate-200" />
            </div>
          </div>

          {!isLaundryDay && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700 font-medium">
              ⚠️ {DAY_FULL[dateDay]} {t('laundry_not_available_day')}
            </div>
          )}

          {loading ? <PageLoader /> : (
            <>
              {slots.length > 0 && isLaundryDay && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('time')}</th>
                        {machines.map(m => (
                          <th key={m} className="text-center px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <WashingMachine size={13} className="inline mr-1" />{t('laundry_machine')} {m}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot, i) => (
                        <tr key={slot} className={i % 2 === 0 ? 'bg-slate-50/50' : ''}>
                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            <Clock size={13} className="inline mr-1.5 text-slate-400" />
                            {fmt12(slot)}
                          </td>
                          {machines.map(m => {
                            const b = bookingMap[`${slot}-${m}`];
                            return (
                              <td key={m} className="px-3 py-2 text-center">
                                {b ? (
                                  <div className="inline-flex flex-col items-center gap-1.5 bg-white border border-slate-100 rounded-xl px-3 py-2 min-w-[120px] shadow-sm">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[b.status]}`}>
                                      {t(b.status).toUpperCase()}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                      <User size={10} /> {b.userId?.name}
                                    </span>
                                    {b.status === 'booked' && (
                                      <button onClick={() => markDone(b._id)}
                                        className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">
                                        <CheckCircle size={10} /> {t('laundry_mark_done_notify')}
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-300 italic">{t('free')}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bookings.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('laundry_all_bookings')} {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' })}</h2>
                  <div className="space-y-2">
                    {bookings.map(b => (
                      <div key={b._id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${b.status === 'done' ? 'bg-emerald-50 text-emerald-600' : b.status === 'cancelled' ? 'bg-slate-100 text-slate-400' : 'bg-cyan-50 text-cyan-600'}`}>
                          <WashingMachine size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-sm">
                            {fmt12(b.slotTime)} — {t('laundry_machine')} {b.machineNo}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <User size={10} /> {b.userId?.name}
                            {b.userId?.roomId && <span className="ml-1 text-slate-300">· {t('rooms_number')} {b.userId.roomId}</span>}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_CLS[b.status]}`}>
                          {t(b.status).toUpperCase()}
                        </span>
                        {b.status === 'booked' && (
                          <button onClick={() => markDone(b._id)}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                            <CheckCircle size={13} /> {t('done')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bookings.length === 0 && isLaundryDay && (
                <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
                  <WashingMachine size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{t('laundry_no_bookings')}</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-7 max-w-xl">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <Settings size={16} className="text-slate-400" /> {t('laundry_configuration')}
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {t('laundry_days')}
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    laundryDays.includes(i)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {laundryDays.length === 0 ? t('laundry_no_days_selected') : laundryDays.sort().map(d => DAY_FULL[d]).join(', ')}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {t('laundry_time_range')}
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-slate-400 mb-1">{t('laundry_start_time')}</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <span className="text-slate-400 mt-5">→</span>
              <div className="flex-1">
                <label className="block text-[11px] text-slate-400 mb-1">{t('laundry_end_time')}</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            {startTime < endTime && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5">{t('laundry_generated_slots')}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {generateSlots(startTime, endTime).map(s => (
                    <span key={s} className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg font-medium">
                      {fmt12(s)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {t('laundry_num_machines')}
            </label>
            <div className="flex items-center gap-3">
              <button onClick={() => setMachineCount(c => Math.max(1, c - 1))}
                className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-lg font-bold transition-all">−</button>
              <span className="text-2xl font-bold text-indigo-700 w-10 text-center">{machineCount}</span>
              <button onClick={() => setMachineCount(c => Math.min(10, c + 1))}
                className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-lg font-bold transition-all">+</button>
              <span className="text-sm text-slate-400 ml-2">{t('laundry_machine').toLowerCase()}</span>
            </div>
          </div>

          {startTime < endTime && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
              <p className="font-semibold mb-1">{t('laundry_summary')}</p>
              <p className="text-xs">
                {generateSlots(startTime, endTime).length} × {machineCount} = <strong>{generateSlots(startTime, endTime).length * machineCount} {t('laundry_total_day')}</strong>
              </p>
              <p className="text-xs mt-1">
                {t('laundry_available_on')}: {laundryDays.length === 0 ? t('laundry_no_days_selected') : laundryDays.sort().map(d => DAYS[d]).join(', ')}
              </p>
            </div>
          )}

          <button onClick={saveSettings} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200">
            {saving ? t('saving') : t('laundry_save_settings')}
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, cls }) {
  return (
    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${cls}`}>{label}</span>
  );
}
