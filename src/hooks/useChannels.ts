import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useActiveHotel } from '../contexts/ActiveHotelContext';

export interface Channel {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error' | 'paused';
  last_sync: string | null;
}

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useActiveHotel();

  useEffect(() => {
    async function fetchChannels() {
      setLoading(true);

      let query = supabase
        .from('channels')
        .select('id, name, type, status, last_sync')
        .order('name', { ascending: true });

      if (session?.tenantId) {
        query = query.or(`tenant_id.eq.${session.tenantId},tenant_id.is.null`);
      } else {
        query = query.is('tenant_id', null);
      }

      const { data, error } = await query;
      if (!error && data) {
        setChannels(data as Channel[]);
      }
      setLoading(false);
    }

    fetchChannels();
  }, [session?.tenantId]);

  return { channels, loading };
}
