import { NextRequest, NextResponse } from 'next/server';

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
    
    // Декодируем base64url токен
    let user;
    try {
      const decoded = Buffer.from(authToken, 'base64url').toString('utf-8');
      user = JSON.parse(decoded);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token format' },
        { status: 400 }
      );
    }
    
    // Проверяем срок действия (24 часа)
    const authDate = user.auth_date;
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || now - authDate > 24 * 60 * 60) {
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 400 }
      );
    }
    
    // Проверяем обязательные поля
    if (!user.id || !user.first_name) {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user,
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
