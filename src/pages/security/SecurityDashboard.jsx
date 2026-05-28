import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import ErrorBoundary from '../../components/ErrorBoundary';
import { LayoutDashboard, KeySquare, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import hstApi from '../../api/hstAxios';
import { useHstAuthStore } from '../../store/hstAuthStore';
import SidebarLayout from '../../components/SidebarLayout';
import { PageLoader } from '../../components/Spinner';
import VisitorLog from '../shared/VisitorLog';

const STATUS_STYLES = {
  approved: 'bg-green-100 text-green-700',
  pending:  'bg-amber-100 text-amber-700',
  returned: 'bg-slate-100 text-slate-600',
  rejected: 'bg-red-100 text-red-700',
};

function SecurityOutPassView() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hstApi.get('/outpass')
      .then(r => setPasses(r.data.outpasses ?? []))
      .catch(() => toast.error('Failed to load out-passes'))
      .finally(() => setLoading(false));
  }, []);

  const approved = passes.filter(p => p.status === 'approved');

  if (loading) return <PageLoader />;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Out-Pass Board</h1>
        <p className="text-slate-500 text-sm mt-0.5">Currently approved out-passes — verify at gate.</p>
      </div>

      {approved.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          No residents currently out on approved passes.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {approved.map(p => (
            <div key={p._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{p.userId?.name ?? '—'}</p>
                  <p className="text-xs text-slate-400">Room {p.userId?.roomId?.roomNumber ?? '—'}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${STATUS_STYLES[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="text-slate-400">Destination:</span> {p.destination}</p>
                <p><span className="text-slate-400">Return by:</span> {p.extendedReturn
                  ? new Date(p.extendedReturn).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : new Date(p.expectedReturn).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecurityHome() {
  const { user } = useHstAuthStore();
  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Security Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome, {user?.name}. View approved out-passes to verify gate entries.</p>
      </div>
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Your Access</p>
        <p className="text-sm text-slate-600">You can view currently approved out-passes to verify who is permitted to enter or exit the hostel.</p>
      </div>
    </div>
  );
}

export default function SecurityDashboard() {
  const { logout, user, fetchMe } = useHstAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    if (!user) fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nav = [
    { to: '/security',          label: 'Dashboard',  icon: LayoutDashboard, end: true },
    // { to: '/security/outpass',  label: 'Out-Passes', icon: KeySquare },
    { to: '/security/visitors', label: 'Visitors',   icon: Users },
  ];

  return (
    <SidebarLayout navItems={nav} user={user} onLogout={handleLogout}>
      <Routes>
        <Route index            element={<ErrorBoundary inline><SecurityHome /></ErrorBoundary>} />
        <Route path="outpass"   element={<ErrorBoundary inline><SecurityOutPassView /></ErrorBoundary>} />
        <Route path="visitors"  element={<ErrorBoundary inline><VisitorLog /></ErrorBoundary>} />
      </Routes>
    </SidebarLayout>
  );
}
