import { NextRequest, NextResponse } from 'next/server';
import { getSession, saveUserData, validateTelegramData } from '@/lib/auth-tokens';
import type { TelegramWebAppUser } from '@/telegram-webapp.d';

interface SaveUserRequest {
  sessionId: string;
  user: TelegramWebAppUser;
  initData?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveUserRequest = await request.json();
    const { sessionId, user, initData } = body;
    
    // Проверяем наличие обязательных полей
    if (!sessionId || !user) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Проверяем сессию
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 400 }
      );
    }
    
    // Опциональная валидация initData (если передан TELEGRAM_BOT_TOKEN)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (initData && botToken) {
      const isValid = validateTelegramData(initData, botToken);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid Telegram data' },
          { status: 400 }
        );
      }
    }
    
    // Проверяем обязательные поля пользователя
    if (!user.id || !user.first_name) {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 400 }
      );
    }
    
    // Сохраняем данные пользователя и получаем auth_token
    const authToken = saveUserData(user, sessionId);
    
    return NextResponse.json({
      success: true,
      authToken,
    });
  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save user data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
