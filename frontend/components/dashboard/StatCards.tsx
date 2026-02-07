"use client"
import { Wallet, TrendingUp, Bot, Zap } from "lucide-react"
import { useVaultBalance, useAgents, useOperationStream } from "@/lib/hooks"
import { formatUSDC } from "@/lib/utils/format"

interface StatCardProps {
  label: string
  value: string
  subtitle: string
  subtitleColor?: string
  icon: React.ReactNode
  iconColor?: string
}

const StatCard = ({
  label,
  value,
  subtitle,
  subtitleColor = "text-grey-400",
  icon,
  iconColor = "text-primary",
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
)

export const StatCards = () => {
  const { total } = useVaultBalance()
  const { agents } = useAgents()
  const { stats } = useOperationStream()

  const activeCount = agents.filter((a) => a.policy.isActive).length
  const pausedCount = agents.filter((a) => !a.policy.isActive).length

  const totalSpent = agents.reduce((sum, a) => sum + a.totalSpent, BigInt(0))
  const totalDailyLimit = agents.reduce(
    (sum, a) => sum + a.policy.dailyLimit,
    BigInt(0),
  )
  const limitPercent =
    totalDailyLimit > BigInt(0)
      ? Number((totalSpent * BigInt(100)) / totalDailyLimit)
      : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Vault Balance"
        value={`$${formatUSDC(total)}`}
        subtitle={`$${formatUSDC(total !== undefined ? total - totalSpent : undefined)} available`}
        subtitleColor="text-primary"
        icon={<Wallet size={18} />}
        iconColor="text-amber-400"
      />
      <StatCard
        label="Spent Today"
        value={`$${formatUSDC(totalSpent)}`}
        subtitle={`${limitPercent}% of limit`}
        subtitleColor="text-grey-400"
        icon={<TrendingUp size={18} />}
        iconColor="text-indigo-400"
      />
      <StatCard
        label="Active Agents"
        value={String(activeCount)}
        subtitle={pausedCount > 0 ? `${pausedCount} paused` : "All active"}
        subtitleColor={pausedCount > 0 ? "text-amber-400" : "text-primary"}
        icon={<Bot size={18} />}
        iconColor="text-primary"
      />
      <StatCard
        label="Transactions"
        value={String(stats.total)}
        subtitle="Last 24h"
        subtitleColor="text-grey-400"
        icon={<Zap size={18} />}
        iconColor="text-amber-400"
      />
    </div>
  )
}
