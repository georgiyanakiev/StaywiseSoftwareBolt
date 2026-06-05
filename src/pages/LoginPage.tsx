import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, Mail, Smartphone, Monitor, Tablet } from 'lucide-react';

type LoginTab = 'email' | 'phone' | 'google';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<LoginTab>('email');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  const enterForgotPassword = () => {
    setIsForgotPassword(true);
    setError('');
    setResetSent(false);
  };

  const exitForgotPassword = () => {
    setIsForgotPassword(false);
    setError('');
    setResetSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cooldownEnd && Date.now() < cooldownEnd) {
      const secsLeft = Math.ceil((cooldownEnd - Date.now()) / 1000);
      setError(`Too many failed attempts. Please wait ${secsLeft} second${secsLeft !== 1 ? 's' : ''} before trying again.`);
      return;
    }

    setLoading(true);

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim()) {
        setError(t.login.nameRequired);
        setLoading(false);
        return;
      }
      const result = await signUp(email, password, firstName, lastName);
      if (result.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
        setFailedAttempts(0);
        setCooldownEnd(null);
      }
    } else {
      const result = await signIn(email, password);
      if (result.error) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 5) {
          setCooldownEnd(Date.now() + 30000);
          setError('Too many failed attempts. Please wait 30 seconds before trying again.');
        } else {
          setError(result.error);
        }
      } else {
        setFailedAttempts(0);
        setCooldownEnd(null);
      }
    }
    setLoading(false);
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSubmitted(false);
  };

  const renderFormContent = () => {
    if (isForgotPassword) {
      if (resetSent) {
        return (
          <div className="text-center px-2">
            <div className="flex items-center justify-center mb-5">
              <div className="w-16 h-16 bg-[#1ABCB4]/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#1ABCB4]" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Link Sent</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-4 max-w-xs mx-auto">
              If <span className="font-medium text-gray-700">{email}</span> is registered, a password reset link will be sent.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs mx-auto">
              If you don't receive an email, contact your hotel administrator.
            </p>
            <button
              onClick={exitForgotPassword}
              className="text-sm font-semibold text-[#1ABCB4] hover:text-[#159e97] transition-colors flex items-center gap-1.5 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>
          </div>
        );
      }

      return (
        <>
          <button
            onClick={exitForgotPassword}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Reset Password</h3>
          <p className="text-gray-500 text-sm mb-5">Enter your email to receive a reset link.</p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1ABCB4]/30 focus:border-[#1ABCB4] transition-all bg-gray-50/50"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1e3a5f] text-white text-sm font-semibold rounded-lg hover:bg-[#172e4c] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Reset Link
            </button>
          </form>
        </>
      );
    }

    if (isSignUp && submitted) {
      return (
        <div className="text-center px-2">
          <div className="flex items-center justify-center mb-5">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs mx-auto">
            Your account has been created. An administrator will review and grant access shortly.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-[11px] text-gray-400 font-medium mb-0.5">Registered as</p>
            <p className="text-sm font-semibold text-gray-800">{email}</p>
          </div>
          <button
            onClick={switchMode}
            className="text-sm font-semibold text-[#1ABCB4] hover:text-[#159e97] transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      );
    }

    return (
      <>
        {!isSignUp && (
          <div className="flex border-b border-gray-200 mb-6">
            {(['email', 'phone', 'google'] as LoginTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium transition-all relative ${
                  activeTab === tab
                    ? 'text-[#1e3a5f]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'email' ? 'Email' : tab === 'phone' ? 'Phone' : 'Google'}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1ABCB4] rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}

        {isSignUp && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 10.5h-1.5v-5h1.5v5zm0-6.5h-1.5V3.5h1.5V5z"/></svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              New accounts require administrator approval before access is granted.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {activeTab === 'email' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.login.firstName}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1ABCB4]/30 focus:border-[#1ABCB4] transition-all bg-gray-50/50"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.login.lastName}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1ABCB4]/30 focus:border-[#1ABCB4] transition-all bg-gray-50/50"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.login.email}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1ABCB4]/30 focus:border-[#1ABCB4] transition-all bg-gray-50/50"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.login.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1ABCB4]/30 focus:border-[#1ABCB4] transition-all bg-gray-50/50 pr-10"
                  placeholder={t.login.enterPassword}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1e3a5f] text-white text-sm font-semibold rounded-lg hover:bg-[#172e4c] transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm hover:shadow-md"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignUp ? t.login.createAccountBtn : 'Sign In'}
            </button>

            {!isSignUp && (
              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={enterForgotPassword}
                  className="text-sm font-medium text-[#1ABCB4] hover:text-[#159e97] transition-colors"
                >
                  {t.login.forgotPassword}
                </button>
                <button
                  type="button"
                  onClick={enterForgotPassword}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Trouble logging in?
                </button>
              </div>
            )}
          </form>
        ) : activeTab === 'phone' ? (
          <div className="text-center py-10">
            <Smartphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Phone sign-in coming soon.</p>
            <p className="text-xs text-gray-400 mt-1">Please use email for now.</p>
          </div>
        ) : (
          <div className="text-center py-10">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <p className="text-sm text-gray-500">Google sign-in coming soon.</p>
            <p className="text-xs text-gray-400 mt-1">Please use email for now.</p>
          </div>
        )}

        <p className="mt-5 text-center text-sm text-gray-500">
          {isSignUp ? t.login.alreadyHaveAccount : t.login.dontHaveAccount}{' '}
          <button
            onClick={switchMode}
            className="font-semibold text-[#1ABCB4] hover:text-[#159e97] transition-colors"
          >
            {isSignUp ? t.login.signIn : t.login.createOne}
          </button>
        </p>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#1e3a5f] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Main card */}
      <div className="relative w-full max-w-[920px] bg-white rounded-2xl shadow-2xl overflow-hidden flex min-h-[560px]">

        {/* Left side - Form */}
        <div className="flex-1 flex flex-col p-8 sm:p-10 lg:p-12">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img
              src="/staywisesoftware_logo_v8.png"
              alt="StayWise Software"
              className="h-10 w-auto"
            />
          </div>

          {/* Header */}
          {!isForgotPassword && !submitted && (
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-[#1e3a5f] tracking-tight">
                {isSignUp ? 'Create Your Account' : 'Welcome to StayWise Software'}
              </h1>
              <p className="text-sm font-medium text-[#1ABCB4] mt-1">
                Hotel Management Portal
              </p>
            </div>
          )}

          {/* Form content */}
          <div className="flex-1 flex flex-col justify-center">
            {renderFormContent()}
          </div>

          {/* Legal */}
          {!isForgotPassword && !submitted && (
            <p className="mt-6 text-center text-[11px] text-gray-400 leading-relaxed">
              By signing in you agree to our{' '}
              <Link to="/terms" className="text-gray-500 hover:text-[#1ABCB4] underline transition-colors">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-gray-500 hover:text-[#1ABCB4] underline transition-colors">Privacy Policy</Link>.
            </p>
          )}
        </div>

        {/* Right side - Illustration */}
        <div className="hidden lg:flex w-[380px] bg-gradient-to-br from-[#f0f9f8] to-[#e8f4f3] flex-col items-center justify-center p-10 relative border-l border-gray-100">
          {/* Decorative circles */}
          <div className="absolute top-6 right-6 w-20 h-20 rounded-full bg-[#1ABCB4]/5" />
          <div className="absolute bottom-10 left-6 w-14 h-14 rounded-full bg-[#1e3a5f]/5" />

          {/* Hotel icon */}
          <div className="w-20 h-20 bg-[#1e3a5f] rounded-2xl flex items-center justify-center mb-8 shadow-lg">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
              <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
            </svg>
          </div>

          {/* Device mockups */}
          <div className="flex items-end gap-4 mb-8">
            {/* Tablet */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-11 bg-white rounded-md border-2 border-[#1e3a5f]/20 flex items-center justify-center shadow-sm">
                <div className="w-12 h-7 bg-gradient-to-br from-[#1e3a5f]/10 to-[#1ABCB4]/10 rounded-sm flex items-center justify-center">
                  <Tablet className="w-4 h-4 text-[#1e3a5f]/40" />
                </div>
              </div>
              <div className="w-4 h-0.5 bg-[#1e3a5f]/15 mt-0.5 rounded-full" />
            </div>
            {/* Laptop */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-16 bg-white rounded-md border-2 border-[#1e3a5f]/20 flex items-center justify-center shadow-sm relative">
                <div className="w-20 h-12 bg-gradient-to-br from-[#1e3a5f]/10 to-[#1ABCB4]/10 rounded-sm flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-[#1e3a5f]/40" />
                </div>
              </div>
              <div className="w-28 h-1.5 bg-[#1e3a5f]/10 rounded-full mt-0.5" />
            </div>
            {/* Phone */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-14 bg-white rounded-md border-2 border-[#1e3a5f]/20 flex items-center justify-center shadow-sm">
                <div className="w-6 h-10 bg-gradient-to-br from-[#1e3a5f]/10 to-[#1ABCB4]/10 rounded-sm flex items-center justify-center">
                  <Smartphone className="w-3 h-3 text-[#1e3a5f]/40" />
                </div>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-[#1e3a5f] font-semibold text-base text-center">
            Manage your hotel from anywhere
          </p>
          <p className="text-gray-400 text-xs text-center mt-1.5 max-w-[220px]">
            Access your dashboard on any device, anytime
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative flex items-center justify-between w-full max-w-[920px] mt-5 px-1">
        {/* Language toggle */}
        <div className="flex items-center rounded-lg overflow-hidden border border-white/20">
          <button
            onClick={() => setLanguage('bg')}
            className={`px-3 py-1.5 text-xs font-bold transition-all ${
              language === 'bg'
                ? 'bg-white text-[#1e3a5f]'
                : 'bg-transparent text-white/60 hover:text-white/90'
            }`}
          >
            BG
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 text-xs font-bold transition-all ${
              language === 'en'
                ? 'bg-white text-[#1e3a5f]'
                : 'bg-transparent text-white/60 hover:text-white/90'
            }`}
          >
            EN
          </button>
        </div>

        {/* Copyright */}
        <p className="text-xs text-white/40">
          &copy; 2026 StayWise Software
        </p>
      </div>
    </div>
  );
}
