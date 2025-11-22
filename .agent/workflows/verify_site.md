---
description: Run a comprehensive verification of the live site
---

1. **Check App Version**
   - Go to `https://rwa.sharematch.me/`
   - Check console logs for "App Version: Dynamic Markets 1.2"

2. **Verify UI Elements**
   - Navigate to "England Premier League"
   - Verify headers are "Team", "Sell", "Buy" and center-aligned
   - Navigate to "Formula 1"
   - Verify headers are "Driver", "Sell", "Buy" and center-aligned

3. **Verify Sell Validation**
   - Attempt to sell an asset not owned (e.g., Man City)
   - Verify that the trade slip does NOT open (or an error alert is shown)

4. **Verify Buy Functionality**
   - Buy 1 unit of Arsenal
   - Confirm trade
   - Verify portfolio updates (quantity increases)

5. **Report Results**
   - Summarize findings
