'use client';

import { supabaseManager } from '@/lib/db/supabase';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'TRADER' | 'ADMIN' | 'QUANT';
  createdAt: number;
}

const SESSION_KEY = 'aitrader_user_session';

export const sessionManager = {
  getCurrentUser(): UserSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
    return null;
  },

  async loginWithEmail(identifier: string, password: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
    try {
      const email = identifier.includes('@') ? identifier : `${identifier.toLowerCase()}@quantarion.ai`;
      const cleanUsername = identifier.includes('@') ? identifier.split('@')[0] : identifier;

      const client = supabaseManager.getClient();
      if (client) {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          const user: UserSession = {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || cleanUsername,
            role: (data.user.user_metadata?.role as any) || 'TRADER',
            createdAt: new Date(data.user.created_at).getTime(),
          };
          this.persistSession(user);
          return { success: true, user };
        }
        if (error) {
          return { success: false, error: error.message };
        }
      }

      return {
        success: false,
        error: 'Authentication failed. Please verify your Supabase credentials or network connection.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  },

  async signUpWithEmail(email: string, password: string, name: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
    try {
      const client = supabaseManager.getClient();
      if (client) {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { name, role: 'TRADER' },
          },
        });

        if (!error && data.user) {
          const user: UserSession = {
            id: data.user.id,
            email: data.user.email || email,
            name: name || email.split('@')[0],
            role: 'TRADER',
            createdAt: Date.now(),
          };
          this.persistSession(user);
          return { success: true, user };
        }
        if (error) {
          return { success: false, error: error.message };
        }
      }

      return {
        success: false,
        error: 'Registration failed. Supabase connection required for secure account provisioning.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  },

  /**
   * Real Supabase OAuth sign in (Item 12)
   */
  async signInWithOAuth(provider: 'google' | 'github'): Promise<{ success: boolean; error?: string }> {
    try {
      const client = supabaseManager.getClient();
      if (!client) {
        return { success: false, error: 'Supabase is not configured for OAuth authentication.' };
      }

      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  },

  persistSession(user: UserSession) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } catch {}
    }
  },

  async logout(): Promise<void> {
    const client = supabaseManager.getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch {}
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {}
    }
  },
};
