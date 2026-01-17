import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: Request) {
    try {
        const { chatId } = await request.json();

        if (!chatId) {
            return NextResponse.json({ error: 'Chat ID requerido' }, { status: 400 });
        }

        const result = await sendTelegramMessage(chatId, "🔔 *Prueba de Finanzas JGM* \n\n¡Hola! Si ves esto, las notificaciones de Telegram están funcionando correctamente.");

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error API Telegram Test:", error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
