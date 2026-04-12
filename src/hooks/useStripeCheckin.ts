import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

type StripeAction = 'charge_checkin' | 'charge_checkout' | 'send_receipt' | 'refund' | null;

interface CheckinResponse {
  checkout_url?: string;
  session_id?: string;
  amount?: number;
  currency?: string;
  message?: string;
  status?: string;
  remaining?: number;
  refund_id?: string;
}

async function callStripePayments(action: string, reservation_id: string): Promise<CheckinResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-payments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ action, reservation_id }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Stripe request failed');
  return data;
}

export function useStripeCheckin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<StripeAction>(null);
  const [error, setError] = useState<string | null>(null);

  const chargeOnCheckIn = useCallback(async (reservationId: string) => {
    setLoading('charge_checkin');
    setError(null);
    try {
      const data = await callStripePayments('charge_checkin', reservationId);
      if (data.status === 'paid') {
        toast('info', 'Guest has already paid for this reservation');
        return data;
      }
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank');
        toast('success', 'Opening Stripe payment for guest...');
      }
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create check-in charge';
      setError(msg);
      toast('error', msg);
      return null;
    } finally {
      setLoading(null);
    }
  }, [toast]);

  const chargeOnCheckOut = useCallback(async (reservationId: string) => {
    setLoading('charge_checkout');
    setError(null);
    try {
      const data = await callStripePayments('charge_checkout', reservationId);
      if (data.message?.includes('Fully paid')) {
        toast('success', 'Guest fully paid — receipt sent');
        return data;
      }
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank');
        toast('success', 'Opening Stripe for remaining balance...');
      }
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create check-out charge';
      setError(msg);
      toast('error', msg);
      return null;
    } finally {
      setLoading(null);
    }
  }, [toast]);

  const sendReceipt = useCallback(async (reservationId: string) => {
    setLoading('send_receipt');
    setError(null);
    try {
      const data = await callStripePayments('send_receipt', reservationId);
      toast('success', data.message || 'Receipt sent');
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send receipt';
      setError(msg);
      toast('error', msg);
      return null;
    } finally {
      setLoading(null);
    }
  }, [toast]);

  const issueRefund = useCallback(async (reservationId: string) => {
    setLoading('refund');
    setError(null);
    try {
      const data = await callStripePayments('refund', reservationId);
      toast('success', data.message || 'Refund processed');
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process refund';
      setError(msg);
      toast('error', msg);
      return null;
    } finally {
      setLoading(null);
    }
  }, [toast]);

  return { chargeOnCheckIn, chargeOnCheckOut, sendReceipt, issueRefund, loading, error };
}
