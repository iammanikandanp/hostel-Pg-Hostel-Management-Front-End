import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { WashingMachine, Calendar, CheckCircle, X, PackageCheck } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import Spinner from '../../components/Spinner';
import { useHstLangStore } from '../../store/hstLangStore';

function fmt12(time24) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function ResidentLaundry() {
  const { t } = useHstLangStore();
  const [slots,     setSlots]     = useState([]);   // { slotTime, machineNo, booked }
  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [booking,   setBooking]   = useState(false);
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [selected,  setSelected]  = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  const fetchSlots = (d) =>
    hstApi.get(`/laundry/available/${d}`)
      .then(r => {
        setSlots(r.data.available || []);
        setUnavailable(!!r.data.unavailableDay);
      })
      .catch(() => {});

  const fetchBookings = () =>
    hstApi.get('/laundry/my')
      .then(r => setBookings(r.data.bookings))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchSlots(date);
    fetchBookings();
  }, []);

  const handleDateChange = (d) => {
    setDate(d);
    setSelected(null);
    fetchSlots(d);
  };

  const book = async () => {
    if (!selected) return toast.error('Select a slot first');
    setBooking(true);
    try {
      await hstApi.post('/laundry', { date, slotTime: selected.slotTime, machineNo: selected.machineNo });
      toast.success(`Booked: Machine ${selected.machineNo} at ${fmt12(selected.slotTime)}`);
      setSelected(null);
      fetchSlots(date);
      fetchBookings();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setBooking(false); }
  };

  const cancel = async (id) => {
    try {
      await hstApi.patch(`/laundry/${id}/cancel`);
      toast.success('Booking cancelled');
      fetchBookings();
      fetchSlots(date);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const markDone = async (id) => {
    try {
      await hstApi.patch(`/laundry/${id}/done`);
      toast.success('Laundry marked as completed!');
      fetchBookings();
      fetchSlots(date);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <PageLoader />;

  const active    = bookings.filter(b => b.status === 'booked');
  const completed = bookings.filter(b => b.status === 'done');
  const cancelled = bookings.filter(b => b.status === 'cancelled');

  // Group slots by time, list machines across
  const slotTimes = [...new Set(slots.map(s => s.slotTime))].sort();
  const machines  = [...new Set(slots.map(s => s.machineNo))].sort((a, b) => a - b);

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('laundry_title')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t('laundry_subtitle')}</p>
      </div>

      {/* Date picker */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" /> {t('laundry_pick_date')}
        </h2>
        <input type="date" value={date}
          onChange={e => handleDateChange(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

        {unavailable && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
            ⚠️ {t('laundry_unavailable_day')}
          </div>
        )}

        {/* Slot grid */}
        {!unavailable && slots.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('laundry_legend')}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left pb-2 text-xs text-slate-400 font-semibold pr-4">Time</th>
                    {machines.map(m => (
                      <th key={m} className="pb-2 text-xs text-slate-400 font-semibold text-center px-2">
                        <WashingMachine size={12} className="inline mr-1" />M{m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {slotTimes.map(time => (
                    <tr key={time}>
                      <td className="pr-4 py-1.5 font-semibold text-slate-700 whitespace-nowrap text-sm">
                        {fmt12(time)}
                      </td>
                      {machines.map(m => {
                        const cell       = slots.find(s => s.slotTime === time && s.machineNo === m);
                        const isBooked   = cell?.booked;
                        const isPast     = cell?.past;
                        const isSelected = selected?.slotTime === time && selected?.machineNo === m;
                        const disabled   = isBooked || isPast;
                        return (
                          <td key={m} className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => !disabled && setSelected(isSelected ? null : { slotTime: time, machineNo: m })}
                              disabled={disabled}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                isPast
                                  ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                  : isBooked
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}>
                              {isPast ? t('past') : isBooked ? t('booked') : isSelected ? `✓ ${t('laundry_selected')}` : t('free')}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 flex items-center gap-2">
                <CheckCircle size={15} />
                {t('laundry_selected')}: <strong>{fmt12(selected.slotTime)}</strong> — {t('laundry_machine')} {selected.machineNo}
              </div>
            )}

            <button onClick={book} disabled={!selected || booking}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]">
              {booking
                ? <><Spinner size="sm" className="border-indigo-300 border-t-white" /> {t('laundry_booking')}</>
                : <><WashingMachine size={16} /> {t('laundry_book_slot')}</>}
            </button>
          </div>
        )}

        {!unavailable && slots.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-xl">
            No slots available for this date.
          </p>
        )}
      </div>

      {/* Active bookings */}
      {active.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            {t('laundry_active_bookings')}
            <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full normal-case">{active.length}</span>
          </h2>
          <div className="space-y-2">
            {active.map(b => (
              <div key={b._id} className="bg-white rounded-xl border border-indigo-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-600">
                  <WashingMachine size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">
                    {fmt12(b.slotTime)} — Machine {b.machineNo}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                </div>
                <button onClick={() => markDone(b._id)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all">
                  <PackageCheck size={13} /> {t('laundry_mark_done')}
                </button>
                <button onClick={() => cancel(b._id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && completed.length === 0 && cancelled.length === 0 && (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <WashingMachine size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">{t('laundry_no_bookings')}</p>
        </div>
      )}

      {/* Completed bookings */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('laundry_completed')}</h2>
          <div className="space-y-2">
            {completed.map(b => (
              <div key={b._id} className="bg-white rounded-xl border border-emerald-100 shadow-sm px-4 py-3.5 flex items-center gap-3 opacity-80">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <CheckCircle size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700 text-sm">
                    {fmt12(b.slotTime)} — Machine {b.machineNo}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{t('done').toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancelled bookings */}
      {cancelled.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('cancelled').toUpperCase()}</h2>
          <div className="space-y-2">
            {cancelled.map(b => (
              <div key={b._id} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3 opacity-60">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-400">
                  <X size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-500 text-sm line-through">
                    {fmt12(b.slotTime)} — Machine {b.machineNo}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-400 px-2.5 py-1 rounded-full">{t('cancelled').toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
