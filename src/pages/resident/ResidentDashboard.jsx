import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ErrorBoundary from '../../components/ErrorBoundary';
import { Home, FileText, UtensilsCrossed, WashingMachine, KeySquare, MoonStar, AlertTriangle, UserCircle } from 'lucide-react';
import { useHstAuthStore } from '../../store/hstAuthStore';
import { useHstLangStore } from '../../store/hstLangStore';
import SidebarLayout from '../../components/SidebarLayout';
import ResidentHome from './ResidentHome';
import ResidentBills from './ResidentBills';
import ResidentFood from './ResidentFood';
import ResidentLaundry from './ResidentLaundry';
import ResidentOutPass from './ResidentOutPass';
import ResidentLatecome from './ResidentLatecome';
import ResidentComplaints from './ResidentComplaints';
import ResidentProfile from './ResidentProfile';

export default function ResidentDashboard() {
  const { logout, user, fetchMe } = useHstAuthStore();
  const { t } = useHstLangStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => { logout(); navigate('/login'); };

  const residentNav = [
    { to: '/resident',          label: t('nav_home'),        icon: Home,           end: true },
    { to: '/resident/bills',    label: t('nav_mybills'),     icon: FileText },
    { to: '/resident/food',     label: t('nav_foodbooking'), icon: UtensilsCrossed },
    { to: '/resident/laundry',  label: t('nav_laundry'),     icon: WashingMachine },
    { to: '/resident/outpass',  label: t('nav_outpass'),     icon: KeySquare },
    { to: '/resident/latecome',     label: t('nav_latecome'),    icon: MoonStar },
    { to: '/resident/complaints',   label: t('nav_complaints'),  icon: AlertTriangle },
    { to: '/resident/profile',      label: t('nav_profile'),     icon: UserCircle },
  ];

  return (
    <SidebarLayout navItems={residentNav} user={user} onLogout={handleLogout}>
      <Routes>
        <Route index           element={<ErrorBoundary inline><ResidentHome /></ErrorBoundary>} />
        <Route path="bills"    element={<ErrorBoundary inline><ResidentBills /></ErrorBoundary>} />
        <Route path="food"     element={<ErrorBoundary inline><ResidentFood /></ErrorBoundary>} />
        <Route path="laundry"  element={<ErrorBoundary inline><ResidentLaundry /></ErrorBoundary>} />
        <Route path="outpass"  element={<ErrorBoundary inline><ResidentOutPass /></ErrorBoundary>} />
        <Route path="latecome"    element={<ErrorBoundary inline><ResidentLatecome /></ErrorBoundary>} />
        <Route path="complaints"  element={<ErrorBoundary inline><ResidentComplaints /></ErrorBoundary>} />
        <Route path="profile"     element={<ErrorBoundary inline><ResidentProfile /></ErrorBoundary>} />
      </Routes>
    </SidebarLayout>
  );
}
