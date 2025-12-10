// Market-specific information for InfoPopup
// Each market has its own description and relevant dates

export interface MarketInfo {
  title: string;
  content: string;
  seasonDates: string;
  isOpen: boolean;
}

export const marketInfoData: Record<string, MarketInfo> = {
  F1: {
    title: 'F1 Drivers Performance Index',
    content: `The F1 Drivers Performance Index is a close-ended digital market that reflects the current price of the performance tokens offered. This index operates under the principles of Haqq Mali to ensure an ethical and transparent trading environment.

Initial Price Setting: Before the market opens, ShareMatch creates the initial price for each token based on historical oracle-based data.

Token Status: While the index itself is a series of close-ended markets, the underlying digital tokens are perpetual assets.

Secondary Market Trading: Once the index is open, a secondary market becomes available, allowing users to trade their tokens on the platform. This secondary market activity does not alter the original terms of the smart contract.

Transparent Pricing: The pricing in the secondary market is solely determined by user supply and demand, ensuring a free and honest market with no interference or third-party data influence from the issuer (ShareMatch). Liquidity within the markets is provided by ShareMatch.

Market Closure & Settlement: Trading is permitted until the clearly displayed closure of the market. At this point, the smart contract settles all positions with a defined value:

The with profits token (i.e., the token at the top of the index) settles at its defined maximum value of $100.0.
All other tokens settle at their defined minimum value of $0.1.`,
    seasonDates: '16 March 2025 - 7 December 2025',
    isOpen: false,
  },

  EPL: {
    title: 'Premier League Performance Index',
    content: `The Premier League Performance Index is a close-ended digital market that reflects the current price of the performance tokens offered. This index operates under the principles of Haqq Mali to ensure an ethical and transparent trading environment.

Initial Price Setting: Before the market opens, ShareMatch creates the initial price for each token based on historical oracle-based data from official Premier League statistics.

Token Status: While the index itself is a series of close-ended markets, the underlying digital tokens are perpetual assets representing club performance.

Secondary Market Trading: Once the index is open, a secondary market becomes available, allowing users to trade their tokens on the platform. This secondary market activity does not alter the original terms of the smart contract.

Transparent Pricing: The pricing in the secondary market is solely determined by user supply and demand, ensuring a free and honest market with no interference or third-party data influence from the issuer (ShareMatch). Liquidity within the markets is provided by ShareMatch.

Market Closure & Settlement: Trading is permitted until the clearly displayed closure of the market. At this point, the smart contract settles all positions with a defined value:

The with profits token (i.e., the club at the top of the league table) settles at its defined maximum value of $100.0.
All other tokens settle at their defined minimum value of $0.1.`,
    seasonDates: '16 August 2025 - 24 May 2026',
    isOpen: true,
  },

  UCL: {
    title: 'Champions League Performance Index',
    content: `The UEFA Champions League Performance Index is a close-ended digital market that reflects the current price of the performance tokens offered. This index operates under the principles of Haqq Mali to ensure an ethical and transparent trading environment.

Initial Price Setting: Before the market opens, ShareMatch creates the initial price for each token based on historical oracle-based data from official UEFA statistics and coefficient rankings.

Token Status: While the index itself is a series of close-ended markets, the underlying digital tokens are perpetual assets representing club tournament performance.

Secondary Market Trading: Once the index is open, a secondary market becomes available, allowing users to trade their tokens on the platform. This secondary market activity does not alter the original terms of the smart contract.

Transparent Pricing: The pricing in the secondary market is solely determined by user supply and demand, ensuring a free and honest market with no interference or third-party data influence from the issuer (ShareMatch). Liquidity within the markets is provided by ShareMatch.

Market Closure & Settlement: Trading is permitted until the clearly displayed closure of the market. At this point, the smart contract settles all positions with a defined value:

The with profits token (i.e., the Champions League winner) settles at its defined maximum value of $100.0.
All other tokens settle at their defined minimum value of $0.1.`,
    seasonDates: '17 September 2025 - 30 May 2026',
    isOpen: true,
  },

  SPL: {
    title: 'Saudi Pro League Performance Index',
    content: `The Saudi Pro League Performance Index is a close-ended digital market that reflects the current price of the performance tokens offered. This index operates under the principles of Haqq Mali to ensure an ethical and transparent trading environment.

Initial Price Setting: Before the market opens, ShareMatch creates the initial price for each token based on historical oracle-based data from the Saudi Arabian Football Federation.

Token Status: While the index itself is a series of close-ended markets, the underlying digital tokens are perpetual assets representing club performance in the Roshn Saudi League.

Secondary Market Trading: Once the index is open, a secondary market becomes available, allowing users to trade their tokens on the platform. This secondary market activity does not alter the original terms of the smart contract.

Transparent Pricing: The pricing in the secondary market is solely determined by user supply and demand, ensuring a free and honest market with no interference or third-party data influence from the issuer (ShareMatch). Liquidity within the markets is provided by ShareMatch.

Market Closure & Settlement: Trading is permitted until the clearly displayed closure of the market. At this point, the smart contract settles all positions with a defined value:

The with profits token (i.e., the club at the top of the league table) settles at its defined maximum value of $100.0.
All other tokens settle at their defined minimum value of $0.1.`,
    seasonDates: '22 August 2025 - 30 May 2026',
    isOpen: true,
  },

  WC: {
    title: 'FIFA World Cup Performance Index',
    content: `The FIFA World Cup Performance Index is a close-ended digital market that reflects the current price of the performance tokens offered. This index operates under the principles of Haqq Mali to ensure an ethical and transparent trading environment.

Initial Price Setting: Before the market opens, ShareMatch creates the initial price for each token based on historical oracle-based data from official FIFA rankings and tournament history.

Token Status: While the index itself is a series of close-ended markets, the underlying digital tokens are perpetual assets representing national team tournament performance.

Secondary Market Trading: Once the index is open, a secondary market becomes available, allowing users to trade their tokens on the platform. This secondary market activity does not alter the original terms of the smart contract.

Transparent Pricing: The pricing in the secondary market is solely determined by user supply and demand, ensuring a free and honest market with no interference or third-party data influence from the issuer (ShareMatch). Liquidity within the markets is provided by ShareMatch.

Market Closure & Settlement: Trading is permitted until the clearly displayed closure of the market. At this point, the smart contract settles all positions with a defined value:

The with profits token (i.e., the World Cup champion) settles at its defined maximum value of $100.0.
All other tokens settle at their defined minimum value of $0.1.`,
    seasonDates: '11 June 2026 - 19 July 2026',
    isOpen: false,
  },

  NBA: {
    title: 'NBA Performance Index',
    content: `The NBA Performance Index is a close-ended digital market that reflects the current price of the performance tokens offered. This index operates under the principles of Haqq Mali to ensure an ethical and transparent trading environment.

Initial Price Setting: Before the market opens, ShareMatch creates the initial price for each token based on historical oracle-based data from official NBA statistics and standings.

Token Status: While the index itself is a series of close-ended markets, the underlying digital tokens are perpetual assets representing franchise performance.

Secondary Market Trading: Once the index is open, a secondary market becomes available, allowing users to trade their tokens on the platform. This secondary market activity does not alter the original terms of the smart contract.

Transparent Pricing: The pricing in the secondary market is solely determined by user supply and demand, ensuring a free and honest market with no interference or third-party data influence from the issuer (ShareMatch). Liquidity within the markets is provided by ShareMatch.

Market Closure & Settlement: Trading is permitted until the clearly displayed closure of the market. At this point, the smart contract settles all positions with a defined value:

The with profits token (i.e., the NBA Finals champion) settles at its defined maximum value of $100.0.
All other tokens settle at their defined minimum value of $0.1.`,
    seasonDates: '22 October 2026 - 21 June 2027',
    isOpen: true,
  },

  NFL: {
    title: 'NFL Performance Index',
    content: `The NFL Performance Index is a close-ended digital market that reflects the current price of the performance tokens offered. This index operates under the principles of Haqq Mali to ensure an ethical and transparent trading environment.

Initial Price Setting: Before the market opens, ShareMatch creates the initial price for each token based on historical oracle-based data from official NFL statistics and power rankings.

Token Status: While the index itself is a series of close-ended markets, the underlying digital tokens are perpetual assets representing franchise performance.

Secondary Market Trading: Once the index is open, a secondary market becomes available, allowing users to trade their tokens on the platform. This secondary market activity does not alter the original terms of the smart contract.

Transparent Pricing: The pricing in the secondary market is solely determined by user supply and demand, ensuring a free and honest market with no interference or third-party data influence from the issuer (ShareMatch). Liquidity within the markets is provided by ShareMatch.

Market Closure & Settlement: Trading is permitted until the clearly displayed closure of the market. At this point, the smart contract settles all positions with a defined value:

The with profits token (i.e., the Super Bowl champion) settles at its defined maximum value of $100.0.
All other tokens settle at their defined minimum value of $0.1.`,
    seasonDates: '4 September 2026 - 8 February 2027',
    isOpen: true,
  },

  T20: {
    title: 'T20 World Cup Performance Index',
    content: `The T20 World Cup Performance Index is a close-ended digital market that reflects the current price of the performance tokens offered. This index operates under the principles of Haqq Mali to ensure an ethical and transparent trading environment.

Initial Price Setting: Before the market opens, ShareMatch creates the initial price for each token based on historical oracle-based data from official ICC rankings and tournament history.

Token Status: While the index itself is a series of close-ended markets, the underlying digital tokens are perpetual assets representing national team tournament performance.

Secondary Market Trading: Once the index is open, a secondary market becomes available, allowing users to trade their tokens on the platform. This secondary market activity does not alter the original terms of the smart contract.

Transparent Pricing: The pricing in the secondary market is solely determined by user supply and demand, ensuring a free and honest market with no interference or third-party data influence from the issuer (ShareMatch). Liquidity within the markets is provided by ShareMatch.

Market Closure & Settlement: Trading is permitted until the clearly displayed closure of the market. At this point, the smart contract settles all positions with a defined value:

The with profits token (i.e., the World Cup winner) settles at its defined maximum value of $100.0.
All other tokens settle at their defined minimum value of $0.1.`,
    seasonDates: '1 June 2026 - 29 June 2026',
    isOpen: true,
  },
};

// Helper function to get market info with fallback
export const getMarketInfo = (market: string): MarketInfo => {
  return marketInfoData[market] || {
    title: 'Market Information',
    content: 'Information about this market is not available yet.',
    seasonDates: '',
    isOpen: false,
  };
};
