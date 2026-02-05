// Хранилище токенов и сессий для Telegram авторизации
// В продакшене рекомендуется использовать Redis или базу данных

import type { TelegramWebAppUser } from '../telegram-webapp.d';

export interface Session {
  id: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'confirmed';
}

export interface UserData {
  user: TelegramWebAppUser;
  authToken: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

// In-memory хранилище (для продакшена используйте Redis/DB)
const sessions = new Map<string, Session>();
const userData = new Map<string, UserData>();

// Время жизни сессии - 5 минут
const SESSION_TTL = 5 * 60 * 1000;
// Время жизни данных пользователя - 24 часа
const USER_DATA_TTL = 24 * 60 * 60 * 1000;

// Генерация случайного токена
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// Создание новой сессии
export function createSession(): Session {
  const sessionId = generateToken(24);
  const now = Date.now();
  
  const session: Session = {
    id: sessionId,
    createdAt: now,
    expiresAt: now + SESSION_TTL,
    status: 'pending',
  };
  
  sessions.set(sessionId, session);
  
  // Очистка устаревших сессий
  cleanupExpiredSessions();
  
  return session;
}

// Получение сессии по ID
export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  // Проверка срока действия
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

// Подтверждение сессии
export function confirmSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  
  if (!session || Date.now() > session.expiresAt) {
    return false;
  }
  
  session.status = 'confirmed';
  return true;
}

// Удаление сессии
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

// Сохранение данных пользователя
export function saveUserData(user: TelegramWebAppUser, sessionId: string): string {
  const authToken = generateToken(32);
  const now = Date.now();
  
  const data: UserData = {
    user,
    authToken,
    createdAt: now,
    expiresAt: now + USER_DATA_TTL,
    used: false,
  };
  
  userData.set(authToken, data);
  
  // Удаляем использованную сессию
  deleteSession(sessionId);
  
  // Очистка устаревших данных
  cleanupExpiredUserData();
  
  return authToken;
}

// Получение данных пользователя по токену (одноразовое)
export function getUserData(authToken: string): UserData | null {
  const data = userData.get(authToken);
  
  if (!data) {
    return null;
  }
  
  // Проверка срока действия
  if (Date.now() > data.expiresAt) {
    userData.delete(authToken);
    return null;
  }
  
  // Проверка, был ли токен уже использован
  if (data.used) {
    userData.delete(authToken);
    return null;
  }
  
  // Помечаем токен как использованный
  data.used = true;
  
  return data;
}

// Очистка устаревших сессий
function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(id);
    }
  }
}

// Очистка устаревших данных пользователей
function cleanupExpiredUserData(): void {
  const now = Date.now();
  for (const [token, data] of userData.entries()) {
    if (now > data.expiresAt || data.used) {
      userData.delete(token);
    }
  }
}

// Валидация initData от Telegram (базовая проверка)
export function validateTelegramData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) {
    return false;
  }
  
  try {
    // Парсим initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return false;
    }
    
    // Удаляем hash из параметров для проверки
    params.delete('hash');
    
    // Сортируем параметры и создаём строку для проверки
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Для полной валидации нужно использовать HMAC-SHA256
    // Здесь базовая проверка наличия обязательных полей
    const authDate = params.get('auth_date');
    if (!authDate) {
      return false;
    }
    
    // Проверяем, что данные не старше 24 часов
    const authTimestamp = parseInt(authDate, 10) * 1000;
    if (Date.now() - authTimestamp > 24 * 60 * 60 * 1000) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
