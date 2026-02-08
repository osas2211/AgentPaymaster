'use client';

import { useRef, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, Shield, AlertTriangle } from 'lucide-react';
import type { AgentCommand, AgentCommandStatus } from '@/lib/brian/types';

// ============================================
// Agent Action Feed Component
// ============================================

interface AgentActionFeedProps {
  commands: AgentCommand[];
  isYellowConnected: boolean;
}

const statusConfig: Record<AgentCommandStatus, { color: string; bg: string; label: string }> = {
  pending: { color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'PENDING' },
  interpreting: { color: 'text-indigo-400', bg: 'bg-indigo-400/10', label: 'INTERPRETING' },
  validated: { color: 'text-indigo-400', bg: 'bg-indigo-400/10', label: 'VALIDATED' },
  rejected: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'REJECTED' },
  executing: { color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'EXECUTING' },
  completed: { color: 'text-primary', bg: 'bg-primary/10', label: 'COMPLETED' },
  failed: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'FAILED' },
};

const StatusIcon = ({ status }: { status: AgentCommandStatus }) => {
  const size = 12;
  switch (status) {
    case 'pending':
    case 'interpreting':
    case 'executing':
      return <Loader2 size={size} className="animate-spin" />;
    case 'validated':
      return <Shield size={size} />;
    case 'completed':
      return <CheckCircle size={size} />;
    case 'rejected':
      return <AlertTriangle size={size} />;
    case 'failed':
      return <XCircle size={size} />;
  }
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const AgentActionFeed = ({ commands, isYellowConnected }: AgentActionFeedProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0;
    }
  }, [commands]);

  return (
    <div className="bg-grey-1000 border border-grey-700 overflow-hidden">
      {/* Terminal Header */}
      <div className="px-4 py-3 bg-white/[0.02] border-b border-grey-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>
          <span className="text-[13px] text-grey-400 font-mono">
            brian-agent.log
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-grey-500">
            {commands.length} commands
          </span>
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isYellowConnected ? 'bg-primary animate-pulse' : 'bg-grey-500'
            }`}
          />
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className="h-[450px] overflow-auto px-4 py-3 font-mono text-xs leading-relaxed"
      >
        {commands.map((cmd, index) => {
          const config = statusConfig[cmd.status];

          return (
            <div
              key={cmd.id}
              className={`py-2.5 border-b border-white/[0.03] ${
                index === 0 ? 'opacity-100 animate-fadeIn' : 'opacity-85'
              }`}
            >
              {/* Prompt Line */}
              <div className="flex items-start gap-2">
                <span className="text-grey-500 min-w-[75px] shrink-0">
                  {formatTime(cmd.timestamp)}
                </span>
                <span className="text-primary">$</span>
                <span className="text-white">{cmd.prompt}</span>
              </div>

              {/* Brian Description */}
              {cmd.brianResponse && (
                <div className="flex items-center gap-2 mt-1 ml-[85px]">
                  <span className="text-grey-500">{'>'}</span>
                  <span className="text-grey-300">{cmd.brianResponse.description}</span>
                  {cmd.brianResponse.protocol && (
                    <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">
                      {cmd.brianResponse.protocol}
                    </span>
                  )}
                </div>
              )}

              {/* Policy Validation */}
              {cmd.validationResult && (
                <div className="flex items-center gap-2 mt-1 ml-[85px]">
                  <Shield size={10} className={cmd.validationResult.allowed ? 'text-primary' : 'text-red-400'} />
                  <span className={cmd.validationResult.allowed ? 'text-primary' : 'text-red-400'}>
                    {cmd.validationResult.reason}
                  </span>
                  {cmd.validationResult.remainingLimit !== undefined && (
                    <span className="text-grey-500 text-[10px]">
                      (remaining: {(Number(cmd.validationResult.remainingLimit) / 1e6).toFixed(2)} USDC)
                    </span>
                  )}
                </div>
              )}

              {/* Status + Gas Saved */}
              <div className="flex items-center gap-2 mt-1 ml-[85px]">
                <span className={`${config.color} ${config.bg} px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1`}>
                  <StatusIcon status={cmd.status} />
                  {config.label}
                </span>
                {cmd.gasSaved !== undefined && cmd.gasSaved > 0 && (
                  <span className="text-primary text-[10px]">
                    saved ${cmd.gasSaved.toFixed(2)}
                  </span>
                )}
                {cmd.error && (
                  <span className="text-red-400 text-[10px]">{cmd.error}</span>
                )}
              </div>
            </div>
          );
        })}

        {commands.length === 0 && (
          <div className="text-grey-500 text-center py-10">
            {isYellowConnected
              ? 'Ready for commands. Type a prompt above to get started.'
              : 'Type a natural language command to interpret Web3 transactions.'}
          </div>
        )}
      </div>

      {/* Terminal Footer */}
      <div className="px-4 py-3 bg-primary/5 border-t border-grey-700 flex justify-between text-[11px]">
        <span className="text-grey-400">
          Total:{' '}
          <span className="text-primary font-semibold">{commands.length} cmds</span>
        </span>
        <span className="text-grey-400">
          Completed:{' '}
          <span className="text-primary font-semibold">
            {commands.filter((c) => c.status === 'completed').length}
          </span>
        </span>
        <span className="text-grey-400">
          Yellow Network:{' '}
          <span className={`font-semibold ${isYellowConnected ? 'text-primary' : 'text-grey-500'}`}>
            {isYellowConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </span>
      </div>
    </div>
  );
};
