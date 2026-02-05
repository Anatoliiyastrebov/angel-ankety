import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/lib/auth-tokens';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authToken = searchParams.get('token');
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Missing auth token' },
        { status: 400 }
      );
    }
    
    // Получаем данные пользователя (одноразовый токен)
    const data = getUserData(authToken);
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: data.user,
    });
  } catch (error) {
    console.error('Error getting user data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user data' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
