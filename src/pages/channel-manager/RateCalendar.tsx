import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { useTenantId } from '../../hooks/useTenantQuery';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToast } from '../../components/ui/Toast';
import type { Channel } from './ChannelCard';

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
  stop_sell: boolean;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
}

interface Props {
  hotelId: string;
  channels: Channel[];
}

const VIEW_SIZES = [7, 14, 30] as const;

export default function RateCalendar({ hotelId, channels }: Props) {
  const { showToast } = useToast();
  const tenantId = useTenantId();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rates, setRates] = useState<ChannelRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewSize, setViewSize] = useState<7 | 14 | 30>(14);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const connectedChannels = channels.filter(c => c.status === 'connected');

  useEffect(() => {
    if (connectedChannels.length > 0 && !selectedChannel) {
      setSelectedChannel(connectedChannels[0].id);
    }
  }, [connectedChannels.length, selectedChannel]);

  const getDates = useCallback(() => {
    const dates: string[] = [];
    const start = new Date();
    start.setDate(start.getDate() + weekOffset * viewSize);
    for (let i = 0; i < viewSize; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [weekOffset, viewSize]);

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
          .lte('date', dates[dates.length - 1]),
      ]);
      setRoomTypes(rt ?? []);
      setRates(cr ?? []);
    } finally {
      setLoading(false);
    }
  }, [hotelId, selectedChannel, getDates]);

  useEffect(() => { loadData(); }, [loadData]);

  const getRate = (roomTypeId: string, date: string) =>
    rates.find(r => r.room_type_id === roomTypeId && r.date === date);

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
      await supabase.from('channel_rates')
        .update({ rate: newRate, status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      setRates(prev => prev.map(r => r.id === existing.id ? { ...r, rate: newRate, status: 'pending' } : r));
    } else {
      const { data } = await supabase.from('channel_rates').insert({
        hotel_id: hotelId,
        channel_id: selectedChannel,
        room_type_id: roomTypeId,
        date,
        rate: newRate,
        availability: 1,
        min_stay: 1,
        status: 'pending',
        ...(tenantId ? { tenant_id: tenantId } : {}),
      }).select().single();
      if (data) setRates(prev => [...prev, data as ChannelRate]);
    }

    setEditingCell(null);
    setSaving(false);
    showToast('Rate updated — pending sync', 'success');
  };

  const dates = getDates();
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  if (connectedChannels.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No connected channels</p>
        <p className="text-sm mt-1">Connect a channel first to manage rates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Channel</label>
            <select
              value={selectedChannel}
              onChange={e => setSelectedChannel(e.target.value)}
              className="border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {connectedChannels.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-gray-50">
            {VIEW_SIZES.map(s => (
              <button
                key={s}
                onClick={() => { setViewSize(s); setWeekOffset(0); }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${viewSize === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {s}d
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            {formatDate(dates[0])} – {formatDate(dates[dates.length - 1])}
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
              <th className="table-header w-36 sticky left-0 bg-white z-10 border-r border-gray-100">Room Type</th>
              {dates.map(d => {
                const dayOfWeek = new Date(d + 'T12:00:00').getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                return (
                  <th key={d} className={`table-header text-center min-w-[72px] px-1 ${isWeekend ? 'bg-blue-50' : ''}`}>
                    <div className="text-xs">{dayNames[dayOfWeek]}</div>
                    <div className="font-normal text-gray-400 text-xs">{d.slice(5)}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {roomTypes.map(rt => (
              <tr key={rt.id} className="border-b border-gray-50 last:border-0">
                <td className="table-cell font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100 text-xs leading-tight">{rt.name}</td>
                {dates.map(d => {
                  const rateRow = getRate(rt.id, d);
                  const key = cellKey(rt.id, d);
                  const isEditing = editingCell === key;
                  const isPending = rateRow?.status === 'pending';
                  const isStopSell = rateRow?.stop_sell;
                  const dayOfWeek = new Date(d + 'T12:00:00').getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  return (
                    <td key={d} className={`p-1 text-center ${isWeekend ? 'bg-blue-50/40' : ''} ${isStopSell ? 'bg-red-50' : ''}`}>
                      {isEditing ? (
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="w-14 px-1 py-1 border border-blue-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveRate(rt.id, d);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                          />
                          <button onClick={() => saveRate(rt.id, d)} disabled={saving} className="text-emerald-600 hover:text-emerald-700 p-0.5">
                            <Save className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(rt.id, d, rateRow?.rate ?? rt.base_rate)}
                          className="w-full text-center hover:bg-blue-50 rounded py-1 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span className={`font-medium text-xs ${rateRow ? 'text-gray-900' : 'text-gray-400'}`}>
                              ${Math.round(rateRow?.rate ?? rt.base_rate)}
                            </span>
                            {isPending && <span className="text-amber-500 text-[10px]">●</span>}
                            {isStopSell && <span className="text-red-500 text-[10px]">✕</span>}
                          </div>
                          <div className="text-[10px] text-gray-400">{rateRow?.availability ?? 0} avail</div>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {roomTypes.length === 0 && (
              <tr>
                <td colSpan={dates.length + 1} className="py-12 text-center text-gray-400">No room types found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-5 text-xs text-gray-500 flex-wrap">
        <div className="flex items-center gap-1.5"><span className="text-amber-500">●</span> Pending sync</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-100 inline-block" /> Weekend</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-100 inline-block" /> Stop Sell</div>
        <div>Click any cell to edit rate</div>
      </div>
    </div>
  );
}
