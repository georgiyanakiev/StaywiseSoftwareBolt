import { useState } from 'react';
import { Shield, Check, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useDpaAcceptance } from '../../pages/legal/useDpaAcceptance';

interface DpaAcceptanceModalProps {
  userId: string;
  tenantId: string | null | undefined;
  hotelName?: string | null;
  onAccepted: () => void;
}

export default function DpaAcceptanceModal({ userId, tenantId, hotelName, onAccepted }: DpaAcceptanceModalProps) {
  const [checked, setChecked] = useState(false);
  const { accepting, error, accept } = useDpaAcceptance(userId, tenantId);

  const handleAccept = async () => {
    if (!checked) return;
    const ok = await accept();
    if (ok) onAccepted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-[fadeInUp_0.2s_ease-out]">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Data Processing Agreement</h2>
              <p className="text-blue-100 text-xs mt-0.5">Required for GDPR compliance — Art. 28</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-700 text-sm leading-relaxed">
            Before using StayWise, your organisation must accept our{' '}
            <strong>Data Processing Agreement</strong> (required by GDPR Art. 28).
          </p>

          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-800 mb-1">
              As a hotel using StayWise, you are the <strong>Data Controller</strong> for your guests'
              personal data. Soft Care Concept EOOD processes this data on your behalf as{' '}
              <strong>Processor</strong>.
            </p>
            <p className="text-xs text-blue-700 leading-relaxed">
              This agreement covers how guest data is stored, secured, and handled — including breach
              notification within 72 hours, sub-processor disclosure, and your rights to request data
              deletion at any time.
            </p>
          </div>

          <a
            href="/dpa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium"
          >
            <FileText className="w-4 h-4" />
            Read full DPA
            <ExternalLink className="w-3 h-3" />
          </a>

          <label className="flex items-start gap-3 cursor-pointer group select-none">
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
            <span className="text-sm text-gray-700 leading-relaxed">
              I have read and accept the Data Processing Agreement on behalf of{' '}
              <strong>{hotelName ?? 'my organisation'}</strong>. I confirm I am authorised to bind
              my organisation to this agreement.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleAccept}
            disabled={!checked || accepting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Recording acceptance…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Accept and Continue
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Your acceptance is recorded with timestamp and IP address for audit purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
