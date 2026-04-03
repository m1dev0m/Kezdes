import { useCallback, useEffect, useState } from 'react';

import api from '@/services/api';
import { getApiErrorMessage } from '@/features/reservations/shared';

export type SubscriptionInvoice = {
  id: number;
  number: string;
  plan: string;
  amount: string;
  currency: string;
  status: string;
  issued_at: string;
  due_at?: string | null;
  paid_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  note?: string;
};

export type SubscriptionChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  description: string;
  path: string;
};

export type SubscriptionFeature = {
  key: string;
  label: string;
  enabled: boolean;
};

export type RestaurantSubscriptionSummary = {
  id: number;
  name: string;
  status: string;
  plan: string;
  plan_label: string;
  payment_status: string;
  payment_status_label: string;
  current_period_starts_at?: string | null;
  current_period_ends_at?: string | null;
  grace_until?: string | null;
  is_subscription_live: boolean;
  subscription_state: string;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
  usage_percent: Record<string, number | null>;
  features: SubscriptionFeature[];
  checklist: SubscriptionChecklistItem[];
  feature_flags: Record<string, boolean>;
  invoices: SubscriptionInvoice[];
  upgrade_cta?: {
    label: string;
    path: string;
  };
};

type SubscriptionAuditEntry = {
  id: number;
  event_type: string;
  target_type: string;
  target_id: string;
  summary: string;
  actor_username?: string | null;
  created_at: string;
  payload?: Record<string, unknown>;
};

export function useRestaurantSubscriptionSummary() {
  const [summary, setSummary] = useState<RestaurantSubscriptionSummary | null>(null);
  const [audit, setAudit] = useState<SubscriptionAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [summaryResponse, auditResponse] = await Promise.all([
        api.get<RestaurantSubscriptionSummary>('/restaurants/subscription/'),
        api.get<SubscriptionAuditEntry[]>('/restaurants/subscription/audit/').catch(() => ({ data: [] as SubscriptionAuditEntry[] })),
      ]);
      setSummary(summaryResponse.data);
      setAudit(Array.isArray(auditResponse.data) ? auditResponse.data : []);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Не удалось загрузить данные по подписке.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    summary,
    audit,
    loading,
    refreshing,
    error,
    reload: load,
  };
}
