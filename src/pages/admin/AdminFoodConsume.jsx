import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Coffee, Sun, Moon, CheckCircle2, XCircle, QrCode, ClipboardList, Settings, AlertTriangle, Loader2, UserCheck, Printer, Smartphone } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import hstApi from '../../api/hstAxios';

// ── Constants ─────────────────────────────────────────────────────────────────

const MEALS = ['breakfast', 'lunch', 'dinner'];
const MEAL_META = {
  breakfast: { icon: Coffee, label: 'Breakfast', bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  active: 'bg-amber-600' },
  lunch:     { icon: Sun,    label: 'Lunch',     bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  active: 'bg-green-600' },
  dinner:    { icon: Moon,   label: 'Dinner',    bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', active: 'bg-indigo-600' },
};

const STATUS_META = {
  booked:   { label: 'Not yet',  chip: 'bg-slate-100 text-slate-600' },
  consumed: { label: 'Collected',chip: 'bg-emerald-100 text-emerald-700' },
  no_show:  { label: 'No show',  chip: 'bg-red-100 text-red-600' },
};

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── QR Scanner tab ────────────────────────────────────────────────────────────

function QRScanTab({ date, meal }) {
  const scannerRef = useRef(null);
  const instanceRef = useRef(null);
  const [result, setResult] = useState(null); // { success, booking, error }
  const [scanning, setScanning] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
    instanceRef.current = scanner;
    scanner.render(
      async (decodedText) => {
        scanner.clear().catch(() => {});
        setScanning(false);
        // decoded text = userId
        try {
          const r = await hstApi.patch('/food/qr-consume', { userId: decodedText, date, meal });
          setResult({ success: true, booking: r.data.booking });
          qc.invalidateQueries({ queryKey: ['consume-list', date, meal] });
          toast.success(`✓ ${r.data.booking?.userId?.name ?? 'Resident'} marked consumed`);
        } catch (err) {
          const msg = err.response?.data?.error ?? 'Scan failed';
          setResult({ success: false, error: msg });
          toast.error(msg);
        }
      },
      () => {} // ignore per-frame errors
    );
    return () => { scanner.clear().catch(() => {}); };
  }, [scanning, date, meal]);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-indigo-50 inline-block">
          <QrCode size={40} className="text-indigo-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">Scan Resident QR Code</p>
          <p className="text-sm text-slate-400 mt-0.5">Point camera at the resident's QR code in their app</p>
        </div>

        {!scanning ? (
          <button onClick={() => { setResult(null); setScanning(true); }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200">
            <QrCode size={16} /> Start Scanning
          </button>
        ) : (
          <button onClick={() => { instanceRef.current?.clear().catch(() => {}); setScanning(false); }}
            className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
            Stop
          </button>
        )}

        {scanning && <div id="qr-reader" ref={scannerRef} className="mt-4 mx-auto max-w-sm" />}

        {result && (
          <div className={`rounded-2xl border p-4 text-left ${result.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            {result.success ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800">{result.booking?.userId?.name}</p>
                  <p className="text-xs text-emerald-600">Room {result.booking?.userId?.roomNumber} · Marked as consumed</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <XCircle size={20} className="text-red-500 flex-shrink-0" />
                <p className="text-sm font-medium text-red-700">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Each scan marks one meal as consumed. Scan again for the next resident.
      </p>
    </div>
  );
}

// ── Staff Checklist tab ───────────────────────────────────────────────────────

function StaffChecklistTab({ date, meal }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState({}); // { bookingId: true }

  const { data, isLoading } = useQuery({
    queryKey: ['consume-list', date, meal],
    queryFn: () => hstApi.get(`/food/consume/${date}/${meal}`).then(r => r.data),
    refetchInterval: 15000,
  });

  const bookings = data?.bookings ?? [];
  const consumed = bookings.filter(b => b.status === 'consumed').length;
  const noShow   = bookings.filter(b => b.status === 'no_show').length;
  const pending  = bookings.filter(b => b.status === 'booked').length;

  async function markConsumed(id) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await hstApi.patch(`/food/${id}/consume`);
      qc.invalidateQueries({ queryKey: ['consume-list', date, meal] });
    } catch (err) { toast.error(err.response?.data?.error ?? 'Failed'); }
    finally { setBusy(b => ({ ...b, [id]: false })); }
  }

  async function markNoShow(id) {
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await hstApi.patch(`/food/${id}/no-show`);
      qc.invalidateQueries({ queryKey: ['consume-list', date, meal] });
    } catch (err) { toast.error(err.response?.data?.error ?? 'Failed'); }
    finally { setBusy(b => ({ ...b, [id]: false })); }
  }

  async function bulkNoShow() {
    if (!window.confirm(`Mark all ${pending} remaining as no-show?`)) return;
    try {
      const r = await hstApi.post('/food/bulk-no-show', { date, meal });
      toast.success(`${r.data.marked} marked as no-show`);
      qc.invalidateQueries({ queryKey: ['consume-list', date, meal] });
    } catch (err) { toast.error('Failed'); }
  }

  if (isLoading) return <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Consumed', val: consumed, color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
          { label: 'No Show',  val: noShow,   color: 'bg-red-50 border-red-100 text-red-600' },
          { label: 'Pending',  val: pending,  color: 'bg-slate-50 border-slate-200 text-slate-600' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.val}</p>
            <p className="text-xs font-semibold mt-0.5 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bulk no-show */}
      {pending > 0 && (
        <div className="flex justify-end">
          <button onClick={bulkNoShow}
            className="flex items-center gap-2 text-xs text-red-500 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors font-medium">
            <AlertTriangle size={13} /> Mark {pending} remaining as No-Show
          </button>
        </div>
      )}

      {/* Resident list */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center">
          <p className="text-sm text-slate-400">No bookings for this meal.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map(b => {
            const isBusy = busy[b._id];
            const chip = STATUS_META[b.status];
            return (
              <div key={b._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {b.userId?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{b.userId?.name}</p>
                  <p className="text-xs text-slate-400">{b.userId?.phone} {b.userId?.roomNumber ? `· Room ${b.userId.roomNumber}` : ''}</p>
                </div>
                {/* Status chip */}
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${chip.chip}`}>
                  {chip.label}
                </span>
                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {b.status === 'booked' && (
                    <>
                      <button onClick={() => markConsumed(b._id)} disabled={isBusy}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors disabled:opacity-50"
                        title="Mark consumed">
                        {isBusy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      </button>
                      <button onClick={() => markNoShow(b._id)} disabled={isBusy}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                        title="Mark no-show">
                        <XCircle size={15} />
                      </button>
                    </>
                  )}
                  {b.status === 'consumed' && (
                    <button onClick={() => markNoShow(b._id)} disabled={isBusy}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 text-xs transition-colors"
                      title="Undo — mark no-show">
                      undo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [mode, setMode]       = useState(null);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    hstApi.get('/food/tracking-mode').then(r => setMode(r.data.mode)).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      await hstApi.patch('/food/tracking-mode', { mode });
      toast.success('Tracking mode saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  const OPTIONS = [
    {
      key: 'staff',
      icon: ClipboardList,
      title: 'Staff Checklist',
      desc: 'Staff manually ticks each resident off a list when they collect food.',
    },
    {
      key: 'qr',
      icon: QrCode,
      title: 'QR Code Scan',
      desc: 'Staff scans the resident\'s QR code using a phone or tablet at the counter.',
    },
    {
      key: 'self',
      icon: UserCheck,
      title: 'Resident Self-Confirm',
      desc: 'Resident taps "I collected my food" in their app within 2 hours of meal time.',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Choose how food collection is tracked for this hostel. This affects which options are shown to staff and residents.</p>
      <div className="space-y-3">
        {OPTIONS.map(opt => {
          const Icon = opt.icon;
          const selected = mode === opt.key;
          return (
            <button key={opt.key} onClick={() => setMode(opt.key)}
              className={`w-full text-left rounded-2xl border p-4 flex items-start gap-4 transition-all
                ${selected ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className={`font-semibold text-sm ${selected ? 'text-indigo-800' : 'text-slate-800'}`}>{opt.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      <button onClick={save} disabled={saving || !mode}
        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        {saving ? 'Saving…' : 'Save Setting'}
      </button>
    </div>
  );
}

// ── Fixed QR Poster Tab ───────────────────────────────────────────────────────

function FixedQRTab() {
  const checkinUrl = `${window.location.origin}/meal-checkin`;

  function printPoster() {
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Meal Check-in QR</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center;
                 justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
          .poster { text-align: center; padding: 40px; border: 3px solid #4f46e5;
                    border-radius: 24px; max-width: 380px; margin: auto; }
          h1 { font-size: 28px; font-weight: 900; color: #1e1b4b; margin: 0 0 4px; }
          p  { color: #6b7280; font-size: 14px; margin: 6px 0 24px; }
          img { width: 220px; height: 220px; }
          .steps { text-align: left; background: #f0f9ff; border-radius: 12px;
                   padding: 16px 20px; margin-top: 20px; }
          .steps li { font-size: 13px; color: #374151; margin: 6px 0; line-height: 1.5; }
          .url { font-size: 11px; color: #9ca3af; margin-top: 16px; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="poster">
          <h1>🍽️ Meal Check-in</h1>
          <p>Scan to confirm you collected your food</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(checkinUrl)}" />
          <div class="steps">
            <ol>
              <li>Scan QR with your phone camera</li>
              <li>Login if prompted</li>
              <li>Tap <strong>"I collected my meal"</strong></li>
            </ol>
          </div>
          <p class="url">${checkinUrl}</p>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-800">Fixed Mess QR Code</h3>
            <p className="text-sm text-slate-400 mt-0.5">Print and stick this QR in the mess room. Residents scan it to confirm meal collection.</p>
          </div>
          <button onClick={printPoster}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 flex-shrink-0">
            <Printer size={15} /> Print Poster
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-5 bg-white border-2 border-indigo-200 rounded-3xl shadow-inner">
            <QRCodeSVG value={checkinUrl} size={200} level="M" />
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 font-mono break-all max-w-xs">{checkinUrl}</p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Smartphone size={13} /> How residents use it
          </p>
          <ol className="space-y-2">
            {[
              'Resident scans this QR with their phone camera',
              'Phone opens the check-in page (login if not already)',
              'Page shows their booked meals within ±1 hour of meal time',
              'Resident taps "I collected my Breakfast / Lunch / Dinner"',
              'Booking is marked as consumed in the system',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-indigo-800">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Meal serve times */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { meal: 'breakfast', icon: Coffee, time: '6 AM – 9 AM',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100' },
            { meal: 'lunch',     icon: Sun,    time: '11 AM – 2 PM', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100' },
            { meal: 'dinner',    icon: Moon,   time: '6 PM – 8 PM',  bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
          ].map(({ meal, icon: Icon, time, bg, text, border }) => (
            <div key={meal} className={`rounded-xl border p-3 text-center ${bg} ${border}`}>
              <Icon size={14} className={`mx-auto mb-1 ${text}`} />
              <p className={`text-[10px] font-bold uppercase tracking-wide ${text}`}>{meal}</p>
              <p className={`text-[10px] mt-0.5 ${text} opacity-70`}>{time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminFoodConsume() {
  const today = localDateStr();
  const [date, setDate] = useState(today);
  const [meal, setMeal] = useState(() => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 15) return 'lunch';
    return 'dinner';
  });
  const [tab, setTab] = useState('fixedqr'); // 'fixedqr' | 'staff' | 'qr' | 'settings'

  const TABS = [
    { key: 'fixedqr',  label: 'Mess QR',   icon: QrCode },
    { key: 'staff',    label: 'Checklist', icon: ClipboardList },
    { key: 'qr',       label: 'Scan QR',   icon: Smartphone },
    { key: 'settings', label: 'Settings',  icon: Settings },
  ];

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Food Consumption</h1>
        <p className="text-slate-500 text-sm mt-0.5">Track which residents actually collected their meal</p>
      </div>

      {/* Date + Meal selector — only for staff checklist and QR scan tabs */}
      {(tab === 'staff' || tab === 'qr') && (
        <div className="flex flex-wrap gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          <div className="flex gap-2">
            {MEALS.map(m => {
              const meta = MEAL_META[m];
              const Icon = meta.icon;
              const active = meal === m;
              return (
                <button key={m} onClick={() => setMeal(m)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                    ${active ? `${meta.active} text-white border-transparent shadow-lg` : `${meta.bg} ${meta.border} ${meta.text} hover:opacity-80`}`}>
                  <Icon size={14} /> {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'fixedqr'  && <FixedQRTab />}
      {tab === 'staff'    && <StaffChecklistTab date={date} meal={meal} />}
      {tab === 'qr'       && <QRScanTab date={date} meal={meal} />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
