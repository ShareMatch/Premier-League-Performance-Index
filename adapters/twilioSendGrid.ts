// adapters/twilioSendGrid.ts
import twilio from 'twilio';  // npm i twilio

// Check if Twilio credentials are configured
const hasCredentials = () => {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
};

export const twilioAdapter = {
    /**
     * Check if Twilio credentials are configured
     */
    isConfigured(): boolean {
        return hasCredentials();
    },

    async getRecentSendLog(email: string) {
        // Check credentials first to avoid SDK error
        if (!hasCredentials()) {
            console.warn('Twilio Adapter: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured. Skipping API call.');
            return null;
        }

        try {
            // Live: List from Twilio/SendGrid API (using test creds - no real send)
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            const messages = await client.messages.list({ to: email, limit: 1 });  // For SMS/WhatsApp; adjust for email if using SendGrid endpoint
            // If pure SendGrid, replace with SendGrid API call (e.g., via @sendgrid/mail or HTTP to /v3/mail/send history - but SendGrid has no direct history API, so log in backend instead)
            return messages[0] || null;
        } catch (err: any) {
            console.warn('Twilio Adapter: Could not fetch recent send log (might be using Test Credentials):', err.message);
            return null;
        }
    },

    async getAllSendLogs(email: string) {
        // Check credentials first to avoid SDK error
        if (!hasCredentials()) {
            console.warn('Twilio Adapter: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured. Skipping API call.');
            return [];
        }

        try {
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            const messages = await client.messages.list({ to: email, limit: 10 });
            return messages;
        } catch (err: any) {
            console.warn('Twilio Adapter: Could not fetch all send logs (might be using Test Credentials):', err.message);
            return [];
        }
    },
};