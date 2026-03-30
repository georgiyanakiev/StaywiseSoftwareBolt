import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';

interface RoomType {
  id: string;
  name: string;
  base_rate: number;
}

interface ChannelRate {
  id: string;
  channel_id: string;
  room_type_id: string;
  date: string;
  rate: number;
  availability: number;
  min_stay: number;
  status: string;
}

interface Channel {
  id: string;
  name: string;
  status: string;
}

interface Props {
  hotelId: string;
  channels: Channel[];
}

export default function RateCalendar({ hotelId, channels }: Props) {
  const { showToast } = useToast();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rates, setRates] = useState<ChannelRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const connectedChannels = channels.filter(c => c.status === 'connected');

  useEffect(() => {
    if (connectedChannels.length > 0 && !selectedChannel) {
      setSelectedChannel(connectedChannels[0].id);
    }
  }, [connectedChannels, selectedChannel]);

  const getDates = useCallback(() => {
    const dates: string[] = [];
    const start = new Date();
    start.setDate(start.getDate() + weekOffset * 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [weekOffset]);

  const loadData = useCallback(async () => {
    if (!hotelId || !selectedChannel) return;
    setLoading(true);
    const dates = getDates();
    try {
      const [{ data: rt }, { data: cr }] = await Promise.all([
        supabase.from('room_types').select('id, name, base_rate').eq('hotel_id', hotelId),
        supabase.from('channel_rates').select('*')
          .eq('hotel_id', hotelId)
          .eq('channel_id', selectedChannel)
          .gte('date', dates[0])
          .lte('date', dates[6]),
      ]);
      setRoomTypes(rt ?? []);
      setRates(cr ?? []);
    } finally {
      setLoading(false);
    }
  }, [hotelId, selectedChannel, getDates]);

  useEffect(() => { loadData(); }, [loadData]);

  const getRate = (roomTypeId: string, date: string) => {
    return rates.find(r => r.room_type_id === roomTypeId && r.date === date);
  };

  const cellKey = (roomTypeId: string, date: string) => `${roomTypeId}::${date}`;

  const startEdit = (roomTypeId: string, date: string, currentRate: number) => {
    setEditingCell(cellKey(roomTypeId, date));
    setEditValue(String(currentRate));
  };

  const saveRate = async (roomTypeId: string, date: string) => {
    if (!selectedChannel || !hotelId) return;
    setSaving(true);
    const existing = getRate(roomTypeId, date);
    const newRate = parseFloat(editValue) || 0;

    if (existing) {
      await supabase.from('channel_rates').update({ rate: newRate, status: 'pending', updated_at: new Date().toISOString() }).eq('id', existing.id);
      setRates(prev => prev.map(r => r.id === existing.id ? { ...r, rate: newRate, status: 'pending' } : r));
    } else {
      const roomType = roomTypes.find(rt => rt.id === roomTypeId);
      const { data } = await supabase.from('channel_rates').insert({
        hotel_id: hotelId,
        channel_id: selectedChannel,
        room_type_id: roomTypeId,
        date,
        rate: newRate,
        availability: 1,
        min_stay: 1,
        status: 'pending',
      }).select().single();
      if (data) setRates(prev => [...prev, data as ChannelRate]);
    }

    setEditingCell(null);
    setSaving(false);
    showToast('Rate updated — pending sync', 'success');
  };

  const dates = getDates();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Channel:</label>
          <select
            value={selectedChannel}
            onChange={e => setSelectedChannel(e.target.value)}
            className="input-field py-1.5 text-sm w-44"
          >
            {connectedChannels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
            {formatDate(dates[0])} – {formatDate(dates[6])}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header w-36 sticky left-0 bg-white z-10">Room Type</th>
              {dates.map(d => {
                const dayOfWeek = new Date(d + 'T12:00:00').getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                return (
                  <th key={d} className={`table-header text-center min-w-[100px] ${isWeekend ? 'bg-blue-50' : ''}`}>
                    <div>{dayNames[dayOfWeek]}</div>
                    <div className="font-normal text-gray-400">{d.slice(5)}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {roomTypes.map(rt => (
              <tr key={rt.id} className="border-b border-gray-50 last:border-0">
                <td className="table-cell font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">{rt.name}</td>
                {dates.map(d => {
                  const rateRow = getRate(rt.id, d);
                  const key = cellKey(rt.id, d);
                  const isEditing = editingCell === key;
                  const isPending = rateRow?.status === 'pending';
                  const dayOfWeek = new Date(d + 'T12:00:00').getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  return (
                    <td key={d} className={`table-cell text-center ${isWeekend ? 'bg-blue-50/40' : ''}`}>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="w-20 px-2 py-1 border border-blue-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveRate(rt.id, d);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                          />
                          <button onClick={() => saveRate(rt.id, d)} className="text-emerald-600 hover:text-emerald-700">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(rt.id, d, rateRow?.rate ?? rt.base_rate)}
                          className="group relative w-full text-center hover:bg-blue-50 rounded py-1 transition-colors"
                        >
                          <span className={`font-medium ${rateRow ? 'text-gray-900' : 'text-gray-400'}`}>
                            ${rateRow?.rate ?? rt.base_rate}
                          </span>
                          {isPending && (
                            <span className="ml-1 text-amber-500 text-xs">●</span>
                          )}
                          <br />
                          <span className="text-xs text-gray-400">{rateRow?.availability ?? 0} avail</span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {roomTypes.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">No room types found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="text-amber-500 text-base">●</span> Pending sync
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-50 border border-blue-100 inline-block" /> Weekend
        </div>
        <div>Click any rate to edit</div>
      </div>
    </div>
  );
}
