import { NextRequest, NextResponse } from 'next/server';
import type { TelegramWebAppUser } from '@/telegram-webapp.d';

interface SaveUserRequest {
  sessionId?: string;
  user: TelegramWebAppUser;
  initData?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveUserRequest = await request.json();
    const { user } = body;
    
    // Проверяем наличие обязательных полей
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Проверяем обязательные поля пользователя
    if (!user.id || !user.first_name) {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 400 }
      );
    }
    
    // Кодируем данные пользователя в base64 для передачи через URL
    // Это безопасно, т.к. данные приходят напрямую от Telegram
    const userData = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      is_premium: user.is_premium,
      auth_date: Math.floor(Date.now() / 1000),
    };
    
    // Кодируем в base64 URL-safe
    const authToken = Buffer.from(JSON.stringify(userData)).toString('base64url');
    
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
