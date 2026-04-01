import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Building2, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      }
    } else {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    }
    setLoading(false);
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
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

          {isSignUp && submitted ? (
            <div className="text-center">
              <div className="flex items-center justify-center mb-5">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-100">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Request Submitted</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
                Your account has been created. An administrator will review your request and grant access shortly.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs text-gray-400 font-medium mb-1">Registered as</p>
                <p className="text-sm font-semibold text-gray-800">{email}</p>
              </div>
              <button
                onClick={switchMode}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {isSignUp ? t.login.createAccount : t.login.welcomeBack}
                  </h2>
                  <p className="text-gray-500">
                    {isSignUp ? t.login.signUpSubtitle : t.login.signInSubtitle}
                  </p>
                </div>
                <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                  <button
                    onClick={() => setLang('en')}
                    className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLang('bg')}
                    className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${lang === 'bg' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    BG
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="mb-5 p-3.5 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2.5">
                  <div className="w-4 h-4 mt-0.5 shrink-0 text-blue-500">
                    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 10.5h-1.5v-5h1.5v5zm0-6.5h-1.5V3.5h1.5V5z"/></svg>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    New accounts require administrator approval before access is granted. You will be notified once your request is reviewed.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.login.firstName}</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="input-field"
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
                        className="input-field"
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
                    className="input-field"
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
                      className="input-field pr-10"
                      placeholder={t.login.enterPassword}
                      required
                      minLength={6}
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

                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSignUp ? t.login.createAccountBtn : t.login.signIn}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                {isSignUp ? t.login.alreadyHaveAccount : t.login.dontHaveAccount}{' '}
                <button
                  onClick={switchMode}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {isSignUp ? t.login.signIn : t.login.createOne}
                </button>
              </p>

              <p className="mt-8 text-center text-xs text-gray-400">
                By using StayWise you agree to our{' '}
                <Link to="/terms" className="text-gray-500 hover:text-gray-700 underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-gray-500 hover:text-gray-700 underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
