import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Sparkles, SlidersHorizontal, BarChart2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHotel } from '../../contexts/HotelContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import RateCalendar90Day from './RateCalendar90Day';
import AISuggestionsPanel from './AISuggestionsPanel';
import PricingRulesBuilder from './PricingRulesBuilder';
import OccupancyHeatmap from './OccupancyHeatmap';
import type { AIPriceSuggestion, RoomTypeRate } from './types';

type Tab = 'calendar' | 'ai' | 'rules' | 'heatmap';

export default function DynamicPricingPage() {
  const { currentHotel } = useHotel();
  const [tab, setTab] = useState<Tab>('calendar');
  const [roomTypes, setRoomTypes] = useState<RoomTypeRate[]>([]);
  const [suggestions, setSuggestions] = useState<AIPriceSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const loadSuggestions = useCallback(async () => {
    if (!currentHotel) return;
    setLoadingSuggestions(true);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('ai_price_suggestions')
      .select('*')
      .eq('hotel_id', currentHotel.id)
      .eq('applied', false)
      .gte('date', today)
      .order('date');
    setSuggestions((data ?? []) as AIPriceSuggestion[]);
    setLoadingSuggestions(false);
  }, [currentHotel]);

  useEffect(() => {
    if (!currentHotel) return;
    supabase.from('room_types').select('id, name, base_rate').eq('hotel_id', currentHotel.id).order('name')
      .then(({ data }) => setRoomTypes((data ?? []) as RoomTypeRate[]));
    loadSuggestions();
  }, [currentHotel, loadSuggestions]);

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'calendar', label: 'Rate Calendar', icon: CalendarDays },
    { key: 'ai', label: 'AI Suggestions', icon: Sparkles, badge: suggestions.length },
    { key: 'rules', label: 'Pricing Rules', icon: SlidersHorizontal },
    { key: 'heatmap', label: 'Occupancy Heatmap', icon: BarChart2 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dynamic Pricing</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI-powered revenue management — optimise rates across all room types</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-500 text-white text-[10px] font-bold">
                  {t.badge > 99 ? '99+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="animate-fade-in">
        {tab === 'calendar' && <RateCalendar90Day />}
        {tab === 'ai' && (
          <AISuggestionsPanel
            suggestions={suggestions}
            roomTypes={roomTypes}
            loading={loadingSuggestions}
            onRefresh={loadSuggestions}
          />
        )}
        {tab === 'rules' && <PricingRulesBuilder roomTypes={roomTypes} />}
        {tab === 'heatmap' && <OccupancyHeatmap />}
      </div>
    </div>
  );
}
