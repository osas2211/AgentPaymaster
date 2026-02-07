import type { Address } from 'viem';
import { parseUnits } from 'viem';
import type { AgentCommand, BrianTransactionResult } from '@/lib/brian/types';
import { getTransactionFromPrompt } from '@/lib/brian/client';
import { GAS_ESTIMATES } from '@/lib/brian/constants';
import { PolicyValidator } from './PolicyValidator';
import type { YellowOperations, AgentRunnerCallbacks } from './types';

// ============================================
// Agent Runner — Core Orchestrator
// ============================================

export class AgentRunner {
  private agentAddress: Address;
  private walletAddress: Address;
  private callbacks: AgentRunnerCallbacks;
  private validator: PolicyValidator;
  private yellowOps: YellowOperations | null = null;

  constructor(
    agentAddress: Address,
    walletAddress: Address,
    callbacks: AgentRunnerCallbacks,
    validator?: PolicyValidator,
  ) {
    this.agentAddress = agentAddress;
    this.walletAddress = walletAddress;
    this.callbacks = callbacks;
    this.validator = validator ?? new PolicyValidator();
  }

  /**
   * Inject Yellow Network operations from the hook layer
   */
  setYellowOperations(ops: YellowOperations): void {
    this.yellowOps = ops;
  }

  /**
   * Execute a full command pipeline: interpret -> validate -> execute
   */
  async executeCommand(prompt: string): Promise<AgentCommand> {
    const command: AgentCommand = {
      id: crypto.randomUUID(),
      prompt,
      status: 'pending',
      timestamp: Date.now(),
    };

    this.callbacks.onCommandUpdate(command);

    try {
      // Step 1: Interpret via Brian AI
      command.status = 'interpreting';
      this.callbacks.onCommandUpdate({ ...command });

      const brianResult = await getTransactionFromPrompt(prompt, this.walletAddress);
      command.brianResponse = brianResult;
      this.callbacks.onCommandUpdate({ ...command });

      // Step 2: Extract amount and validate against PolicyVault
      const amount = this.extractAmount(brianResult);

      if (amount > BigInt(0)) {
        const validation = await this.validator.validateSpend(this.agentAddress, amount);
        command.validationResult = validation;

        if (!validation.allowed) {
          command.status = 'rejected';
          command.error = validation.reason;
          this.callbacks.onCommandUpdate({ ...command });
          return command;
        }
      } else {
        command.validationResult = {
          allowed: true,
          reason: 'No spend required (read-only operation)',
        };
      }

      command.status = 'validated';
      this.callbacks.onCommandUpdate({ ...command });

      // Step 3: Execute via Yellow Network if connected
      if (this.yellowOps?.isConnected()) {
        const sessionId = this.yellowOps.getActiveSessionId();

        if (sessionId && amount > BigInt(0)) {
          command.status = 'executing';
          this.callbacks.onCommandUpdate({ ...command });

          const target = brianResult.transactions[0]?.to;
          if (target) {
            const success = await this.yellowOps.transfer(sessionId, amount, target);

            if (success) {
              command.status = 'completed';
              command.gasSaved = this.inferGasSavings(brianResult);
              command.executionResult = {
                success: true,
                method: 'yellow',
                sessionId,
              };
            } else {
              command.status = 'failed';
              command.error = 'Yellow Network transfer failed';
              command.executionResult = {
                success: false,
                method: 'yellow',
                sessionId,
                error: 'Transfer rejected by Yellow Network',
              };
            }
          } else {
            // No target address — read-only command
            command.status = 'completed';
            command.gasSaved = this.inferGasSavings(brianResult);
            command.executionResult = {
              success: true,
              method: 'yellow',
              sessionId,
            };
          }
        } else {
          // No session or no amount — validated but can't execute
          command.status = 'completed';
          command.gasSaved = this.inferGasSavings(brianResult);
          command.executionResult = {
            success: true,
            method: 'yellow',
          };
        }
      }

      // If Yellow not connected, stay at 'validated' status
      this.callbacks.onCommandUpdate({ ...command });
      return command;
    } catch (err) {
      command.status = 'failed';
      command.error = err instanceof Error ? err.message : 'Unknown error';
      this.callbacks.onCommandUpdate({ ...command });
      this.callbacks.onError(command.error);
      return command;
    }
  }

  /**
   * Extract amount from Brian result using multiple strategies
   */
  private extractAmount(result: BrianTransactionResult): bigint {
    // Strategy 1: fromAmount field (most reliable)
    if (result.fromAmount) {
      try {
        return parseUnits(result.fromAmount, 6);
      } catch {
        // Fall through to next strategy
      }
    }

    // Strategy 2: transaction value
    const tx = result.transactions[0];
    if (tx?.value && tx.value !== '0') {
      try {
        return BigInt(tx.value);
      } catch {
        // Fall through
      }
    }

    // Strategy 3: regex on description
    const match = result.description.match(/(\d+(?:\.\d+)?)\s*(?:USDC|USD)/i);
    if (match) {
      try {
        return parseUnits(match[1], 6);
      } catch {
        // Fall through
      }
    }

    return BigInt(0);
  }

  /**
   * Infer the operation type from Brian result for gas estimates
   */
  private inferOperationType(result: BrianTransactionResult): string {
    const desc = result.description.toLowerCase();
    if (desc.includes('swap')) return 'swap';
    if (desc.includes('transfer') || desc.includes('send')) return 'transfer';
    if (desc.includes('bridge')) return 'bridge';
    if (desc.includes('approve')) return 'approve';
    if (desc.includes('deposit')) return 'deposit';
    if (desc.includes('withdraw')) return 'withdraw';
    return 'unknown';
  }

  /**
   * Calculate estimated gas savings for an operation
   */
  private inferGasSavings(result: BrianTransactionResult): number {
    const opType = this.inferOperationType(result);
    return GAS_ESTIMATES[opType] ?? GAS_ESTIMATES.unknown;
  }
}
