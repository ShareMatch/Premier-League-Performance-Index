# ShareMatch Site Monitoring

This directory contains a script to set up a free, reliable site health monitor using **Google Apps Script**. This runs entirely on Google's infrastructure and does not require any external servers or n8n.

## Setup Instructions

1.  **Open Google Apps Script:**
    *   Go to [script.google.com](https://script.google.com/).
    *   Click **+ New Project**.

2.  **Add the Script:**
    *   Copy the entire content of `site_monitor.gs` from this folder.
    *   Paste it into the script editor (replace the default `function myFunction() {}`).
    *   Give the project a name (e.g., "ShareMatch Monitor").
    *   Click the **Save** icon (floppy disk).

3.  **Test the Connection:**
    *   **CRITICAL STEP:** Ensure you have added your bot (`@ShareMatchAlertsBot`) to the Telegram group!
    *   In the toolbar, select the function `testTelegram` from the dropdown menu.
    *   Click **Run**.
    *   *Note:* You will be asked to "Review Permissions". Click "Review Permissions", choose your Google account, click "Advanced", and then "Go to ShareMatch Monitor (unsafe)" (it's safe, it's your own script).
    *   **Verify:** Check your Telegram group. You should see a test message.

4.  **Set up the Schedule (Trigger):**
    *   Click on the **Triggers** icon (alarm clock) in the left sidebar.
    *   Click the blue **+ Add Trigger** button in the bottom right.
    *   **Choose which function to run:** `checkSiteHealth`
    *   **Select event source:** `Time-driven`
    *   **Select type of time based trigger:** `Hour timer`
    *   **Select hour interval:** `Every hour`
    *   Click **Save**.

## How it Works

*   **Frequency:** The script runs every hour automatically on Google's servers.
*   **Checks:** It attempts to load `https://rwa.sharematch.me/`.
*   **Success:** If the site loads (Status 200) and contains the text "ShareMatch" or "PL Index", it is considered UP.
*   **Failure:** If the site fails to load or returns an error, it sends an alert to the Telegram group.
*   **Recovery:** If the site was down and comes back up, it sends a "RECOVERED" message.

## Configuration

You can modify the `CONFIG` object at the top of the script:

```javascript
const CONFIG = {
  URL: 'https://rwa.sharematch.me/',
  TELEGRAM_BOT_TOKEN: '...',
  TELEGRAM_CHAT_ID: '...',
  NOTIFY_ON_SUCCESS: false // Set to true if you want a message EVERY hour
};
```
