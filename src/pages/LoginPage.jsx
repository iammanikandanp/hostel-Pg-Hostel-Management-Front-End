import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import hstApi from '../api/hstAxios';
import { useHstAuthStore } from '../store/hstAuthStore';
import Spinner from '../components/Spinner';

function redirectByRole(user, navigate) {
  if (user.mustChangePassword) navigate('/change-password');
  else if (user.role === 'admin') navigate('/admin');
  else if (user.role === 'security') navigate('/security');
  else if (['warden', 'accountant'].includes(user.role)) navigate('/staff');
  else navigate('/resident');
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpUserId, setOtpUserId] = useState(null);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, loading, fetchMe } = useHstAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login(email, password);
      // login() resolves with user OR {requires2FA, userId}
      if (result?.requires2FA) {
        setOtpUserId(result.userId);
        setOtpStep(true);
        toast.success('OTP sent to your registered WhatsApp number.');
      } else {
        redirectByRole(result, navigate);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await hstApi.post('/auth/verify-otp', { userId: otpUserId, otp });
      const user = await fetchMe();
      redirectByRole(user, navigate);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="h-11 w-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-900/50">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">HostelMS</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Smart Hostel<br />Management
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Everything your hostel needs — rooms, residents, billing, food, laundry, and out-passes in one place.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {['Room & resident management', 'Automated monthly billing', 'Food & laundry bookings', 'Out-pass approvals'].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="text-slate-300 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="h-11 w-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-slate-800 font-bold text-xl tracking-tight">HostelMS</span>
          </div>

          {otpStep ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-11 w-11 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-center">
                  <ShieldCheck size={22} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Two-Factor Verification</h2>
                  <p className="text-slate-500 text-sm">Enter the 6-digit OTP sent to your WhatsApp.</p>
                </div>
              </div>
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">One-Time Password</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    placeholder="••••••"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 placeholder-slate-400 tracking-widest text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-200"
                >
                  {submitting ? <><Spinner size="sm" className="border-indigo-300 border-t-white" /><span>Verifying…</span></> : 'Verify & Sign In'}
                </button>
                <button type="button" onClick={() => { setOtpStep(false); setOtp(''); }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-2 transition">
                  ← Back to login
                </button>
              </form>
            </>
          ) : (
            <>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-slate-500 mb-8 text-sm">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="border-indigo-300 border-t-white" />
                  <span>Signing in…</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-8">
            Hostel Management System &copy; {new Date().getFullYear()}
          </p>
          </> /* end else (non-OTP) */
          )}
        </div>
      </div>
    </div>
  );
}
