# Универсальный промпт: Telegram Web App авторизация для анкет

## Использование
Скопируйте промпт ниже и вставьте в AI-ассистент (Claude, ChatGPT, Cursor) вместе с описанием вашего проекта.

---

## ПРОМПТ

```
Добавь авторизацию через Telegram Web App в мой Next.js проект с анкетами.

### Переменные окружения (.env.local)
```env
# Получить в @BotFather
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Имя бота без @ (если бот @MyBot, то: MyBot)
NEXT_PUBLIC_TELEGRAM_BOT_NAME=your_bot_name

# URL сайта без / в конце
NEXT_PUBLIC_SITE_URL=https://your-site.vercel.app
```

### Настройка бота в @BotFather:
1. /newbot — создать бота
2. /newapp — создать Web App для бота
3. Short Name: ОБЯЗАТЕЛЬНО "app"
4. URL: https://your-site.vercel.app/auth/confirm

### Структура файлов (создай если нет):

#### 1. TypeScript типы: `telegram-webapp.d.ts` (в корне проекта)
```typescript
interface TelegramWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramWebAppInitData {
  user?: TelegramWebAppUser;
  start_param?: string;
  auth_date: number;
  hash: string;
}

interface TelegramMainButton {
  text: string;
  isVisible: boolean;
  setText(text: string): TelegramMainButton;
  onClick(callback: () => void): TelegramMainButton;
  offClick(callback: () => void): TelegramMainButton;
  show(): TelegramMainButton;
  hide(): TelegramMainButton;
  showProgress(): TelegramMainButton;
  hideProgress(): TelegramMainButton;
}

interface TelegramHapticFeedback {
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitData;
  MainButton: TelegramMainButton;
  HapticFeedback: TelegramHapticFeedback;
  ready(): void;
  expand(): void;
  close(): void;
  openLink(url: string): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export type { TelegramWebApp, TelegramWebAppUser, TelegramWebAppInitData };
```

#### 2. Серверное хранилище: `lib/auth-tokens.ts`
```typescript
import type { TelegramWebAppUser } from '../telegram-webapp.d';

interface Session {
  id: string;
  createdAt: number;
  expiresAt: number;
}

interface UserData {
  user: TelegramWebAppUser;
  authToken: string;
  expiresAt: number;
  used: boolean;
}

const sessions = new Map<string, Session>();
const userData = new Map<string, UserData>();

const SESSION_TTL = 5 * 60 * 1000; // 5 минут
const USER_DATA_TTL = 24 * 60 * 60 * 1000; // 24 часа

export function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function createSession(): Session {
  const sessionId = generateToken(24);
  const now = Date.now();
  const session: Session = { id: sessionId, createdAt: now, expiresAt: now + SESSION_TTL };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session || Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

export function saveUserData(user: TelegramWebAppUser, sessionId: string): string {
  const authToken = generateToken(32);
  userData.set(authToken, {
    user,
    authToken,
    expiresAt: Date.now() + USER_DATA_TTL,
    used: false,
  });
  sessions.delete(sessionId);
  return authToken;
}

export function getUserData(authToken: string): UserData | null {
  const data = userData.get(authToken);
  if (!data || Date.now() > data.expiresAt || data.used) {
    userData.delete(authToken);
    return null;
  }
  data.used = true;
  return data;
}
```

#### 3. API: `app/api/auth/create-session/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth-tokens';

export async function POST() {
  try {
    const session = createSession();
    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create session' }, { status: 500 });
  }
}
```

#### 4. API: `app/api/auth/save-user/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession, saveUserData } from '@/lib/auth-tokens';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, user } = await request.json();
    
    if (!sessionId || !user || !user.id || !user.first_name) {
      return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
    }
    
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 400 });
    }
    
    const authToken = saveUserData(user, sessionId);
    return NextResponse.json({ success: true, authToken });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save user' }, { status: 500 });
  }
}
```

#### 5. API: `app/api/auth/get-user-data/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/lib/auth-tokens';

export async function GET(request: NextRequest) {
  try {
    const authToken = new URL(request.url).searchParams.get('token');
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
    }
    
    const data = getUserData(authToken);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to get user' }, { status: 500 });
  }
}
```

#### 6. Страница подтверждения: `app/auth/confirm/page.tsx`
```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';

