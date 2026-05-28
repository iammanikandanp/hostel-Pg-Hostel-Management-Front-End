import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Package, X, Save, Trash2, Edit3 } from 'lucide-react';
import hstApi from '../../api/hstAxios';

const CATEGORIES = ['furniture', 'electronics', 'appliances', 'fixtures', 'linen', 'other'];
const CONDITIONS = ['good', 'fair', 'poor', 'damaged'];

const CONDITION_COLORS = {
  good:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  fair:    'bg-amber-50 text-amber-700 border-amber-200',
  poor:    'bg-orange-50 text-orange-700 border-orange-200',
  damaged: 'bg-red-50 text-red-700 border-red-200',
};

const CAT_COLORS = {
  furniture:   'bg-indigo-50 text-indigo-700',
  electronics: 'bg-violet-50 text-violet-700',
  appliances:  'bg-sky-50 text-sky-700',
  fixtures:    'bg-teal-50 text-teal-700',
  linen:       'bg-pink-50 text-pink-700',
  other:       'bg-slate-50 text-slate-600',
};

function AssetModal({ asset, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!asset;
  const [form, setForm] = useState({
    name:          asset?.name          ?? '',
    category:      asset?.category      ?? 'furniture',
    roomId:        asset?.roomId?._id   ?? '',
    condition:     asset?.condition     ?? 'good',
    purchaseDate:  asset?.purchaseDate  ? asset.purchaseDate.split('T')[0] : '',
    purchasePrice: asset?.purchasePrice ?? '',
    serialNumber:  asset?.serialNumber  ?? '',
    notes:         asset?.notes         ?? '',
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms-simple'],
    queryFn: () => hstApi.get('/rooms').then(r => r.data),
    staleTime: 60000,
  });

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? hstApi.patch(`/assets/${asset._id}`, form)
      : hstApi.post('/assets', form),
    onSuccess: () => {
      toast.success(isEdit ? 'Asset updated' : 'Asset added');
      qc.invalidateQueries({ queryKey: ['assets'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const rooms = roomsData?.rooms ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Asset' : 'Add Asset'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Name</label>
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 capitalize">
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Condition</label>
              <select value={form.condition} onChange={e => setForm(p => ({...p, condition: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 capitalize">
                {CONDITIONS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Room (optional)</label>
            <select value={form.roomId} onChange={e => setForm(p => ({...p, roomId: e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">— Common Area / Unassigned —</option>
              {rooms.map(r => <option key={r._id} value={r._id}>Room {r.roomNumber} (Floor {r.floor})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={e => setForm(p => ({...p, purchaseDate: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Purchase Price (₹)</label>
              <input type="number" value={form.purchasePrice} onChange={e => setForm(p => ({...p, purchasePrice: e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Serial Number</label>
            <input value={form.serialNumber} onChange={e => setForm(p => ({...p, serialNumber: e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAssets() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'add' | asset object
  const [catFilter, setCatFilter] = useState('');
  const [condFilter, setCondFilter] = useState('');

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (catFilter)  p.set('category', catFilter);
    if (condFilter) p.set('condition', condFilter);
    return p.toString() ? `?${p}` : '';
  };

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets', catFilter, condFilter],
    queryFn: () => hstApi.get(`/assets${buildQuery()}`).then(r => r.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['assets-summary'],
    queryFn: () => hstApi.get('/assets/summary').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => hstApi.delete(`/assets/${id}`),
    onSuccess: () => { toast.success('Asset removed'); qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['assets-summary'] }); },
    onError: (e) => toast.error(e.response?.data?.error ?? 'Failed'),
  });

  const assets = assetsData?.assets ?? [];
  const summary = summaryData ?? {};

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Asset Inventory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track hostel furniture, electronics and equipment</p>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200">
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {/* Summary */}
      {summary.byCondition && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(summary.byCondition ?? []).map(c => (
            <div key={c._id} className={`rounded-xl border p-3 text-center ${CONDITION_COLORS[c._id] ?? 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              <p className="text-2xl font-bold">{c.count}</p>
              <p className="text-xs font-semibold capitalize">{c._id}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 capitalize">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <select value={condFilter} onChange={e => setCondFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 capitalize">
          <option value="">All Conditions</option>
          {CONDITIONS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Package size={32} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm">No assets found. Add your first asset!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map(asset => (
            <div key={asset._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{asset.name}</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full capitalize ${CAT_COLORS[asset.category] ?? 'bg-slate-50 text-slate-600'}`}>
                      {asset.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border capitalize ${CONDITION_COLORS[asset.condition]}`}>
                      {asset.condition}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal(asset)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => deleteMutation.mutate(asset._id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400 space-y-0.5">
                {asset.roomId ? (
                  <p>Room {asset.roomId.roomNumber} · Floor {asset.roomId.floor}</p>
                ) : (
                  <p className="italic">Common Area</p>
                )}
                {asset.purchaseDate && <p>Purchased: {new Date(asset.purchaseDate).toLocaleDateString('en-IN')}</p>}
                {asset.purchasePrice && <p>Value: ₹{asset.purchasePrice.toLocaleString('en-IN')}</p>}
                {asset.serialNumber && <p>S/N: {asset.serialNumber}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'add' && <AssetModal onClose={() => setModal(null)} />}
      {modal && modal !== 'add' && <AssetModal asset={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
