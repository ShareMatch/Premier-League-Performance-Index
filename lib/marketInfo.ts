// Market-specific information for InfoPopup
// Each market has its own description and relevant dates

export interface MarketInfo {
  title: string;
  content: string;
  details: { label: string; value: string }[];
}

export const marketInfoData: Record<string, MarketInfo> = {
  F1: {
    title: 'Formula 1 Index Information',
    content: `A Formula 1 event-market links every user position to a real, permissible underlying asset supported by licensed digital rights. Formula 1's globally broadcast races, highly transparent timing systems, and precisely measured driver performance provide clear, independently verified outcomes that allow asset values to adjust fairly and objectively after each race.

Participants hold ownership units whose value changes in line with these publicly observed results. Because the sport's ranking structure, lap times, and season format are fully documented and easily validated, all adjustments to asset value are driven by factual events rather than uncertainty.`,
    details: [
      { label: 'Season Start Date', value: '16 March 2025' },
      { label: 'Season End Date', value: '7 December 2025' },
      { label: 'Smart Contract Start Date', value: '16 March 2025' },
      { label: 'Smart Contract End Date', value: '7 December 2025' },
    ],
  },

  EPL: {
    title: 'Premier League Index Information',
    content: `The Premier League event-market connects every user position to a real, permissible underlying asset backed by licensed digital rights. The English Premier League's globally broadcast matches, official league standings, and verified match statistics provide transparent, independently confirmed outcomes that allow asset values to adjust fairly after each matchweek.

Participants hold ownership units whose value changes based on publicly observed league performance. With official points tables, goal differentials, and match results documented by the league, all asset value adjustments are driven by factual sporting outcomes rather than speculation.`,
    details: [
      { label: 'Season Start Date', value: '16 August 2025' },
      { label: 'Season End Date', value: '24 May 2026' },
      { label: 'Smart Contract Start Date', value: '16 August 2025' },
      { label: 'Smart Contract End Date', value: '24 May 2026' },
    ],
  },

  UCL: {
    title: 'Champions League Index Information',
    content: `The UEFA Champions League event-market ties every user position to a real, permissible underlying asset supported by licensed digital rights. Europe's premier club competition features globally broadcast matches with UEFA-verified results, official group standings, and knockout round progression that provide transparent outcomes for fair asset value adjustments.

Participants hold ownership units whose value shifts based on publicly verified tournament performance. With UEFA's official match reports, coefficient rankings, and tournament brackets fully documented, all asset adjustments reflect factual competitive results rather than uncertainty.`,
    details: [
      { label: 'Season Start Date', value: '17 September 2025' },
      { label: 'Season End Date', value: '30 May 2026' },
      { label: 'Smart Contract Start Date', value: '17 September 2025' },
      { label: 'Smart Contract End Date', value: '30 May 2026' },
    ],
  },

  SPL: {
    title: 'Saudi Pro League Index Information',
    content: `The Saudi Pro League event-market links every user position to a real, permissible underlying asset backed by licensed digital rights. The Roshn Saudi League's broadcast matches, official standings, and verified statistics from the Saudi Arabian Football Federation provide clear, independently confirmed outcomes for objective asset value adjustments.

Participants hold ownership units whose value changes in line with publicly observed league results. With official league tables, match statistics, and seasonal records fully documented, all asset value changes are driven by verified sporting facts rather than speculation.`,
    details: [
      { label: 'Season Start Date', value: '22 August 2025' },
      { label: 'Season End Date', value: '30 May 2026' },
      { label: 'Smart Contract Start Date', value: '22 August 2025' },
      { label: 'Smart Contract End Date', value: '30 May 2026' },
    ],
  },

  WC: {
    title: 'World Cup Index Information',
    content: `The FIFA World Cup event-market connects every user position to a real, permissible underlying asset supported by licensed digital rights. The world's most-watched sporting event features FIFA-verified match results, official group standings, and knockout round outcomes that provide transparent, independently confirmed results for fair asset value adjustments.

Participants hold ownership units whose value changes based on publicly verified tournament performance. With FIFA's official match reports, tournament brackets, and final standings fully documented and broadcast globally, all asset adjustments reflect factual competitive outcomes.`,
    details: [
      { label: 'Tournament Start Date', value: '11 June 2026' },
      { label: 'Tournament End Date', value: '19 July 2026' },
      { label: 'Smart Contract Start Date', value: '11 June 2026' },
      { label: 'Smart Contract End Date', value: '19 July 2026' },
    ],
  },
};

// Helper function to get market info with fallback
export const getMarketInfo = (market: string): MarketInfo => {
  return marketInfoData[market] || {
    title: 'Market Information',
    content: 'Information about this market is not available yet.',
    details: [],
  };
};

