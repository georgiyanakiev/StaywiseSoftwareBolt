import { Building2, CheckCircle, TrendingUp } from 'lucide-react';
import type { Tenant } from './types';

interface StatsBarProps {
  tenants: Tenant[];
}

export default function StatsBar({ tenants }: StatsBarProps) {
  const total = tenants.length;
  const active = tenants.filter(t => t.active).length;
  const starter = tenants.filter(t => t.plan === 'starter').length;
  const pro = tenants.filter(t => t.plan === 'pro').length;
  const enterprise = tenants.filter(t => t.plan === 'enterprise').length;

  const stats = [
    { label: 'Total Hotels', value: total, icon: Building2, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active', value: active, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Starter', value: starter, icon: TrendingUp, color: 'bg-gray-50 text-gray-600' },
    { label: 'Pro', value: pro, icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
    { label: 'Enterprise', value: enterprise, icon: TrendingUp, color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
            <s.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
