import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';

interface Props {
  role: string;
}

export default function ForbiddenPage({ role }: Props) {
  const navigate = useNavigate();
  const { session } = useActiveHotel();
  const brandColor = session?.primaryColor ?? '#2563eb';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${brandColor}14` }}
        >
          <ShieldOff className="w-10 h-10" style={{ color: brandColor }} />
        </div>

        <div className="mb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wide">
            403 Forbidden
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mt-3 mb-2">
          Access Restricted
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-1">
          Your current role{' '}
          <span className="font-medium text-gray-700 capitalize">({role})</span>{' '}
          does not have permission to view this page.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Contact your hotel administrator to request access.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: brandColor }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
