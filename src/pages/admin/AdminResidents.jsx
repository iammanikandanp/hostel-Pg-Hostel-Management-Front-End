import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, X, UserX, UserCheck, Camera, Upload, User, Phone, Mail, Home, Calendar, Pencil, ArrowRight } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import Spinner from '../../components/Spinner';
import { useHstLangStore } from '../../store/hstLangStore';

// ─── Avatar palette (same as AdminRooms) ────────────────────────────────────
const PALETTE = [
  ['#e6f1fb','#185FA5'],['#e1f5ee','#0F6E56'],['#faeeda','#854F0B'],
  ['#eeedfe','#534AB7'],['#faece7','#993C1D'],['#eaf3de','#3B6D11'],
  ['#fbeaf0','#993556'],['#fcebeb','#A32D2D'],
];
function avatarPalette(str = '') {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % PALETTE.length;
  return PALETTE[h];
}

// ─── Profile View Modal ──────────────────────────────────────────────────────
function ResidentRoomHistory({ residentId }) {
  const { data } = useQuery({
    queryKey: ['room-history-admin', residentId],
    queryFn: () => hstApi.get(`/residents/${residentId}/room-history`).then(r => r.data),
  });
  const history = data?.roomHistory ?? [];
  if (!history.length) return null;
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
        <ArrowRight size={10} /> Room History
      </p>
      {[...history].reverse().map((h, i) => (
        <div key={i} className="flex justify-between text-xs text-slate-600">
          <span className="font-medium">Room {h.roomNumber} · Floor {h.floor}</span>
          <span className="text-slate-400">{new Date(h.fromDate).toLocaleDateString('en-IN')} – {new Date(h.toDate).toLocaleDateString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileModal({ resident, onClose }) {
  const name = resident.name ?? '';
  const letter = name.trim()[0]?.toUpperCase() ?? '?';
  const [bg, fg] = avatarPalette(name);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 grid place-items-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Photo / Letter avatar header */}
        <div className="relative h-32 flex items-center justify-center"
          style={{ background: resident.profilePhotoUrl ? '#000' : bg }}>
          {resident.profilePhotoUrl
            ? <img src={resident.profilePhotoUrl} alt={name}
                className="h-full w-full object-cover opacity-90" />
            : <span className="text-6xl font-bold select-none" style={{ color: fg }}>{letter}</span>}
          <button onClick={onClose}
            className="absolute top-3 right-3 h-7 w-7 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{name}</h2>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1
              ${resident.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {resident.isActive ? <><UserCheck size={10} /> Active</> : 'Archived'}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <Row icon={<Mail size={13} />} label={resident.email} />
            <Row icon={<Phone size={13} />} label={resident.phone} />
            {resident.roomId && (
              <Row icon={<Home size={13} />} label={`Room ${resident.roomId.roomNumber ?? resident.roomId}`} />
            )}
            {resident.moveInDate && (
              <Row icon={<Calendar size={13} />}
                label={`Moved in ${new Date(resident.moveInDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}`} />
            )}
          </div>

          {(resident.guardianName || resident.aadharNumber) && (
            <div className="bg-slate-50 rounded-xl px-3 py-2.5 space-y-1 text-xs text-slate-500">
              {resident.guardianName && (
                <p><span className="font-medium text-slate-600">Guardian:</span> {resident.guardianName}
                  {resident.guardianPhone && <span className="text-slate-400"> · {resident.guardianPhone}</span>}
                </p>
              )}
              {resident.aadharNumber && (
                <p className="font-mono">
                  <span className="font-sans font-medium text-slate-600">Aadhar:</span>{' '}
                  {resident.aadharNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}
                </p>
              )}
            </div>
          )}

          {resident.securityDeposit?.amount > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs space-y-1">
              <p className="font-semibold text-amber-700 uppercase tracking-wide text-[10px]">Security Deposit</p>
              <p className="text-slate-700">Amount: <span className="font-semibold">₹{resident.securityDeposit.amount?.toLocaleString('en-IN')}</span>
                <span className="ml-2 capitalize text-amber-600">({resident.securityDeposit.status?.replace(/_/g, ' ')})</span>
              </p>
              {resident.securityDeposit.refundedAmount > 0 && (
                <p className="text-slate-600">Refunded: ₹{resident.securityDeposit.refundedAmount?.toLocaleString('en-IN')}</p>
              )}
            </div>
          )}

          <ResidentRoomHistory residentId={resident._id} />

          <button onClick={onClose}
            className="w-full mt-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label }) {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <span className="text-slate-400 flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

// ─── Aadhar formatter ────────────────────────────────────────────────────────
function formatAadhar(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// ─── Profile photo picker (upload + camera) ───────────────────────────────────
function ProfilePicker({ value, onChange }) {
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    onChange(file);
    setPreview(URL.createObjectURL(file));
  };

  const clear = () => { onChange(null); setPreview(null); };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar preview */}
      <div className="relative">
        <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
          {preview
            ? <img src={preview} alt="profile" className="h-full w-full object-cover" />
            : <User size={32} className="text-slate-300" />}
        </div>
        {preview && (
          <button type="button" onClick={clear}
            className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        {/* Upload from gallery */}
        <input ref={uploadRef} type="file" accept="image/*" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
        <button type="button" onClick={() => uploadRef.current.click()}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Upload size={13} /> Upload
        </button>

        {/* Camera capture (opens front camera on mobile) */}
        <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
        <button type="button" onClick={() => cameraRef.current.click()}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors">
          <Camera size={13} /> Camera
        </button>
      </div>
      <p className="text-[11px] text-slate-400">JPG or PNG · max 5 MB</p>
    </div>
  );
}

// ─── Bill Components Toggle ──────────────────────────────────────────────────
function BillComponentsToggle({ value, onChange }) {
  const { t } = useHstLangStore();
  const items = [
    { key: 'rent',        label: t('residents_rent') },
    { key: 'electricity', label: t('residents_electricity') },
    { key: 'food',        label: t('residents_food_charge') },
  ];
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('residents_bill_components')}</p>
      <p className="text-xs text-slate-400 mb-3">{t('billing_select_components')}.</p>
      <div className="flex flex-wrap gap-2">
        {items.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ ...value, [key]: !value[key] })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              value[key]
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${value[key] ? 'bg-white' : 'bg-slate-300'}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Edit Resident Modal ──────────────────────────────────────────────────────
function EditResidentModal({ resident, onClose, onRefresh }) {
  const { t } = useHstLangStore();
  const uploadRef = useRef(null);
  const dep = resident.securityDeposit ?? {};
  const [form, setForm] = useState({
    name:          resident.name          ?? '',
    phone:         resident.phone         ?? '',
    moveInDate:    resident.moveInDate ? new Date(resident.moveInDate).toISOString().split('T')[0] : '',
    guardianName:  resident.guardianName  ?? '',
    guardianPhone: resident.guardianPhone ?? '',
    aadharNumber:  resident.aadharNumber  ?? '',
  });
  const [deposit, setDeposit] = useState({
    amount:         dep.amount         ?? 0,
    status:         dep.status         ?? 'held',
    refundedAmount: dep.refundedAmount ?? 0,
    refundDate:     dep.refundDate ? new Date(dep.refundDate).toISOString().split('T')[0] : '',
    deductionNotes: dep.deductionNotes ?? '',
  });
  const [billComponents, setBillComponents] = useState({
    rent:        resident.billComponents?.rent        ?? true,
    electricity: resident.billComponents?.electricity ?? true,
    food:        resident.billComponents?.food        ?? true,
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [preview, setPreview] = useState(resident.profilePhotoUrl || null);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handlePhoto = (file) => {
    if (!file) return;
    setProfilePhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
    fd.append('billRent',        billComponents.rent);
    fd.append('billElectricity', billComponents.electricity);
    fd.append('billFood',        billComponents.food);
    fd.append('depositAmount',   deposit.amount);
    fd.append('depositStatus',   deposit.status);
    fd.append('depositRefundedAmount', deposit.refundedAmount);
    if (deposit.refundDate)     fd.append('depositRefundDate',     deposit.refundDate);
    if (deposit.deductionNotes) fd.append('depositDeductionNotes', deposit.deductionNotes);
    if (profilePhoto) fd.append('profilePhoto', profilePhoto);
    try {
      await hstApi.patch(`/residents/${resident._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Resident updated');
      onRefresh();
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Update failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 grid place-items-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('residents_edit')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{resident.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-5">
          {/* Profile photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                {preview
                  ? <img src={preview} alt="profile" className="h-full w-full object-cover" />
                  : <User size={28} className="text-slate-300" />}
              </div>
              {preview && (
                <button type="button" onClick={() => { setProfilePhoto(null); setPreview(null); }}
                  className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input ref={uploadRef} type="file" accept="image/*" className="hidden"
                onChange={e => handlePhoto(e.target.files[0])} />
              <button type="button" onClick={() => uploadRef.current.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Upload size={12} /> Change Photo
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('name')} required>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required
                className="input-base" />
            </Field>
            <Field label={t('phone')} required>
              <input type="text" value={form.phone} maxLength={10}
                onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} required
                className="input-base" />
            </Field>
            <Field label={t('residents_joined')}>
              <input type="date" value={form.moveInDate} onChange={e => set('moveInDate', e.target.value)}
                className="input-base" />
            </Field>
            <Field label="Aadhar">
              <input type="text" inputMode="numeric" placeholder="0000 0000 0000" maxLength={14}
                value={formatAadhar(form.aadharNumber)}
                onChange={e => set('aadharNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
                className="input-base font-mono tracking-widest" />
            </Field>
          </div>

          <hr className="border-slate-100" />

          {/* Guardian info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Guardian">
              <input type="text" value={form.guardianName} onChange={e => set('guardianName', e.target.value)}
                className="input-base" />
            </Field>
            <Field label="Guardian Phone">
              <input type="text" value={form.guardianPhone} maxLength={10}
                onChange={e => set('guardianPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input-base" />
            </Field>
          </div>

          <hr className="border-slate-100" />

          {/* Security deposit */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Security Deposit</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Deposit Amount (₹)">
                <input type="number" min="0" value={deposit.amount}
                  onChange={e => setDeposit(d => ({ ...d, amount: e.target.value }))}
                  className="input-base" />
              </Field>
              <Field label="Status">
                <select value={deposit.status}
                  onChange={e => setDeposit(d => ({ ...d, status: e.target.value }))}
                  className="input-base">
                  <option value="held">Held</option>
                  <option value="partially_refunded">Partially Refunded</option>
                  <option value="refunded">Refunded</option>
                </select>
              </Field>
              <Field label="Refunded Amount (₹)">
                <input type="number" min="0" value={deposit.refundedAmount}
                  onChange={e => setDeposit(d => ({ ...d, refundedAmount: e.target.value }))}
                  className="input-base" />
              </Field>
              <Field label="Refund Date">
                <input type="date" value={deposit.refundDate}
                  onChange={e => setDeposit(d => ({ ...d, refundDate: e.target.value }))}
                  className="input-base" />
              </Field>
            </div>
            <Field label="Deduction Notes" className="mt-4">
              <input type="text" value={deposit.deductionNotes}
                placeholder="e.g. furniture damage ₹500"
                onChange={e => setDeposit(d => ({ ...d, deductionNotes: e.target.value }))}
                className="input-base" />
            </Field>
          </div>

          <hr className="border-slate-100" />

          {/* Bill components */}
          <BillComponentsToggle value={billComponents} onChange={setBillComponents} />
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
            {saving ? <><Spinner size="sm" className="border-indigo-300 border-t-white" /> {t('saving')}</> : t('save')}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', email: '', phone: '', moveInDate: '',
  guardianName: '', guardianPhone: '', aadharNumber: '',
};
const DEFAULT_BILL_COMPONENTS = { rent: true, electricity: true, food: true };

export default function AdminResidents() {
  const { t } = useHstLangStore();
  const [residents, setResidents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newBillComponents, setNewBillComponents] = useState(DEFAULT_BILL_COMPONENTS);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [idProof, setIdProof] = useState(null);
  const idProofRef = useRef(null);
  const [viewResident, setViewResident] = useState(null);
  const [editResident, setEditResident] = useState(null);

  const fetchAll = () => {
    Promise.all([
      hstApi.get('/residents').then(r => setResidents(r.data.residents)),
      hstApi.get('/rooms').then(r => setRooms(r.data.rooms)),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { fetchAll(); }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleAadhar = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 12);
    set('aadharNumber', digits);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setNewBillComponents(DEFAULT_BILL_COMPONENTS);
    setProfilePhoto(null);
    setIdProof(null);
    if (idProofRef.current) idProofRef.current.value = '';
  };

  const addResident = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    fd.append('billRent',        newBillComponents.rent);
    fd.append('billElectricity', newBillComponents.electricity);
    fd.append('billFood',        newBillComponents.food);
    if (profilePhoto) fd.append('profilePhoto', profilePhoto);
    if (idProof)      fd.append('idProof', idProof);
    try {
      await hstApi.post('/residents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Resident added. Temp password sent via WhatsApp.');
      setShowForm(false);
      resetForm();
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const assignRoom = async (userId, roomId) => {
    try {
      await hstApi.post(`/rooms/${roomId}/assign`, { userId });
      toast.success('Room assigned');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const moveOut = async (id) => {
    if (!window.confirm('Move out this resident? This cannot be undone.')) return;
    try {
      await hstApi.patch(`/residents/${id}/moveout`);
      toast.success('Resident moved out');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('residents_title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {residents.filter(r => r.isActive).length} {t('residents_active').toLowerCase()}
          </p>
        </div>
        <button onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 active:scale-[0.97]">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? t('cancel') : t('residents_add')}
        </button>
      </div>

      {/* ── Add Resident form ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-fade-up">
          <h3 className="font-semibold text-slate-700 mb-6">{t('residents_add')}</h3>
          <form onSubmit={addResident} className="space-y-6">

            {/* Profile photo */}
            <div className="flex flex-col items-center">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Profile Photo
              </label>
              <ProfilePicker value={profilePhoto} onChange={setProfilePhoto} />
            </div>

            <hr className="border-slate-100" />

            {/* Basic info */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Basic Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <input type="text" placeholder="John Doe" value={form.name}
                    onChange={e => set('name', e.target.value)} required
                    className="input-base" />
                </Field>
                <Field label="Email Address" required>
                  <input type="email" placeholder="john@example.com" value={form.email}
                    onChange={e => set('email', e.target.value)} required
                    className="input-base" />
                </Field>
                <Field label="Phone Number" required>
                  <input type="text" placeholder="9876543210" maxLength={10} value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} required
                    className="input-base" />
                </Field>
                <Field label="Move-in Date" required>
                  <input type="date" value={form.moveInDate}
                    onChange={e => set('moveInDate', e.target.value)} required
                    className="input-base" />
                </Field>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Guardian info */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Guardian Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Father / Mother Name">
                  <input type="text" placeholder="Parent name" value={form.guardianName}
                    onChange={e => set('guardianName', e.target.value)}
                    className="input-base" />
                </Field>
                <Field label="Father / Mother Phone">
                  <input type="text" placeholder="9876543210" maxLength={10} value={form.guardianPhone}
                    onChange={e => set('guardianPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="input-base" />
                </Field>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Identity */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Identity Documents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Aadhar — 4-digit split display */}
                <Field label="Aadhar Number">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000 0000 0000"
                      value={formatAadhar(form.aadharNumber)}
                      onChange={e => handleAadhar(e.target.value)}
                      maxLength={14}
                      className="input-base font-mono tracking-widest"
                    />
                    {form.aadharNumber.length === 12 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                        <UserCheck size={15} />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">12 digits · auto-formatted</p>
                </Field>

                {/* ID Proof upload */}
                <Field label="ID Proof (JPG / PNG / PDF)">
                  <input ref={idProofRef} type="file" accept=".jpg,.jpeg,.png,.pdf"
                    onChange={e => setIdProof(e.target.files[0])}
                    className="w-full text-sm text-slate-500
                      file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0
                      file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-600
                      hover:file:bg-slate-200 cursor-pointer" />
                  {idProof && (
                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                      <UserCheck size={11} /> {idProof.name}
                    </p>
                  )}
                </Field>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Bill components */}
            <BillComponentsToggle value={newBillComponents} onChange={setNewBillComponents} />

            {/* Submit */}
            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]">
              {submitting
                ? <><Spinner size="sm" className="border-indigo-300 border-t-white" /> {t('submitting')}</>
                : t('residents_add')}
            </button>
          </form>
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {[t('name'), t('email'), 'Guardian', 'Aadhar', t('residents_room'), t('status'), t('actions')].map(h => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {residents.map(r => (
              <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                {/* Avatar + name */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setViewResident(r)}
                      title="View profile"
                      className="h-9 w-9 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                      {r.profilePhotoUrl
                        ? <img src={r.profilePhotoUrl} alt={r.name} className="h-full w-full object-cover" />
                        : <span className="text-white text-xs font-bold">{r.name?.[0]?.toUpperCase()}</span>}
                    </button>
                    <button onClick={() => setViewResident(r)}
                      className="font-medium text-slate-800 hover:text-indigo-600 transition-colors text-left">
                      {r.name}
                    </button>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-slate-600 text-xs">{r.email}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{r.phone}</p>
                </td>
                <td className="px-5 py-4">
                  {r.guardianName
                    ? <><p className="text-slate-600 text-xs">{r.guardianName}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{r.guardianPhone}</p></>
                    : <span className="text-slate-300 text-xs">—</span>}
                </td>
                <td className="px-5 py-4 font-mono text-xs text-slate-600">
                  {r.aadharNumber ? formatAadhar(r.aadharNumber) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-5 py-4">
                  {r.roomId
                    ? <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">Room {r.roomId.roomNumber}</span>
                    : <select onChange={e => e.target.value && assignRoom(r._id, e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Assign Room</option>
                        {rooms.filter(rm => rm.members.length < rm.capacity).map(rm => (
                          <option key={rm._id} value={rm._id}>{rm.roomNumber} ({rm.members.length}/{rm.capacity})</option>
                        ))}
                      </select>}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                    ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {r.isActive ? <><UserCheck size={11} /> {t('residents_active')}</> : t('residents_inactive')}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditResident(r)}
                      className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 text-xs font-medium transition-colors">
                      <Pencil size={13} /> {t('edit')}
                    </button>
                    {r.isActive && (
                      <button onClick={() => moveOut(r._id)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium transition-colors">
                        <UserX size={14} /> Move Out
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {residents.length === 0 && (
          <p className="text-center py-12 text-slate-400 text-sm">{t('residents_no_residents')}</p>
        )}
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {residents.map(r => (
          <div key={r._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setViewResident(r)}
                className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow hover:opacity-80 transition-opacity cursor-pointer">
                {r.profilePhotoUrl
                  ? <img src={r.profilePhotoUrl} alt={r.name} className="h-full w-full object-cover" />
                  : <span className="text-white font-bold">{r.name?.[0]?.toUpperCase()}</span>}
              </button>
              <div className="flex-1 min-w-0">
                <button onClick={() => setViewResident(r)}
                  className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors truncate block text-left w-full">
                  {r.name}
                </button>
                <p className="text-xs text-slate-500 truncate">{r.email}</p>
                <p className="text-xs text-slate-400">{r.phone}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0
                ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {r.isActive ? t('residents_active') : t('residents_inactive')}
              </span>
            </div>

            {(r.guardianName || r.aadharNumber) && (
              <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-3 space-y-1">
                {r.guardianName && (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Guardian:</span> {r.guardianName}
                    {r.guardianPhone && <span className="text-slate-400"> · {r.guardianPhone}</span>}
                  </p>
                )}
                {r.aadharNumber && (
                  <p className="text-xs text-slate-500 font-mono">
                    <span className="font-sans font-medium text-slate-600">Aadhar:</span> {formatAadhar(r.aadharNumber)}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              {r.roomId
                ? <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">Room {r.roomId.roomNumber}</span>
                : <select onChange={e => e.target.value && assignRoom(r._id, e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                    <option value="">Assign Room</option>
                    {rooms.filter(rm => rm.members.length < rm.capacity).map(rm => (
                      <option key={rm._id} value={rm._id}>{rm.roomNumber} ({rm.members.length}/{rm.capacity})</option>
                    ))}
                  </select>}
              <div className="flex items-center gap-3">
                <button onClick={() => setEditResident(r)}
                  className="flex items-center gap-1 text-indigo-500 text-xs font-medium">
                  <Pencil size={13} /> {t('edit')}
                </button>
                {r.isActive && (
                  <button onClick={() => moveOut(r._id)}
                    className="flex items-center gap-1 text-red-500 text-xs font-medium">
                    <UserX size={14} /> Move Out
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Profile view modal */}
      {viewResident && <ProfileModal resident={viewResident} onClose={() => setViewResident(null)} />}

      {/* Edit resident modal */}
      {editResident && (
        <EditResidentModal
          resident={editResident}
          onClose={() => setEditResident(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
