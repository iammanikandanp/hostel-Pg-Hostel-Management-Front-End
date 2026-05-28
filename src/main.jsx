import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

import LoginPage          from './pages/LoginPage';
import AdminDashboard     from './pages/admin/AdminDashboard';
import ResidentDashboard  from './pages/resident/ResidentDashboard';
import ChangePasswordPage from './pages/ChangePasswordPage';
import StaffDashboard     from './pages/staff/StaffDashboard';
import SecurityDashboard  from './pages/security/SecurityDashboard';
import ErrorBoundary      from './components/ErrorBoundary';
import MealCheckinPage    from './pages/shared/MealCheckinPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/meal-checkin"    element={<MealCheckinPage />} />
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/admin/*"         element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
            <Route path="/resident/*"      element={<ErrorBoundary><ResidentDashboard /></ErrorBoundary>} />
            <Route path="/staff/*"         element={<ErrorBoundary><StaffDashboard /></ErrorBoundary>} />
            <Route path="/security/*"      element={<ErrorBoundary><SecurityDashboard /></ErrorBoundary>} />
            <Route path="*"                element={<Navigate to="/login" />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
