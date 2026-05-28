import { useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import ErrorBoundary from '../../components/ErrorBoundary';
import { KeySquare, MoonStar, AlertTriangle, LayoutDashboard, CreditCard } from 'lucide-react';
import { useHstAuthStore } from '../../store/hstAuthStore';
import SidebarLayout from '../../components/SidebarLayout';
import AdminOutPass from '../admin/AdminOutPass';
import AdminLatecome from '../admin/AdminLatecome';
import AdminComplaints from '../admin/AdminComplaints';
import AdminBilling from '../admin/AdminBilling';

function StaffHome() {
  const { user } = useHstAuthStore();
  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name}</h1>
        <p className="text-slate-500 text-sm mt-0.5 capitalize">Role: {user?.role}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {user?.role === 'warden' && (
          <>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Out-Pass Requests</p>
              <p className="text-sm text-slate-600">Review and approve resident out-pass requests.</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Late Arrivals</p>
              <p className="text-sm text-slate-600">Approve late arrival requests from residents.</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Complaints</p>
              <p className="text-sm text-slate-600">View and update status of resident complaints.</p>
            </div>
          </>
        )}
        {user?.role === 'accountant' && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Billing</p>
            <p className="text-sm text-slate-600">Generate monthly bills and manage payments.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const { logout, user, fetchMe } = useHstAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    if (!user) fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wardenNav = [
    { to: '/staff',            label: 'Dashboard',    icon: LayoutDashboard, end: true },
    // { to: '/staff/outpass',    label: 'Out-Passes',   icon: KeySquare },
    { to: '/staff/latecome',   label: 'Late Come',    icon: MoonStar },
    { to: '/staff/complaints', label: 'Complaints',   icon: AlertTriangle },
  ];
  const accountantNav = [
    { to: '/staff',         label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/staff/billing', label: 'Billing',   icon: CreditCard },
  ];

  const nav = user?.role === 'accountant' ? accountantNav : wardenNav;

  return (
    <SidebarLayout navItems={nav} user={user} onLogout={handleLogout}>
      <Routes>
        <Route index              element={<ErrorBoundary inline><StaffHome /></ErrorBoundary>} />
        <Route path="outpass"    element={<ErrorBoundary inline><AdminOutPass /></ErrorBoundary>} />
        <Route path="latecome"   element={<ErrorBoundary inline><AdminLatecome /></ErrorBoundary>} />
        <Route path="complaints" element={<ErrorBoundary inline><AdminComplaints /></ErrorBoundary>} />
        <Route path="billing"    element={<ErrorBoundary inline><AdminBilling /></ErrorBoundary>} />
      </Routes>
    </SidebarLayout>
  );
}
