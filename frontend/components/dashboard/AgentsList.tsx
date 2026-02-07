"use client"
import Link from "next/link"
import { useAgents } from "@/lib/hooks"
import { formatUSDC, formatAddress } from "@/lib/utils/format"

const agentColors = [
  { border: "border-l-primary", bar: "bg-primary" },
  { border: "border-l-indigo-400", bar: "bg-indigo-400" },
  { border: "border-l-violet-400", bar: "bg-violet-400" },
  { border: "border-l-pink-400", bar: "bg-pink-400" },
  { border: "border-l-teal-400", bar: "bg-teal-400" },
]

export const AgentsList = () => {
  const { agents, isLoading } = useAgents()

  return (
    <div className="border border-grey-700 bg-grey-900 p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="font-semibold text-lg">Agents</p>
        <Link
          href="/setup"
          className="text-xs font-mono bg-primary text-night px-3 py-1.5 hover:bg-primary/90 transition-colors"
        >
          + Add
        </Link>
      </div>

      <div className="space-y-4">
        {isLoading && (
          <div className="text-grey-400 text-sm text-center py-6">
            Loading agents...
          </div>
        )}

        {!isLoading && agents.length === 0 && (
          <div className="text-grey-400 text-sm text-center py-6">
            No agents authorized yet
          </div>
        )}

        {agents.map((agent, index) => {
          const color = agentColors[index % agentColors.length]
          const spent = Number(agent.totalSpent) / 1e6
          const limit = Number(agent.policy.dailyLimit) / 1e6
          const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0

          return (
            <div
              key={agent.address}
              className={`border-l-2 ${color.border} pl-4 py-3`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs font-mono text-grey-400 mt-0.5">
                    {formatAddress(agent.address)}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-medium ${
                    !agent.policy.isActive
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {agent.policy.isActive ? "active" : "paused"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full h-1 bg-grey-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${!agent.policy.isActive ? "bg-amber-500" : color.bar} rounded-full transition-all`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-grey-400 font-mono mt-1.5">
                  ${formatUSDC(agent.totalSpent)} / ${formatUSDC(agent.policy.dailyLimit)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
