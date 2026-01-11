# GitHub Secrets Setup for CI/CD Pipeline

## Required Secrets

You need to add the following secrets to your GitHub repository:

### 1. Telegram Bot Configuration
Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

#### TELEGRAM_BOT_TOKEN
1. Create a bot with [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the instructions
3. Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Add as secret: `TELEGRAM_BOT_TOKEN`

#### TELEGRAM_CHAT_ID
1. Start a chat with your bot or add it to a group
2. Send a message to the bot/group
3. Get your chat ID:
   - For personal chat: Send `/start` to [@userinfobot](https://t.me/userinfobot)
   - For group: Send a message and use [@JsonDumpBot](https://t.me/JsonDumpBot) to see the chat ID
4. Add as secret: `TELEGRAM_CHAT_ID`

### 2. Supabase Configuration (if using Supabase)

#### SUPABASE_ACCESS_TOKEN
- Get from Supabase Dashboard → Settings → API → service_role (confidential)
- Add as secret: `SUPABASE_ACCESS_TOKEN`

#### SUPABASE_DB_PASSWORD_PROD
- Your production database password
- Add as secret: `SUPABASE_DB_PASSWORD_PROD`

#### SUPABASE_PROJECT_REF_PROD
- Get from Supabase Dashboard → Settings → API → Project URL (the part after `https://`)
- Example: `abcdefgh123456`
- Add as secret: `SUPABASE_PROJECT_REF_PROD`

## Setup Steps

1. **Navigate to GitHub Secrets:**
   ```
   Repository → Settings → Secrets and variables → Actions
   ```

2. **Add each secret:**
   - Click "New repository secret"
   - Enter the name (exactly as shown above)
   - Paste the value
   - Click "Add secret"

3. **Verify setup:**
   - Push to `staging` or `main` branch
   - Check Actions tab to see if workflow runs
   - Verify Telegram notifications are received

## Testing Locally

You can test the audit system locally:

```bash
# Set environment variables
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"

# Run the enhanced audit
npm run audit:ci
```

## Workflow Triggers

The pipeline runs on:
- Push to `staging` branch
- Push to `main` branch  
- Pull requests to `staging` or `main`
- Manual trigger (via Actions tab)

## Features

- ✅ Runs tests 3 times with detailed retry logic
- ✅ Targets `tests/generated/` directory specifically
- ✅ Differentiates between persistent failures and flaky tests
- ✅ Sends detailed Telegram reports with error details
- ✅ Uploads test artifacts (reports and screenshots)
- ✅ Includes branch and commit information in reports
