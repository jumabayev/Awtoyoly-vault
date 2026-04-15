import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/auth';
import useThemeStore from '../store/theme';
import { cn } from '../lib/utils';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password, totpCode || undefined);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      if (error.status === 401 && error.data?.requires_2fa) {
        setNeeds2FA(true);
        toast('Please enter your 2FA code', { icon: '🔐' });
      } else {
        toast.error(error.message || 'Login failed');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-vault-bg p-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-vault-accent/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-vault-accent" />
          </div>
          <h1 className="text-2xl font-bold text-vault-text">Awtoyoly Vault</h1>
          <p className="text-vault-text-secondary mt-1">Secure credential management</p>
        </div>

        {/* Login Card */}
        <div className="bg-vault-card border border-vault-border rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-vault-text-secondary mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={cn(
                  'w-full px-4 py-3 rounded-xl bg-vault-input border border-vault-border',
                  'text-vault-text placeholder-vault-text-secondary/50',
                  'focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent',
                  'transition-all'
                )}
                placeholder="Enter your username"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-vault-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    'w-full px-4 py-3 pr-12 rounded-xl bg-vault-input border border-vault-border',
                    'text-vault-text placeholder-vault-text-secondary/50',
                    'focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent',
                    'transition-all'
                  )}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text-secondary hover:text-vault-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 2FA Code */}
            {needs2FA && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-vault-text-secondary mb-2">
                  <KeyRound className="w-4 h-4 inline mr-1" />
                  Two-Factor Authentication Code
                </label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl bg-vault-input border border-vault-border',
                    'text-vault-text placeholder-vault-text-secondary/50 text-center text-2xl tracking-[0.5em] font-mono',
                    'focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent',
                    'transition-all'
                  )}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 rounded-xl font-semibold text-white',
                'bg-vault-accent hover:bg-vault-accent-hover',
                'focus:outline-none focus:ring-2 focus:ring-vault-accent/50',
                'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Theme Toggle */}
        <div className="text-center mt-6">
          <button
            onClick={toggleTheme}
            className="text-sm text-vault-text-secondary hover:text-vault-text transition-colors"
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </div>
    </div>
  );
}
