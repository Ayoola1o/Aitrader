import { StrategyLifecycleStatus, StrategyRecord, StrategyVersionRecord } from '@/types/database';
import { getServerSupabaseAdminClient } from '@/lib/db/supabase';
import { auditLogger } from '@/lib/server/audit';

export interface TransitionValidationProof {
  validatedConfig?: boolean;
  backtestTradesCount?: number;
  backtestSharpe?: number;
  backtestMaxDrawdown?: number;
  walkForwardConfirmed?: boolean;
  paperTradingDays?: number;
  riskViolationsCount?: number;
  reason?: string;
}

export class StrategyLifecycleManager {
  private localStrategies = new Map<string, StrategyRecord>();
  private localVersions = new Map<string, StrategyVersionRecord[]>(); // strategyId -> versions

  /**
   * 1. Create a new Strategy in DRAFT state
   */
  createStrategy(
    strategyId: string,
    name: string,
    category = 'MOMENTUM_TREND',
    initialParameters: Record<string, unknown> = {},
    userId?: string
  ): { strategy: StrategyRecord; version: StrategyVersionRecord } {
    const strategy: StrategyRecord = {
      strategy_id: strategyId,
      user_id: userId,
      name,
      category,
      current_version: 'v1.0',
      lifecycle_status: 'DRAFT',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const version: StrategyVersionRecord = {
      strategy_id: strategyId,
      user_id: userId,
      version_tag: 'v1.0',
      parameters: initialParameters,
      lifecycle_status: 'DRAFT',
      is_immutable: false,
      change_summary: 'Initial draft version creation',
      created_at: new Date().toISOString(),
    };

    this.localStrategies.set(strategyId, strategy);
    this.localVersions.set(strategyId, [version]);

    return { strategy, version };
  }

  /**
   * 2. Branch or Create a new Version (Immutable once deployed)
   */
  createVersion(
    strategyId: string,
    newVersionTag: string,
    parameters: Record<string, unknown>,
    changeSummary: string,
    userId?: string
  ): StrategyVersionRecord {
    const versions = this.localVersions.get(strategyId) || [];
    const exists = versions.find((v) => v.version_tag === newVersionTag);
    if (exists) {
      throw new Error(`Strategy version ${newVersionTag} already exists. Increment version tag.`);
    }

    const newVersion: StrategyVersionRecord = {
      strategy_id: strategyId,
      user_id: userId,
      version_tag: newVersionTag,
      parameters,
      lifecycle_status: 'DRAFT',
      is_immutable: false,
      change_summary: changeSummary,
      created_at: new Date().toISOString(),
    };

    versions.push(newVersion);
    this.localVersions.set(strategyId, versions);

    const strat = this.localStrategies.get(strategyId);
    if (strat) {
      strat.current_version = newVersionTag;
      strat.lifecycle_status = 'DRAFT';
    }

    return newVersion;
  }

  /**
   * 3. Transition Lifecycle Stage with strict prerequisite gate checking
   */
  transition(
    strategyId: string,
    versionTag: string,
    targetStatus: StrategyLifecycleStatus,
    proof: TransitionValidationProof = {}
  ): { success: boolean; error?: string } {
    const versions = this.localVersions.get(strategyId) || [];
    const version = versions.find((v) => v.version_tag === versionTag);

    if (!version) {
      return { success: false, error: `Version ${versionTag} for strategy ${strategyId} not found.` };
    }

    const current = version.lifecycle_status;

    // Allowed transition rules
    const allowedTransitions: Record<StrategyLifecycleStatus, StrategyLifecycleStatus[]> = {
      DRAFT: ['VALIDATED', 'RETIRED'],
      VALIDATED: ['BACKTESTED', 'DRAFT', 'RETIRED'],
      BACKTESTED: ['WALK_FORWARD_TESTED', 'VALIDATED', 'RETIRED'],
      WALK_FORWARD_TESTED: ['PAPER_APPROVED', 'BACKTESTED', 'RETIRED'],
      PAPER_APPROVED: ['LIVE_ELIGIBLE', 'SUSPENDED', 'RETIRED'],
      LIVE_ELIGIBLE: ['LIVE', 'SUSPENDED', 'RETIRED'],
      LIVE: ['SUSPENDED', 'RETIRED'],
      SUSPENDED: ['LIVE', 'RETIRED', 'DRAFT'],
      RETIRED: [],
    };

    if (!allowedTransitions[current].includes(targetStatus)) {
      return {
        success: false,
        error: `Illegal lifecycle jump: Cannot transition directly from ${current} to ${targetStatus}.`,
      };
    }

    // Gate checks per transition
    if (targetStatus === 'VALIDATED' && !proof.validatedConfig) {
      return { success: false, error: 'Transition to VALIDATED requires valid risk configuration proof.' };
    }

    if (targetStatus === 'BACKTESTED') {
      if ((proof.backtestTradesCount || 0) < 10 || (proof.backtestSharpe || 0) < 0.5) {
        return { success: false, error: 'Transition to BACKTESTED requires minimum 10 trades and Sharpe >= 0.5.' };
      }
    }

    if (targetStatus === 'WALK_FORWARD_TESTED' && !proof.walkForwardConfirmed) {
      return { success: false, error: 'Transition to WALK_FORWARD_TESTED requires confirmed out-of-sample test.' };
    }

    if (targetStatus === 'LIVE_ELIGIBLE') {
      if ((proof.riskViolationsCount || 0) > 0) {
        return { success: false, error: 'Cannot achieve LIVE_ELIGIBLE with active risk violations.' };
      }
    }

    if (targetStatus === 'LIVE') {
      version.is_immutable = true; // Freeze version immutability on live deployment
    }

    // Apply status
    version.lifecycle_status = targetStatus;
    const strat = this.localStrategies.get(strategyId);
    if (strat) {
      strat.lifecycle_status = targetStatus;
      strat.updated_at = new Date().toISOString();
    }

    auditLogger.log({
      eventType: 'SETTINGS_UPDATED',
      status: 'SUCCESS',
      details: {
        strategyLifecycleTransition: true,
        strategyId,
        versionTag,
        from: current,
        to: targetStatus,
      },
    });

    return { success: true };
  }

  /**
   * 4. Check if strategy version is authorized to place live orders
   */
  canExecuteLive(strategyId: string, versionTag: string): boolean {
    const versions = this.localVersions.get(strategyId) || [];
    const version = versions.find((v) => v.version_tag === versionTag);
    if (!version) return false;

    // Must be in LIVE state and never SUSPENDED/RETIRED
    return version.lifecycle_status === 'LIVE';
  }
}

export const strategyLifecycleManager = new StrategyLifecycleManager();
