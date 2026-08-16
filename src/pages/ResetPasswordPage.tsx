import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { validatePassword } from '../lib/passwordValidation';
import { Building2, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import LegalFooter from '../components/legal/LegalFooter';

type PageState = 'loading' | 'ready' | 'success' | 'invalid';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready');
      }
    });

    const timer = setTimeout(() => {
      setPageState(prev => prev === 'loading' ? 'invalid' : prev);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t.login.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.login.passwordMismatch);
      return;
    }
    const pwIssues = validatePassword(password);
    if (pwIssues.length > 0) {
      setError(pwIssues[0].message);
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error('Password update failed', updateError);
      setError('We could not update your password. Please request a new reset link and try again.');
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setPageState('success');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <img
            src="https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            alt="Hotel"
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">StayWise</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
              {t.login.tagline}
            </h1>
            <p className="text-gray-300 text-base max-w-md leading-relaxed">
              {t.login.description}
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">StayWise</span>
            </div>

            {pageState === 'loading' && (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">{t.common.loading}</p>
              </div>
            )}

            {pageState === 'invalid' && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-5">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-100">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.common.error}</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
                  {t.login.invalidResetLink}
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  {t.login.backToSignIn}
                </Link>
              </div>
            )}

            {pageState === 'success' && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-5">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-100">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.login.passwordUpdated}</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
                  {t.login.passwordUpdatedDesc}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  {t.login.signIn}
                </button>
              </div>
            )}

            {pageState === 'ready' && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{t.login.resetPassword}</h2>
                  <p className="text-gray-500 text-sm">{t.login.resetPasswordSubtitle}</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.login.newPassword}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="input-field pr-10"
                        placeholder="••••••••"
                        required
                        minLength={8}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.login.confirmPassword}</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="input-field pr-10"
                        placeholder="••••••••"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t.login.updatePassword}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                  <Link
                    to="/"
                    className="font-medium text-brand-600 hover:text-brand-700"
                  >
                    {t.login.backToSignIn}
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
