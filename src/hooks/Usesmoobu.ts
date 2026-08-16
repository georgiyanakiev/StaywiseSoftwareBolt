import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Booking = {
  id: string;
  smoobu_id: string;
  property_id: string;
  property_name: string;
  channel_name: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  adults: number;
  children: number;
  arrival: string;
  departure: string;
  check_in_time: string;
  check_out_time: string;
  total_price: number;
  price_paid: boolean;
  status: "confirmed" | "modified" | "cancelled";
  notice: string;
  created_at: string;
};

export type AvailabilityDay = {
  date: string;
  is_available: boolean;
  smoobu_id: string | null;
};

// Fetch all bookings for a property
export function useBookings(propertyId?: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();

    // Real-time subscription — updates UI instantly when webhook fires
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          console.log("Booking change received:", payload);
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  async function fetchBookings() {
    setLoading(true);
    let query = supabase
      .from("bookings")
      .select("*")
      .order("arrival", { ascending: true });

    if (propertyId) {
      query = query.eq("property_id", propertyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to load channel bookings', error);
      setError('We could not load bookings right now. Please try again.');
    } else {
      setBookings(data ?? []);
    }
    setLoading(false);
  }

  return { bookings, loading, error, refetch: fetchBookings };
}

// Fetch availability calendar for a property and month
export function useAvailability(propertyId: string, year: number, month: number) {
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate   = new Date(year, month, 0).toISOString().split("T")[0];

    supabase
      .from("availability")
      .select("date, is_available, smoobu_id")
      .eq("property_id", propertyId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date")
      .then(({ data, error }) => {
        if (!error) setAvailability(data ?? []);
        setLoading(false);
      });
  }, [propertyId, year, month]);

  return { availability, loading };
}

// Manually sync bookings from Smoobu API via proxy
export async function syncFromSmoobu(propertyId: string) {
  const { data, error } = await supabase.functions.invoke("smoobu-proxy", {
    body: {
      endpoint: `/reservations?apartmentId=${propertyId}&pageSize=100`,
      method: "GET",
    },
  });

  if (error) throw new Error(error.message);
  return data;
}