"use client"
import { useOperationStream } from "@/lib/hooks"
import { formatUSDC, formatRelativeTime } from "@/lib/utils/format"
import type { OperationType } from "@/types"

const typeLabels: Record<OperationType, string> = {
  transfer: "Transfer USDC",
  swap_request: "Swap USDC",
  approve: "Token Approval",
  state_update: "State Update",
  balance_check: "Balance Query",
  policy_check: "Policy Check",
}

export const RecentTransactions = () => {
  const { recentOperations } = useOperationStream()

  // Show up to 8 most recent
  const transactions = recentOperations.slice(0, 8)

  return (
    <div className="border border-grey-700 bg-grey-900 p-5">
      <p className="font-semibold text-lg mb-5">Recent Transactions</p>

      <div className="space-y-0">
        {transactions.length === 0 && (
          <div className="text-grey-400 text-sm text-center py-6">
            No recent transactions
          </div>
        )}

        {transactions.map((op) => (
          <div
            key={op.id}
            className="flex items-center justify-between py-4 border-b border-grey-700 last:border-b-0"
          >
            <div>
              <p className="font-medium text-sm">
                {typeLabels[op.type] ?? op.type}
                {op.target && (
                  <span className="text-grey-400">
                    {" "}
                    &rarr; {op.target}
                  </span>
                )}
              </p>
              <p className="text-xs text-grey-400 font-mono mt-1">
                {formatRelativeTime(op.timestamp)}
              </p>
            </div>
            <div className="text-right">
              {op.amount > BigInt(0) && (
                <p className="font-mono font-medium text-sm">
                  -{formatUSDC(op.amount, { showSymbol: true })}
                </p>
              )}
              <p
                className={`text-[11px] font-mono mt-0.5 ${
                  op.status === "confirmed"
                    ? "text-primary"
                    : op.status === "failed"
                      ? "text-red-400"
                      : "text-amber-400"
                }`}
              >
                {op.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
