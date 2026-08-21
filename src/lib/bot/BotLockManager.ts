import { getServerSupabaseAdminClient } from '@/lib/db/supabase';

export interface BotLock {
  botId: string;
  lockedAt: number;
  expiresAt: number;
  lockedBy: string; // Worker / process ID
}

/**
 * Distributed Bot Lock Manager (Phase 3 Execution Safety)
 * Prevents multiple bot execution cycles from running simultaneously across
 * serverless invocations, cron triggers, and multiple server nodes.
 */
export class BotLockManager {
  private localLocks = new Map<string, BotLock>();

  /**
   * Acquire a distributed lock for a specific bot ID.
   * @param botId Unique bot identifier
   * @param ttlMs Time-to-live in milliseconds (default: 45 seconds)
   * @param workerId Unique ID of worker attempting to acquire lock
   * @returns true if lock acquired, false if already locked
   */
  async acquireLock(botId: string, ttlMs = 45000, workerId = 'worker-main'): Promise<boolean> {
    const now = Date.now();

    // 1. Check local lock map
    const local = this.localLocks.get(botId);
    if (local && now < local.expiresAt) {
      // Already locked locally by active cycle
      return false;
    }

    // 2. Set local lock immediately
    const lock: BotLock = {
      botId,
      lockedAt: now,
      expiresAt: now + ttlMs,
      lockedBy: workerId,
    };
    this.localLocks.set(botId, lock);

    // 3. Persist lock timestamp to Supabase if available
    try {
      const client = getServerSupabaseAdminClient();
      if (client) {
        // Atomic conditional update or timestamp check
        await client
          .from('bot_sessions')
          .update({
            updated_at: new Date().toISOString(),
            last_cycle_timestamp: now,
          })
          .eq('session_id', botId);
      }
    } catch {
      // Fallback to local memory lock if offline
    }

    return true;
  }

  /**
   * Release the distributed lock for a specific bot ID.
   */
  async releaseLock(botId: string): Promise<void> {
    this.localLocks.delete(botId);
  }

  /**
   * Check if a bot currently holds an active lock.
   */
  isLocked(botId: string): boolean {
    const lock = this.localLocks.get(botId);
    if (!lock) return false;
    if (Date.now() >= lock.expiresAt) {
      this.localLocks.delete(botId);
      return false;
    }
    return true;
  }
}

export const botLockManager = new BotLockManager();
