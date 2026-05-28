import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import hstApi from '../../api/hstAxios';
import { useHstAuthStore } from '../../store/hstAuthStore';
import { PageLoader } from '../../components/Spinner';

export default function AdminSecurity() {
  const { user, fetchMe } = useHstAuthStore();
  const [toggling, setToggling] = useState(false);

  const handleToggle2FA = async () => {
    const enable = !user?.twoFaEnabled;
    setToggling(true);
    try {
      await hstApi.patch('/auth/2fa', { enable });
      await fetchMe();
      toast.success(`Two-factor authentication ${enable ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update 2FA');
    } finally { setToggling(false); }
  };

  const is2FAOn = user?.twoFaEnabled ?? false;

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Security Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account security preferences.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg space-y-5">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${is2FAOn ? 'bg-indigo-50' : 'bg-slate-100'}`}>
            {is2FAOn
              ? <ShieldCheck size={24} className="text-indigo-600" />
              : <ShieldOff size={24} className="text-slate-400" />
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Two-Factor Authentication</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${is2FAOn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {is2FAOn ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              When enabled, a 6-digit OTP will be sent to your WhatsApp number
              {user?.phone ? ` (+91${user.phone})` : ''} on every login.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={handleToggle2FA}
            disabled={toggling}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition ${
              is2FAOn
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            } disabled:opacity-50`}
          >
            {toggling ? 'Updating…' : is2FAOn ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
          {!is2FAOn && (
            <p className="text-xs text-slate-400 text-center mt-2">
              Make sure your WhatsApp number is correct before enabling.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
