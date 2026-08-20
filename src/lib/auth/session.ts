'use client';

import { supabaseManager } from '@/lib/db/supabase';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'TRADER' | 'ADMIN' | 'QUANT';
  createdAt: number;
  isApiAuth?: boolean;
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

      // Master Account Authentication
      if (cleanUsername.toLowerCase() === 'azahadinc' && password === 'Ayoola10') {
        const user: UserSession = {
          id: 'usr-azahadinc-master',
          email: 'azahadinc@quantarion.ai',
          name: 'Ayoola Adebisi (Azahadinc)',
          role: 'ADMIN',
          createdAt: Date.now(),
        };
        this.persistSession(user);
        return { success: true, user };
      }

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
            role: 'TRADER',
            createdAt: new Date(data.user.created_at).getTime(),
          };
          this.persistSession(user);
          return { success: true, user };
        }
      }

      // Local / Offline fallback authentication
      if (identifier && password.length >= 6) {
        const user: UserSession = {
          id: `usr-${btoa(email).slice(0, 12).toLowerCase()}`,
          email,
          name: cleanUsername,
          role: 'TRADER',
          createdAt: Date.now(),
        };
        this.persistSession(user);
        return { success: true, user };
      }

      return { success: false, error: 'Password must be at least 6 characters' };
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
            data: { name },
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
      }

      // Local / Offline fallback registration
      if (email && password.length >= 6) {
        const user: UserSession = {
          id: `usr-${btoa(email).slice(0, 12).toLowerCase()}`,
          email,
          name: name || email.split('@')[0],
          role: 'TRADER',
          createdAt: Date.now(),
        };
        this.persistSession(user);
        return { success: true, user };
      }

      return { success: false, error: 'Password must be at least 6 characters' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  },

  async loginWithApiKey(apiKey: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
    if (!apiKey || apiKey.trim().length < 8) {
      return { success: false, error: 'Invalid API Key length' };
    }

    const user: UserSession = {
      id: `key-${apiKey.slice(0, 8)}`,
      email: `quant-${apiKey.slice(0, 6)}@quantarion.ai`,
      name: `Institutional Quant (${apiKey.slice(0, 4)}***)`,
      role: 'QUANT',
      createdAt: Date.now(),
      isApiAuth: true,
    };

    this.persistSession(user);
    return { success: true, user };
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    const client = supabaseManager.getClient();
    if (client) {
      client.auth.signOut().catch(() => {});
    }
  },

  persistSession(user: UserSession) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
  },
};
