import fetch from 'node-fetch';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(text: string): Promise<boolean> {
    // Skip if Telegram isn't configured
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('⚠️ [Telegram] Not configured - skipping notification');
        console.log('   Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables to enable');
        return false;
    }

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
            const errorBody = await response.text().catch(() => 'Unknown error');
            console.error(`❌ [Telegram] Failed to send message: ${response.status} ${response.statusText}`);
            console.error(`   Response: ${errorBody}`);
            return false;
        }
        
        console.log('✅ [Telegram] Message sent successfully');
        return true;
    } catch (error) {
        console.error('❌ [Telegram] Error sending message:', error);
        return false;
    }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const message = process.argv[2] || "🧪 *Test Message from Monitoring Script*";
    sendTelegramMessage(message);
}
