import { Building2, Clock, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PendingApprovalPage() {
  const { user, signOut } = useAuth();

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
            Your account is under review
          </h1>
          <p className="text-gray-300 text-base max-w-md leading-relaxed">
            Our team reviews every new registration to ensure the security and integrity of your hotel's data.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">StayWise</span>
          </div>

          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center border-4 border-amber-100">
                <Clock className="w-9 h-9 text-amber-500" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full border-2 border-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
            Awaiting Approval
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            Your account has been created and a notification has been sent to the administrator. You will be able to sign in once your access is approved.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8 text-left space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Registered email</p>
                <p className="text-sm font-semibold text-gray-800">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Status</p>
                <p className="text-sm font-semibold text-amber-600">Pending administrator approval</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed mb-6">
            Once approved, you can sign in with your email and password. If you haven't heard back within 24 hours, please contact your hotel administrator.
          </p>

          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
