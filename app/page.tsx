'use client';

import { useEffect, useState, useCallback } from 'react';
import type { TelegramWebAppUser } from '@/telegram-webapp.d';

// Определение типа устройства
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Иконка Telegram
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<TelegramWebAppUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Проверка auth_token в URL при загрузке
  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authToken = urlParams.get('auth_token');
      
      if (!authToken) return;

      setIsAuthenticating(true);
      setError(null);

      try {
        // Получаем данные пользователя по токену
        const response = await fetch(`/api/auth/get-user-data?token=${authToken}`);
        const data = await response.json();

        if (data.success && data.user) {
          // Сохраняем в localStorage
          localStorage.setItem('telegram_user', JSON.stringify(data.user));
          setUser(data.user);
          
          // Очищаем URL от токена
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          setError(data.error || 'Ошибка авторизации');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Не удалось получить данные пользователя');
      } finally {
        setIsAuthenticating(false);
      }
    };

    // Проверяем localStorage на наличие сохранённого пользователя
    const savedUser = localStorage.getItem('telegram_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('telegram_user');
      }
    }

    // Обрабатываем callback авторизации
    handleAuthCallback();
  }, []);

  // Обработчик входа через Telegram
  const handleTelegramLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Создаём сессию на сервере
      const response = await fetch('/api/auth/create-session', {
        method: 'POST',
      });
      const data = await response.json();

      if (!data.success || !data.sessionId) {
        throw new Error(data.error || 'Не удалось создать сессию');
      }

      const sessionId = data.sessionId;
      const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || '';

      if (!botName) {
        console.error('NEXT_PUBLIC_TELEGRAM_BOT_NAME is not set');
        throw new Error('Telegram bot не настроен. Добавьте NEXT_PUBLIC_TELEGRAM_BOT_NAME в переменные окружения Vercel и сделайте Redeploy.');
      }

      // Формируем URL для Telegram Web App
      // Short Name должен быть "app" (настраивается в BotFather)
      const telegramUrl = `https://t.me/${botName}/app?startapp=${sessionId}`;

      // Всегда используем прямой редирект - это лучше открывает Telegram приложение
      window.location.href = telegramUrl;
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка входа');
      setIsLoading(false);
    }
  }, []);

  // Обработчик выхода
  const handleLogout = useCallback(() => {
    localStorage.removeItem('telegram_user');
    setUser(null);
  }, []);

  // Если идёт процесс авторизации
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-medical-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-medical-600">Завершение авторизации...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-medical-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-medical-900 mb-4">
            Angel Ankety
          </h1>
          <p className="text-medical-600 text-lg">
            Медицинская анкета для пациентов
          </p>
        </header>

        {/* Main content */}
        <main className="max-w-md mx-auto">
          {user ? (
            // Авторизованный пользователь
            <div className="card-wellness text-center animate-fade-in">
              {/* Аватар */}
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {user.photo_url ? (
                  <img 
                    src={user.photo_url} 
                    alt={user.first_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user.first_name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Информация о пользователе */}
              <h2 className="text-2xl font-semibold text-medical-900 mb-1">
                {user.first_name} {user.last_name || ''}
              </h2>
              {user.username && (
                <p className="text-medical-500 mb-6">@{user.username}</p>
              )}

              {/* Telegram Premium Badge */}
              {user.is_premium && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-sm font-medium rounded-full mb-6">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Premium
                </div>
              )}

              {/* Действия */}
              <div className="space-y-3">
                <button className="btn-primary w-full">
                  Заполнить анкету
                </button>
                <button 
                  onClick={handleLogout}
                  className="btn-secondary w-full"
                >
                  Выйти
                </button>
              </div>

              {/* User ID (для отладки) */}
              <p className="text-xs text-medical-400 mt-6">
                ID: {user.id}
              </p>
            </div>
          ) : (
            // Неавторизованный пользователь
            <div className="card-wellness text-center animate-fade-in">
              {/* Иконка */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#0088cc] to-[#0077b5] flex items-center justify-center shadow-lg">
                <TelegramIcon className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-2xl font-semibold text-medical-900 mb-2">
                Вход в систему
              </h2>
              <p className="text-medical-600 mb-8">
                Авторизуйтесь через Telegram для доступа к анкете
              </p>

              {/* Ошибка */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Кнопка входа */}
              <button
                onClick={handleTelegramLogin}
                disabled={isLoading}
                className="btn-telegram w-full"
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Подождите...</span>
                  </>
                ) : (
                  <>
                    <TelegramIcon className="w-5 h-5" />
                    <span>Войти через Telegram</span>
                  </>
                )}
              </button>

              {/* Преимущества */}
              <div className="mt-8 pt-6 border-t border-medical-200">
                <p className="text-sm text-medical-500 mb-4">
                  Почему Telegram?
                </p>
                <ul className="text-left text-sm text-medical-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Быстрый вход без пароля</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Безопасная авторизация</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Уведомления о статусе анкеты</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-medical-500">
          <p>© 2026 Angel Ankety. Все права защищены.</p>
        </footer>
      </div>
    </div>
  );
}
