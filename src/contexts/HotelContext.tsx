import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Hotel } from '../types';

interface HotelContextValue {
  hotels: Hotel[];
  currentHotel: Hotel | null;
  setCurrentHotel: (hotel: Hotel) => void;
  loading: boolean;
  refreshHotels: () => Promise<void>;
}

const HotelContext = createContext<HotelContextValue | null>(null);

export function HotelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshHotels = async () => {
    if (!user) {
      setHotels([]);
      setCurrentHotel(null);
      setLoading(false);
      return;
    }

    const sessionRaw = sessionStorage.getItem('sw_active_hotel');
    const activeHotelId = sessionRaw ? JSON.parse(sessionRaw).hotelId : null;

    if (activeHotelId) {
      const { data } = await supabase.from('hotels').select('*').eq('id', activeHotelId).maybeSingle();
      if (data) {
        const hotel = data as Hotel;
        setHotels([hotel]);
        setCurrentHotel(hotel);
        setLoading(false);
        return;
      }
    }

    const { data } = await supabase.from('hotels').select('*').order('name');
    const hotelList = (data || []) as Hotel[];
    setHotels(hotelList);
    if (hotelList.length > 0) {
      const savedId = localStorage.getItem('staywise_current_hotel');
      const found = savedId ? hotelList.find(h => h.id === savedId) : null;
      setCurrentHotel(prev => prev ?? (found || hotelList[0]));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      refreshHotels();
    } else {
      setHotels([]);
      setCurrentHotel(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handleHotelEntered = () => {
      if (user) refreshHotels();
    };
    window.addEventListener('sw:hotel:entered', handleHotelEntered);
    return () => window.removeEventListener('sw:hotel:entered', handleHotelEntered);
  }, [user]);

  const handleSetHotel = (hotel: Hotel) => {
    setCurrentHotel(hotel);
    localStorage.setItem('staywise_current_hotel', hotel.id);
  };

  return (
    <HotelContext.Provider value={{ hotels, currentHotel, setCurrentHotel: handleSetHotel, loading, refreshHotels }}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  const ctx = useContext(HotelContext);
  if (!ctx) throw new Error('useHotel must be used within HotelProvider');
  return ctx;
}
