import { useState } from 'react';
import PasswordStrengthMeter from '../PasswordStrengthMeter';
import { useToast } from '../Toast';
import { api } from '../../api';
import { useAuth } from '../AuthContext';

export default function SecuritySettings() {
  const { user, updateUser, changePassword } = useAuth();
  const { addToast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [setup2FA, setSetup2FA] = useState(null);
  const [token2FA, setToken2FA] = useState('');
  const [toggling2FA, setToggling2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      addToast('Passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPass.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(passwordForm);
      addToast('Password changed successfully', 'success');
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      setShowPassword(false);
    } catch (err) {
      addToast(err.message, 'error');
    }
    setChangingPassword(false);
  };

  const handleStart2FA = async () => {
    try {
      const res = await api.auth.setup2FA();
      setSetup2FA(res);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setToggling2FA(true);
    try {
      await api.auth.verify2FA({ token: token2FA });
      updateUser({ two_factor_enabled: true });
      setSetup2FA(null);
      setToken2FA('');
      addToast('Two-factor authentication enabled', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setToggling2FA(false);
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setToggling2FA(true);
    try {
      await api.auth.disable2FA({ token: token2FA });
      updateUser({ two_factor_enabled: false });
      setShowDisable2FA(false);
      setToken2FA('');
      addToast('Two-factor authentication disabled', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setToggling2FA(false);
  };

  return (
    <>
      <div className="premium-card-elevated p-6 sm:p-8 mt-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text">Password</h3>
          {!showPassword && (
            <button onClick={() => setShowPassword(true)} className="text-sm text-accent font-semibold hover:text-accent-dark transition-colors">Change</button>
          )}
        </div>
        {showPassword && (
          <form onSubmit={handlePasswordChange} className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Current Password</label>
              <input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} required className="input-field" placeholder="Enter current password" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">New Password</label>
                <input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })} required minLength={8} className="input-field" placeholder="Min. 8 characters" />
                <PasswordStrengthMeter value={passwordForm.newPass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Confirm Password</label>
                <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required className="input-field" placeholder="Re-enter new password" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowPassword(false); setPasswordForm({ current: '', newPass: '', confirm: '' }); }} className="btn-outline flex-1 !py-3 !rounded-2xl">Cancel</button>
              <button type="submit" disabled={changingPassword} className="btn-primary flex-1 !py-3 !rounded-2xl text-base">
                {changingPassword ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</span> : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="premium-card-elevated p-6 sm:p-8 mt-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Two-Factor Authentication
          </h3>
          <span className={`badge text-xs ${user?.two_factor_enabled ? 'badge-green' : 'badge-gray'}`}>
            {user?.two_factor_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="text-sm text-subtle mb-6">Add an extra layer of security to your account by requiring a code from an authenticator app when you log in.</p>

        {!user?.two_factor_enabled ? (
          !setup2FA ? (
            <button onClick={handleStart2FA} className="btn-primary !py-2 !px-4 !rounded-xl text-sm">Set up 2FA</button>
          ) : (
            <div className="bg-gray-50 border border-border rounded-2xl p-6 animate-slide-up">
              <h4 className="font-semibold text-text mb-2">Step 1: Scan QR Code</h4>
              <p className="text-sm text-subtle mb-4">Open your authenticator app (e.g. Google Authenticator, Authy) and scan this QR code.</p>
              <div className="bg-white p-2 rounded-xl inline-block shadow-sm border border-border mb-4">
                <img src={setup2FA.qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
              </div>
              
              <h4 className="font-semibold text-text mb-2">Step 2: Verify Code</h4>
              <p className="text-sm text-subtle mb-4">Enter the 6-digit code generated by your app to confirm setup.</p>
              <form onSubmit={handleVerify2FA} className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={token2FA} onChange={e => setToken2FA(e.target.value)} required maxLength={6} className="input-field max-w-[200px] text-center font-mono tracking-widest text-lg" placeholder="000000" />
                <button type="submit" disabled={toggling2FA || token2FA.length < 6} className="btn-primary !py-2.5 !px-6 !rounded-xl text-sm">
                  {toggling2FA ? 'Verifying...' : 'Enable 2FA'}
                </button>
                <button type="button" onClick={() => { setSetup2FA(null); setToken2FA(''); }} className="btn-outline !py-2.5 !px-4 !rounded-xl text-sm">Cancel</button>
              </form>
            </div>
          )
        ) : (
          !showDisable2FA ? (
            <button onClick={() => setShowDisable2FA(true)} className="btn-outline !py-2 !px-4 !rounded-xl text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">Disable 2FA</button>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 animate-slide-up">
              <h4 className="font-semibold text-red-800 mb-2">Disable Two-Factor Authentication</h4>
              <p className="text-sm text-red-600/80 mb-4">Please enter a code from your authenticator app to confirm you want to disable 2FA.</p>
              <form onSubmit={handleDisable2FA} className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={token2FA} onChange={e => setToken2FA(e.target.value)} required maxLength={6} className="input-field max-w-[200px] text-center font-mono tracking-widest text-lg bg-white border-red-200 focus:ring-red-500/20" placeholder="000000" />
                <button type="submit" disabled={toggling2FA || token2FA.length < 6} className="btn-primary !py-2.5 !px-6 !rounded-xl text-sm !bg-red-600 hover:!bg-red-700 shadow-red !shadow-red-500/30">
                  {toggling2FA ? 'Disabling...' : 'Confirm Disable'}
                </button>
                <button type="button" onClick={() => { setShowDisable2FA(false); setToken2FA(''); }} className="btn-outline !py-2.5 !px-4 !rounded-xl text-sm !border-red-200 !text-red-700 hover:!bg-red-100">Cancel</button>
              </form>
            </div>
          )
        )}
      </div>
    </>
  );
}
