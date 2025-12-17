# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.16] - 2025-12-17
### Added
- **New Market:** Added full support for **Indonesia Super League** (ISL) with 18 new assets.
- **Database:** Executed migration to populate ISL teams in the `assets` table.
- **Navigation:** Added ISL to Sidebar (Football section) and Ticker.
- **Market Info:** Added detailed operational rules and settlement logic for ISL.

## [2.15] - 2025-12-14
### Added
- **Dynamic Trending Markets:** Overhauled "Trending Markets" with live updates every 3-5s, explosive animations, and strict filtering (Price > $5, Open Markets only).

### Changed
- **UI:** Standardized "Info" icon across pages to a consistent "White 'i' in Green Circle" design for better visibility.

### Fixed
- **Critical:** Resolved "Blank Screen" crash on startup caused by a reference to a missing `seedSportsAssets` function.
- **Performance:** Implemented lazy loading for `AIAnalyticsPage` to improve initial load time.

## [2.14] - 2025-12-13
### Added
- **Global Search:** Implemented fully functional sidebar search bar to find assets across all markets.
- **Voice Search:** Integrated Voice-to-Text using Web Speech API for hands-free search capability.
- **UX:** Search results now display market context (e.g., "Arsenal • EPL" vs "Arsenal • UCL") to handle duplicate team names.
- **Mobile Header:** Fixed mobile header branding (Green background, Logo transparency matched).
- **Desktop Header:** Refactored to full-width "Betfair-style" header, integrating Logo and Search Bar.
- **Search:** Moved Search functionality from Sidebar to Top Header for better accessibility.
- **Mobile Search:** Restored mobile search functionality with a dedicated search overlay and toggle button.
- **Voice Search (Mobile):** Added microphone support to the mobile search overlay for consistent experience.
- **AI Analytics:** Added high-impact "AI Analytics Engine" banner below the header.
- **Access Control:** Restricted AI Analytics access to token holders only (Shariah compliant "Real Utility" check).
- **Branding:** Significantly increased desktop logo size for better visibility.

## [2.13] - 2025-12-13
### Added
- **AI Analytics:** Added missing markets: T20 Cricket and Eurovision to the analysis engine.

### Changed
- **Mobile UX:** Improved filter button layout on AI Analytics page to wrap correctly on mobile devices for better accessibility.

