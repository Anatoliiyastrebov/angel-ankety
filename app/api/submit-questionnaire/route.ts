import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let message: string;
    let userId: string;
    let username: string;
    let type: string;
    let files: { name: string; data: Buffer; type: string }[] = [];

    // Обработка FormData (с файлами)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      message = formData.get('message') as string;
      userId = formData.get('userId') as string;
      username = formData.get('username') as string;
      type = formData.get('type') as string;

      // Собираем файлы
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_') && value instanceof Blob) {
          const arrayBuffer = await value.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const fileName = value instanceof File ? value.name : `file_${key}.dat`;
          files.push({
            name: fileName,
            data: buffer,
            type: value.type || 'application/octet-stream',
          });
        }
      }
    } else {
      // Обработка JSON (без файлов - обратная совместимость)
      const body = await request.json();
      message = body.message;
      userId = String(body.userId);
      username = body.username || '';
      type = body.type;
    }

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
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return NextResponse.json(
        { success: false, error: 'Failed to send message', details: result.description },
        { status: 500 }
      );
    }

    // Отправляем файлы в Telegram
    let filesSuccessCount = 0;
    if (files.length > 0) {
      const sendDocumentUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
      
      for (const file of files) {
        try {
          // Создаем FormData для отправки файла
          const fileFormData = new FormData();
          fileFormData.append('chat_id', chatId);
          
          // Создаем Blob из Buffer
          const blob = new Blob([file.data], { type: file.type });
          fileFormData.append('document', blob, file.name);
          fileFormData.append('caption', `📎 Файл от пользователя ${username ? `@${username}` : `ID: ${userId}`}\n📋 Тип анкеты: ${type}`);

          const fileResponse = await fetch(sendDocumentUrl, {
            method: 'POST',
            body: fileFormData,
          });

          const fileResult = await fileResponse.json();
          
          if (fileResult.ok) {
            filesSuccessCount++;
          } else {
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
      filesSuccessCount,
    });
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
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
