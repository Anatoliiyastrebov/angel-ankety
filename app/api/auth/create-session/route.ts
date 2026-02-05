import { NextResponse } from 'next/server';

// Генерация случайного ID
function generateSessionId(length: number = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export async function POST() {
  try {
    // Генерируем sessionId (используется только как идентификатор в URL)
    // Сессии больше не хранятся на сервере - данные передаются через закодированный токен
    const sessionId = generateSessionId();
    
    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
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
