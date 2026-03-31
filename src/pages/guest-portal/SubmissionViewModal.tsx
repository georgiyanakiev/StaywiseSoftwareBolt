import { useState, useEffect } from 'react';
import { X, User, FileText, Star, PenLine, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

interface PortalSession {
  id: string;
  guest_name: string;
  guest_email: string;
  step_completed: number;
  completed_at: string | null;
}

interface GuestDoc {
  id: string;
  document_type: string;
  document_number: string;
  nationality: string;
  date_of_birth: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  verified: boolean;
}

interface PreArrival {
  id: string;
  arrival_time: string;
  departure_transport: string;
  special_requests: string;
  dietary_requirements: string;
  celebration_type: string;
  room_preferences: string[];
  agreed_to_terms: boolean;
  signature_data: string;
  submitted_at: string | null;
}

interface Props {
  session: PortalSession;
  onClose: () => void;
}

export default function SubmissionViewModal({ session, onClose }: Props) {
  const [doc, setDoc] = useState<GuestDoc | null>(null);
  const [form, setForm] = useState<PreArrival | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('guest_documents').select('*').eq('session_id', session.id).maybeSingle(),
      supabase.from('pre_arrival_forms').select('*').eq('session_id', session.id).maybeSingle(),
    ]).then(([{ data: d }, { data: f }]) => {
      setDoc(d as GuestDoc | null);
      setForm(f as PreArrival | null);
    });
  }, [session.id]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">{session.guest_name || 'Guest Submission'}</p>
            <p className="text-xs text-gray-500">{session.guest_email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <div key={n} className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                session.step_completed >= n ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>{n}</div>
            ))}
          </div>

          {doc && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-800">ID Document</h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                <Field label="Type" value={doc.document_type?.replace('_', ' ')} />
                <Field label="Number" value={doc.document_number} />
                <Field label="Nationality" value={doc.nationality} />
                <Field label="Date of Birth" value={doc.date_of_birth ? formatDate(doc.date_of_birth) : ''} />
                <Field label="Issue Date" value={doc.issue_date ? formatDate(doc.issue_date) : ''} />
                <Field label="Expiry Date" value={doc.expiry_date ? formatDate(doc.expiry_date) : ''} />
              </div>
            </section>
          )}

          {form && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-800">Preferences & Requests</h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <Field label="Arrival Time" value={form.arrival_time} />
                <Field label="Departure Transport" value={form.departure_transport} />
                <Field label="Special Requests" value={form.special_requests} />
                <Field label="Dietary Requirements" value={form.dietary_requirements} />
                <Field label="Celebration" value={form.celebration_type} />
                {form.room_preferences?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Room Preferences</p>
                    <div className="flex flex-wrap gap-1">
                      {form.room_preferences.map(p => (
                        <span key={p} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {form?.signature_data && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <PenLine className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-800">Digital Signature</h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <img src={form.signature_data} alt="signature" className="max-h-24 mx-auto" />
                {form.agreed_to_terms && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-2 justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Agreed to terms and conditions
                  </div>
                )}
              </div>
            </section>
          )}

          {!doc && !form && (
            <div className="py-8 text-center text-gray-400">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No data collected yet for this session</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  );
}
