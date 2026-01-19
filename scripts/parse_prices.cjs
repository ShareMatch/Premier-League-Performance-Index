
const fs = require('fs');
const readline = require('readline');

const mapping = {
    'EPL': 'Premier League Performance Index',
    'UCL': 'Champions League Performance Index',
    'WC': 'World Cup Performance Index',
    'SPL': 'Saudi Pro League Performance Index',
    'F1': 'Formula 1 Drivers Performance Index',
    'NBA': 'NBA Performance Index',
    'NFL': 'NFL Performance Index',
    'T20 World Cup': 'T20 World Cup Performance Index',
    'T20': 'T20 World Cup Performance Index',
    'Eurovision': 'Eurovision Performance Index',
    'Indonesia': 'Indonesia Super League Performance Index',
    'ISL': 'Indonesia Super League Performance Index'
};

async function processLineByLine() {
    const fileStream = fs.createReadStream('scripts/raw_data.txt');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const values = [];
    let isHeader = true;

    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue;
        }
        if (!line.trim()) continue;

        const parts = line.split('\t');
        if (parts.length < 5) continue;

        const name = parts[1].trim().replace(/'/g, "''");
        const marketCode = parts[2].trim();
        const marketName = mapping[marketCode] || marketCode;
        const sell = parts[3];
        const buy = parts[4];

        values.push(`('${name}', '${marketName}', ${buy}, ${sell})`);
    }


    const sql = `
WITH updates (asset_name, market_name, new_buy, new_sell) AS (
    VALUES
    ${values.join(',\n    ')}
)
UPDATE market_index_trading_assets mita
SET buy = u.new_buy, sell = u.new_sell
FROM updates u
JOIN assets a ON a.name = u.asset_name
JOIN market_indexes mi ON mi.name = u.market_name
JOIN market_index_seasons mis ON mis.market_index_id = mi.id
WHERE mita.asset_id = a.id
  AND mita.market_index_season_id = mis.id;
`;

    fs.writeFileSync('scripts/update_prices.sql', sql);
    console.log('SQL generated');
}

processLineByLine();
