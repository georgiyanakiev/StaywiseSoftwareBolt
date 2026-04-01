import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Check, ExternalLink, FileText } from 'lucide-react';
import { useDpaAcceptance } from '../../pages/legal/useDpaAcceptance';

interface DpaAcceptanceModalProps {
  userId: string;
  tenantId: string | null | undefined;
  onAccepted: () => void;
}

export default function DpaAcceptanceModal({ userId, tenantId, onAccepted }: DpaAcceptanceModalProps) {
  const [checked, setChecked] = useState(false);
  const { accepting, error, accept } = useDpaAcceptance(userId, tenantId);

  const handleAccept = async () => {
    if (!checked) return;
    const ok = await accept();
    if (ok) onAccepted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Data Processing Agreement</h2>
              <p className="text-blue-100 text-xs mt-0.5">Required for GDPR compliance — GDPR Art. 28</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-gray-700 text-sm leading-relaxed">
            Before continuing, please review and accept the{' '}
            <strong>Data Processing Agreement</strong> between your hotel (Data Controller)
            and Soft Care Concept EOOD — StayWise (Data Processor).
          </p>

          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">This agreement covers:</p>
            <ul className="space-y-1.5">
              {[
                'How StayWise processes guest data on your behalf',
                'Technical and organisational security measures',
                'Sub-processors used (Supabase, Stripe, Netlify)',
                'Your rights and obligations as Data Controller',
                'Breach notification within 72 hours',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-blue-700">
                  <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Link
            to="/dpa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium"
          >
            <FileText className="w-4 h-4" />
            Read the full Data Processing Agreement
            <ExternalLink className="w-3 h-3" />
          </Link>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                }`}
              >
                {checked && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <span className="text-sm text-gray-600 leading-relaxed">
              I have read and accept the Data Processing Agreement on behalf of my hotel. I confirm
              I am authorised to bind my organisation to this agreement.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleAccept}
            disabled={!checked || accepting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Recording acceptance…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                I accept — Continue to StayWise
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Your acceptance is recorded with a timestamp for audit purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
