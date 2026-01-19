const fs = require('fs');
const path = require('path');

const rawDataPath = path.join(__dirname, 'raw_data.txt');
const marketDataPath = path.join(__dirname, '../data/marketData.ts');

// Read existing marketData to extract colors
const existingContent = fs.readFileSync(marketDataPath, 'utf8');
const colorMap = {};

// Regex to find color properties: name: '...', ... color: '#...'
// This is a rough extraction, might miss some if formatted oddly, but should catch most 
const teamRegex = /name:\s*['"]([^'"]+)['"][\s\S]*?color:\s*['"]([^'"]+)['"]/g;
let match;
while ((match = teamRegex.exec(existingContent)) !== null) {
    colorMap[match[1]] = match[2];
}

// Default colors for new leagues if not found
const defaultColors = {
    'NBA': '#C9082A',
    'NFL': '#013369',
    'T20': '#00B140', // Cricket green
    'Eurovision': '#601848', // Generic purple
    'Indonesia': '#FF0000'
};

const marketMap = {
    'EPL': { varName: 'EPL_TEAMS', category: 'football' },
    'UCL': { varName: 'UCL_TEAMS', category: 'football' },
    'WC': { varName: 'WC_TEAMS', category: 'football' },
    'SPL': { varName: 'SPL_TEAMS', category: 'football' },
    'F1': { varName: 'F1_TEAMS', category: 'f1' },
    'NBA': { varName: 'NBA_TEAMS', category: 'basketball' },
    'NFL': { varName: 'NFL_TEAMS', category: 'american_football' },
    'T20 World Cup': { varName: 'T20_TEAMS', category: 'cricket' },
    'T20': { varName: 'T20_TEAMS', category: 'cricket' },
    'Eurovision': { varName: 'EUROVISION_TEAMS', category: 'global_events' },
    'Indonesia': { varName: 'ISL_TEAMS', category: 'football' },
    'ISL': { varName: 'ISL_TEAMS', category: 'football' }
};

const rawData = fs.readFileSync(rawDataPath, 'utf8');
const lines = rawData.split('\n');

const teamsByMarket = {};

lines.forEach(line => {
    const parts = line.trim().split('\t');
    if (parts.length < 5) return;

    // id, name, market, sell, buy
    const id = parts[0];
    if (id === 'id') return; // Header

    const name = parts[1];
    const marketCode = parts[2];
    const sell = parseFloat(parts[3]);
    const buy = parseFloat(parts[4]);

    if (!marketMap[marketCode]) {
        console.warn(`Unknown market: ${marketCode}`);
        return;
    }

    const { varName, category } = marketMap[marketCode];
    if (!teamsByMarket[varName]) {
        teamsByMarket[varName] = [];
    }

    let color = colorMap[name];
    if (!color) {
        // Try to pick a default based on market
        if (marketCode.includes('NBA')) color = defaultColors.NBA;
        else if (marketCode.includes('NFL')) color = defaultColors.NFL;
        else if (marketCode.includes('T20')) color = defaultColors.T20;
        else if (marketCode.includes('Eurovision')) color = defaultColors.Eurovision;
        else if (marketCode.includes('Indonesia')) color = defaultColors.Indonesia;
        else color = '#6B7280';
    }

    teamsByMarket[varName].push({
        id,
        name,
        bid: buy,
        offer: sell,
        lastChange: 'none',
        color,
        category,
        market: marketCode // Keep short code or full name? Using short code from raw data for now.
    });
});

// Construct the file content
let output = "import { Team } from '../types';\n\n";

// Helper function (preserved but unused for now)
output += `// Helper to convert decimal odds to Buy/Sell prices
const calculatePrices = (decimalOdds: number): { bid: number; offer: number } => {
    if (decimalOdds > 100) {
        return { bid: 0.1, offer: 0.2 };
    }
    const impliedProb = 100 / decimalOdds;
    // Spread of ~0.4-0.5%
    const bid = parseFloat((impliedProb - 0.2).toFixed(1));
    const offer = parseFloat((impliedProb + 0.2).toFixed(1));
    return { bid: Math.max(0.1, bid), offer: offer };
};

const createTeam = (id: string, name: string, odds: number, color: string = '#6B7280', category: 'football' | 'f1' | 'other' = 'football'): Team => {
    const { bid, offer } = calculatePrices(odds);
    return { id, name, bid, offer, lastChange: 'none', color, category };
};\n\n`;

for (const [varName, teams] of Object.entries(teamsByMarket)) {
    output += `export const ${varName}: Team[] = [\n`;
    teams.forEach(team => {
        output += `    { id: '${team.id}', name: "${team.name}", bid: ${team.bid}, offer: ${team.offer}, lastChange: '${team.lastChange}', color: '${team.color}', category: '${team.category}', market: "${team.market}" },\n`;
    });
    output += `];\n\n`;
}

fs.writeFileSync(marketDataPath, output);
console.log('Successfully updated marketData.ts');
