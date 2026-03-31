import { useState } from 'react';
import { Plus, Wrench, ChevronDown, ChevronUp, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/utils';
import Modal from '../../components/ui/Modal';
import {
  MaintenanceIssue, CATEGORY_COLORS, ISSUE_STATUS_COLORS, PRIORITY_COLORS,
} from './types';

interface Room { id: string; number: string }

interface Props {
  issues: MaintenanceIssue[];
  rooms: Room[];
  hotelId: string;
  tenantId: string | null;
  onChanged: () => void;
}

export default function MaintenanceTab({ issues, rooms, hotelId, tenantId, onChanged }: Props) {
  const { toast } = useToast();
  const [showResolved, setShowResolved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const open     = issues.filter(i => i.status !== 'resolved' && i.status !== 'closed');
  const resolved = issues.filter(i => i.status === 'resolved' || i.status === 'closed');

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('maintenance_issues').update({ status }).eq('id', id);
    onChanged();
  };

  const resolveIssue = async (id: string) => {
    setResolvingId(id);
    await supabase.from('maintenance_issues').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    setResolvingId(null);
    onChanged();
    toast('success', 'Issue resolved');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{open.length} open issue{open.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Report Issue
        </button>
      </div>

      {open.length === 0 && (
        <div className="py-12 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
          <p>No open maintenance issues — great!</p>
        </div>
      )}

      <div className="space-y-3">
        {open.map(issue => (
          <IssueCard
            key={issue.id}
            issue={issue}
            onStatusChange={updateStatus}
            onResolve={resolveIssue}
            resolvingId={resolvingId}
          />
        ))}
      </div>

      {resolved.length > 0 && (
        <div>
          <button
            onClick={() => setShowResolved(v => !v)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2"
          >
            {showResolved ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showResolved ? 'Hide' : 'Show'} {resolved.length} resolved issue{resolved.length !== 1 ? 's' : ''}
          </button>
          {showResolved && (
            <div className="space-y-3 mt-2 opacity-75">
              {resolved.map(issue => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onStatusChange={updateStatus}
                  onResolve={resolveIssue}
                  resolvingId={resolvingId}
                  readOnly
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ReportIssueModal
          rooms={rooms}
          hotelId={hotelId}
          tenantId={tenantId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onChanged(); toast('success', 'Issue reported'); }}
        />
      )}
    </div>
  );
}

function IssueCard({ issue, onStatusChange, onResolve, resolvingId, readOnly }: {
  issue: MaintenanceIssue;
  onStatusChange: (id: string, status: string) => void;
  onResolve: (id: string) => void;
  resolvingId: string | null;
  readOnly?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${readOnly ? 'border-gray-100' : 'border-gray-100 hover:border-gray-200 transition-colors'}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-4 h-4 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{issue.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">Room {issue.room_number || '—'} · {formatDate(issue.created_at)}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ISSUE_STATUS_COLORS[issue.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {issue.status.replace('_', ' ')}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[issue.priority] ?? ''}`}>
                {issue.priority}
              </span>
            </div>
          </div>

          {issue.description && (
            <p className="text-sm text-gray-600 mt-1.5">{issue.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {issue.category && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[issue.category] ?? 'bg-gray-100 text-gray-600'}`}>
                {issue.category}
              </span>
            )}
            {issue.assigned_to && (
              <span className="text-xs text-gray-500">→ {issue.assigned_to}</span>
            )}
            {issue.reported_by && (
              <span className="text-xs text-gray-400">by {issue.reported_by}</span>
            )}
            {issue.estimated_cost && (
              <span className="text-xs text-gray-400">est. €{issue.estimated_cost}</span>
            )}
          </div>

          {!readOnly && issue.status !== 'resolved' && issue.status !== 'closed' && (
            <div className="flex items-center gap-2 mt-3">
              <select
                value={issue.status}
                onChange={e => onStatusChange(issue.id, e.target.value)}
                className="input-field py-1 text-xs flex-1"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_parts">Waiting Parts</option>
                <option value="resolved">Resolved</option>
              </select>
              <button
                onClick={() => onResolve(issue.id)}
                disabled={resolvingId === issue.id}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-70"
              >
                {resolvingId === issue.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Resolve
              </button>
            </div>
          )}
          {readOnly && issue.resolved_at && (
            <p className="text-xs text-gray-400 mt-2">Resolved {formatDate(issue.resolved_at)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportIssueModal({ rooms, hotelId, tenantId, onClose, onSaved }: {
  rooms: Room[];
  hotelId: string;
  tenantId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    room_id: '',
    title: '',
    description: '',
    category: 'other',
    priority: 'normal',
    reported_by: '',
    assigned_to: '',
    estimated_cost: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const room = rooms.find(r => r.id === form.room_id);
    await supabase.from('maintenance_issues').insert({
      hotel_id: hotelId,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      room_id: form.room_id || null,
      room_number: room?.number ?? '',
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      reported_by: form.reported_by,
      assigned_to: form.assigned_to,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
      status: 'open',
    });
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Report Maintenance Issue" size="md">
      <div className="space-y-4 p-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} className="input-field" placeholder="Brief description of the issue" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Room</label>
            <select value={form.room_id} onChange={e => set('room_id', e.target.value)} className="input-field">
              <option value="">No specific room</option>
              {rooms.map(r => <option key={r.id} value={r.id}>Room {r.number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field">
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="hvac">HVAC</option>
              <option value="furniture">Furniture</option>
              <option value="cleaning">Cleaning</option>
              <option value="it">IT</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input-field resize-none" rows={3} placeholder="Detailed description..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)} className="input-field">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Est. Cost (€)</label>
            <input type="number" min={0} value={form.estimated_cost} onChange={e => set('estimated_cost', e.target.value)} className="input-field" placeholder="0.00" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reported By</label>
            <input value={form.reported_by} onChange={e => set('reported_by', e.target.value)} className="input-field" placeholder="Name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned To</label>
            <input value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} className="input-field" placeholder="Name" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Report Issue
          </button>
        </div>
      </div>
    </Modal>
  );
}