export default function TelegramAuthConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'confirming' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setError('Откройте через Telegram');
      setStatus('error');
      return;
    }

    tg.ready();
    tg.expand();

    const startParam = tg.initDataUnsafe?.start_param;
    if (!startParam) {
      setError('Отсутствует сессия');
      setStatus('error');
      return;
    }
    setSessionId(startParam);

    const userData = tg.initDataUnsafe?.user;
    if (!userData) {
      setError('Не удалось получить данные');
      setStatus('error');
      return;
    }
    setUser(userData);
    setStatus('ready');

    tg.MainButton.setText('Подтвердить вход');
    tg.MainButton.show();
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!user || !sessionId) return;
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    setStatus('confirming');
    tg.MainButton.showProgress();

    try {
      const response = await fetch('/api/auth/save-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, user, initData: tg.initData }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setStatus('success');
      tg.MainButton.hide();
      tg.HapticFeedback?.notificationOccurred('success');

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      setTimeout(() => {
        tg.openLink(`${siteUrl}?auth_token=${data.authToken}`);
        tg.close();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Ошибка');
      setStatus('error');
      tg.MainButton.hideProgress();
    }
  }, [user, sessionId]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg || status !== 'ready') return;
    tg.MainButton.onClick(handleConfirm);
    return () => tg.MainButton.offClick(handleConfirm);
  }, [status, handleConfirm]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {status === 'loading' && <p>Загрузка...</p>}
      {status === 'ready' && user && (
        <div style={{ textAlign: 'center' }}>
          <h2>{user.first_name} {user.last_name || ''}</h2>
          {user.username && <p>@{user.username}</p>}
          <p>Нажмите кнопку ниже для подтверждения</p>
        </div>
      )}
      {status === 'confirming' && <p>Подтверждение...</p>}
      {status === 'success' && <p>✅ Успешно! Перенаправление...</p>}
      {status === 'error' && <p style={{ color: 'red' }}>❌ {error}</p>}
    </div>
  );
}
```

#### 7. Главная страница: обновить для авторизации
```typescript
// В компоненте главной страницы добавить:

const [user, setUser] = useState(null);

// При загрузке:
useEffect(() => {
  // Проверяем auth_token в URL
  const urlParams = new URLSearchParams(window.location.search);
  const authToken = urlParams.get('auth_token');
  
  if (authToken) {
    fetch(`/api/auth/get-user-data?token=${authToken}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          localStorage.setItem('telegram_user', JSON.stringify(data.user));
          setUser(data.user);
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
  } else {
    const saved = localStorage.getItem('telegram_user');
    if (saved) setUser(JSON.parse(saved));
  }
}, []);

// Кнопка входа:
const handleLogin = async () => {
  const response = await fetch('/api/auth/create-session', { method: 'POST' });
  const { sessionId } = await response.json();
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
  window.location.href = `https://t.me/${botName}/app?startapp=${sessionId}`;
};

// Выход:
const handleLogout = () => {
  localStorage.removeItem('telegram_user');
  setUser(null);
};
```

### Логика работы:
1. Пользователь нажимает "Войти через Telegram"
2. Создаётся сессия → получаем sessionId
3. Редирект в бота: `https://t.me/BOT_NAME/app?startapp=SESSION_ID`
4. В боте открывается Mini App `/auth/confirm`
5. Mini App получает данные из `window.Telegram.WebApp.initDataUnsafe.user`
6. Данные сохраняются → получаем authToken
7. Редирект обратно: `https://site.com?auth_token=TOKEN`
8. Сайт получает данные по токену, сохраняет в localStorage

### Автозаполнение анкеты:
```typescript
useEffect(() => {
  if (user) {
    setFormData(prev => ({
      ...prev,
      name: user.first_name || '',
      last_name: user.last_name || '',
    }));
    setContactData(prev => ({
      ...prev,
      telegram: user.username ? `@${user.username}` : '',
    }));
  }
}, [user]);
```

Адаптируй под существующую структуру проекта. НЕ ломай текущую функциональность.
```

---

## Чеклист настройки

- [ ] Переменные окружения в `.env.local` и Vercel
- [ ] Бот создан в @BotFather
- [ ] Web App создан с Short Name = "app"
- [ ] URL Web App = `https://ваш-сайт.vercel.app/auth/confirm`
- [ ] Все файлы созданы по структуре выше
- [ ] Тест на localhost работает
- [ ] Тест на Vercel работает

## Отладка

**Не открывается Mini App:**
- Проверьте Short Name в BotFather (должен быть "app")
- URL должен быть HTTPS

**Не работает редирект:**
- Проверьте `NEXT_PUBLIC_SITE_URL`
- На мобильных используйте `window.location.href`, не `window.open()`

**Токен не валидируется:**
- Проверьте `TELEGRAM_BOT_TOKEN` на сервере
- Сессии хранятся 5 минут, успейте подтвердить
