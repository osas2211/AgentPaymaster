"use client"
import { useSession, useOperationStream } from "@/lib/hooks"
import { formatAddress, formatUSDC } from "@/lib/utils/format"

const stateStyles: Record<string, { text: string; bg: string; label: string }> = {
  open: {
    text: "text-primary",
    bg: "bg-primary/10",
    label: "Active",
  },
  pending: {
    text: "text-yellow-500",
    bg: "bg-yellow-500/10",
    label: "Pending",
  },
  closing: {
    text: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Closing",
  },
  closed: {
    text: "text-grey-400",
    bg: "bg-grey-400/10",
    label: "Closed",
  },
}

export const ActiveStateChannels = () => {
  const { sessions } = useSession()
  const { getSessionOperations } = useOperationStream()

  return (
    <div>
      <p className="font-mono mb-4">Active state channels</p>
      <div className="space-y-4">
        {sessions.length === 0 && (
          <div className="p-4 border border-grey-700 bg-grey-900 text-grey-400 text-sm text-center">
            No active sessions
          </div>
        )}

        {sessions.map((session) => {
          const style = stateStyles[session.state] ?? stateStyles.pending
          const opCount = getSessionOperations(session.channelId).length

          return (
            <div
              key={session.channelId}
              className="p-4 border border-grey-700 bg-grey-900"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p>Session</p>
                  <p className="text-xs font-mono text-grey-300">
                    {formatAddress(session.participant)}
                  </p>
                </div>
                <p
                  className={`text-[10px] ${style.bg} rounded-full ${style.text} px-3 py-1 uppercase`}
                >
                  {style.label}
                </p>
              </div>

              <div className="mt-6">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-grey-200">Balance</p>
                    <p className="font-mono text-[16px] font-medium">
                      ${formatUSDC(session.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-grey-200">Operations</p>
                    <p className="font-mono text-[16px] font-medium">
                      {opCount}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-xs bg-primary/7 p-3 flex items-center justify-between gap-4 mt-3">
                <p>Allocated</p>
                <p className="text-primary font-mono font-medium">
                  ${formatUSDC(session.allocation)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
