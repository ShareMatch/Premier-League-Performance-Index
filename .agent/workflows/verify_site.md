---
description: Run a comprehensive verification of the live site including new layout and features
---

1. **Check App Version**
   - Go to `https://rwa.sharematch.me/`
   - Check console logs for "App Version: Zero Trust 2.5"

2. **Verify Authentication**
   - **Logged Out View:** Verify that accessing the site while logged out shows the Dashboard.
     - Top Bar should show a "Sign In" button.
     - **Verify Balance Hidden:** Ensure the green wallet balance box is NOT visible.
     - **Verify Date/Time:** Ensure date and time are still visible.
     - Portfolio should show "No active positions".
   - **Sign In Modal:** Click "Sign In". Verify the modal header shows the "ShareMatch" logo and branding instead of just text.
   - **Sign In:** Sign in with a test account (or create one).
   - **Logged In View:** Verify user avatar appears. Verify green wallet balance box APPEARS.
   - **Sign Out:** Click the user avatar -> Sign Out. Verify "Sign In" button reappears and balance box disappears.

3. **Verify Layout & Navigation**
   - **Sidebar Search:** Verify the search bar is present in the Sidebar (left panel).
   - **Top Bar:** Verify the Top Bar only contains Date/Time, Wallet, and Profile (no search bar).
   - **Dynamic Title:**
     - Navigate to "Saudi Pro League". Verify Sidebar title says "SPL Index".
     - Navigate to "Champions League". Verify Sidebar title says "UCL Index".

3. **Verify News Feed**
   - Navigate to "England Premier League".
   - Verify the News Feed title is "England Premier League News Wire".
   - Verify the news items are relevant to EPL (e.g., specific team news).
   - Navigate to "Formula 1".
   - Verify the News Feed title is "Formula 1 News Wire".

4. **Verify Portfolio Navigation**
   - Click on a portfolio item (e.g., "Arsenal").
   - Verify that the app navigates to the "England Premier League" market automatically.

5. **Verify Trading Core**
   - **Headers:** Verify column headers are "Asset", "Sell", "Buy" (consistent across markets).
   - **Sell Validation:** Attempt to sell an asset not owned. Verify trade is blocked.
   - **Buy Functionality:** Buy 1 unit of an asset. Verify portfolio updates immediately.

6. **Report Results**
   - Summarize findings and note any visual regressions.
