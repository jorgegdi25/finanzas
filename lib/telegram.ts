export const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;

/**
 * Envía un mensaje a través del bot de Telegram
 * @param chatId ID del chat de destino
 * @param message Texto del mensaje
 */
export async function sendTelegramMessage(chatId: string, message: string) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN no configurado");
        return { success: false, error: "Token no configurado" };
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            console.error("Error Telegram API:", data);
            return { success: false, error: data.description };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Error enviando mensaje Telegram:", error);
        return { success: false, error: "Error de red" };
    }
}
