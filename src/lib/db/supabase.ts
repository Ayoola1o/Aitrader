import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

class SupabaseManager {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined') {
      const url = localStorage.getItem('aitrader_supabase_url') || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const anonKey = localStorage.getItem('aitrader_supabase_anon_key') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
    if (!this.client && typeof window !== 'undefined') {
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
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err?.message || String(err)}` };
    }
  }
}

export const supabaseManager = new SupabaseManager();
