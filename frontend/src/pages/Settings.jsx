import { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Eye,
  EyeOff,
  QrCode,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth as authApi } from '../lib/api';
import useAuthStore from '../store/auth';
import { cn, getPasswordStrength } from '../lib/utils';

// ---- Change Password Section ----
function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      // First verify current password
      const verified = await authApi.verifyPassword(currentPassword);
      if (!verified?.verified) {
        toast.error('Current password is incorrect');
        setSaving(false);
        return;
      }
      // The actual password change would go through a dedicated endpoint
      // For now we'll show success since verify-password confirmed the current pw
      toast.success('Password verification successful. Contact admin to change password via backend.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl bg-vault-input border border-vault-border',
    'text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent transition-all'
  );

  return (
    <div className="bg-vault-card border border-vault-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-vault-accent/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-vault-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-vault-text">Change Password</h3>
          <p className="text-sm text-vault-text-secondary">Update your account password</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              className={cn(inputClass, 'pr-10')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text-secondary hover:text-vault-text"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              className={cn(inputClass, 'pr-10')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text-secondary hover:text-vault-text"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {newPassword && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-vault-text-secondary">Strength</span>
                <span className="text-[10px] font-medium text-vault-text-secondary">{strength.label}</span>
              </div>
              <div className="w-full h-1 bg-vault-border rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', strength.color)}
                  style={{ width: `${strength.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Confirm New Password</label>
          <input
            type="password"
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-vault-accent hover:bg-vault-accent-hover transition-all disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Update Password
        </button>
      </form>
    </div>
  );
}

// ---- 2FA Setup Section ----
function TwoFactorSection() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [qrData, setQrData] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const has2FA = user?.totp_enabled;

  const handleSetup = async () => {
    setLoading(true);
    try {
      const data = await authApi.setup2FA();
      setQrData(data);
    } catch (error) {
      toast.error(error.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await authApi.verify2FA(verifyCode);
      toast.success('Two-factor authentication enabled!');
      setQrData(null);
      setVerifyCode('');
      refreshUser();
    } catch (error) {
      toast.error(error.message || 'Invalid code');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) return;
    setDisabling(true);
    try {
      await authApi.disable2FA();
      toast.success('Two-factor authentication disabled');
      refreshUser();
    } catch (error) {
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setDisabling(false);
    }
  };

  return (
    <div className="bg-vault-card border border-vault-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            has2FA ? 'bg-green-500/10' : 'bg-amber-500/10'
          )}
        >
          {has2FA ? (
            <ShieldCheck className="w-5 h-5 text-green-400" />
          ) : (
            <ShieldOff className="w-5 h-5 text-amber-400" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-vault-text">Two-Factor Authentication</h3>
          <p className="text-sm text-vault-text-secondary">
            {has2FA ? 'Your account is protected with 2FA' : 'Add an extra layer of security'}
          </p>
        </div>
      </div>

      {has2FA ? (
        <div>
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/20">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-400 font-medium">2FA is enabled</span>
          </div>
          <button
            onClick={handleDisable}
            disabled={disabling}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            {disabling && <Loader2 className="w-4 h-4 animate-spin" />}
            Disable 2FA
          </button>
        </div>
      ) : qrData ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col items-center p-6 bg-white rounded-xl max-w-xs mx-auto">
            {qrData.qr_code ? (
              <img
                src={`data:image/png;base64,${qrData.qr_code}`}
                alt="QR Code for 2FA setup"
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                <QrCode className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

          {qrData.secret && (
            <div className="text-center">
              <p className="text-xs text-vault-text-secondary mb-1">Manual entry key:</p>
              <code className="text-sm font-mono text-vault-text bg-vault-bg px-3 py-1 rounded-lg select-all">
                {qrData.secret}
              </code>
            </div>
          )}

          <form onSubmit={handleVerify} className="max-w-xs mx-auto space-y-3">
            <p className="text-sm text-vault-text-secondary text-center">
              Scan the QR code with your authenticator app, then enter the 6-digit code below.
            </p>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 rounded-xl bg-vault-input border border-vault-border text-vault-text text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent transition-all"
              maxLength={6}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQrData(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifying || verifyCode.length !== 6}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-vault-accent hover:bg-vault-accent-hover transition-all disabled:opacity-50"
              >
                {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={handleSetup}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-vault-accent hover:bg-vault-accent-hover transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          Setup 2FA
        </button>
      )}
    </div>
  );
}

// ---- Main Page ----
export default function Settings() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vault-text">Settings</h1>
        <p className="text-vault-text-secondary mt-1">Manage your account preferences</p>
      </div>

      {/* Profile info */}
      <div className="bg-vault-card border border-vault-border rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-vault-accent/20 flex items-center justify-center">
            <span className="text-xl font-bold text-vault-accent">
              {(user?.display_name || user?.username)?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-vault-text">
              {user?.display_name || user?.username}
            </h3>
            <p className="text-sm text-vault-text-secondary">@{user?.username}</p>
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 capitalize',
                user?.role === 'admin'
                  ? 'bg-red-500/10 text-red-400'
                  : user?.role === 'manager'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-blue-500/10 text-blue-400'
              )}
            >
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      <ChangePasswordSection />
      <TwoFactorSection />
    </div>
  );
}
