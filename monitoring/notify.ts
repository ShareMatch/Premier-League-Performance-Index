
import fetch from 'node-fetch';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8494711955:AAFlDO3u3d7HMLYY2hjHmoi39_ayg6WJviM';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-5081339100';

export async function sendTelegramMessage(text: string) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            console.error(`Failed to send Telegram message: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
}

// Allow running directly
if (require.main === module) {
    const message = process.argv[2] || "🧪 *Test Message from Monitoring Script*";
    sendTelegramMessage(message);
}
