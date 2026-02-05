import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth-tokens';

export async function POST() {
  try {
    const session = createSession();
    
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      expiresAt: session.expiresAt,
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
