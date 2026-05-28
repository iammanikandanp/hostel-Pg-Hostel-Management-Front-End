import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, RefreshCw, CheckCircle, Settings, ChevronDown, ChevronUp, Zap, Save, Gauge, AlertTriangle, Bell, X } from 'lucide-react';

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import Spinner from '../../components/Spinner';
import { useHstLangStore } from '../../store/hstLangStore';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Keeps input empty when cleared instead of jumping to 0
const NumInput = ({ label, prefix, suffix, value, onChange, min, max, step, placeholder, className = '' }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>}
    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
      {prefix && <span className="px-3 py-2.5 bg-slate-50 text-slate-500 text-sm border-r border-slate-200 whitespace-nowrap">{prefix}</span>}
      <input
        type="number" value={value} onChange={onChange}
        min={min} max={max} step={step} placeholder={placeholder}
        className="flex-1 px-3 py-2.5 text-sm focus:outline-none min-w-0"
      />
      {suffix && <span className="px-3 py-2.5 bg-slate-50 text-slate-400 text-xs border-l border-slate-200 whitespace-nowrap">{suffix}</span>}
    </div>
  </div>
);

export default function AdminBilling() {
  const { t } = useHstLangStore();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMeter, setShowMeter] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [reminderType, setReminderType] = useState('auto');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Settings form — stored as strings so empty field stays empty (not 0)
  const [form, setForm] = useState({
    rentPerRoom: '5000',
    electricityRate: '8',
    breakfast: '50',
    lunch: '80',
    dinner: '70',
    dueDateDay: '10',
  });
  const [previewUnits, setPreviewUnits] = useState('');

  // Meter readings
  const [rooms, setRooms] = useState([]);
  const [meterInputs, setMeterInputs] = useState({});   // roomId → string
  const [savingMeter, setSavingMeter] = useState({});    // roomId → bool
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [confirmMeter, setConfirmMeter] = useState(null); // { room, newVal } pending confirmation
  const [waModal, setWaModal] = useState(null);           // { bill } — single reminder modal
  const [waType, setWaType] = useState('pre-3');
  const [waSending, setWaSending] = useState(false);
  const [payModal, setPayModal] = useState(null);         // { bill } — mark paid modal
  const [payComponents, setPayComponents] = useState({ rent: true, electricity: true, food: true });
  const [paying, setPaying] = useState(false);

  const fetchBills = () => {
    const params = {};
    if (filterMonth) params.month = filterMonth;
    if (filterYear) params.year = filterYear;
    hstApi.get('/billing/all', { params })
      .then(r => setBills(r.data.bills))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBills();
    hstApi.get('/billing/settings').then(r => {
      const s = r.data.settings;
      setSettings(s);
      setForm({
        rentPerRoom:     String(s.rentPerRoom     ?? 5000),
        electricityRate: String(s.electricityRate ?? 8),
        breakfast:       String(s.foodPrices?.breakfast ?? 50),
        lunch:           String(s.foodPrices?.lunch     ?? 80),
        dinner:          String(s.foodPrices?.dinner    ?? 70),
        dueDateDay:      String(s.dueDateDay ?? 10),
      });
    }).catch(() => {});
  }, []);

  const loadRooms = () => {
    if (roomsLoaded) return;
    hstApi.get('/rooms').then(r => {
      const list = r.data.rooms;
      setRooms(list);
      const init = {};
      list.forEach(rm => { init[rm._id] = String(rm.currentMeterReading ?? 0); });
      setMeterInputs(init);
      setRoomsLoaded(true);
    }).catch(() => toast.error('Failed to load rooms'));
  };

  useEffect(() => {
    if (showMeter) loadRooms();
  }, [showMeter]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload = {
        rentPerRoom:     Number(form.rentPerRoom)     || 0,
        electricityRate: Number(form.electricityRate) || 0,
        foodPrices: {
          breakfast: Number(form.breakfast) || 0,
          lunch:     Number(form.lunch)     || 0,
          dinner:    Number(form.dinner)    || 0,
        },
        dueDateDay: Number(form.dueDateDay) || 10,
      };
      const r = await hstApi.patch('/billing/settings', payload);
      setSettings(r.data.settings);
      setShowSettings(false);
      toast.success('Settings saved');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSavingSettings(false); }
  };

  const requestMeterUpdate = (room) => {
    const newVal = Number(meterInputs[room._id]);
    if (isNaN(newVal) || meterInputs[room._id] === '') return toast.error('Enter a valid reading');
    setConfirmMeter({ room, newVal });
  };

  const confirmAndSaveMeter = async () => {
    const { room, newVal } = confirmMeter;
    const roomId = room._id;
    setConfirmMeter(null);
    setSavingMeter(s => ({ ...s, [roomId]: true }));
    try {
      await hstApi.patch('/rooms/meter-reading', { roomId, currentReading: newVal });
      setRooms(prev => prev.map(r =>
        r._id === roomId
          ? { ...r, lastMeterReading: r.currentMeterReading, currentMeterReading: newVal }
          : r
      ));
      toast.success('Meter reading updated');

      // Recalculate existing unpaid bills for this room in current month
      const now = new Date();
      const recalcRes = await hstApi.post('/billing/recalculate-room', {
        roomId,
        month: now.getMonth() + 1,
        year:  now.getFullYear(),
      });
      if (recalcRes.data.updated > 0) {
        toast.success(recalcRes.data.message);
        fetchBills();
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSavingMeter(s => ({ ...s, [roomId]: false })); }
  };

  const generateBills = async () => {
    setGenerating(true);
    try {
      const r = await hstApi.post('/billing/generate');
      toast.success(`Generated ${r.data.results.filter(x => x.status === 'generated').length} bills`);
      fetchBills();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setGenerating(false); }
  };

  const sendReminders = async () => {
    setSendingReminder(true);
    try {
      const r = await hstApi.post('/billing/send-reminders', { type: reminderType });
      if (r.data.sent > 0) {
        toast.success(`${r.data.message} via WhatsApp`);
      } else {
        toast(r.data.message, { icon: 'ℹ️' });
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send'); }
    finally { setSendingReminder(false); }
  };

  const sendSingleReminder = async () => {
    setWaSending(true);
    try {
      const r = await hstApi.post('/billing/send-reminder-single', { billId: waModal._id, type: waType });
      toast.success(r.data.message);
      setWaModal(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send'); }
    finally { setWaSending(false); }
  };

  const openPayModal = (bill) => {
    // Pre-select only unpaid components that exist on this bill
    const prev = bill.paidComponents ?? { rent: false, electricity: false, food: false };
    setPayComponents({
      rent:        !prev.rent        && bill.rent             > 0,
      electricity: !prev.electricity && bill.electricityShare > 0,
      food:        !prev.food        && bill.foodTotal        > 0,
    });
    setPayModal(bill);
  };

  const confirmMarkPaid = async () => {
    if (!payModal) return;
    const noneSelected = !payComponents.rent && !payComponents.electricity && !payComponents.food;
    if (noneSelected) { toast.error('Select at least one component'); return; }
    setPaying(true);
    try {
      await hstApi.patch(`/billing/${payModal._id}/paid`, { components: payComponents });
      toast.success('Payment recorded & WhatsApp sent');
      setPayModal(null);
      fetchBills();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setPaying(false); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const ebRate = Number(form.electricityRate) || 0;
  const previewAmount = previewUnits !== '' ? Math.ceil(Number(previewUnits) * ebRate) : null;

  if (loading) return <PageLoader />;

  const paidCount   = bills.filter(b => b.isPaid).length;
  const unpaidCount = bills.length - paidCount;

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('billing_title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {paidCount} {t('billing_paid').toLowerCase()} &bull; <span className="text-red-500 font-medium">{unpaidCount} {t('billing_unpaid').toLowerCase()}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setShowSettings(s => !s); setShowMeter(false); setShowReminders(false); }}
            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
            <Settings size={15} />
            Rate Settings
            {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => { setShowMeter(s => !s); setShowSettings(false); setShowReminders(false); }}
            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
            <Gauge size={15} />
            Meter Readings
            {showMeter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => { setShowReminders(s => !s); setShowSettings(false); setShowMeter(false); }}
            className="flex items-center gap-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
            <Bell size={15} />
            Send Reminders
            {showReminders ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={generateBills} disabled={generating}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-200 active:scale-[0.97]">
            {generating
              ? <><Spinner size="sm" className="border-emerald-200 border-t-white" /> {t('loading')}</>
              : <><RefreshCw size={15} /> {t('billing_generate')}</>}
          </button>
        </div>
      </div>

      {/* ── Rate Settings Panel ── */}
      {showSettings && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-700">Rate & Due Date Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">These rates apply to all residents when bills are generated</p>
          </div>

          <div className="p-5 space-y-6">

            {/* Rent */}
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Rent</h3>
              <div className="max-w-xs">
                <NumInput
                  label="Rent per Resident (monthly)"
                  prefix="₹"
                  value={form.rentPerRoom}
                  onChange={e => set('rentPerRoom', e.target.value)}
                  min="0"
                />
                <p className="text-xs text-slate-400 mt-1.5">Each resident is charged this amount individually</p>
              </div>
            </section>

            {/* Electricity */}
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Electricity</h3>
              <p className="text-xs text-slate-400 mb-3">
                Rate is same for all rooms. Each room has its own meter — units are read from meter readings.
                Electricity cost is split equally among room occupants.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <NumInput
                  label="Rate per Unit"
                  prefix="₹"
                  suffix="per unit"
                  value={form.electricityRate}
                  step="0.5"
                  min="0"
                  onChange={e => set('electricityRate', e.target.value)}
                />

                {/* Live calculator */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Zap size={12} className="text-yellow-500" /> Unit Preview Calculator
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-yellow-400 bg-white flex-1">
                      <input
                        type="number" min="0" placeholder="Enter units"
                        value={previewUnits}
                        onChange={e => setPreviewUnits(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                      />
                      <span className="px-3 py-2.5 bg-slate-50 text-slate-400 text-xs border-l border-slate-200">units</span>
                    </div>
                    {previewAmount !== null && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 text-sm font-bold text-yellow-700 whitespace-nowrap">
                        = ₹{previewAmount}
                      </div>
                    )}
                  </div>
                  {previewAmount !== null && (
                    <p className="text-xs text-slate-400">
                      {previewUnits} units × ₹{ebRate}/unit = ₹{previewAmount}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Food */}
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Food Menu Rates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
                <NumInput label="Breakfast" prefix="₹" value={form.breakfast} min="0"
                  onChange={e => set('breakfast', e.target.value)} />
                <NumInput label="Lunch"     prefix="₹" value={form.lunch}     min="0"
                  onChange={e => set('lunch', e.target.value)} />
                <NumInput label="Dinner"    prefix="₹" value={form.dinner}    min="0"
                  onChange={e => set('dinner', e.target.value)} />
              </div>
            </section>

            {/* Due Date */}
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Bill Due Date</h3>
              <div className="max-w-xs">
                <NumInput label="Due on day of month" value={form.dueDateDay} min="1" max="31"
                  onChange={e => set('dueDateDay', e.target.value)} />
                <p className="text-xs text-slate-400 mt-1.5">
                  WhatsApp message will say "Due by {form.dueDateDay || '?'} {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}"
                </p>
              </div>
            </section>

            <div className="pt-2 border-t border-slate-100">
              <button onClick={saveSettings} disabled={savingSettings}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-100 active:scale-[0.97]">
                {savingSettings
                  ? <><Spinner size="sm" className="border-indigo-200 border-t-white" /> Saving…</>
                  : <><Save size={14} /> Save Settings</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Meter Readings Panel ── */}
      {showMeter && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-700">Room Meter Readings</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter the latest meter reading for each room before generating bills.
              Each room has a separate meter — the rate (₹{ebRate}/unit) is the same for all.
            </p>
          </div>

          <div className="p-5">
            {rooms.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No active rooms found.</p>
            ) : (
              <div className="space-y-3">
                {rooms.map(rm => {
                  const inputVal  = meterInputs[rm._id] ?? '';
                  const newRead   = Number(inputVal);
                  const curRead   = rm.currentMeterReading ?? 0;
                  const lastRead  = rm.lastMeterReading ?? 0;
                  // units that will be billed = new reading − current (which becomes last after save)
                  const units     = inputVal !== '' && newRead > curRead ? newRead - curRead : 0;
                  const roomCost  = Math.ceil(units * ebRate);
                  const occupants = rm.members?.length || 1;
                  const perPerson = Math.ceil(roomCost / occupants);
                  const isChanged = inputVal !== '' && newRead !== curRead;

                  return (
                    <div key={rm._id}
                      className="border border-slate-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-start">

                      {/* Room info */}
                      <div className="sm:w-36">
                        <p className="font-bold text-slate-800 text-base">Room {rm.roomNumber}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Floor {rm.floor}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {occupants} resident{occupants !== 1 ? 's' : ''}
                        </p>
                        <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                          <p>Last saved: <span className="text-slate-600 font-medium">{lastRead}</span></p>
                          <p>Current:    <span className="text-slate-600 font-medium">{curRead}</span></p>
                        </div>
                      </div>

                      {/* Reading input + calc */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-wrap">
                        <div className="flex flex-col gap-1 w-52">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            New Meter Reading
                          </label>
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
                            <input
                              type="number" min={0} placeholder={`current: ${curRead}`}
                              value={inputVal}
                              onChange={e => setMeterInputs(s => ({ ...s, [rm._id]: e.target.value }))}
                              className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                            />
                          </div>
                          {inputVal !== '' && newRead < curRead && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                              <AlertTriangle size={11} /> Lower than current — correction mode
                            </p>
                          )}
                        </div>

                        {/* Live calc */}
                        {inputVal !== '' && (
                          <div className="flex gap-3 flex-wrap text-sm">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
                              <p className="text-xs text-slate-400">Units</p>
                              <p className="font-bold text-slate-700">{units}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
                              <p className="text-xs text-slate-400">Room Total</p>
                              <p className="font-bold text-slate-700">₹{roomCost}</p>
                            </div>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-center">
                              <p className="text-xs text-indigo-400">Per Person</p>
                              <p className="font-bold text-indigo-700">₹{perPerson}</p>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => requestMeterUpdate(rm)}
                          disabled={!isChanged || savingMeter[rm._id]}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
                          {savingMeter[rm._id]
                            ? <><Spinner size="sm" className="border-emerald-200 border-t-white" /> Saving…</>
                            : <><Save size={13} /> Update</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Send Reminders Panel ── */}
      {showReminders && (
        <div className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50">
            <h2 className="text-sm font-bold text-amber-800">Send WhatsApp Reminders</h2>
            <p className="text-xs text-amber-600 mt-0.5">
              Sends a WhatsApp message to all <strong>unpaid</strong> residents for the current month.
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* Reminder type cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  value: 'pre-3',
                  label: '3-Day Reminder',
                  desc: 'Bill due in 3 days — gentle heads-up with full breakdown',
                  icon: '🔔',
                  color: 'indigo',
                },
                {
                  value: 'pre-2',
                  label: '2-Day Final Reminder',
                  desc: 'Bill due in 2 days — urgent nudge before due date',
                  icon: '⚠️',
                  color: 'amber',
                },
                {
                  value: 'overdue',
                  label: 'Overdue Alert',
                  desc: 'Due date passed — pay immediately message',
                  icon: '🚨',
                  color: 'red',
                },
                {
                  value: 'last-warning',
                  label: 'Last Warning',
                  desc: '7 days overdue — final warning, contact admin',
                  icon: '🚨',
                  color: 'red',
                },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setReminderType(opt.value)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    reminderType === opt.value
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{opt.icon}</span>
                    <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                    {reminderType === opt.value && (
                      <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Message preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Message Preview</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {reminderType === 'pre-3' && `Hi [Name]! 🔔 Bill Reminder – Room [Room]\n\nYour hostel bill for [Month Year] is due in 3 days (by ${settings?.dueDateDay ?? 10}th).\n\nRent        : ₹[rent]\nElectricity : ₹[eb]\nFood        : ₹[food]\n────────────────────\nTotal       : ₹[total]\nPay here: [link]`}
                {reminderType === 'pre-2' && `Hi [Name]! ⚠️ Final Reminder – Room [Room]\n\nYour hostel bill of ₹[total] for [Month Year] is due in 2 days (by ${settings?.dueDateDay ?? 10}th).\nPlease pay soon to avoid a late charge.\nPay here: [link]`}
                {reminderType === 'overdue' && `Hi [Name]! 🚨 Bill Overdue – Room [Room]\n\nYour hostel bill of ₹[total] for [Month Year] is now overdue.\nPlease pay immediately.\nPay here: [link]`}
                {reminderType === 'last-warning' && `Hi [Name]! 🚨 LAST WARNING – Room [Room]\n\nYour bill of ₹[total] for [Month Year] is 7 days overdue.\nPlease contact the admin immediately.\nPay here: [link]`}
              </pre>
            </div>

            <button onClick={sendReminders} disabled={sendingReminder}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-amber-100 active:scale-[0.97]">
              {sendingReminder
                ? <><Spinner size="sm" className="border-amber-200 border-t-white" /> Sending…</>
                : <><Bell size={14} /> Send to All Unpaid Residents</>}
            </button>
          </div>
        </div>
      )}

      {/* Active rates summary bar */}
      {settings && !showSettings && !showMeter && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-wrap gap-x-6 gap-y-1">
          {[
            `Rent/resident: ₹${settings.rentPerRoom}`,
            `EB rate: ₹${settings.electricityRate}/unit`,
            `Breakfast: ₹${settings.foodPrices?.breakfast}`,
            `Lunch: ₹${settings.foodPrices?.lunch}`,
            `Dinner: ₹${settings.foodPrices?.dinner}`,
            `Due: ${settings.dueDateDay}th of month`,
          ].map(t => (
            <span key={t} className="text-sm text-indigo-700 font-medium">{t}</span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Months</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" value={filterYear} onChange={e => setFilterYear(e.target.value)}
          placeholder="Year" className="w-24 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={fetchBills}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
          {t('search')}
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {[t('name'), t('billing_month'), t('billing_components'), t('billing_total'), t('status'), t('actions')].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bills.map(b => (
              <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4 font-medium text-slate-800">{b.userId?.name}</td>
                <td className="px-5 py-4 text-slate-500">{MONTHS[(b.month ?? 1) - 1]} {b.year}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {b.rent > 0 && (
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                        Rent ₹{b.rent}
                      </span>
                    )}
                    {b.electricityShare > 0 && (
                      <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded-full font-medium">
                        EB ₹{b.electricityShare}
                      </span>
                    )}
                    {b.foodTotal > 0 && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                        Food ₹{b.foodTotal}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 font-bold text-slate-800">₹{b.total}</td>
                <td className="px-5 py-4">
                  {(() => {
                    const pc = b.paidComponents;
                    const isPartial = !b.isPaid && pc && (pc.rent || pc.electricity || pc.food);
                    if (b.isPaid)    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{t('billing_paid')}</span>;
                    if (isPartial)   return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{t('billing_partial')} ₹{b.paidAmount}</span>;
                    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">{t('billing_unpaid')}</span>;
                  })()}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {!b.isPaid && (() => {
                      const pc = b.paidComponents;
                      const isPartial = pc && (pc.rent || pc.electricity || pc.food);
                      return (
                        <button onClick={() => openPayModal(b)}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-semibold transition-colors">
                          <CheckCircle size={13} /> {isPartial ? t('billing_add_payment') : t('billing_mark_paid')}
                        </button>
                      );
                    })()}
                    {b.paymentLink && (
                      <a href={b.paymentLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-semibold">
                        <FileText size={13} /> Pay Link
                      </a>
                    )}
                    {!b.isPaid && (
                      <button onClick={() => { setWaModal(b); setWaType('pre-3'); }}
                        title="Send WhatsApp reminder"
                        className="h-7 w-7 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors">
                        <WhatsAppIcon size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bills.length === 0 && (
          <div className="text-center py-12 text-slate-400"><p>{t('billing_no_bills')}</p></div>
        )}
      </div>

      {/* ── Meter Update Confirmation Dialog ── */}
      {confirmMeter && (() => {
        const { room, newVal } = confirmMeter;
        const oldVal  = room.currentMeterReading ?? 0;
        const units   = newVal - oldVal;
        const isCorrection = newVal < oldVal;
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmMeter(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6"
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center gap-3 mb-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCorrection ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <AlertTriangle size={20} className={isCorrection ? 'text-amber-600' : 'text-emerald-600'} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Confirm Meter Update</h3>
                  <p className="text-xs text-slate-400">Room {room.roomNumber} · Floor {room.floor}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Previous reading</span>
                  <span className="font-semibold text-slate-700">{oldVal} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">New reading</span>
                  <span className={`font-semibold ${isCorrection ? 'text-amber-700' : 'text-emerald-700'}`}>{newVal} units</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-slate-500">Difference</span>
                  <span className={`font-bold ${isCorrection ? 'text-amber-700' : 'text-slate-800'}`}>
                    {units > 0 ? `+${units}` : units} units
                  </span>
                </div>
              </div>

              {isCorrection && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-700">
                  This reading is lower than the current value — treated as a <strong>correction</strong>.
                </div>
              )}

              <p className="text-xs text-slate-500 mb-5">
                Existing <strong>unpaid</strong> bills for this room in the current month will be recalculated automatically.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setConfirmMeter(null)}
                  className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  {t('cancel')}
                </button>
                <button onClick={confirmAndSaveMeter}
                  className={`flex-1 h-10 text-white rounded-xl text-sm font-semibold transition-all ${isCorrection ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {t('yes')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {bills.map(b => (
          <div key={b._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-slate-800">{b.userId?.name}</p>
                <p className="text-xs text-slate-400">{MONTHS[(b.month ?? 1) - 1]} {b.year}</p>
              </div>
              {(() => {
                const pc = b.paidComponents;
                const isPartial = !b.isPaid && pc && (pc.rent || pc.electricity || pc.food);
                if (b.isPaid)  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{t('billing_paid')}</span>;
                if (isPartial) return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{t('billing_partial')} ₹{b.paidAmount}</span>;
                return <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">{t('billing_unpaid')}</span>;
              })()}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {b.rent > 0 && (
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs px-2 py-0.5 rounded-full font-medium">
                  Rent ₹{b.rent}
                </span>
              )}
              {b.electricityShare > 0 && (
                <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 text-xs px-2 py-0.5 rounded-full font-medium">
                  EB ₹{b.electricityShare}
                </span>
              )}
              {b.foodTotal > 0 && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs px-2 py-0.5 rounded-full font-medium">
                  Food ₹{b.foodTotal}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-sm mb-3">
              <span className="font-semibold text-slate-700">Total</span><span className="font-bold text-slate-800">₹{b.total}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!b.isPaid && (() => {
                const pc = b.paidComponents;
                const isPartial = pc && (pc.rent || pc.electricity || pc.food);
                return (
                  <button onClick={() => openPayModal(b)}
                    className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                    <CheckCircle size={12} /> {isPartial ? t('billing_add_payment') : t('billing_mark_paid')}
                  </button>
                );
              })()}
              {b.paymentLink && (
                <a href={b.paymentLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <FileText size={12} /> Pay Link
                </a>
              )}
              {!b.isPaid && (
                <button onClick={() => { setWaModal(b); setWaType('pre-3'); }}
                  title="Send WhatsApp reminder"
                  className="flex items-center gap-1 bg-green-50 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                  <WhatsAppIcon size={12} /> WhatsApp
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Mark Paid Modal ── */}
      {payModal && (() => {
        const pc = payModal.paidComponents ?? { rent: false, electricity: false, food: false };
        const items = [
          { key: 'rent',        label: 'Rent',            amount: payModal.rent,             alreadyPaid: pc.rent        },
          { key: 'electricity', label: 'Electricity (EB)', amount: payModal.electricityShare, alreadyPaid: pc.electricity },
          { key: 'food',        label: 'Food',             amount: payModal.foodTotal,         alreadyPaid: pc.food        },
        ].filter(i => i.amount > 0);

        const payingTotal = items.reduce((sum, i) => {
          if (i.alreadyPaid) return sum;
          return sum + (payComponents[i.key] ? i.amount : 0);
        }, 0);

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPayModal(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <CheckCircle size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{payModal.userId?.name}</p>
                    <p className="text-xs text-slate-400">
                      Room {payModal.roomId?.roomNumber ?? '?'} · {MONTHS[(payModal.month ?? 1) - 1]} {payModal.year}
                    </p>
                  </div>
                </div>
                <button onClick={() => setPayModal(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('billing_select_components')}</p>

                <div className="space-y-2">
                  {items.map(({ key, label, amount, alreadyPaid }) => (
                    <button key={key} type="button"
                      disabled={alreadyPaid}
                      onClick={() => !alreadyPaid && setPayComponents(p => ({ ...p, [key]: !p[key] }))}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                        alreadyPaid
                          ? 'border-emerald-100 bg-emerald-50 opacity-60 cursor-not-allowed'
                          : payComponents[key]
                            ? 'border-indigo-400 bg-indigo-50'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          alreadyPaid ? 'border-emerald-400 bg-emerald-400' :
                          payComponents[key] ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                        }`}>
                          {(alreadyPaid || payComponents[key]) && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${alreadyPaid ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {label}
                        </span>
                        {alreadyPaid && <span className="text-xs text-emerald-600 font-medium">{t('billing_paid')}</span>}
                      </div>
                      <span className={`text-sm font-bold ${alreadyPaid ? 'text-emerald-600' : 'text-slate-700'}`}>
                        ₹{amount}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Amount summary */}
                <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500 font-medium">{t('billing_collecting_now')}</span>
                  <span className="text-lg font-bold text-indigo-700">₹{payingTotal}</span>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setPayModal(null)}
                    className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                    {t('cancel')}
                  </button>
                  <button onClick={confirmMarkPaid} disabled={paying || payingTotal === 0}
                    className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                    {paying
                      ? <><Spinner size="sm" className="border-indigo-200 border-t-white" /> {t('saving')}</>
                      : <><CheckCircle size={14} /> {t('billing_mark_paid')} ₹{payingTotal}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Single WhatsApp Reminder Modal ── */}
      {waModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setWaModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
                  <WhatsAppIcon size={18} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{waModal.userId?.name}</p>
                  <p className="text-xs text-slate-400">
                    Room {waModal.roomId?.roomNumber ?? '?'} · ₹{waModal.total} · {MONTHS[(waModal.month ?? 1) - 1]} {waModal.year}
                  </p>
                </div>
              </div>
              <button onClick={() => setWaModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Reminder type selector */}
            <div className="p-5 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Select Reminder Type</p>
              <div className="space-y-2">
                {[
                  { value: 'pre-3',        icon: '🔔', label: '3-Day Reminder',   desc: 'Due in 3 days — full bill breakdown' },
                  { value: 'pre-2',        icon: '⚠️', label: '2-Day Reminder',   desc: 'Due in 2 days — urgent nudge' },
                  { value: 'overdue',      icon: '🚨', label: 'Overdue Alert',    desc: 'Bill is past due — pay immediately' },
                  { value: 'last-warning', icon: '🚨', label: 'Last Warning',     desc: '7 days overdue — final warning' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setWaType(opt.value)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      waType === opt.value
                        ? 'border-green-400 bg-green-50'
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}>
                    <span className="text-base flex-shrink-0">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                      <p className="text-xs text-slate-400 truncate">{opt.desc}</p>
                    </div>
                    {waType === opt.value && (
                      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setWaModal(null)}
                  className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  {t('cancel')}
                </button>
                <button onClick={sendSingleReminder} disabled={waSending}
                  className="flex-1 h-10 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                  {waSending
                    ? <><Spinner size="sm" className="border-green-200 border-t-white" /> {t('loading')}</>
                    : <><WhatsAppIcon size={14} /> {t('submit')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
