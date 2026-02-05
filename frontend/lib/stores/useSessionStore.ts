import { create } from 'zustand';
import type { YellowSession, Operation, GasStats } from '@/types';

// ============================================
// Session Store Types
// ============================================

interface SessionState {
  // Sessions
  sessions: YellowSession[];

  // Operations by session ID
  operations: Map<string, Operation[]>;

  // Gas statistics
  gasStats: GasStats;

  // Actions
  addSession: (session: YellowSession) => void;
  updateSession: (sessionId: string, data: Partial<YellowSession>) => void;
  removeSession: (sessionId: string) => void;

  addOperation: (sessionId: string, operation: Operation) => void;
  clearOperations: (sessionId: string) => void;

  updateGasStats: (gasSaved: number) => void;
  resetGasStats: () => void;

  // Selectors
  getSession: (sessionId: string) => YellowSession | undefined;
  getSessionOperations: (sessionId: string) => Operation[];
}

// ============================================
// Initial State
// ============================================

const initialGasStats: GasStats = {
  totalSaved: 0,
  wouldHaveCost: 0,
  actualCost: 0,
  savingsPercent: 0,
  operationsCount: 0,
};

// ============================================
// Session Store
// ============================================

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  operations: new Map(),
  gasStats: { ...initialGasStats },

  // Session Actions
  addSession: (session) => {
    set((state) => ({
      sessions: [...state.sessions, session],
      operations: new Map(state.operations).set(session.channelId, []),
    }));
  },

  updateSession: (sessionId, data) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.channelId === sessionId ? { ...s, ...data } : s
      ),
    }));
  },

  removeSession: (sessionId) => {
    set((state) => {
      const newOperations = new Map(state.operations);
      newOperations.delete(sessionId);

      return {
        sessions: state.sessions.filter((s) => s.channelId !== sessionId),
        operations: newOperations,
      };
    });
  },

  // Operation Actions
  addOperation: (sessionId, operation) => {
    set((state) => {
      const newOperations = new Map(state.operations);
      const sessionOps = newOperations.get(sessionId) || [];

      // Keep last 100 operations per session
      const updatedOps = [...sessionOps, operation].slice(-100);
      newOperations.set(sessionId, updatedOps);

      return { operations: newOperations };
    });
  },

  clearOperations: (sessionId) => {
    set((state) => {
      const newOperations = new Map(state.operations);
      newOperations.set(sessionId, []);
      return { operations: newOperations };
    });
  },

  // Gas Stats Actions
  updateGasStats: (gasSaved) => {
    set((state) => {
      const estimatedOnChainCost = gasSaved * 1.01; // Assume 1% overhead
      const actualCost = gasSaved * 0.001; // Yellow Network is ~0.1% of on-chain

      return {
        gasStats: {
          totalSaved: state.gasStats.totalSaved + gasSaved,
          wouldHaveCost: state.gasStats.wouldHaveCost + estimatedOnChainCost,
          actualCost: state.gasStats.actualCost + actualCost,
          savingsPercent:
            ((state.gasStats.wouldHaveCost + estimatedOnChainCost -
              (state.gasStats.actualCost + actualCost)) /
              (state.gasStats.wouldHaveCost + estimatedOnChainCost)) *
            100,
          operationsCount: state.gasStats.operationsCount + 1,
        },
      };
    });
  },

  resetGasStats: () => {
    set({ gasStats: { ...initialGasStats } });
  },

  // Selectors
  getSession: (sessionId) => {
    return get().sessions.find((s) => s.channelId === sessionId);
  },

  getSessionOperations: (sessionId) => {
    return get().operations.get(sessionId) || [];
  },
}));
