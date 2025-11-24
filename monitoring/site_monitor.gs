// Google Apps Script to monitor ShareMatch Site Health
// 1. Go to https://script.google.com/
// 2. Click "New Project"
// 3. Paste this code into the editor (replace existing code)
// 4. Save the project (e.g., "ShareMatch Monitor")
// 5. Run the 'setup' function once to verify permissions (if asked)
// 6. Click on the "Triggers" (clock icon) on the left sidebar
// 7. Click "+ Add Trigger"
//    - Choose function: checkSiteHealth
//    - Select event source: Time-driven
//    - Select type of time based trigger: Hour timer
//    - Select hour interval: Every hour
// 8. Save

const CONFIG = {
  URL: 'https://rwa.sharematch.me/',
  TELEGRAM_BOT_TOKEN: '8494711955:AAFlDO3u3d7HMLYY2hjHmoi39_ayg6WJviM',
  TELEGRAM_CHAT_ID: '-5081339100',
  // Set to true to receive a message EVERY hour (noisy). 
  // Set to false to only receive messages when the site is DOWN or recovers.
  NOTIFY_ON_SUCCESS: true 
};

function checkSiteHealth() {
  const status = getSiteStatus();
  const properties = PropertiesService.getScriptProperties();
  const lastStatus = properties.getProperty('LAST_STATUS');
  
  // Log for debugging in Apps Script dashboard
  console.log(`Check result: ${status.code} - ${status.text}`);

  if (status.isUp) {
    // Site is UP
    if (lastStatus === 'DOWN') {
      // RECOVERY ALERT
      sendTelegramMessage(`✅ *ShareMatch RECOVERED*\n\nSite is back online.\nStatus: ${status.code}`);
      properties.setProperty('LAST_STATUS', 'UP');
    } else if (CONFIG.NOTIFY_ON_SUCCESS) {
      // Routine Success Message (Optional)
      sendTelegramMessage(`🟢 *ShareMatch Health Check*\n\nSite is operating correctly.\nStatus: ${status.code}`);
    }
    // If it was already UP and NOTIFY_ON_SUCCESS is false, do nothing.
    properties.setProperty('LAST_STATUS', 'UP');
    
  } else {
    // Site is DOWN
    if (lastStatus !== 'DOWN') {
      // NEW DOWNTIME ALERT
      sendTelegramMessage(`🚨 *ShareMatch ALERT* 🚨\n\nSite appears to be DOWN!\nError: ${status.text}\nCode: ${status.code}`);
      properties.setProperty('LAST_STATUS', 'DOWN');
    } else {
      // Still down... maybe remind every 6 hours? 
      // For now, we won't spam every hour, but you could add logic here.
      console.log("Site still down, alert already sent.");
    }
  }
}

function getSiteStatus() {
  try {
    const options = {
      'muteHttpExceptions': true,
      'followRedirects': true
    };
    const response = UrlFetchApp.fetch(CONFIG.URL, options);
    const code = response.getResponseCode();
    const content = response.getContentText();
    
    // Basic check: 200 OK and contains "Premier League Performance Index" (from <title>)
    // Note: We check static HTML because Apps Script doesn't execute React/JS.
    if (code === 200 && (content.includes('Premier League Performance Index') || content.includes('root'))) {
      return { isUp: true, code: code, text: "OK" };
    } else {
      return { isUp: false, code: code, text: `Unexpected content. Code: ${code}` };
    }
  } catch (e) {
    return { isUp: false, code: 0, text: e.toString() };
  }
}

function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    'chat_id': CONFIG.TELEGRAM_CHAT_ID,
    'text': text,
    'parse_mode': 'Markdown'
  };
  
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error("Failed to send Telegram message: " + e.toString());
  }
}

// Run this manually to test the Telegram connection
function testTelegram() {
  sendTelegramMessage("🧪 *Test Message*\n\nIf you see this, the ShareMatch monitoring bot is connected!");
}

// HELPER: Run this to find your Chat ID
// 1. Add the bot to your group
// 2. Send a message "hello" in the group
// 3. Run this function and check the logs
function getChatId() {
  const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/getUpdates`;
  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());
  console.log("Recent Updates:", JSON.stringify(data, null, 2));
  
  if (data.result.length > 0) {
    data.result.forEach(update => {
      if (update.message && update.message.chat) {
        console.log(`Found Chat: "${update.message.chat.title}" (ID: ${update.message.chat.id})`);
      }
    });
  } else {
    console.log("No updates found. Send a message to the bot in the group first!");
  }
}
