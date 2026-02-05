import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('=== Submit questionnaire started ===');
  
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    console.log('Bot token exists:', !!botToken);
    console.log('Chat ID exists:', !!chatId);

    if (!botToken || !chatId) {
      console.error('Telegram credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error: missing Telegram credentials' },
        { status: 500 }
      );
    }

    // Определяем тип контента
    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    let message: string = '';
    let userId: string = '';
    let username: string = '';
    let type: string = '';
    let fileBuffers: { name: string; buffer: Buffer; mimeType: string }[] = [];

    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data');
      
      const formData = await request.formData();
      
      message = (formData.get('message') as string) || '';
      userId = (formData.get('userId') as string) || '';
      username = (formData.get('username') as string) || '';
      type = (formData.get('type') as string) || '';

      console.log('Message length:', message.length);
      console.log('UserId:', userId);

      // Собираем файлы
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_')) {
          console.log('Found file:', key, 'type:', typeof value);
          if (value instanceof Blob) {
            try {
              const arrayBuffer = await value.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const fileName = (value as File).name || `document_${key}`;
              fileBuffers.push({
                name: fileName,
                buffer: buffer,
                mimeType: value.type || 'application/octet-stream',
              });
              console.log('File processed:', fileName, 'size:', buffer.length);
            } catch (fileErr) {
              console.error('Error processing file:', fileErr);
            }
          }
        }
      }
    } else {
      console.log('Processing JSON');
      const body = await request.json();
      message = body.message || '';
      userId = String(body.userId || '');
      username = body.username || '';
      type = body.type || '';
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Missing message' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Отправляем текстовое сообщение в Telegram
    console.log('Sending message to Telegram...');
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    const telegramResult = await telegramResponse.json();
    console.log('Telegram response ok:', telegramResult.ok);

    if (!telegramResult.ok) {
      console.error('Telegram API error:', telegramResult);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send message to Telegram',
          telegramError: telegramResult.description 
        },
        { status: 500 }
      );
    }

    // Отправляем файлы
    let filesSuccess = 0;
    if (fileBuffers.length > 0) {
      console.log('Sending', fileBuffers.length, 'files...');
      const sendDocumentUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
      
      for (const file of fileBuffers) {
        try {
          const formDataForFile = new FormData();
          formDataForFile.append('chat_id', chatId);
          
          const blob = new Blob([file.buffer], { type: file.mimeType });
          formDataForFile.append('document', blob, file.name);
          formDataForFile.append('caption', `📎 ${file.name}\n👤 ${username ? `@${username}` : `ID: ${userId}`}`);

          const fileResponse = await fetch(sendDocumentUrl, {
            method: 'POST',
            body: formDataForFile,
          });

          const fileResult = await fileResponse.json();
          console.log('File send result:', file.name, fileResult.ok);
          
          if (fileResult.ok) {
            filesSuccess++;
          }
        } catch (fileErr) {
          console.error('Error sending file:', file.name, fileErr);
        }
      }
    }

    console.log('=== Submit questionnaire completed ===');
    
    return NextResponse.json({
      success: true,
      messageId: telegramResult.result.message_id,
      filesTotal: fileBuffers.length,
      filesSuccess,
    });

  } catch (error) {
    console.error('=== Submit questionnaire ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'no stack');
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'submit-questionnaire' });
}
