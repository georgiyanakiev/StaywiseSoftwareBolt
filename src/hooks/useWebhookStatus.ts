import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface WebhookEvent {
  id: string;
  source: string;
  event_type: string;
  status: 'success' | 'failed' | 'retrying';
  attempt: number;
  max_attempts: number;
  error_message: string | null;
  response_code: number | null;
  created_at: string;
  resolved_at: string | null;
}

export interface SyncStatus {
  overall: 'healthy' | 'degraded' | 'failing' | 'unknown';
  lastSuccess: string | null;
  lastFailure: string | null;
  recentFailures: number;
  totalToday: number;
  successToday: number;
  failedToday: number;
  retryingCount: number;
  recentEvents: WebhookEvent[];
}

export function useWebhookStatus(hotelId: string | undefined) {
  const [status, setStatus] = useState<SyncStatus>({
    overall: 'unknown',
    lastSuccess: null,
    lastFailure: null,
    recentFailures: 0,
    totalToday: 0,
    successToday: 0,
    failedToday: 0,
    retryingCount: 0,
    recentEvents: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hotelId) {
      setLoading(false);
      return;
    }

    fetchStatus();

    const channel = supabase
      .channel('webhook-events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'webhook_events' },
        () => { fetchStatus(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId]);

  async function fetchStatus() {
    if (!hotelId) return;
    setLoading(true);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    const [recentRes, todayRes] = await Promise.all([
      supabase
        .from('webhook_events')
        .select('*')
        .eq('hotel_id', hotelId)
        .gte('created_at', last24h.toISOString())
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('webhook_events')
        .select('status')
        .eq('hotel_id', hotelId)
        .gte('created_at', todayStart.toISOString()),
    ]);

    const recentEvents = (recentRes.data || []) as WebhookEvent[];
    const todayEvents = todayRes.data || [];

    const successToday = todayEvents.filter(e => e.status === 'success').length;
    const failedToday = todayEvents.filter(e => e.status === 'failed').length;
    const retryingCount = todayEvents.filter(e => e.status === 'retrying').length;

    const lastSuccess = recentEvents.find(e => e.status === 'success')?.created_at ?? null;
    const lastFailure = recentEvents.find(e => e.status === 'failed')?.created_at ?? null;

    const recentFailures = recentEvents.filter(e => e.status === 'failed').length;

    let overall: SyncStatus['overall'] = 'unknown';
    if (todayEvents.length === 0 && recentEvents.length === 0) {
      overall = 'unknown';
    } else if (failedToday === 0 && retryingCount === 0) {
      overall = 'healthy';
    } else if (recentFailures >= 3) {
      overall = 'failing';
    } else {
      overall = 'degraded';
    }

    setStatus({
      overall,
      lastSuccess,
      lastFailure,
      recentFailures,
      totalToday: todayEvents.length,
      successToday,
      failedToday,
      retryingCount,
      recentEvents: recentEvents.slice(0, 10),
    });

    setLoading(false);
  }

  return { status, loading, refresh: fetchStatus };
}
