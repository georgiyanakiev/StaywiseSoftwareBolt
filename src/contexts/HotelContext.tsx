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
  const { user, staff } = useAuth();
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
    const { data } = await supabase.from('hotels').select('*').order('name');
    const hotelList = (data || []) as Hotel[];
    setHotels(hotelList);
    if (hotelList.length > 0 && !currentHotel) {
      const savedId = localStorage.getItem('staywise_current_hotel');
      const found = savedId ? hotelList.find(h => h.id === savedId) : null;
      setCurrentHotel(found || hotelList[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && staff) {
      refreshHotels();
    } else {
      setLoading(false);
    }
  }, [user, staff]);

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
