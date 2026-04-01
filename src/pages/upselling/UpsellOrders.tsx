import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, Truck, XCircle, TrendingUp, Euro, BarChart2,
  Filter, RefreshCw, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { STATUS_CONFIG, CATEGORY_LABELS, type UpsellOrder, type UpsellItem, type OrderStatus } from './types';

interface PopularItem {
  item_name: string;
  count: number;
  revenue: number;
}

export default function UpsellOrders() {
  const { currentHotel } = useHotel();
  const { toast } = useToast();
  const [orders, setOrders] = useState<UpsellOrder[]>([]);
  const [items, setItems] = useState<UpsellItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    if (!currentHotel) return;
    setLoading(true);
    const [ordersRes, itemsRes] = await Promise.all([
      supabase.from('upsell_orders').select('*').eq('hotel_id', currentHotel.id).order('ordered_at', { ascending: false }),
      supabase.from('upsell_items').select('*').eq('hotel_id', currentHotel.id),
    ]);
    setOrders((ordersRes.data ?? []) as UpsellOrder[]);
    setItems((itemsRes.data ?? []) as UpsellItem[]);
    setLoading(false);
  }, [currentHotel]);

  useEffect(() => { load(); }, [load]);

  const getItemCategory = (itemId: string | null) => {
    if (!itemId) return null;
    return items.find(i => i.id === itemId)?.category ?? null;
  };

  const updateStatus = async (order: UpsellOrder, status: OrderStatus) => {
    setUpdatingId(order.id);
    const updates: Record<string, unknown> = { status };
    if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
    if (status === 'delivered') updates.delivered_at = new Date().toISOString();
    const { error } = await supabase.from('upsell_orders').update(updates).eq('id', order.id);
    if (error) { toast('error', error.message); }
    else { toast('success', `Order marked as ${status}`); }
    setUpdatingId(null);
    load();
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (categoryFilter) {
      const cat = getItemCategory(o.upsell_item_id);
      if (cat !== categoryFilter) return false;
    }
    if (dateFrom && o.ordered_at < dateFrom) return false;
    if (dateTo && o.ordered_at > dateTo + 'T23:59:59') return false;
    return true;
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthOrders = orders.filter(o => o.ordered_at >= startOfMonth && o.status !== 'cancelled');
  const monthRevenue = monthOrders.reduce((s, o) => s + o.total_price, 0);
  const avgUpsellValue = monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0;

  const popularMap: Record<string, PopularItem> = {};
  for (const o of orders.filter(o => o.status !== 'cancelled')) {
    if (!popularMap[o.item_name]) popularMap[o.item_name] = { item_name: o.item_name, count: 0, revenue: 0 };
    popularMap[o.item_name].count += 1;
    popularMap[o.item_name].revenue += o.total_price;
  }
  const popularItems = Object.values(popularMap).sort((a, b) => b.count - a.count).slice(0, 3);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="md" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Euro className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-500">Upsell Revenue (this month)</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(monthRevenue)}</p>
          <p className="text-xs text-gray-400 mt-1">{monthOrders.length} order{monthOrders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">Avg Upsell per Order</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(avgUpsellValue)}</p>
          <p className="text-xs text-gray-400 mt-1">based on this month</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm text-gray-500">Most Popular</p>
          </div>
          {popularItems.length === 0 ? (
            <p className="text-xs text-gray-400">No data yet</p>
          ) : (
            <div className="space-y-1">
              {popularItems.map((p, i) => (
                <div key={p.item_name} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 truncate">
                    <span className="text-gray-400 mr-1">#{i + 1}</span>{p.item_name}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{p.count}× · {formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as OrderStatus | '')}
          className="border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-400 text-sm">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {(statusFilter || categoryFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setStatusFilter(''); setCategoryFilter(''); setDateFrom(''); setDateTo(''); }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
        <button onClick={load} className="ml-auto p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">No orders match your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-header">Guest</th>
                <th className="table-header">Item</th>
                <th className="table-header">Qty</th>
                <th className="table-header">Price</th>
                <th className="table-header">Status</th>
                <th className="table-header">Ordered</th>
                <th className="table-header">Notes</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map(order => {
                const cfg = STATUS_CONFIG[order.status];
                const isUpdating = updatingId === order.id;
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell font-medium text-gray-900">{order.guest_name || '—'}</td>
                    <td className="table-cell text-gray-700">{order.item_name}</td>
                    <td className="table-cell text-center">{order.quantity}</td>
                    <td className="table-cell font-semibold text-gray-900">{formatCurrency(order.total_price)}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500">{formatDate(order.ordered_at)}</td>
                    <td className="table-cell text-gray-400 max-w-[140px] truncate">{order.notes || '—'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        ) : (
                          <>
                            {order.status === 'pending' && (
                              <button
                                onClick={() => updateStatus(order, 'confirmed')}
                                title="Confirm"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {order.status === 'confirmed' && (
                              <button
                                onClick={() => updateStatus(order, 'delivered')}
                                title="Mark Delivered"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <Truck className="w-4 h-4" />
                              </button>
                            )}
                            {(order.status === 'pending' || order.status === 'confirmed') && (
                              <button
                                onClick={() => updateStatus(order, 'cancelled')}
                                title="Cancel"
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
