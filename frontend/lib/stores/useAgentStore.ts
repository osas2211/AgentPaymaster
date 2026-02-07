import { create } from 'zustand';
import type { AgentCommand, AgentCommandStatus } from '@/lib/brian/types';
import { MAX_COMMAND_HISTORY } from '@/lib/brian/constants';

// ============================================
// Agent Store Types
// ============================================

interface AgentStats {
  totalCommands: number;
  totalGasSaved: number;
  successfulCommands: number;
  rejectedCommands: number;
}

interface AgentState {
  // Command history (newest first)
  commands: AgentCommand[];

  // Processing state
  isProcessing: boolean;
  currentCommandId: string | null;

  // Agent context
  selectedAgentAddress: string | null;
  activeSessionId: string | null;

  // Aggregated stats
  stats: AgentStats;

  // Actions
  addCommand: (command: AgentCommand) => void;
  updateCommand: (id: string, data: Partial<AgentCommand>) => void;
  setProcessing: (isProcessing: boolean) => void;
  setSelectedAgent: (address: string | null) => void;
  setActiveSession: (sessionId: string | null) => void;
  clearCommands: () => void;

  // Selectors
  getCommand: (id: string) => AgentCommand | undefined;
  getCommandsByStatus: (status: AgentCommandStatus) => AgentCommand[];
}

// ============================================
// Initial State
// ============================================

const initialStats: AgentStats = {
  totalCommands: 0,
  totalGasSaved: 0,
  successfulCommands: 0,
  rejectedCommands: 0,
};

// ============================================
// Agent Store
// ============================================

export const useAgentStore = create<AgentState>((set, get) => ({
  commands: [],
  isProcessing: false,
  currentCommandId: null,
  selectedAgentAddress: null,
  activeSessionId: null,
  stats: { ...initialStats },

  // Command Actions
  addCommand: (command) => {
    set((state) => ({
      commands: [command, ...state.commands].slice(0, MAX_COMMAND_HISTORY),
      currentCommandId: command.id,
      stats: {
        ...state.stats,
        totalCommands: state.stats.totalCommands + 1,
      },
    }));
  },

  updateCommand: (id, data) => {
    set((state) => {
      const commands = state.commands.map((cmd) =>
        cmd.id === id ? { ...cmd, ...data } : cmd,
      );

      // Recalculate stats on status transitions
      const stats = { ...state.stats };

      if (data.status === 'completed') {
        stats.successfulCommands += 1;
      } else if (data.status === 'rejected') {
        stats.rejectedCommands += 1;
      }

      if (data.gasSaved !== undefined) {
        stats.totalGasSaved += data.gasSaved;
      }

      return { commands, stats };
    });
  },

  setProcessing: (isProcessing) => {
    set({ isProcessing });
  },

  setSelectedAgent: (address) => {
    set({ selectedAgentAddress: address });
  },

  setActiveSession: (sessionId) => {
    set({ activeSessionId: sessionId });
  },

  clearCommands: () => {
    set({ commands: [], stats: { ...initialStats }, currentCommandId: null });
  },

  // Selectors
  getCommand: (id) => {
    return get().commands.find((cmd) => cmd.id === id);
  },

  getCommandsByStatus: (status) => {
    return get().commands.filter((cmd) => cmd.status === status);
  },
}));
