// Market-specific information for InfoPopup
// Each market has its own description and relevant dates

export interface MarketInfo {
  title: string;
  content: string;
  volumeDescription: string;
  buyInfo: { price?: string; description: string };
  sellInfo: { price?: string; description: string };
  details: { label: string; value: string }[];
  isOpen: boolean;
}

export const marketInfoData: Record<string, MarketInfo> = {
  F1: {
    title: 'Formula 1 General Information',
    content: `A Formula 1 event-market links every user position to a real, permissible underlying asset supported by licensed digital rights. Formula 1's globally broadcast races, highly transparent timing systems, and precisely measured driver performance provide clear, independently verified outcomes that allow asset values to adjust fairly and objectively after each race.

Participants hold ownership units whose value changes in line with these publicly observed results. Because the sport's ranking structure, lap times, and season format are fully documented and easily validated, all adjustments to asset value are driven by factual events rather than uncertainty.`,
    volumeDescription: 'Total trading volume in this F1 market over the last 24 hours. Higher volume indicates more active trading and better liquidity.',
    buyInfo: {
      description: 'Purchase ownership units at the current offer price. Your position increases in value as the driver performs well in races and climbs the championship standings.',
    },
    sellInfo: {
      description: 'Sell your ownership units at the current bid price. Use this to take profits or reduce your exposure to a particular driver.',
    },
    details: [
      { label: 'Season Start Date', value: '16 March 2025' },
      { label: 'Season End Date', value: '7 December 2025' },
      { label: 'Smart Contract Start Date', value: '16 March 2025' },
      { label: 'Smart Contract End Date', value: '7 December 2025' },
    ],
    isOpen: false,
  },

  EPL: {
    title: 'Premier League General Information',
    content: `The Premier League event-market connects every user position to a real, permissible underlying asset backed by licensed digital rights. The English Premier League's globally broadcast matches, official league standings, and verified match statistics provide transparent, independently confirmed outcomes that allow asset values to adjust fairly after each matchweek.

Participants hold ownership units whose value changes based on publicly observed league performance. With official points tables, goal differentials, and match results documented by the league, all asset value adjustments are driven by factual sporting outcomes rather than speculation.`,
    volumeDescription: 'Total trading volume in this Premier League market over the last 24 hours. Higher volume indicates more active trading and better liquidity.',
    buyInfo: {
      description: 'Purchase ownership units at the current offer price. Your position gains value as the team wins matches, accumulates points, and rises in the league table.',
    },
    sellInfo: {
      description: 'Sell your ownership units at the current bid price. Use this to lock in profits or exit your position in a team.',
    },
    details: [
      { label: 'Season Start Date', value: '16 August 2025' },
      { label: 'Season End Date', value: '24 May 2026' },
      { label: 'Smart Contract Start Date', value: '16 August 2025' },
      { label: 'Smart Contract End Date', value: '24 May 2026' },
    ],
    isOpen: true,
  },

  UCL: {
    title: 'Champions League General Information',
    content: `The UEFA Champions League event-market ties every user position to a real, permissible underlying asset supported by licensed digital rights. Europe's premier club competition features globally broadcast matches with UEFA-verified results, official group standings, and knockout round progression that provide transparent outcomes for fair asset value adjustments.

Participants hold ownership units whose value shifts based on publicly verified tournament performance. With UEFA's official match reports, coefficient rankings, and tournament brackets fully documented, all asset adjustments reflect factual competitive results rather than uncertainty.`,
    volumeDescription: 'Total trading volume in this Champions League market over the last 24 hours. Higher volume indicates more active trading and better liquidity.',
    buyInfo: {
      description: 'Purchase ownership units at the current offer price. Your position appreciates as the team advances through group stages and knockout rounds toward the final.',
    },
    sellInfo: {
      description: 'Sell your ownership units at the current bid price. Use this to realize gains or reduce exposure before critical matches.',
    },
    details: [
      { label: 'Season Start Date', value: '17 September 2025' },
      { label: 'Season End Date', value: '30 May 2026' },
      { label: 'Smart Contract Start Date', value: '17 September 2025' },
      { label: 'Smart Contract End Date', value: '30 May 2026' },
    ],
    isOpen: true,
  },

  SPL: {
    title: 'Saudi Pro League General Information',
    content: `The Saudi Pro League event-market links every user position to a real, permissible underlying asset backed by licensed digital rights. The Roshn Saudi League's broadcast matches, official standings, and verified statistics from the Saudi Arabian Football Federation provide clear, independently confirmed outcomes for objective asset value adjustments.

Participants hold ownership units whose value changes in line with publicly observed league results. With official league tables, match statistics, and seasonal records fully documented, all asset value changes are driven by verified sporting facts rather than speculation.`,
    volumeDescription: 'Total trading volume in this Saudi Pro League market over the last 24 hours. Higher volume indicates more active trading and better liquidity.',
    buyInfo: {
      description: 'Purchase ownership units at the current offer price. Your position increases in value as the team performs well and climbs the Saudi Pro League standings.',
    },
    sellInfo: {
      description: 'Sell your ownership units at the current bid price. Use this to secure profits or adjust your portfolio exposure.',
    },
    details: [
      { label: 'Season Start Date', value: '22 August 2025' },
      { label: 'Season End Date', value: '30 May 2026' },
      { label: 'Smart Contract Start Date', value: '22 August 2025' },
      { label: 'Smart Contract End Date', value: '30 May 2026' },
    ],
    isOpen: false,
  },

  WC: {
    title: 'World Cup General Information',
    content: `The FIFA World Cup event-market connects every user position to a real, permissible underlying asset supported by licensed digital rights. The world's most-watched sporting event features FIFA-verified match results, official group standings, and knockout round outcomes that provide transparent, independently confirmed results for fair asset value adjustments.

Participants hold ownership units whose value changes based on publicly verified tournament performance. With FIFA's official match reports, tournament brackets, and final standings fully documented and broadcast globally, all asset adjustments reflect factual competitive outcomes.`,
    volumeDescription: 'Total trading volume in this World Cup market over the last 24 hours. Higher volume indicates more active trading and better liquidity.',
    buyInfo: {
      description: 'Purchase ownership units at the current offer price. Your position gains value as the national team progresses through the World Cup tournament stages.',
    },
    sellInfo: {
      description: 'Sell your ownership units at the current bid price. Use this to take profits or exit positions before elimination rounds.',
    },
    details: [
      { label: 'Tournament Start Date', value: '11 June 2026' },
      { label: 'Tournament End Date', value: '19 July 2026' },
      { label: 'Smart Contract Start Date', value: '11 June 2026' },
      { label: 'Smart Contract End Date', value: '19 July 2026' },
    ],
    isOpen: false,
  },
};

// Helper function to get market info with fallback
export const getMarketInfo = (market: string): MarketInfo => {
  return marketInfoData[market] || {
    title: 'Market Information',
    content: 'Information about this market is not available yet.',
    volumeDescription: 'Total trading volume in this market over the last 24 hours.',
    buyInfo: { description: 'Purchase ownership units at the current offer price.' },
    sellInfo: { description: 'Sell your ownership units at the current bid price.' },
    details: [],
    isOpen: false,
  };
};

