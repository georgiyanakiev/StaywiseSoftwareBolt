import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Building2, Eye, EyeOff, Loader2, ShieldCheck, Users, Headphones, Sparkles } from 'lucide-react';

const TEST_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'admin@demo.com',
    description: 'Full system access',
    icon: ShieldCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    role: 'Manager',
    email: 'manager@demo.com',
    description: 'Operations & reporting',
    icon: Users,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    role: 'Receptionist',
    email: 'receptionist@demo.com',
    description: 'Front desk & bookings',
    icon: Headphones,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    role: 'Housekeeping',
    email: 'housekeeping@demo.com',
    description: 'Cleaning & task views',
    icon: Sparkles,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
  },
];

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
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
      if (result.error) setError(result.error);
    } else {
      const result = await signIn(email, password);
      if (result.error) setError(result.error);
    }
    setLoading(false);
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
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {isSignUp ? t.login.signIn : t.login.createOne}
            </button>
          </p>

          {!isSignUp && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Test Accounts &mdash; password: <span className="font-bold text-gray-500">demo123456</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TEST_ACCOUNTS.map(({ role, email, description, icon: Icon, color, bg, border }) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => { setEmail(email); setPassword('demo123456'); }}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border ${bg} ${border} hover:shadow-sm transition-all text-left group`}
                  >
                    <div className={`mt-0.5 shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${color}`}>{role}</p>
                      <p className="text-xs text-gray-500 truncate leading-tight">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
