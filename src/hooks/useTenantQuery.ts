import { useTenant } from '../contexts/TenantContext';

export function useTenantId(): string | null {
  const { tenant } = useTenant();
  return tenant?.id ?? null;
}
