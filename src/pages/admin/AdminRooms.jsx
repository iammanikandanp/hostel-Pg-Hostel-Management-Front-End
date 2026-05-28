import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, X, User, ChevronDown, ChevronUp, Search, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { PageLoader } from '../../components/Spinner';
import { useHstLangStore } from '../../store/hstLangStore';

// ─── Avatar color palette ────────────────────────────────────────────────────
const PALETTE = [
  ['#e6f1fb','#185FA5'],['#e1f5ee','#0F6E56'],['#faeeda','#854F0B'],
  ['#eeedfe','#534AB7'],['#faece7','#993C1D'],['#eaf3de','#3B6D11'],
  ['#fbeaf0','#993556'],['#fcebeb','#A32D2D'],
];
function avatarColor(str = '') {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % PALETTE.length;
  return PALETTE[h];
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Seat-dot grid ───────────────────────────────────────────────────────────
function SeatDots({ capacity, filled }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: capacity }).map((_, i) => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: i < filled ? '#4F46E5' : 'transparent',
          border: `1.5px solid ${i < filled ? '#4F46E5' : '#CBD5E1'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }}>
          {i < filled && <User size={13} color="white" strokeWidth={2.2} />}
        </div>
      ))}
    </div>
  );
}

// ─── Room status helper ───────────────────────────────────────────────────────
function roomStatus(room, t) {
  const avail = room.capacity - room.members.length;
  if (avail === 0) return { bg: '#fcebeb', color: '#A32D2D', label: t('rooms_full') };
  if (avail === room.capacity) return { bg: '#F1F5F9', color: '#64748B', label: t('rooms_vacant') };
  return { bg: '#e1f5ee', color: '#0F6E56', label: `${avail} ${t('free')}` };
}

// ─── View Members Modal ───────────────────────────────────────────────────────
function ViewModal({ room, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Room {room.roomNumber}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Floor {room.floor} · {room.members.length}/{room.capacity} seats taken
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 mb-5">
        <SeatDots capacity={room.capacity} filled={room.members.length} />
        <p className="text-xs text-slate-400 mt-2">
          {room.capacity - room.members.length} seat{room.capacity - room.members.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {room.members.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-6">No members assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {room.members.map((m, i) => {
            const name = m.name ?? m._id;
            const [bg, fg] = avatarColor(initials(name));
            return (
              <div key={m._id ?? i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, color: fg, fontSize: 12, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {initials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                  <p className="text-xs text-slate-400">Seat {i + 1}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Overlay>
  );
}

// ─── Edit Room Modal ──────────────────────────────────────────────────────────
function EditModal({ room, rooms, onClose, onRefresh }) {
  const [capacity, setCapacity] = useState(room.capacity);
  const [savingCap, setSavingCap] = useState(false);
  const [relocating, setRelocating] = useState(null); // memberId being relocated

  const saveCapacity = async () => {
    if (capacity < room.members.length) {
      toast.error(`Capacity can't be below current occupants (${room.members.length})`); return;
    }
    setSavingCap(true);
    try {
      await hstApi.patch(`/rooms/${room._id}/capacity`, { capacity });
      toast.success(`Capacity updated to ${capacity}`);
      onRefresh();
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSavingCap(false); }
  };

  const relocateMember = async (memberId, toRoomId) => {
    if (!toRoomId) return;
    setRelocating(memberId);
    try {
      await hstApi.patch(`/residents/${memberId}/reallocate`, { toRoomId });
      toast.success('Member moved to new room');
      onRefresh();
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setRelocating(null); }
  };

  // Rooms available for relocation (exclude current room, show only non-full ones)
  const otherRooms = rooms.filter(r => r._id !== room._id && r.members.length < r.capacity);

  return (
    <Overlay onClose={onClose}>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Edit Room {room.roomNumber}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Adjust capacity · Reallocate members</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
      </div>

      {/* Capacity stepper */}
      <div className="bg-slate-50 rounded-2xl p-5 mb-5">
        <p className="text-sm font-semibold text-slate-700 mb-4">Room Capacity</p>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setCapacity(v => Math.max(1, v - 1))}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-lg font-medium hover:bg-slate-100 transition-colors">
            <ChevronDown size={18} />
          </button>
          <div className="flex-1 text-center">
            <span className="text-3xl font-bold text-indigo-600">{capacity}</span>
            <p className="text-xs text-slate-400 mt-0.5">seats</p>
          </div>
          <button onClick={() => setCapacity(v => Math.min(10, v + 1))}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-lg font-medium hover:bg-slate-100 transition-colors">
            <ChevronUp size={18} />
          </button>
          <button onClick={saveCapacity} disabled={savingCap}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold rounded-xl transition-all">
            {savingCap ? 'Saving…' : 'Save'}
          </button>
        </div>
        <SeatDots capacity={capacity} filled={room.members.length} />
        <p className="text-xs text-slate-400 mt-2">
          {Math.max(0, capacity - room.members.length)} seat{capacity - room.members.length !== 1 ? 's' : ''} available after save
        </p>
      </div>

      {/* Members list with reallocation */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">
          Members ({room.members.length}/{room.capacity})
        </p>
        {room.members.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-4">No members assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {room.members.map((m, i) => {
              const name = m.name ?? m._id;
              const [bg, fg] = avatarColor(initials(name));
              const isMoving = relocating === (m._id ?? m);
              return (
                <div key={m._id ?? i} className="bg-slate-50 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, color: fg, fontSize: 11, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-400">{m.phone ?? `Seat ${i + 1}`}</p>
                    </div>
                  </div>
                  {/* Reallocation row */}
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft size={12} className="text-slate-400 flex-shrink-0" />
                    <select
                      disabled={isMoving || otherRooms.length === 0}
                      onChange={e => relocateMember(m._id, e.target.value)}
                      value=""
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50">
                      <option value="">{isMoving ? 'Moving…' : otherRooms.length === 0 ? 'No rooms available' : 'Move to room…'}</option>
                      {otherRooms.map(r => (
                        <option key={r._id} value={r._id}>
                          Room {r.roomNumber} — Floor {r.floor} ({r.members.length}/{r.capacity})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button onClick={onClose}
        className="w-full mt-5 h-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
        Done
      </button>
    </Overlay>
  );
}

// ─── Shared Overlay wrapper ───────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 grid place-items-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminRooms() {
  const { t } = useHstLangStore();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ roomNumber: '', floor: '', capacity: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [viewRoom, setViewRoom] = useState(null);
  const [editRoom, setEditRoom] = useState(null);

  const fetchRooms = () =>
    hstApi.get('/rooms')
      .then(r => setRooms(r.data.rooms))
      .catch(() => toast.error('Failed to load rooms'))
      .finally(() => setLoading(false));

  useEffect(() => { fetchRooms(); }, []);

  const createRoom = async (e) => {
    e.preventDefault();
    setAddSubmitting(true);
    try {
      await hstApi.post('/rooms', {
        roomNumber: addForm.roomNumber,
        floor: Number(addForm.floor),
        capacity: Number(addForm.capacity),
      });
      toast.success('Room created');
      setShowAddForm(false);
      setAddForm({ roomNumber: '', floor: '', capacity: '' });
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setAddSubmitting(false); }
  };

  // Stats
  const totalSeats    = rooms.reduce((a, r) => a + r.capacity, 0);
  const totalOccupied = rooms.reduce((a, r) => a + r.members.length, 0);
  const totalVacant   = totalSeats - totalOccupied;
  const fullRooms     = rooms.filter(r => r.members.length >= r.capacity).length;

  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);

  // Filtered rooms
  const filtered = rooms.filter(r => {
    const avail = r.capacity - r.members.length;
    const floorOk  = filterFloor === 'all' || r.floor === Number(filterFloor);
    const statusOk = filterStatus === 'all'
      || (filterStatus === 'vacant' && avail > 0)
      || (filterStatus === 'full'   && avail === 0);
    const searchOk = !search
      || r.roomNumber.toLowerCase().includes(search.toLowerCase())
      || r.members.some(m => (m.name ?? '').toLowerCase().includes(search.toLowerCase()));
    return floorOk && statusOk && searchOk;
  });

  if (loading) return <PageLoader />;

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('rooms_title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('rooms_subtitle')}</p>
        </div>
        <button onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200 active:scale-[0.97]">
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? t('cancel') : t('rooms_add')}
        </button>
      </div>

      {/* Add Room form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 animate-fade-up">
          <h3 className="font-semibold text-slate-700 mb-4">{t('rooms_add')}</h3>
          <form onSubmit={createRoom} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'roomNumber', ph: t('rooms_number') },
              { key: 'floor',     ph: t('rooms_floor'), type: 'number' },
              { key: 'capacity',  ph: t('rooms_capacity'), type: 'number' },
            ].map(({ key, ph, type = 'text' }) => (
              <input key={key} type={type} placeholder={ph} value={addForm[key]}
                onChange={e => setAddForm({ ...addForm, [key]: e.target.value })} required
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            ))}
            <button type="submit" disabled={addSubmitting}
              className="sm:col-span-3 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2.5 rounded-xl text-sm font-semibold transition-all">
              {addSubmitting ? t('saving') : <><CheckCircle2 size={15} /> {t('rooms_add')}</>}
            </button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: t('rooms_capacity'),  value: totalSeats,    bg: '#e6f1fb', color: '#185FA5' },
          { label: t('rooms_occupied'),  value: totalOccupied, bg: '#faeeda', color: '#854F0B' },
          { label: t('rooms_available'), value: totalVacant,   bg: '#e1f5ee', color: '#0F6E56' },
          { label: t('rooms_full'),      value: fullRooms,     bg: '#fcebeb', color: '#A32D2D' },
          { label: t('rooms_total'),     value: rooms.length,  bg: '#eeedfe', color: '#534AB7' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder={t('residents_search')} value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">{t('rooms_floor')}</option>
          {floors.map(f => <option key={f} value={f}>{t('rooms_floor')} {f}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">{t('rooms_status')}</option>
          <option value="vacant">{t('rooms_vacant')}</option>
          <option value="full">{t('rooms_full')}</option>
        </select>
      </div>

      {/* Room grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-medium">{t('rooms_no_rooms')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(room => {
            const avail = room.capacity - room.members.length;
            const pct   = room.capacity > 0 ? Math.round((room.members.length / room.capacity) * 100) : 0;
            const st    = roomStatus(room, t);
            const barColor = pct === 100 ? '#E24B4A' : pct > 60 ? '#EF9F27' : '#1D9E75';

            return (
              <div key={room._id}
                className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-200">

                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Room {room.roomNumber}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Floor {room.floor}</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>

                {/* Seat dots */}
                <SeatDots capacity={room.capacity} filled={room.members.length} />

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{room.members.length} / {room.capacity} {t('rooms_occupied').toLowerCase()}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%`, background: barColor, height: '100%', borderRadius: 4, transition: 'width .4s' }} />
                  </div>
                </div>

                {/* Member avatars */}
                {room.members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {room.members.slice(0, 5).map(m => {
                      const name = m.name ?? '';
                      const [bg, fg] = avatarColor(initials(name));
                      return (
                        <div key={m._id} title={name} style={{
                          width: 28, height: 28, borderRadius: 7, background: bg, color: fg,
                          fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', border: '1.5px solid white',
                          boxShadow: '0 0 0 1px #E2E8F0',
                        }}>
                          {initials(name)}
                        </div>
                      );
                    })}
                    {room.members.length > 5 && (
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#F1F5F9', color: '#64748B', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        +{room.members.length - 5}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => setViewRoom(room)}
                    className="flex-1 h-9 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    {t('residents_title')}
                  </button>
                  <button onClick={() => setEditRoom(room)}
                    className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors">
                    ✎ {t('edit')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {viewRoom && <ViewModal room={viewRoom} onClose={() => setViewRoom(null)} />}
      {editRoom && <EditModal room={editRoom} rooms={rooms} onClose={() => setEditRoom(null)} onRefresh={fetchRooms} />}
    </div>
  );
}
