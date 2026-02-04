"use client"
import React, { useState, useEffect, useRef } from "react"

interface Operation {
  id: number
  timestamp: Date
  type: string
  action: string
  agent: string
  target: string
  amount: string | null
  gasWouldCost: number
  status: string
  channel: string
}

interface GasStats {
  saved: number
  wouldHaveCost: number
  actualCost: number
  opCount: number
}

const typeColorMap: Record<string, { text: string; bg: string }> = {
  transfer: { text: "text-primary", bg: "bg-primary/10" },
  swap_request: { text: "text-indigo-500", bg: "bg-indigo-500/10" },
  approve: { text: "text-amber-500", bg: "bg-amber-500/10" },
  state_update: { text: "text-violet-500", bg: "bg-violet-500/10" },
  balance_check: { text: "text-pink-500", bg: "bg-pink-500/10" },
  policy_check: { text: "text-teal-500", bg: "bg-teal-500/10" },
}

export const SessionMonitor = () => {
  const [operations, setOperations] = useState<Operation[]>([])
  const [_gasStats, setGasStats] = useState<GasStats>({
    saved: 0,
    wouldHaveCost: 0,
    actualCost: 0,
    opCount: 0,
  })
  const [isStreaming, setIsStreaming] = useState(true)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Simulated real-time operations stream
  useEffect(() => {
    if (!isStreaming) return

    const operationTypes = [
      { type: "transfer", action: "Transfer USDC", gasWouldCost: 0.45 },
      { type: "swap_request", action: "Swap Request", gasWouldCost: 0.85 },
      { type: "approve", action: "Token Approval", gasWouldCost: 0.35 },
      { type: "state_update", action: "State Update", gasWouldCost: 0.25 },
      { type: "balance_check", action: "Balance Query", gasWouldCost: 0.15 },
      { type: "policy_check", action: "Policy Validation", gasWouldCost: 0.2 },
    ]

    const agents = ["Trading Bot Alpha", "DeFi Optimizer", "Yield Harvester"]
    const targets = [
      "Uniswap v4",
      "LI.FI Router",
      "Curve Pool",
      "Aave",
      "Compound",
    ]

    const interval = setInterval(
      () => {
        const op =
          operationTypes[Math.floor(Math.random() * operationTypes.length)]
        const agent = agents[Math.floor(Math.random() * agents.length)]
        const target = targets[Math.floor(Math.random() * targets.length)]
        const amount =
          op.type === "transfer" || op.type === "swap_request"
            ? (Math.random() * 100 + 5).toFixed(2)
            : null

        const newOp: Operation = {
          id: Date.now(),
          timestamp: new Date(),
          type: op.type,
          action: op.action,
          agent,
          target,
          amount,
          gasWouldCost: op.gasWouldCost,
          status: "confirmed",
          channel: "0x4a21...8f3c",
        }

        setOperations((prev) => [newOp, ...prev].slice(0, 100))
        setGasStats((prev) => ({
          saved: prev.saved + op.gasWouldCost,
          wouldHaveCost: prev.wouldHaveCost + op.gasWouldCost,
          actualCost: prev.actualCost + 0.0001,
          opCount: prev.opCount + 1,
        }))
      },
      Math.random() * 800 + 200,
    )

    return () => clearInterval(interval)
  }, [isStreaming])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0
    }
  }, [operations])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
  }

  const getTypeColors = (type: string) => {
    return typeColorMap[type] || { text: "text-grey-400", bg: "bg-grey-700" }
  }

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
            {operations.length} ops buffered
          </span>
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isStreaming ? "bg-primary animate-pulse" : "bg-grey-500"
            }`}
          />
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="h-[550px] overflow-auto px-4 py-3 font-mono text-xs leading-relaxed"
      >
        {operations.map((op, index) => (
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
              className={`${getTypeColors(op.type).text} ${getTypeColors(op.type).bg} min-w-[100px] px-1.5 py-0.5 rounded text-[11px]`}
            >
              {op.type.toUpperCase()}
            </span>
            <span className="text-white min-w-[130px]">{op.agent}</span>
            <span className="text-grey-500">→</span>
            <span className="text-white min-w-[100px]">{op.target}</span>
            {op.amount && (
              <span className="text-primary min-w-[80px]">
                {op.amount} USDC
              </span>
            )}
            <span className="text-grey-500 ml-auto text-[10px]">
              saved ${op.gasWouldCost.toFixed(2)}
            </span>
          </div>
        ))}

        {operations.length === 0 && (
          <div className="text-grey-500 text-center py-10">
            Waiting for operations...
          </div>
        )}
      </div>

      {/* Terminal Footer Stats */}
      <div className="px-4 py-3 bg-primary/5 border-t border-grey-700 flex justify-between text-[11px]">
        <span className="text-grey-400">
          Throughput:{" "}
          <span className="text-primary font-semibold">
            ~{Math.floor(Math.random() * 500 + 200)} ops/sec
          </span>
        </span>
        <span className="text-grey-400">
          Latency: <span className="text-primary font-semibold">&lt;50ms</span>
        </span>
        <span className="text-grey-400">
          State Channel:{" "}
          <span className="text-primary font-semibold">HEALTHY</span>
        </span>
      </div>
    </div>
  )
}
