"use client"
import { StatCards } from "@/components/dashboard/StatCards"
import { AgentsList } from "@/components/dashboard/AgentsList"
import { RecentTransactions } from "@/components/dashboard/RecentTransactions"

export default function DashboardPage() {
  return (
    <div>
      <StatCards />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
        <div className="md:col-span-2">
          <AgentsList />
        </div>
        <div className="md:col-span-3">
          <RecentTransactions />
        </div>
      </div>
    </div>
  )
}
