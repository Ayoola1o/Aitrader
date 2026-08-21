import { auditLogger } from '@/lib/server/audit';

export type TelegramRole = 'VIEWER' | 'TRADER' | 'BOT_MANAGER' | 'STRATEGY_MANAGER' | 'ADMIN';

export const ROLE_HIERARCHY: Record<TelegramRole, number> = {
  VIEWER: 1,
  TRADER: 2,
  BOT_MANAGER: 3,
  STRATEGY_MANAGER: 4,
  ADMIN: 5,
};

export interface TelegramUserContext {
  chatId: string;
  userId?: string;
  username?: string;
  role: TelegramRole;
  isAuthorized: boolean;
}

export class TelegramAuthService {
  private authorizedChatMap = new Map<string, { role: TelegramRole; userId?: string }>();

  constructor() {
    this.loadAuthorizedChats();
  }

  private loadAuthorizedChats() {
    const defaultChatId = process.env.TELEGRAM_CHAT_ID;
    if (defaultChatId) {
      // Default configured chat gets ADMIN role
      this.authorizedChatMap.set(String(defaultChatId).trim(), { role: 'ADMIN' });
    }

    const authorizedList = process.env.TELEGRAM_AUTHORIZED_CHAT_IDS;
    if (authorizedList) {
      // Format: "12345:ADMIN,67890:VIEWER,11223:TRADER" or "12345,67890"
      for (const item of authorizedList.split(',')) {
        const trimmed = item.trim();
        if (trimmed.includes(':')) {
          const [cid, roleStr] = trimmed.split(':');
          const role = (roleStr.toUpperCase() as TelegramRole) || 'VIEWER';
          this.authorizedChatMap.set(cid.trim(), { role });
        } else if (trimmed) {
          this.authorizedChatMap.set(trimmed, { role: 'VIEWER' });
        }
      }
    }
  }

  /**
   * Authenticates and authorizes an incoming Telegram message context
   */
  authenticateChat(chatId: string | number, username?: string): TelegramUserContext {
    const cidStr = String(chatId).trim();
    const mapping = this.authorizedChatMap.get(cidStr);

    if (!mapping) {
      auditLogger.log({
        eventType: 'AUTH_LOGIN',
        status: 'FAILURE',
        details: {
          telegramAuth: false,
          chatId: cidStr,
          username: username || 'UNKNOWN',
          reason: 'Unauthorized Telegram chat ID',
        },
      });

      return {
        chatId: cidStr,
        username,
        role: 'VIEWER',
        isAuthorized: false,
      };
    }

    return {
      chatId: cidStr,
      userId: mapping.userId,
      username,
      role: mapping.role,
      isAuthorized: true,
    };
  }

  /**
   * Checks if user has required role privilege to execute a specific command
   */
  hasPermission(userContext: TelegramUserContext, requiredRole: TelegramRole): boolean {
    if (!userContext.isAuthorized) return false;
    const userLevel = ROLE_HIERARCHY[userContext.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Manually register or grant permissions to a chat ID (used during dynamic admin pairing)
   */
  grantPermission(chatId: string, role: TelegramRole, userId?: string) {
    this.authorizedChatMap.set(String(chatId).trim(), { role, userId });
  }
}

export const telegramAuthService = new TelegramAuthService();
