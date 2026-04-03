import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface DpaAcceptance {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  accepted_at: string;
  dpa_version: string;
}

async function fetchClientIp(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) return null;
    const json = await res.json();
    return json.ip ?? null;
  } catch {
    return null;
  }
}

export function useDpaAcceptance(userId: string | null | undefined, tenantId: string | null | undefined) {
  const [acceptance, setAcceptance] = useState<DpaAcceptance | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAcceptance = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    let query = supabase
      .from('dpa_acceptances')
      .select('*')
      .order('accepted_at', { ascending: false })
      .limit(1);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setAcceptance(data as DpaAcceptance | null);
    }
    setLoading(false);
  }, [userId, tenantId]);

  useEffect(() => {
    fetchAcceptance();
  }, [fetchAcceptance]);

  const accept = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    setAccepting(true);
    setError(null);

    const ip = await fetchClientIp();

    const payload: Record<string, unknown> = {
      user_id: userId,
      dpa_version: '1.0',
      user_agent: navigator.userAgent,
    };
    if (ip) payload.ip_address = ip;
    if (tenantId) payload.tenant_id = tenantId;

    const { data, error: insertError } = await supabase
      .from('dpa_acceptances')
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setAccepting(false);
      return false;
    }

    setAcceptance(data as DpaAcceptance);
    setAccepting(false);
    return true;
  }, [userId, tenantId]);

  return { acceptance, loading, accepting, error, accept, refetch: fetchAcceptance };
}
