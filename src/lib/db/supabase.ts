import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface BotSessionRecord {
  id?: number;
  session_id: string;
  symbol: string;
  allocated_capital: number;
  cycle_interval_seconds: number;
  cycles_completed: number;
  trades_executed: number;
  final_pnl: number;
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'IDLE';
  last_action?: string;
  last_decision_action?: string;
  consecutive_no_trades?: number;
  consecutive_losses?: number;
  current_price?: number;
  logs?: Array<{ id: number; time: number; level: string; message: string }>;
  started_at?: string;
  stopped_at?: string;
}

class SupabaseManager {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;

  constructor() {
    this.init();
  }

  private init() {
    let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    let anonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('aitrader_supabase_url');
      const storedKey = localStorage.getItem('aitrader_supabase_anon_key');
      if (storedUrl) url = storedUrl;
      if (storedKey) anonKey = storedKey;
    }

    if (url && anonKey) {
      try {
        this.config = { url, anonKey };
        this.client = createClient(url, anonKey, {
          auth: { persistSession: false },
        });
      } catch (err) {
        console.warn('[SupabaseManager] Initialization error:', err);
        this.client = null;
      }
    }
  }

  setCredentials(url: string, anonKey: string): boolean {
    try {
      if (!url || !anonKey) {
        this.client = null;
        this.config = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('aitrader_supabase_url');
          localStorage.removeItem('aitrader_supabase_anon_key');
        }
        return true;
      }

      this.config = { url, anonKey };
      this.client = createClient(url, anonKey, {
        auth: { persistSession: false },
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('aitrader_supabase_url', url);
        localStorage.setItem('aitrader_supabase_anon_key', anonKey);
      }
      return true;
    } catch (err) {
      console.error('[SupabaseManager] Failed to set credentials:', err);
      return false;
    }
  }

  getClient(): SupabaseClient | null {
    if (!this.client) {
      this.init();
    }
    return this.client;
  }

  isConfigured(): boolean {
    return this.getClient() !== null;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase URL or Anon Key is missing.' };
    }

    try {
      const { error } = await client.from('ai_decisions').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            message: 'Connected to Supabase, but tables are missing. Please run the SQL schema migration in Supabase SQL editor.',
          };
        }
        return { success: false, message: `Database error: ${error.message}` };
      }
      return { success: true, message: '✓ Successfully connected to Supabase PostgreSQL database.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Connection failed: ${message}` };
    }
  }

  // ── Bot State Cloud Persistence ───────────────────────────────────────────────
  async getActiveBotSession(): Promise<BotSessionRecord | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('bot_sessions')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return data as BotSessionRecord;
    } catch {
      return null;
    }
  }

  async saveBotSession(session: Partial<BotSessionRecord> & { session_id: string }): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      const { error } = await client
        .from('bot_sessions')
        .upsert(session, { onConflict: 'session_id' });
      return !error;
    } catch {
      return false;
    }
  }

  // ── Multi-Tenant User Persistence ───────────────────────────────────────────
  async getUserBots(userId: string): Promise<Record<string, unknown>[]> {
    const client = this.getClient();
    if (!client || !userId) return [];
    try {
      const { data, error } = await client
        .from('user_bots')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  }

  async saveUserBot(userId: string, bot: Record<string, unknown>): Promise<boolean> {
    const client = this.getClient();
    if (!client || !userId) return false;
    try {
      const { error } = await client
        .from('user_bots')
        .upsert({ ...bot, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'bot_id' });
      return !error;
    } catch {
      return false;
    }
  }

  async getUserTrades(userId: string): Promise<Record<string, unknown>[]> {
    const client = this.getClient();
    if (!client || !userId) return [];
    try {
      const { data, error } = await client
        .from('user_trades')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100);
      if (error || !data) return [];
      return data;
    } catch {
      return [];
    }
  }

  async saveUserTrade(userId: string, trade: Record<string, unknown>): Promise<boolean> {
    const client = this.getClient();
    if (!client || !userId) return false;
    try {
      const { error } = await client
        .from('user_trades')
        .insert({ ...trade, user_id: userId, created_at: new Date().toISOString() });
      return !error;
    } catch {
      return false;
    }
  }

  async getUserProfile(userId: string): Promise<Record<string, unknown> | null> {
    const client = this.getClient();
    if (!client || !userId) return null;
    try {
      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  }

  async saveUserProfile(userId: string, profile: Record<string, unknown>): Promise<boolean> {
    const client = this.getClient();
    if (!client || !userId) return false;
    try {
      const { error } = await client
        .from('user_profiles')
        .upsert({ ...profile, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      return !error;
    } catch {
      return false;
    }
  }
}

export const supabaseManager = new SupabaseManager();
