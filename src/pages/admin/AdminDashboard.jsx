import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ErrorBoundary from '../../components/ErrorBoundary';
import toast from 'react-hot-toast';
import { LayoutDashboard, Building2, Users, CreditCard, UtensilsCrossed, KeySquare, MoonStar, WashingMachine, AlertTriangle, ShieldCheck, UserCog, UserCheck, Megaphone, TrendingDown, CalendarCheck, Wrench, Package, Monitor, UserPlus, ClipboardCheck } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { useHstAuthStore } from '../../store/hstAuthStore';
import { useHstLangStore } from '../../store/hstLangStore';
import SidebarLayout from '../../components/SidebarLayout';
import { PageLoader } from '../../components/Spinner';
import AdminRooms from './AdminRooms';
import AdminResidents from './AdminResidents';
import AdminBilling from './AdminBilling';
import AdminFood from './AdminFood';
import AdminOutPass from './AdminOutPass';
import AdminLatecome from './AdminLatecome';
import AdminLaundry from './AdminLaundry';
import AdminComplaints from './AdminComplaints';
import AdminAuditLog from './AdminAuditLog';
import AdminStaff from './AdminStaff';
import AdminSecurity from './AdminSecurity';
import VisitorLog from '../shared/VisitorLog';
import AdminNotices from './AdminNotices';
import AdminExpenses from './AdminExpenses';
import AdminFoodMenu from './AdminFoodMenu';
import AdminAttendance from './AdminAttendance';
import AdminWaitlist from './AdminWaitlist';
import AdminMaintenance from './AdminMaintenance';
import AdminAssets from './AdminAssets';
import AdminSessions from './AdminSessions';
import AdminFoodConsume from './AdminFoodConsume';

