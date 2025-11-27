# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

### Fixed
- Updated `fetch-news` Edge Function to use `delete` + `insert` strategy instead of `upsert` to avoid unique constraint errors.
- Disabled JWT verification for `fetch-news` to allow public access.

### Added
- Supabase Edge Function `fetch-news` for lazy-loading news articles.
- Database tables `news_articles` and `news_updates`.
- Frontend integration in `NewsFeed.tsx`.

## [1.1] - 2025-11-22
### Added
- **Core:** Integrated dynamic market data from Supabase.
- **Core:** Implemented Realtime subscriptions for assets and prices.
- **Database:** Created `assets` table and seeded with EPL, UCL, WC, SPL, and F1 data.
