import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const message = formData.get('message') as string;
    const userId = formData.get('userId') as string;
    const username = formData.get('username') as string;
    const type = formData.get('type') as string;

    if (!message || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Telegram credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Отправляем текстовое сообщение в Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return NextResponse.json(
        { success: false, error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // Собираем все файлы из formData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value);
      }
    }

    // Отправляем файлы в Telegram
    if (files.length > 0) {
      const sendDocumentUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
      
      for (const file of files) {
        try {
          const fileFormData = new FormData();
          fileFormData.append('chat_id', chatId);
          fileFormData.append('document', file);
          fileFormData.append('caption', `📎 Файл от пользователя ${username ? `@${username}` : `ID: ${userId}`}\n📋 Тип анкеты: ${type}`);

          const fileResponse = await fetch(sendDocumentUrl, {
            method: 'POST',
            body: fileFormData,
          });

          const fileResult = await fileResponse.json();
          
          if (!fileResult.ok) {
            console.error('Telegram API error sending file:', fileResult);
          }
        } catch (fileError) {
          console.error('Error sending file to Telegram:', fileError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      messageId: result.result.message_id,
      filesCount: files.length,
    });
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
