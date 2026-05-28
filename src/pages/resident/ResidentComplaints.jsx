import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X, AlertTriangle, CheckCircle, Clock, Wrench, Plus, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import hstApi from '../../api/hstAxios';
import { useHstLangStore } from '../../store/hstLangStore';
import { PageLoader } from '../../components/Spinner';

const STATUS_STYLE = {
  open:         { bg: 'bg-red-100',    text: 'text-red-700',    icon: AlertTriangle, label: 'Open' },
  acknowledged: { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Clock,         label: 'Acknowledged' },
  fixed:        { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Wrench,        label: 'Fixed' },
  closed:       { bg: 'bg-emerald-100',text: 'text-emerald-700',icon: CheckCircle,   label: 'Closed' },
};

const CATEGORIES = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing',   label: 'Plumbing' },
  { value: 'cleanliness',label: 'Cleanliness' },
  { value: 'furniture',  label: 'Furniture' },
  { value: 'security',   label: 'Security' },
  { value: 'other',      label: 'Other' },
];

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.open;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <Icon size={11} /> {s.label}
    </span>
  );
}

function PhotoPicker({ photos, onChange }) {
  const fileRef = useRef();
  const cameraRef = useRef();
  const streamRef = useRef(null);
  const videoRef = useRef();
  const [showCamera, setShowCamera] = useState(false);

  const openCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error('Camera access denied');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onChange([...photos, { file, preview: URL.createObjectURL(blob) }]);
      closeCamera();
    }, 'image/jpeg', 0.85);
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    onChange([...photos, ...newPhotos].slice(0, 5));
    e.target.value = '';
  };

  const removePhoto = (i) => {
    const updated = photos.filter((_, idx) => idx !== i);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500">Photos (up to 5)</label>

      {/* Camera modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex justify-between items-center p-4">
            <span className="text-white font-medium">Take a Photo</span>
            <button onClick={closeCamera}><X size={24} className="text-white" /></button>
          </div>
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <div className="p-6 flex justify-center">
            <button onClick={capturePhoto}
              className="h-16 w-16 rounded-full bg-white border-4 border-slate-300 hover:bg-slate-100 flex items-center justify-center">
              <Camera size={28} className="text-slate-700" />
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFileChange} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />

      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative h-20 w-20 rounded-xl overflow-hidden border border-slate-200">
            <img src={p.preview} alt="" className="h-full w-full object-cover" />
            <button onClick={() => removePhoto(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 hover:bg-black/80">
              <X size={10} className="text-white" />
            </button>
          </div>
        ))}

        {photos.length < 5 && (
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
              <Image size={18} />
              <span className="text-[10px] font-medium">Gallery</span>
            </button>
            <button type="button" onClick={openCamera}
              className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
              <Camera size={18} />
              <span className="text-[10px] font-medium">Camera</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewComplaintModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ category: '', title: '', description: '' });
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.category || !form.title.trim() || !form.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
      photos.forEach(p => fd.append('complaintPhotos', p.file));

      const { data } = await hstApi.post('/complaints', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Complaint submitted');
      onCreated(data);
      onClose();
    } catch {
      toast.error('Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg " onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-semibold text-slate-800">Report a Complaint</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Category *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                    ${form.category === cat.value ? 'bg-indigo-100 text-indigo-700 border-indigo-400' : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Brief summary of the issue"
              maxLength={120}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Description *</label>
            <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue in detail…"
              maxLength={1000}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            <p className="text-xs text-slate-400 text-right mt-0.5">{form.description.length}/1000</p>
          </div>

          <PhotoPicker photos={photos} onChange={setPhotos} />
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
            {submitting ? <><Upload size={14} className="animate-bounce" /> Submitting…</> : 'Submit Complaint'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoViewer({ photos, onClose }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-9 right-0 text-white hover:text-slate-300">
          <X size={24} />
        </button>
        <img src={photos[idx].url} alt="" className="w-full rounded-xl object-contain max-h-[70vh]" />
        {photos.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`h-2 w-2 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-slate-500'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResidentComplaints() {
  const { t } = useHstLangStore();
  const [complaints, setComplaints] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(null);

  const fetchComplaints = async () => {
    try {
      const { data } = await hstApi.get('/complaints/mine');
      setComplaints(data);
    } catch {
      toast.error('Failed to load complaints');
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleCreated = (newComplaint) => {
    setComplaints(prev => [newComplaint, ...(prev || [])]);
  };

  if (!complaints) return <PageLoader />;

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      {photoViewer && <PhotoViewer photos={photoViewer} onClose={() => setPhotoViewer(null)} />}
      {showForm && <NewComplaintModal onClose={() => setShowForm(false)} onCreated={handleCreated} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('my_complaints_title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('my_complaints_subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> {t('complaints_new')}
        </button>
      </div>

      {complaints.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <AlertTriangle size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-slate-500">No complaints yet</p>
          <p className="text-sm mt-1">Report an issue and we'll get it fixed.</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700">
            Report Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <div key={c._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatusBadge status={c.status} />
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {CATEGORIES.find(cat => cat.value === c.category)?.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800">{c.title}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{c.description}</p>
                </div>
                {c.photos?.length > 0 && (
                  <button onClick={() => setPhotoViewer(c.photos)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg shrink-0">
                    <Camera size={13} /> {c.photos.length} photo{c.photos.length > 1 ? 's' : ''}
                  </button>
                )}
              </div>

              {/* Admin note */}
              {c.adminNote && (
                <div className="bg-indigo-50 rounded-xl px-4 py-2.5">
                  <p className="text-xs font-semibold text-indigo-600 mb-0.5">Admin Response</p>
                  <p className="text-sm text-indigo-800">{c.adminNote}</p>
                </div>
              )}

              {/* Status timeline */}
              {c.statusHistory?.length > 0 && (
                <div className="pt-2 border-t border-slate-50">
                  <p className="text-xs text-slate-400 mb-2 font-medium">Status Timeline</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {c.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-center gap-1">
                        {i > 0 && <div className="w-4 h-px bg-slate-200" />}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[h.status]?.bg} ${STATUS_STYLE[h.status]?.text}`}>
                          {STATUS_STYLE[h.status]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo thumbnails */}
              {c.photos?.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {c.photos.map((p, i) => (
                    <img key={i} src={p.url} alt="" onClick={() => setPhotoViewer(c.photos)}
                      className="h-16 w-16 rounded-lg object-cover cursor-pointer hover:opacity-90 border border-slate-100" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
