import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface DpaAcceptance {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  accepted_at: string;
  dpa_version: string;
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
      .eq('user_id', userId)
      .order('accepted_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
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

    const payload: Record<string, unknown> = {
      user_id: userId,
      dpa_version: '1.0',
      user_agent: navigator.userAgent,
    };
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
