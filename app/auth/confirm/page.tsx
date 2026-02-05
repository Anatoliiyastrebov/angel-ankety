'use client';

import { useEffect, useState, useCallback } from 'react';
import type { TelegramWebAppUser } from '@/telegram-webapp.d';

export default function TelegramAuthConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'confirming' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<TelegramWebAppUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Инициализация Telegram Web App
  useEffect(() => {
    const initTelegram = () => {
      const tg = window.Telegram?.WebApp;
      
      if (!tg) {
        setError('Эта страница должна быть открыта в Telegram');
        setStatus('error');
        return;
      }

      // Сообщаем Telegram, что приложение готово
      tg.ready();
      tg.expand();

      // Получаем sessionId из start_param
      const startParam = tg.initDataUnsafe?.start_param;
      if (!startParam) {
        setError('Отсутствует идентификатор сессии');
        setStatus('error');
        return;
      }
      setSessionId(startParam);

      // Получаем данные пользователя
      const userData = tg.initDataUnsafe?.user;
      if (!userData) {
        setError('Не удалось получить данные пользователя');
        setStatus('error');
        return;
      }
      setUser(userData);
      setStatus('ready');

      // Настраиваем главную кнопку
      tg.MainButton.setText('Подтвердить вход');
      tg.MainButton.show();
    };

    // Ждём загрузки Telegram Web App SDK
    if (window.Telegram?.WebApp) {
      initTelegram();
    } else {
      // Повторная проверка через небольшую задержку
      const timer = setTimeout(initTelegram, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Обработка подтверждения
  const handleConfirm = useCallback(async () => {
    if (!user || !sessionId) return;

    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    setStatus('confirming');
    tg.MainButton.showProgress();

    try {
      // Отправляем данные на сервер
      const response = await fetch('/api/auth/save-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          user,
          initData: tg.initData,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка сохранения данных');
      }

      setStatus('success');
      tg.MainButton.hideProgress();
      tg.MainButton.hide();

      // Показываем уведомление об успехе
      tg.HapticFeedback?.notificationOccurred('success');

      // Формируем URL для возврата на сайт
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const returnUrl = `${siteUrl}?auth_token=${data.authToken}`;

      // Небольшая задержка перед редиректом
      setTimeout(() => {
        // Закрываем Web App и открываем сайт
        tg.openLink(returnUrl);
        tg.close();
      }, 1000);

    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      setStatus('error');
      tg.MainButton.hideProgress();
      tg.HapticFeedback?.notificationOccurred('error');
    }
  }, [user, sessionId]);

  // Подключаем обработчик к кнопке Telegram
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg || status !== 'ready') return;

    tg.MainButton.onClick(handleConfirm);

    return () => {
      tg.MainButton.offClick(handleConfirm);
    };
  }, [status, handleConfirm]);

  // Рендер в зависимости от статуса
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-gray-600">Загрузка...</p>
          </div>
        )}

        {status === 'ready' && user && (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            {/* Аватар пользователя */}
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
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
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {user.first_name} {user.last_name || ''}
            </h1>
            {user.username && (
              <p className="text-gray-500 mb-4">@{user.username}</p>
            )}

            {/* Описание */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-gray-700 text-sm">
                Нажмите кнопку ниже, чтобы подтвердить вход на сайт с вашим аккаунтом Telegram
              </p>
            </div>

            {/* Информация о безопасности */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Безопасное соединение</span>
            </div>
          </div>
        )}

        {status === 'confirming' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <p className="text-gray-600">Подтверждение входа...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Успешно!</h2>
            <p className="text-gray-600">Перенаправление на сайт...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.Telegram?.WebApp?.close()}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
