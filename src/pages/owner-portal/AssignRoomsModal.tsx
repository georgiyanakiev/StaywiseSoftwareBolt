import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useHotel } from '../../contexts/HotelContext';
import { useTenantId } from '../../hooks/useTenantQuery';
import { supabase } from '../../lib/supabase';
import type { PropertyOwner, OwnerProperty } from './types';
import type { Room, RoomType } from '../../types';

interface RoomWithType extends Room {
  room_type?: RoomType;
}

interface Props {
  open: boolean;
  owner: PropertyOwner | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AssignRoomsModal({ open, owner, onClose, onSaved }: Props) {
  const { currentHotel } = useHotel();
  const tenantId = useTenantId();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<RoomWithType[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { selected: boolean; ownership_pct: number; monthly_expenses: number; existing_id?: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !currentHotel || !owner) return;

    const load = async () => {
      const [{ data: roomData }, { data: propData }] = await Promise.all([
        supabase.from('rooms').select('*, room_type:room_types(*)').eq('hotel_id', currentHotel.id).order('number'),
        supabase.from('owner_properties').select('*').eq('owner_id', owner.id),
      ]);

      const roomList = (roomData ?? []) as RoomWithType[];
      setRooms(roomList);

      const init: typeof assignments = {};
      for (const room of roomList) {
        const existing = (propData ?? []).find((p: OwnerProperty) => p.room_id === room.id);
        init[room.id] = {
          selected: !!existing,
          ownership_pct: existing?.ownership_pct ?? 100,
          monthly_expenses: existing?.monthly_expenses ?? 0,
          existing_id: existing?.id,
        };
      }
      setAssignments(init);
    };

    load();
  }, [open, currentHotel, owner]);

  const toggle = (roomId: string) => {
    setAssignments(prev => ({
      ...prev,
      [roomId]: { ...prev[roomId], selected: !prev[roomId].selected },
    }));
  };

  const handleSave = async () => {
    if (!currentHotel || !owner) return;
    setSaving(true);
    try {
      for (const [roomId, val] of Object.entries(assignments)) {
        const room = rooms.find(r => r.id === roomId);
        if (val.selected) {
          const payload: Record<string, unknown> = {
            hotel_id: currentHotel.id,
            owner_id: owner.id,
            room_id: roomId,
            room_number: room?.number ?? '',
            ownership_pct: val.ownership_pct,
            monthly_expenses: val.monthly_expenses,
          };
          if (tenantId) payload.tenant_id = tenantId;

          if (val.existing_id) {
            await supabase.from('owner_properties').update({
              ownership_pct: val.ownership_pct,
              monthly_expenses: val.monthly_expenses,
            }).eq('id', val.existing_id);
          } else {
            await supabase.from('owner_properties').insert(payload);
          }
        } else if (val.existing_id) {
          await supabase.from('owner_properties').delete().eq('id', val.existing_id);
        }
      }
      toast('success', 'Room assignments saved');
      onSaved();
      onClose();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.values(assignments).filter(a => a.selected).length;

  return (
    <Modal open={open} onClose={onClose} title={`Assign Rooms — ${owner?.full_name ?? ''}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Select which rooms belong to this owner and set ownership percentage and monthly expenses.
        </p>

        {rooms.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No rooms found for this hotel.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {rooms.map(room => {
              const a = assignments[room.id];
              if (!a) return null;
              return (
                <div key={room.id} className={`flex items-center gap-3 px-4 py-3 ${a.selected ? 'bg-blue-50' : 'bg-white'}`}>
                  <input
                    type="checkbox"
                    checked={a.selected}
                    onChange={() => toggle(room.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">Room {room.number}</p>
                    <p className="text-xs text-gray-500">{room.room_type?.name ?? 'Unknown type'} · Floor {room.floor}</p>
                  </div>
                  {a.selected && (
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Ownership %</label>
                        <input
                          type="number"
                          min="1" max="100" step="0.01"
                          className="w-20 input-field py-1 text-xs"
                          value={a.ownership_pct}
                          onChange={e => setAssignments(prev => ({
                            ...prev,
                            [room.id]: { ...prev[room.id], ownership_pct: parseFloat(e.target.value) || 100 },
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Monthly Expenses</label>
                        <input
                          type="number"
                          min="0" step="0.01"
                          className="w-28 input-field py-1 text-xs"
                          value={a.monthly_expenses}
                          onChange={e => setAssignments(prev => ({
                            ...prev,
                            [room.id]: { ...prev[room.id], monthly_expenses: parseFloat(e.target.value) || 0 },
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">{selectedCount} room{selectedCount !== 1 ? 's' : ''} selected</p>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
