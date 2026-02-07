"use client"
import { ActiveStateChannels } from "@/components/sessions/ActiveStateChannels"
import { GasSavingBanner } from "@/components/sessions/GasSavingBanner"
import { SessionMonitor } from "@/components/sessions/SessionMonitor"
import { useYellowConnection } from "@/lib/hooks"
const SessionsPage = () => {
  const { isConnected, isConnecting, connect, disconnect, hasError, error } =
    useYellowConnection()

  return (
    <div>
      {/* Yellow Network Connection Status */}
      <div className="flex items-center justify-between mb-4 px-4 py-3 border border-grey-700 bg-grey-900">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-primary animate-pulse"
                : isConnecting
                  ? "bg-amber-400 animate-pulse"
                  : hasError
                    ? "bg-red-500"
                    : "bg-grey-500"
            }`}
          />
          <span className="text-sm font-mono text-grey-300">
            Yellow Network:{" "}
            <span
              className={
                isConnected
                  ? "text-primary"
                  : hasError
                    ? "text-red-400"
                    : "text-grey-400"
              }
            >
              {isConnected
                ? "Connected"
                : isConnecting
                  ? "Connecting..."
                  : hasError
                    ? `Error: ${error?.message}`
                    : "Disconnected"}
            </span>
          </span>
        </div>
        {!isConnecting && (
          <button
            onClick={isConnected ? disconnect : () => connect()}
            className={`text-xs font-mono px-3 py-1 border ${
              isConnected
                ? "border-grey-600 text-grey-300 hover:border-red-500 hover:text-red-400"
                : "border-primary/50 text-primary hover:border-primary"
            } transition-colors`}
          >
            {isConnected ? "Disconnect" : "Connect"}
          </button>
        )}
      </div>

      <div>
        <GasSavingBanner />
      </div>

      <div className="grid grid-cols-1 gap-4 md: md:grid-cols-5 my-4 md:my-7">
        <ActiveStateChannels />
        <div className="col-span-4">
          <SessionMonitor />
        </div>
      </div>
    </div>
  )
}

export default SessionsPage
