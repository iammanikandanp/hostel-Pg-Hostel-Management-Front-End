import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Phone, ShieldCheck, Building2, Calendar, Download, Camera, Edit3, X, Save, FileText, Award, ArrowRight } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { useHstAuthStore } from '../../store/hstAuthStore';
import { PageLoader } from '../../components/Spinner';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function InfoRow({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className={`mt-0.5 p-1.5 rounded-lg ${accent ?? 'bg-slate-100'}`}>
        <Icon size={14} className="text-slate-600" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function RoomHistory() {
  const { data } = useQuery({
    queryKey: ['room-history'],
    queryFn: () => hstApi.get('/residents/me/room-history').then(r => r.data),
  });

  const history = data?.roomHistory ?? [];
  if (!history.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
        <ArrowRight size={15} className="text-violet-500" /> Room Transfer History
      </h3>
      <div className="space-y-2">
        {[...history].reverse().map((h, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">Room {h.roomNumber}</p>
              <p className="text-xs text-slate-400">Floor {h.floor}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">{new Date(h.fromDate).toLocaleDateString('en-IN')}</p>
              <p className="text-xs text-slate-400">→ {new Date(h.toDate).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEPOSIT_STATUS_STYLES = {
  held:                'bg-amber-100 text-amber-700',
  partially_refunded:  'bg-blue-100 text-blue-700',
  refunded:            'bg-green-100 text-green-700',
};

export default function ResidentProfile() {
  const { user: authUser, setUser } = useHstAuthStore();
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', guardianName: '', guardianPhone: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => hstApi.get('/residents/me').then(r => r.data.user),
  });

  const updateMutation = useMutation({
    mutationFn: (fd) => hstApi.patch('/residents/me', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      toast.success('Profile updated');
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      if (setUser) setUser(res.data.user);
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Update failed'),
  });

  const startEdit = (profile) => {
    setForm({
      phone:         profile.phone ?? '',
      guardianName:  profile.guardianName ?? '',
      guardianPhone: profile.guardianPhone ?? '',
    });
    setEditing(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    const fd = new FormData();
    if (form.phone)         fd.append('phone',         form.phone);
    if (form.guardianName)  fd.append('guardianName',  form.guardianName);
    if (form.guardianPhone) fd.append('guardianPhone', form.guardianPhone);
    if (photoFile)          fd.append('profilePhoto',  photoFile);
    updateMutation.mutate(fd);
  };

  const downloadDoc = async (url, filename) => {
    try {
      const res = await hstApi.get(url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Download failed');
    }
  };

  if (isLoading) return <PageLoader />;
  const profile = data;
  if (!profile) return null;

  const deposit = profile.securityDeposit;
  const avatarSrc = photoPreview ?? profile.profilePhotoUrl;

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
          <p className="text-slate-500 text-sm mt-0.5">View and update your personal details</p>
        </div>
        {!editing ? (
          <button
            onClick={() => startEdit(profile)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Edit3 size={15} /> Edit
          </button>
        ) : (
          <button onClick={() => { setEditing(false); setPhotoFile(null); setPhotoPreview(null); }}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        )}
      </div>

      {/* Avatar + name card */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 flex items-center gap-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 rounded-full w-64 h-64 -right-16 -top-16" />
        <div className="relative flex-shrink-0">
          {avatarSrc ? (
            <img src={avatarSrc} alt="Profile" className="h-20 w-20 rounded-full object-cover border-4 border-white/30 shadow-lg" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30 text-3xl font-bold shadow-lg">
              {profile.name?.[0]?.toUpperCase()}
            </div>
          )}
          {editing && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-md hover:bg-slate-100 transition-colors"
              >
                <Camera size={13} className="text-indigo-600" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </>
          )}
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold">{profile.name}</h2>
          <p className="text-indigo-200 text-sm mt-0.5">{profile.email}</p>
          <span className="mt-2 inline-block bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
            {profile.role}
          </span>
        </div>
      </div>

      {/* Contact details — editable */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <User size={15} className="text-indigo-500" /> Contact Details
        </h3>
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="10-digit mobile number"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Guardian Name</label>
              <input
                type="text"
                value={form.guardianName}
                onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))}
                placeholder="Parent / guardian name"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Guardian Phone</label>
              <input
                type="tel"
                value={form.guardianPhone}
                onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))}
                placeholder="Guardian's 10-digit number"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 w-full justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              <Save size={15} /> {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div>
            <InfoRow icon={Phone} label="Phone" value={profile.phone} accent="bg-indigo-50" />
            <InfoRow icon={User} label="Guardian Name" value={profile.guardianName} accent="bg-violet-50" />
            <InfoRow icon={Phone} label="Guardian Phone" value={profile.guardianPhone} accent="bg-violet-50" />
          </div>
        )}
      </div>

      {/* Room & stay info — read only */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Building2 size={15} className="text-emerald-500" /> Room & Stay
        </h3>
        <InfoRow icon={Building2} label="Room Number" value={profile.roomId?.roomNumber} accent="bg-emerald-50" />
        <InfoRow icon={Building2} label="Floor" value={profile.roomId?.floor} accent="bg-emerald-50" />
        <InfoRow icon={Calendar} label="Move-in Date" value={profile.moveInDate ? new Date(profile.moveInDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : null} accent="bg-emerald-50" />
      </div>

      {/* Security Deposit */}
      {deposit && (deposit.amount > 0 || deposit.status !== 'held') && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <ShieldCheck size={15} className="text-amber-500" /> Security Deposit
          </h3>
          <div className="flex items-center justify-between mb-3">
            <p className="text-2xl font-bold text-slate-800">₹{deposit.amount?.toLocaleString('en-IN')}</p>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${DEPOSIT_STATUS_STYLES[deposit.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {deposit.status?.replace(/_/g, ' ')}
            </span>
          </div>
          {deposit.refundedAmount > 0 && (
            <p className="text-sm text-slate-600">Refunded: <span className="font-semibold text-green-600">₹{deposit.refundedAmount?.toLocaleString('en-IN')}</span>
              {deposit.refundDate ? ` on ${new Date(deposit.refundDate).toLocaleDateString('en-IN')}` : ''}
            </p>
          )}
          {deposit.deductionNotes && (
            <p className="text-sm text-slate-500 mt-1 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <span className="font-medium text-amber-700">Deduction note:</span> {deposit.deductionNotes}
            </p>
          )}
        </div>
      )}

      {/* Room Transfer History */}
      <RoomHistory />

      {/* Documents */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <FileText size={15} className="text-blue-500" /> Documents
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => downloadDoc('/residents/me/certificate', 'residency-certificate.pdf')}
            className="flex items-center gap-3 w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 transition-colors text-left group"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Award size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-indigo-800">Residency Certificate</p>
              <p className="text-xs text-indigo-500 mt-0.5">Official proof of residence with move-in date</p>
            </div>
            <Download size={16} className="text-indigo-500 group-hover:text-indigo-700 transition-colors" />
          </button>

          <p className="text-xs text-slate-400 text-center">Rent receipts can be downloaded from the Bills page.</p>
        </div>
      </div>
    </div>
  );
}
