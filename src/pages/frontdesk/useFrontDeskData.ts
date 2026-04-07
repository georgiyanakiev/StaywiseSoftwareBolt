import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Hotel } from '../../types';

export interface FrontDeskKPIs {
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  dirtyRooms: number;
  cleanRooms: number;
  maintenanceRooms: number;
  arrivalsExpected: number;
  arrivalsCheckedIn: number;
  departuresExpected: number;
  departuresCheckedOut: number;
  stayovers: number;
  todayRevenue: number;
  avgRoomRate: number;
  noShows: number;
  walkins: number;
}

export interface ArrivalItem {
  id: string;
  confirmationCode: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  nights: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  source: string | null;
}

export interface DepartureItem {
  id: string;
  confirmationCode: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  nights: number;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  balance: number;
}

export interface StayoverItem {
  id: string;
  confirmationCode: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nightsRemaining: number;
  totalAmount: number;
}

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

function nightsBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

export function useFrontDeskData(currentHotel: Hotel | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<FrontDeskKPIs>({
    occupancyRate: 0, totalRooms: 0, occupiedRooms: 0, availableRooms: 0,
    dirtyRooms: 0, cleanRooms: 0, maintenanceRooms: 0,
    arrivalsExpected: 0, arrivalsCheckedIn: 0,
    departuresExpected: 0, departuresCheckedOut: 0,
    stayovers: 0, todayRevenue: 0, avgRoomRate: 0,
    noShows: 0, walkins: 0,
  });
  const [arrivals, setArrivals] = useState<ArrivalItem[]>([]);
  const [departures, setDepartures] = useState<DepartureItem[]>([]);
  const [stayovers, setStayovers] = useState<StayoverItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (currentHotel) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [currentHotel]);

  async function fetchAll() {
    if (!currentHotel) return;
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchRoomStats(), fetchReservations()]);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load front desk data');
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoomStats() {
    if (!currentHotel) return;
    const { data, error: err } = await supabase
      .from('rooms')
      .select('status')
      .eq('hotel_id', currentHotel.id);
    if (err) throw err;
    const rooms = data || [];
    return rooms;
  }

  async function fetchReservations() {
    if (!currentHotel) return;
    const today = isoToday();

    const [roomsRes, arrivalsRes, departuresRes, stayoversRes] = await Promise.all([
      supabase.from('rooms').select('status').eq('hotel_id', currentHotel.id),
      supabase
        .from('reservations')
        .select('id, confirmation_code, check_in, check_out, status, total_amount, adults, children, notes, source, created_at, guest:guests(first_name, last_name), room:rooms(number, room_type:room_types(name))')
        .eq('hotel_id', currentHotel.id)
        .eq('check_in', today)
        .in('status', ['confirmed', 'checked_in', 'no_show'])
        .order('check_in', { ascending: true }),
      supabase
        .from('reservations')
        .select('id, confirmation_code, check_in, check_out, status, total_amount, amount_paid, adults, children, notes, guest:guests(first_name, last_name), room:rooms(number, room_type:room_types(name))')
        .eq('hotel_id', currentHotel.id)
        .eq('check_out', today)
        .in('status', ['checked_in', 'checked_out'])
        .order('check_out', { ascending: true }),
      supabase
        .from('reservations')
        .select('id, confirmation_code, check_in, check_out, status, total_amount, guest:guests(first_name, last_name), room:rooms(number, room_type:room_types(name))')
        .eq('hotel_id', currentHotel.id)
        .eq('status', 'checked_in')
        .lt('check_in', today)
        .gt('check_out', today)
        .order('check_out', { ascending: true }),
    ]);

    if (roomsRes.error) throw roomsRes.error;

    const rooms = roomsRes.data || [];
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const dirtyRooms = rooms.filter(r => r.status === 'dirty').length;
    const cleanRooms = rooms.filter(r => r.status === 'clean').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance' || r.status === 'out_of_service').length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const arrivalList = (arrivalsRes.data || []) as any[];
    const departureList = (departuresRes.data || []) as any[];
    const stayoverList = (stayoversRes.data || []) as any[];

    const arrivalsExpected = arrivalList.filter(r => r.status === 'confirmed').length;
    const arrivalsCheckedIn = arrivalList.filter(r => r.status === 'checked_in').length;
    const noShows = arrivalList.filter(r => r.status === 'no_show').length;
    const walkins = arrivalList.filter(r =>
      r.source === 'walk_in' ||
      (r.created_at && r.created_at.split('T')[0] === today && r.source !== 'booking_com' && r.source !== 'expedia' && r.source !== 'airbnb')
    ).length;
    const departuresExpected = departureList.filter(r => r.status === 'checked_in').length;
    const departuresCheckedOut = departureList.filter(r => r.status === 'checked_out').length;

    const arrivedRevenue = arrivalList.filter(r => r.status === 'checked_in').reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
    const departedRevenue = departureList.filter(r => r.status === 'checked_out').reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
    const todayRevenue = arrivedRevenue + departedRevenue;

    const allOccupied = [...arrivalList.filter(r => r.status === 'checked_in'), ...stayoverList];
    const avgRoomRate = allOccupied.length > 0
      ? Math.round(allOccupied.reduce((s: number, r: any) => {
          const nights = nightsBetween(r.check_in, r.check_out);
          return s + (r.total_amount || 0) / Math.max(1, nights);
        }, 0) / allOccupied.length)
      : 0;

    setKpis({
      occupancyRate, totalRooms, occupiedRooms, availableRooms,
      dirtyRooms, cleanRooms, maintenanceRooms,
      arrivalsExpected, arrivalsCheckedIn,
      departuresExpected, departuresCheckedOut,
      stayovers: stayoverList.length,
      todayRevenue, avgRoomRate,
      noShows, walkins,
    });

    setArrivals(arrivalList.map((r: any) => ({
      id: r.id,
      confirmationCode: r.confirmation_code || '—',
      guestName: r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : 'Unknown Guest',
      roomNumber: r.room?.number || '—',
      roomType: r.room?.room_type?.name || '—',
      nights: nightsBetween(r.check_in, r.check_out),
      adults: r.adults || 1,
      children: r.children || 0,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
      totalAmount: r.total_amount || 0,
      notes: r.notes,
      source: r.source,
    })));

    setDepartures(departureList.map((r: any) => ({
      id: r.id,
      confirmationCode: r.confirmation_code || '—',
      guestName: r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : 'Unknown Guest',
      roomNumber: r.room?.number || '—',
      roomType: r.room?.room_type?.name || '—',
      nights: nightsBetween(r.check_in, r.check_out),
      adults: r.adults || 1,
      children: r.children || 0,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
      totalAmount: r.total_amount || 0,
      notes: r.notes,
      balance: Math.max(0, (r.total_amount || 0) - (r.amount_paid || 0)),
    })));

    setStayovers(stayoverList.map((r: any) => ({
      id: r.id,
      confirmationCode: r.confirmation_code || '—',
      guestName: r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : 'Unknown Guest',
      roomNumber: r.room?.number || '—',
      roomType: r.room?.room_type?.name || '—',
      checkIn: r.check_in,
      checkOut: r.check_out,
      nightsRemaining: Math.max(0, nightsBetween(today, r.check_out)),
      totalAmount: r.total_amount || 0,
    })));
  }

  return { loading, error, kpis, arrivals, departures, stayovers, lastUpdated, refresh: fetchAll };
}
