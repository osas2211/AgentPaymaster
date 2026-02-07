"use client"
import { useRef, useEffect } from "react"
import { useOperationStream, useYellowConnection } from "@/lib/hooks"
import { formatUSDC } from "@/lib/utils/format"

const typeColorMap: Record<string, { text: string; bg: string }> = {
  transfer: { text: "text-primary", bg: "bg-primary/10" },
  swap_request: { text: "text-indigo-500", bg: "bg-indigo-500/10" },
  approve: { text: "text-amber-500", bg: "bg-amber-500/10" },
  state_update: { text: "text-violet-500", bg: "bg-violet-500/10" },
  balance_check: { text: "text-pink-500", bg: "bg-pink-500/10" },
  policy_check: { text: "text-teal-500", bg: "bg-teal-500/10" },
}

const getTypeColors = (type: string) => {
  return typeColorMap[type] || { text: "text-grey-400", bg: "bg-grey-700" }
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export const SessionMonitor = () => {
  const { recentOperations, stats } = useOperationStream()
  const { isConnected, status } = useYellowConnection()
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0
    }
  }, [recentOperations])

  return (
    <div className="bg-grey-1000 border border-grey-700 overflow-hidden mt-10">
      {/* Terminal Header */}
      <div className="px-4 py-3 bg-white/[0.02] border-b border-grey-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>
          <span className="text-[13px] text-grey-400 font-mono">
            yellow-network-stream.log
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-grey-500">
            {recentOperations.length} ops buffered
          </span>
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? "bg-primary animate-pulse" : "bg-grey-500"
            }`}
          />
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="h-[550px] overflow-auto px-4 py-3 font-mono text-xs leading-relaxed"
      >
        {recentOperations.map((op, index) => {
          const colors = getTypeColors(op.type)

          return (
            <div
              key={op.id}
              className={`flex gap-3 py-1.5 border-b border-white/[0.03] ${
                index === 0 ? "opacity-100 animate-fadeIn" : "opacity-85"
              }`}
            >
              <span className="text-grey-500 min-w-[85px]">
                {formatTime(op.timestamp)}
              </span>
              <span
                className={`${colors.text} ${colors.bg} min-w-[100px] px-1.5 py-0.5 rounded text-[11px]`}
              >
                {op.type.toUpperCase()}
              </span>
              <span className="text-white min-w-[130px]">{op.target}</span>
              <span className="text-grey-500">→</span>
              <span
                className={`min-w-[80px] text-[10px] px-1.5 py-0.5 rounded ${
                  op.status === "confirmed"
                    ? "text-primary bg-primary/10"
                    : op.status === "failed"
                      ? "text-red-400 bg-red-400/10"
                      : "text-amber-400 bg-amber-400/10"
                }`}
              >
                {op.status.toUpperCase()}
              </span>
              {op.amount > BigInt(0) && (
                <span className="text-primary min-w-[80px]">
                  {formatUSDC(op.amount, { showSymbol: true })}
                </span>
              )}
              <span className="text-grey-500 ml-auto text-[10px]">
                saved {formatUSDC(op.estimatedGas)}
              </span>
            </div>
          )
        })}

        {recentOperations.length === 0 && (
          <div className="text-grey-500 text-center py-10">
            {isConnected
              ? "Waiting for operations..."
              : `Yellow Network ${status} — connect to stream operations`}
          </div>
        )}
      </div>

      {/* Terminal Footer Stats */}
      <div className="px-4 py-3 bg-primary/5 border-t border-grey-700 flex justify-between text-[11px]">
        <span className="text-grey-400">
          Total:{" "}
          <span className="text-primary font-semibold">
            {stats.total} ops
          </span>
        </span>
        <span className="text-grey-400">
          Pending:{" "}
          <span className="text-amber-400 font-semibold">{stats.pending}</span>
        </span>
        <span className="text-grey-400">
          Yellow Network:{" "}
          <span
            className={`font-semibold ${isConnected ? "text-primary" : "text-grey-500"}`}
          >
            {isConnected ? "CONNECTED" : status.toUpperCase()}
          </span>
        </span>
      </div>
    </div>
  )
}
