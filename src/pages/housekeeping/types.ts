export interface HKTask {
  id: string;
  hotel_id: string;
  room_id: string;
  room_number: string;
  room_type: string;
  floor: number;
  task_type: string;
  status: string;
  priority: string;
  assigned_to: string;
  notes: string;
  duration_minutes: number | null;
  scheduled_date: string;
  started_at: string | null;
  completed_at: string | null;
  inspected_by: string;
  inspected_at: string | null;
  created_at: string;
}

export interface MaintenanceIssue {
  id: string;
  hotel_id: string;
  room_id: string | null;
  room_number: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  reported_by: string;
  assigned_to: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  resolved_at: string | null;
  created_at: string;
}

export interface HKStaff {
  id: string;
  hotel_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  department: string | null;
  created_at: string;
}

export function staffFullName(s: HKStaff): string {
  return `${s.first_name} ${s.last_name}`.trim();
}

export const TASK_TYPE_LABELS: Record<string, string> = {
  checkout_clean:  'Checkout Clean',
  stayover_clean:  'Stayover Clean',
  turndown:        'Turndown',
  deep_clean:      'Deep Clean',
  inspection:      'Inspection',
  touch_up:        'Touch Up',
  clean:           'Clean',
  linen_change:    'Linen Change',
  restock:         'Restock',
};

export const TASK_TYPE_COLORS: Record<string, string> = {
  checkout_clean: 'bg-orange-100 text-orange-700',
  stayover_clean: 'bg-blue-100 text-blue-700',
  turndown:       'bg-sky-100 text-sky-700',
  deep_clean:     'bg-rose-100 text-rose-700',
  inspection:     'bg-emerald-100 text-emerald-700',
  touch_up:       'bg-amber-100 text-amber-700',
  clean:          'bg-blue-100 text-blue-700',
  linen_change:   'bg-teal-100 text-teal-700',
  restock:        'bg-gray-100 text-gray-700',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-gray-100 text-gray-600',
  normal: 'bg-gray-100 text-gray-600',
  high:   'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export const STATUS_LABELS: Record<string, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  done:        'Done',
  inspected:   'Inspected',
  skipped:     'Skipped',
  blocked:     'Blocked',
  completed:   'Done',
};

export const KANBAN_COLUMNS = [
  { id: 'pending',     label: 'Pending',     color: 'border-t-amber-400' },
  { id: 'in_progress', label: 'In Progress',  color: 'border-t-blue-400' },
  { id: 'done',        label: 'Done',         color: 'border-t-emerald-400' },
  { id: 'inspected',   label: 'Inspected',    color: 'border-t-teal-500' },
];

export const NEXT_STATUS: Record<string, string> = {
  pending:     'in_progress',
  in_progress: 'done',
  done:        'inspected',
};

export const CATEGORY_COLORS: Record<string, string> = {
  plumbing:   'bg-blue-100 text-blue-700',
  electrical: 'bg-yellow-100 text-yellow-700',
  hvac:       'bg-sky-100 text-sky-700',
  furniture:  'bg-amber-100 text-amber-700',
  appliance:  'bg-orange-100 text-orange-700',
  structural: 'bg-stone-100 text-stone-700',
  it:         'bg-emerald-100 text-emerald-700',
  electronics:'bg-purple-100 text-purple-700',
  carpentry:  'bg-amber-100 text-amber-700',
  cleaning:   'bg-teal-100 text-teal-700',
  other:      'bg-gray-100 text-gray-600',
};

export const ISSUE_STATUS_COLORS: Record<string, string> = {
  open:           'bg-red-50 text-red-700',
  in_progress:    'bg-blue-50 text-blue-700',
  waiting_parts:  'bg-amber-50 text-amber-700',
  resolved:       'bg-emerald-50 text-emerald-700',
  closed:         'bg-gray-100 text-gray-500',
};
