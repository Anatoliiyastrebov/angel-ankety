import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    
    let message = '';
    let userId = '';
    let username = '';
    let type = '';
    const fileBuffers: { name: string; buffer: ArrayBuffer; mimeType: string }[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      message = (formData.get('message') as string) || '';
      userId = (formData.get('userId') as string) || '';
      username = (formData.get('username') as string) || '';
      type = (formData.get('type') as string) || '';

      // Собираем файлы параллельно
      const filePromises: Promise<void>[] = [];
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_') && value instanceof Blob) {
          filePromises.push(
            value.arrayBuffer().then(buffer => {
              fileBuffers.push({
                name: (value as File).name || `document_${key}`,
                buffer,
                mimeType: value.type || 'application/octet-stream',
              });
            })
          );
        }
      }
      await Promise.all(filePromises);
    } else {
      const body = await request.json();
      message = body.message || '';
      userId = String(body.userId || '');
      username = body.username || '';
      type = body.type || '';
    }

    if (!message || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Отправляем сообщение в Telegram
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      }
    );

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to send message', details: telegramResult.description },
        { status: 500 }
      );
    }

    // Отправляем файлы параллельно
    let filesSuccess = 0;
    if (fileBuffers.length > 0) {
      const filePromises = fileBuffers.map(async (file) => {
        try {
          const formDataForFile = new FormData();
          formDataForFile.append('chat_id', chatId);
          formDataForFile.append('document', new Blob([file.buffer], { type: file.mimeType }), file.name);
          formDataForFile.append('caption', `📎 ${file.name}\n👤 ${username ? `@${username}` : `ID: ${userId}`}`);

          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: 'POST',
            body: formDataForFile,
          });
          const result = await res.json();
          return result.ok ? 1 : 0;
        } catch {
          return 0;
        }
      });

      const results = await Promise.all(filePromises);
      filesSuccess = results.reduce((a, b) => a + b, 0);
    }

    return NextResponse.json({
      success: true,
      messageId: telegramResult.result.message_id,
      filesCount: fileBuffers.length,
      filesSuccess,
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