function StatCard({ label, value, sub, color }) {
  const styles = {
    indigo:  { wrap: 'bg-indigo-50 border-indigo-100',  val: 'text-indigo-700',  dot: 'bg-indigo-500' },
    emerald: { wrap: 'bg-emerald-50 border-emerald-100', val: 'text-emerald-700', dot: 'bg-emerald-500' },
    violet:  { wrap: 'bg-violet-50 border-violet-100',  val: 'text-violet-700',  dot: 'bg-violet-500' },
    amber:   { wrap: 'bg-amber-50 border-amber-100',    val: 'text-amber-700',   dot: 'bg-amber-500' },
  };
  const s = styles[color];
  return (
    <div className={`rounded-2xl border p-5 ${s.wrap}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2 w-2 rounded-full ${s.dot}`} />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${s.val}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function AdminHome() {
  const [stats, setStats] = useState(null);
  const { t } = useHstLangStore();

  useEffect(() => {
    hstApi.get('/residents/admin/dashboard')
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load dashboard'));
  }, []);

  if (!stats) return <PageLoader />;

  return (
    <div className="p-5 md:p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('dashboard_title')}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t('dashboard_subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('dashboard_total_rooms')}      value={stats.rooms?.total}          color="indigo" />
        <StatCard label={t('dashboard_seats_occupied')}   value={`${stats.rooms?.takenSeats}/${stats.rooms?.totalSeats}`} color="emerald" sub={t('dashboard_seats_filled')} />
        <StatCard label={t('dashboard_active_residents')} value={stats.residents}              color="violet" />
        <StatCard label={t('dashboard_pending_passes')}   value={stats.pendingOutpassRequests} color="amber"  sub={t('dashboard_awaiting_approval')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-slate-400" />
            {t('dashboard_billing_month')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{t('dashboard_total_due')}</span>
              <span className="font-semibold text-slate-800">₹{stats.billing?.totalDue?.toLocaleString('en-IN') ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{t('dashboard_total_paid')}</span>
              <span className="font-semibold text-emerald-600">₹{stats.billing?.totalPaid?.toLocaleString('en-IN') ?? 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-sm text-slate-500">{t('dashboard_unpaid_residents')}</span>
              <span className="font-semibold text-red-500">{stats.billing?.unpaidResidents ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <UtensilsCrossed size={16} className="text-slate-400" />
            {t('dashboard_todays_meals')}
          </h3>
          <div className="space-y-3">
            {[
              { labelKey: 'dashboard_breakfast', key: 'breakfast', color: 'bg-amber-400' },
              { labelKey: 'dashboard_lunch',     key: 'lunch',     color: 'bg-emerald-400' },
              { labelKey: 'dashboard_dinner',    key: 'dinner',    color: 'bg-indigo-400' },
            ].map(m => (
              <div key={m.key} className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${m.color}`} />
                <span className="text-sm text-slate-500 flex-1">{t(m.labelKey)}</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {stats.todayFood?.[m.key] ?? 0} {t('dashboard_bookings')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { logout, user, fetchMe } = useHstAuthStore();
  const { t } = useHstLangStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) fetchMe();
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const adminNav = [
    { to: '/admin',           label: t('nav_dashboard'), icon: LayoutDashboard, end: true },
    { to: '/admin/rooms',     label: t('nav_rooms'),      icon: Building2 },
    { to: '/admin/residents', label: t('nav_residents'),  icon: Users },
    { to: '/admin/billing',   label: t('nav_billing'),    icon: CreditCard },
    { to: '/admin/food',      label: t('nav_food'),       icon: UtensilsCrossed },
    { to: '/admin/food-consume', label: 'Meal Tracking',  icon: ClipboardCheck },
    // { to: '/admin/outpass',   label: t('nav_outpasses'),  icon: KeySquare },
    { to: '/admin/laundry',   label: t('nav_laundry'),    icon: WashingMachine },
    { to: '/admin/latecome',     label: t('nav_latecome'),    icon: MoonStar },
    { to: '/admin/complaints',   label: t('nav_complaints'),  icon: AlertTriangle },
    { sectionHeader: 'Settings' },
    { to: '/admin/audit',        label: t('nav_audit'),       icon: ShieldCheck },
    { to: '/admin/staff',        label: t('nav_staff'),       icon: UserCog },
    { to: '/admin/security',     label: t('nav_security'),    icon: ShieldCheck },
    { to: '/admin/visitors',     label: t('nav_visitors'),    icon: UserCheck },
    { to: '/admin/notices',      label: t('nav_notices'),     icon: Megaphone },
    { to: '/admin/expenses',     label: t('nav_expenses'),    icon: TrendingDown },
    { to: '/admin/attendance',   label: t('nav_attendance'),  icon: CalendarCheck },
    { to: '/admin/waitlist',     label: t('nav_waitlist'),    icon: UserPlus },
    { to: '/admin/maintenance',  label: t('nav_maintenance'), icon: Wrench },
    { to: '/admin/assets',       label: t('nav_assets'),      icon: Package },
    { to: '/admin/sessions',     label: t('nav_sessions'),    icon: Monitor },
  ];

  return (
    <SidebarLayout navItems={adminNav} user={user} onLogout={handleLogout}>
      <Routes>
        <Route index          element={<ErrorBoundary inline><AdminHome /></ErrorBoundary>} />
        <Route path="rooms"     element={<ErrorBoundary inline><AdminRooms /></ErrorBoundary>} />
        <Route path="residents" element={<ErrorBoundary inline><AdminResidents /></ErrorBoundary>} />
        <Route path="billing"   element={<ErrorBoundary inline><AdminBilling /></ErrorBoundary>} />
        <Route path="food"         element={<ErrorBoundary inline><AdminFood /></ErrorBoundary>} />
        <Route path="food-consume" element={<ErrorBoundary inline><AdminFoodConsume /></ErrorBoundary>} />
        {/* <Route path="outpass"   element={<ErrorBoundary inline><AdminOutPass /></ErrorBoundary>} /> */}
        <Route path="laundry"   element={<ErrorBoundary inline><AdminLaundry /></ErrorBoundary>} />
        <Route path="latecome"    element={<ErrorBoundary inline><AdminLatecome /></ErrorBoundary>} />
        <Route path="complaints"  element={<ErrorBoundary inline><AdminComplaints /></ErrorBoundary>} />
        <Route path="audit"       element={<ErrorBoundary inline><AdminAuditLog /></ErrorBoundary>} />
        <Route path="staff"       element={<ErrorBoundary inline><AdminStaff /></ErrorBoundary>} />
        <Route path="security"    element={<ErrorBoundary inline><AdminSecurity /></ErrorBoundary>} />
        <Route path="visitors"    element={<ErrorBoundary inline><VisitorLog /></ErrorBoundary>} />
        <Route path="notices"     element={<ErrorBoundary inline><AdminNotices /></ErrorBoundary>} />
        <Route path="expenses"    element={<ErrorBoundary inline><AdminExpenses /></ErrorBoundary>} />
        <Route path="food-menu"   element={<ErrorBoundary inline><AdminFoodMenu /></ErrorBoundary>} />
        <Route path="attendance"  element={<ErrorBoundary inline><AdminAttendance /></ErrorBoundary>} />
        <Route path="waitlist"    element={<ErrorBoundary inline><AdminWaitlist /></ErrorBoundary>} />
        <Route path="maintenance" element={<ErrorBoundary inline><AdminMaintenance /></ErrorBoundary>} />
        <Route path="assets"      element={<ErrorBoundary inline><AdminAssets /></ErrorBoundary>} />
        <Route path="sessions"    element={<ErrorBoundary inline><AdminSessions /></ErrorBoundary>} />
      </Routes>
    </SidebarLayout>
  );
}
