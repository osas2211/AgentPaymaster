'use client';

import { Terminal, Fuel, CheckCircle, XCircle } from 'lucide-react';
import { useAgentHistory } from '@/lib/hooks/useAgentHistory';

// ============================================
// Agent Stats Component
// ============================================

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  subtitleColor?: string;
  icon: React.ReactNode;
  iconColor?: string;
}

const StatCard = ({
  label,
  value,
  subtitle,
  subtitleColor = 'text-grey-400',
  icon,
  iconColor = 'text-primary',
}: StatCardProps) => (
  <div className="p-5 border border-grey-700 bg-grey-900">
    <div className="flex items-start justify-between">
      <p className="uppercase text-xs text-grey-300 font-medium tracking-wide">
        {label}
      </p>
      <div className={iconColor}>{icon}</div>
    </div>
    <p className="text-4xl font-medium font-mono mt-4">{value}</p>
    <p className={`text-xs font-mono mt-2 ${subtitleColor}`}>{subtitle}</p>
  </div>
);

export const AgentStats = () => {
  const { stats, successRate, formattedGasSaved } = useAgentHistory();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Commands"
        value={String(stats.totalCommands)}
        subtitle="Prompts processed"
        subtitleColor="text-grey-400"
        icon={<Terminal size={18} />}
        iconColor="text-indigo-400"
      />
      <StatCard
        label="Gas Saved"
        value={formattedGasSaved}
        subtitle="Via Yellow Network"
        subtitleColor="text-grey-400"
        icon={<Fuel size={18} />}
        iconColor="text-amber-400"
      />
      <StatCard
        label="Approved"
        value={String(stats.successfulCommands)}
        subtitle={`${successRate}% success rate`}
        subtitleColor="text-primary"
        icon={<CheckCircle size={18} />}
        iconColor="text-primary"
      />
      <StatCard
        label="Rejected"
        value={String(stats.rejectedCommands)}
        subtitle="By PolicyVault"
        subtitleColor={stats.rejectedCommands > 0 ? 'text-red-400' : 'text-grey-400'}
        icon={<XCircle size={18} />}
        iconColor="text-red-400"
      />
    </div>
  );
};
