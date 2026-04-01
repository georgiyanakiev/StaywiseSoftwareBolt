import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useActiveHotel } from '../contexts/ActiveHotelContext';
import { getChannelIcon } from '../utils/channelCatalog';

export interface Channel {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error' | 'paused';
  last_sync: string | null;
  logo_color: string | null;
  logo_letter: string | null;
}

const STATUS_ORDER = ['connected', 'error', 'paused', 'disconnected'];

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useActiveHotel();

  useEffect(() => {
    let cancelled = false;

    async function fetchChannels() {
      setLoading(true);

      let query = supabase
        .from('channels')
        .select('id, name, type, status, last_sync')
        .order('name', { ascending: true });

      if (session?.tenantId) {
        query = query.eq('tenant_id', session.tenantId);
      } else {
        query = query.is('tenant_id', null);
      }

      const { data, error } = await query;
      if (cancelled || error || !data) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: catalog } = await supabase
        .from('channel_catalog')
        .select('slug, logo_color, logo_letter');

      if (cancelled) return;

      const catalogMap = new Map(
        (catalog ?? []).map(c => [c.slug as string, { logo_color: c.logo_color as string, logo_letter: c.logo_letter as string }])
      );

      const enriched: Channel[] = (data as { id: string; name: string; type: string; status: Channel['status']; last_sync: string | null }[]).map(ch => {
        const meta = catalogMap.get(ch.type);
        const fallback = getChannelIcon(ch.type);
        return {
          ...ch,
          logo_color: meta?.logo_color ?? fallback.color,
          logo_letter: meta?.logo_letter ?? fallback.letter,
        };
      });

      enriched.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

      setChannels(enriched);
      setLoading(false);
    }

    fetchChannels();
    return () => { cancelled = true; };
  }, [session?.tenantId]);

  return { channels, loading };
}
