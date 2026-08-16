import { supabase } from './supabase';

export async function storeChannelSecret(params: {
  vaultId: string | null;
  name: string;
  value: string;
  hotelId: string;
}): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-channel-secret`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_vault_id: params.vaultId,
        p_name: params.name,
        p_value: params.value,
        p_hotel_id: params.hotelId,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? 'Failed to store secret');
  }

  const { vault_id } = await res.json();
  return (vault_id as string) ?? null;
}