## [2.12] - 2025-12-13
### Changed
- **Branding:** Rebranded entire application to use new corporate green (#005430) as primary color.
- **UI Contrast:** Implemented high-contrast "white on green" styling for:
    - Sidebar buttons (AI Analytics)
    - Header badges (Market Status)
    - Order Book (Buy/Sell prices)
    - Portfolio (Asset values and active tabs)
    - Trending Markets (Action buttons)
- **News Feed:** Upgraded news fetching engine to use **Google Gemini Search Grounding** for real-time, accurate results, replacing deprecated NewsAPI.
- **News Feed:** Updated feed titles to "ShareMatch [Topic] News Wire".
- **News Feed:** Switched AI model to **Gemini 2.5 Flash** for improved performance and tool compatibility.
- **UI:** Added `$` prefix to Ticker prices, Index Valuation text, and Portfolio unit prices for consistency.
- **UI:** Removed blocky background from Market Headers for a cleaner, responsive design using high-contrast text.
- **UI:** Fixed "Performance Index" title duplication in page headers.
- **UI:** Added visual "Season Progress Bar" with start/end dates to all Market Information popups.
- **UI:** Added helper text to Portfolio to clarify that values reflect "Realizable Value" (Sell Price).
- **UX:** Enhanced Portfolio interaction: Clicking a holding now opens the Market Page AND the Transaction Slip (defaulting to Buy) for immediate trading.
- **UX:** Trade Slip now persists during navigation, preventing accidental cancellation of trades.
- **UI:** Updated Ticker to hide assets from closed markets (like F1).
- **UI:** Updated Ticker to display Buy Price (Offer) instead of Sell Price, with explicit "Buy" label.
- **UX:** Repositioned "AI Market Analysis" button to the right sidebar column to prevent overlapping with the main header on smaller screens.
- **AI:** Updated AI Analysis prompt to strictly exclude specific prices and percentages, focusing solely on qualitative news and sentiment.
- **Fix:** Corrected settled prices for F1 Drivers (Lando Norris settled at $100).
- **UI:** Increased size and visibility of "Info" icons in market headers.
- **Markets:** Opened **FIFA World Cup** market in preparation for upcoming events.

### Fixed
- **News Feed:** Resolved critical "400 Bad Request" error by removing conflicting JSON mode configuration.
- **News Feed:** Resolved "404 Model Not Found" error by updating deprecated `v1beta` model alias.
- **News Feed:** Fixed client-side bug where news list would not refresh despite successful backend update.
- **News Feed:** Re-enabled 6-hour caching mechanism to optimize API usage.
- **News Feed:** Added robust error handling to display specific API errors in the client debug panel.

## [2.11] - 2025-12-13
### Added
- **Eurovision Market**: Added "Eurovision Song Contest Performance Index" to Global Events.
- **Assets**: Added initial asset listings for Eurovision 2026.
- **Frontend Refactor**: Introduced shared `League` type in `types.ts`.

### Changed
- **Asset Prices**: Updated prices for all markets.
- **Sidebar**: Fixed issue where "Eurovision" link was not clickable.
- **Global Events**: Enabled "Global Events" in sidebar.

## [2.10] - 2025-12-09
### Added
- **Market Settlement:** Implemented full backend settlement logic for closed markets (e.g., F1 2025).
- **History View:** New dedicated "Transaction History" tab in the Right Panel to view all past trades and settlements.
- **UI:** Visual indicators for settled assets (greyed out, labeled "SETTLED AT [PRICE] - [DATE]").

### Changed
- **Navigation:** Renamed "F1" to "Motorsport > Formula 1" in the sidebar for better categorization.
- **Wallet Accounting:** Updated `place_trade` logic to correctly deduct cash balance immediately upon purchase, ensuring accurate portfolio accounting.

### Fixed
- **Wallet Balance:** Resolved a critical bug where buying assets reserved funds but didn't deduct them from the cash balance, leading to inflated balance displays after settlement.
- **Navigation:** Restored missing "Motorsport" menu item.
- **Trending Markets:** Filtered out settled markets (like F1) from the "Hot Questions" homepage section, replacing them with active markets (NFL, NBA).
- **UX:** Renamed "In Orders" to "Active Assets" to align with Shariah-compliant "asset-backed" terminology (replacing "Invested"). Updated logic to show total portfolio value + reserved funds.
- **Markets:** Opened NBA and NFL markets.
- **Compliance:** Prefixed all asset prices with "$" to clearly distinguish them as asset values rather than percentages, reinforcing Shariah compliance.
- **Navigation:** Removed "Climate" section from the sidebar.

## [2.9] - 2025-12-06
### Added
- **Markets:** Full integration of NBA (Basketball) and NFL (American Football) markets.
- **Assets:** Added 57 new assets (30 NBA, 27 NFL) with real-time pricing and official colors.
- **Database:** Implemented auto-seeding mechanism for missing sports assets to ensure data integrity.
- **News Feed:** Dedicated news wires for "Basketball" and "American Football" topics.
- **AI Analytics:** Expanded coverage to include deep-dive analysis for NBA and NFL indices.

### Changed
- **AI Analytics:** Refined AI prompt engineering to remove explicit religious terminology while maintaining Sharia-compliant tone (e.g., using "Top the Index" instead of "Win").
- **Sidebar:** Added new "Basketball" and "American Football" sections with "NBA" and "NFL" sub-items.

## [2.8] - 2025-12-06
### Added
- **AI Analytics Engine:** New paywalled section for token holders offering Gemini-powered market analysis.
- **Sidebar:** Added "AI Analytics Engine" to the main navigation menu.
- **Compliance:** Added Sharia-compliance keyword filtering for the "Global Sports Wire" news feed to block non-compliant content.

### Changed
- **Ticker:** Implemented round-robin randomization for the ticker to prevent consecutive same-market asset display and ensure all markets are represented.
- **Trending Markets:** Updated "Hot Questions" text from "Will [Team] win..." to "Will [Team] Top the [League] Index?" for clearer financial terminology.
- **Sidebar:** Reordered Sports menu to: Football, F1, Golf, Cricket.
- **Auth UI:** Removed "Login to Your Account" header text from Login Modal.
- **Auth UI:** Updated Signup Modal slogan to "Join our trading community" and hyperlinked the Privacy Policy.
- **Auth UI:** Prioritized "Saudi Arabia" in Country and Phone Number selection lists.

## [2.7] - 2025-12-05
### Changed
- **User Journey - Sign Up Flow:** Sign Up → Email Verification (with inline success toast) → WhatsApp Verification (with inline success toast) → "Account Created" success screen → Redirects to Login.
- **User Journey - Password Reset Flow:** Forgot Password → Email sent → Click link → Reset Password modal → Success → Login modal with success message. Expired/invalid links now show proper "Link Expired" UI with "Back to Login" button.
- **Sidebar:** Updated logo to white icon on green background.
- **Sidebar:** Reorganized menu items - removed Companies, renamed Politics to Global Events, added E-Sports.
- **Sidebar:** New menu order: Home, Sports, E-Sports (SOON), Climate (SOON), Global Events (SOON).

### Fixed
- **Auth:** Login modal now resets form data when opened (prevents stale credentials after logout).
- **Auth:** Fixed multi-tab behavior for password reset - only the tab that opened the reset link shows the modal.
- **Auth:** Added expired/invalid link detection with proper UI feedback for password reset.

### Removed
- **Code Quality:** Removed unnecessary console.log statements from auth components.

## [2.6] - 2025-11-29
### Changed
- Removed percentage signs from token values in Transaction Slip, Portfolio, and Home Page (Hot Questions) for consistency.
- Added logo variations and fixed transaction slip league title.

### Fixed
- Updated `fetch-news` Edge Function to use `delete` + `insert` strategy instead of `upsert` to avoid unique constraint errors.
- Disabled JWT verification for `fetch-news` to allow public access.

### Added
- Supabase Edge Function `fetch-news` for lazy-loading news articles.
- Database tables `news_articles` and `news_updates`.
- Frontend integration in `NewsFeed.tsx`.

## [2.5] - 2025-11-28
### Added
- **Auth:** Implemented Zero Trust Authentication with Supabase.
- **Auth:** Added "Sign In" modal with ShareMatch branding.
- **UI:** Logged-out users see Dashboard with "Sign In" button; Wallet balance hidden.
- **UI:** Added "Sign Out" button to user menu.
- **Auth:** Implemented automatic user profile and wallet creation on signup.

## [2.4] - 2025-11-27
### Added
- **Homepage:** Redesigned homepage with new "Hot Questions" component.
- **Homepage:** Implemented dynamic question generation based on top teams in each league.
- **Homepage:** Added randomization logic to shuffle questions on page load.
- **Homepage:** Integrated "Hot Questions" into `HomeDashboard` replacing the old market preview grid.

### Changed
- **Homepage:** Enhanced randomization logic to select from the top 5 teams in each market instead of just the top 1.
- **Homepage:** Removed "Real-time probabilities" text from the "Trending Markets" header for a cleaner UI.

### Fixed
- **Data Fetching:** Resolved issue with `App.tsx` not passing `teams` prop to `HomeDashboard`.
- **Environment:** Implemented workaround for Supabase credentials loading issue by hardcoding them in `lib/supabase.ts` (temporary).

## [2.3] - 2025-11-27
### Added
- **Environment:** Cloned repository to local machine.
- **Environment:** Installed dependencies and verified development server startup.

## [2.2] - 2025-11-23
### Added
- **Monitoring:** Implemented automated site health checks using Google Apps Script.
- **Monitoring:** Integrated Telegram alerts (`@ShareMatchAlertsBot`) for downtime and recovery notifications.
- **Monitoring:** Configured hourly "heartbeat" messages to confirm site uptime.
- **Documentation:** Added `monitoring/README.md` and setup guide.

## [2.1] - 2025-11-23
### Changed
- **News Feed:** Updated to use real-time grounded data fetched via Google Search.
- **News Feed:** Made feed specific to each market (EPL, UCL, SPL, WC, F1) instead of generic "Global Sports".
- **News Feed:** Dynamic titles (e.g., "England Premier League News Wire").

## [2.0] - 2025-11-23
### Changed
- **Sidebar:** Title is now dynamic and updates based on the active league (e.g., "SPL Index", "F1 Index").
- **Branding:** Home view title set to "ShareMatch".

## [1.9] - 2025-11-23
### Changed
- **Navigation:** Moved Search Bar from Top Bar to Sidebar to save vertical space.
- **Layout:** Optimized Top Bar to only show Date/Time, Wallet, and Profile.
- **Layout:** Added separator for Date/Time to prevent encroachment on center content.

## [1.8] - 2025-11-23
### Changed
- **Layout:** Implemented "Split View" for laptop screens (2/3 Order Book, 1/3 AI & News).
- **Layout:** Compacted the main Header component to maximize screen real estate.
- **Layout:** Ensured Order Book scrolls independently of the page.
- **News Feed:** Ensured News Feed is visible for all markets in the right-hand column.

## [1.7] - 2025-11-22
### Added
- **Portfolio:** Added market labels (e.g., "Premier League") to each position.
- **Portfolio:** Made portfolio rows clickable to navigate to the respective market.
- **Portfolio:** Integrated real-time pricing for current valuations.

## [1.6] - 2025-11-22
### Fixed
- **Compliance:** Changed all column headers from "Team"/"Driver" to "Asset" for consistency.
- **Compliance:** Updated footer disclaimer to use "asset" terminology.

## [1.5] - 2025-11-22
### Fixed
- **Portfolio:** Implemented forced portfolio refresh after every trade to resolve update lag.
- **Compliance:** Updated disclaimer text to remove "winning" (Sharia compliance).
- **Mobile:** Fixed Ticker scrolling issues on mobile devices.
- **Ticker:** Updated Ticker to use dynamic team data from database.

## [1.4] - 2025-11-22
### Changed
- **UI:** Switched to Clearbit API for more reliable team logos.

## [1.3] - 2025-11-22
### Added
- **UI:** Initial implementation of team logos in Order Book.

## [1.2] - 2025-11-22
### Fixed
- **Trading:** Fixed sell validation logic to prevent selling assets not owned.
- **UI:** Centered columns in Order Book.
- **UI:** Dynamic headers ("Driver" for F1, "Team" for others).

## [1.1] - 2025-11-22
### Added
- **Core:** Integrated dynamic market data from Supabase.
- **Core:** Implemented Realtime subscriptions for assets and prices.
- **Database:** Created `assets` table and seeded with EPL, UCL, WC, SPL, and F1 data.
