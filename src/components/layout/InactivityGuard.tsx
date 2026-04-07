import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, LogOut } from 'lucide-react';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_TIMEOUT_MS = 2 * 60 * 1000;

export default function InactivityGuard() {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  }, []);

  const handleSignOut = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    await signOut();
  }, [clearAllTimers, signOut]);

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true);
    setCountdown(120);

    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    warningTimer.current = setTimeout(() => {
      handleSignOut();
    }, WARNING_TIMEOUT_MS);
  }, [handleSignOut]);

  const resetTimer = useCallback(() => {
    if (!user) return;
    clearAllTimers();
    setShowWarning(false);

    inactivityTimer.current = setTimeout(() => {
      startWarningCountdown();
    }, INACTIVITY_TIMEOUT_MS);
  }, [user, clearAllTimers, startWarningCountdown]);

  const handleStaySignedIn = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    resetTimer();
  }, [clearAllTimers, resetTimer]);

  useEffect(() => {
    if (!user) {
      clearAllTimers();
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      if (!showWarning) resetTimer();
    };

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearAllTimers();
    };
  }, [user, resetTimer, clearAllTimers, showWarning]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-fade-in">
        <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mx-auto mb-4">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          Session Expiring Soon
        </h3>
        <p className="text-sm text-gray-500 text-center mb-1">
          You have been inactive for 30 minutes. For security, you will be automatically signed out in:
        </p>
        <div className="text-3xl font-bold text-amber-600 text-center my-4">
          {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleStaySignedIn}
            className="w-full py-2.5 px-4 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#172e4c] transition-colors"
          >
            Stay Signed In
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
