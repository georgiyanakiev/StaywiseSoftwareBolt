export type ReportTab = 'revenue' | 'occupancy' | 'bookings' | 'financial';

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

export interface RevenueKPIs {
  totalRevenue: number;
  revpar: number;
  adr: number;
  occupancyPct: number;
  gop: number;
  gopMargin: number;
}

export interface RevenueBySourceRow {
  source: string;
  revenue: number;
  bookings: number;
  pct: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface RoomTypePerf {
  roomType: string;
  nightsSold: number;
  revenue: number;
  occupancyPct: number;
  adr: number;
  revpar: number;
}

export interface OccupancyDay {
  date: string;
  occupancyPct: number;
  occupied: number;
  available: number;
}

export interface MonthOccupancy {
  month: string;
  occupancyPct: number;
  prevOccupancyPct: number;
}

export interface RoomPerf {
  roomNumber: string;
  roomType: string;
  nightsOccupied: number;
  nightsAvailable: number;
  occupancyPct: number;
  revenue: number;
}

export interface LeadTimeBucket {
  label: string;
  count: number;
}

export interface BookingSourcePie {
  name: string;
  value: number;
  revenue: number;
}

export interface DailyCancellationRate {
  date: string;
  rate: number;
}

export interface AvgStayTrend {
  month: string;
  avgNights: number;
}

export interface NationalityRow {
  country: string;
  guests: number;
  pct: number;
}

export interface PLRow {
  label: string;
  current: number;
  prev: number;
  isTotal?: boolean;
  isNegative?: boolean;
  isProfit?: boolean;
  isEstimated?: boolean;
}
