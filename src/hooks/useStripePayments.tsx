import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { Reservation } from '../types';

export function useStripePayments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callStripeAction = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Stripe request failed');
    }
    return data;
  }, []);

  const openCheckout = useCallback(async (reservation: Reservation) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callStripeAction({
        action: 'create_checkout_session',
        reservation_id: reservation.id,
      });
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank');
        toast('success', 'Stripe checkout opened in a new tab');
      }
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create checkout';
      setError(msg);
      toast('error', msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [callStripeAction, toast]);

  const issueRefund = useCallback(async (reservationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callStripeAction({
        action: 'refund',
        reservation_id: reservationId,
      });
      toast('success', 'Refund processed successfully');
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process refund';
      setError(msg);
      toast('error', msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [callStripeAction, toast]);

  const getPaymentStatus = useCallback(async (reservationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callStripeAction({
        action: 'get_status',
        reservation_id: reservationId,
      });
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get payment status';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [callStripeAction]);

  return { openCheckout, issueRefund, getPaymentStatus, loading, error };
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  partial: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partial' },
  refunded: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Refunded' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
};

export function PaymentBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.text.replace('text-', 'bg-')}`} />
      {config.label}
    </span>
  );
}
