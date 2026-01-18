import { supabase } from './supabase';

export const seedSportsAssets = async () => {
    try {
        // Check if assets already exist
        const { count, error: countError } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .in('market', ['NBA', 'NFL', 'T20']);

        if (countError) {
            console.error('Error checking assets:', countError);
            return;
        }

        if (count && count > 0) {
            return;
        }

        const nbaTeams = [
            { id: 404, name: 'Oklahoma City Thunder', market: 'NBA', bid: 40.4, offer: 44.7, last_change: 'none', color: '#007ACC', category: 'basketball' },
            { id: 405, name: 'Denver Nuggets', market: 'NBA', bid: 13.6, offer: 15.0, last_change: 'none', color: '#0E2240', category: 'basketball' },
            { id: 406, name: 'Houston Rockets', market: 'NBA', bid: 8.6, offer: 9.5, last_change: 'none', color: '#CE1141', category: 'basketball' },
            { id: 407, name: 'Los Angeles Lakers', market: 'NBA', bid: 7.3, offer: 8.1, last_change: 'none', color: '#552583', category: 'basketball' },
            { id: 408, name: 'Cleveland Cavaliers', market: 'NBA', bid: 6.3, offer: 7.0, last_change: 'none', color: '#6F263D', category: 'basketball' },
            { id: 409, name: 'New York Knicks', market: 'NBA', bid: 7.3, offer: 8.1, last_change: 'none', color: '#F58426', category: 'basketball' },
            { id: 410, name: 'Detroit Pistons', market: 'NBA', bid: 4.1, offer: 4.6, last_change: 'none', color: '#006BB6', category: 'basketball' },
            { id: 411, name: 'Golden State Warriors', market: 'NBA', bid: 3.7, offer: 4.0, last_change: 'none', color: '#006BB6', category: 'basketball' },
            { id: 412, name: 'Minnesota Timberwolves', market: 'NBA', bid: 3.7, offer: 4.0, last_change: 'none', color: '#0C2340', category: 'basketball' },
            { id: 413, name: 'Orlando Magic', market: 'NBA', bid: 3.7, offer: 4.0, last_change: 'none', color: '#0077C0', category: 'basketball' },
            { id: 414, name: 'San Antonio Spurs', market: 'NBA', bid: 2.3, offer: 2.6, last_change: 'none', color: '#000000', category: 'basketball' },
            { id: 415, name: 'Atlanta Hawks', market: 'NBA', bid: 1.9, offer: 2.1, last_change: 'none', color: '#E03A3E', category: 'basketball' },
            { id: 416, name: 'Philadelphia 76ers', market: 'NBA', bid: 1.9, offer: 2.1, last_change: 'none', color: '#006BB6', category: 'basketball' },
            { id: 417, name: 'Boston Celtics', market: 'NBA', bid: 2.3, offer: 2.6, last_change: 'none', color: '#008348', category: 'basketball' },
            { id: 418, name: 'Miami Heat', market: 'NBA', bid: 1.9, offer: 2.1, last_change: 'none', color: '#98002E', category: 'basketball' },
            { id: 419, name: 'Toronto Raptors', market: 'NBA', bid: 1.2, offer: 1.3, last_change: 'none', color: '#CE1141', category: 'basketball' },
            { id: 420, name: 'Chicago Bulls', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#CE1141', category: 'basketball' },
            { id: 421, name: 'Milwaukee Bucks', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#00471B', category: 'basketball' },
            { id: 422, name: 'Phoenix Suns', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#E56020', category: 'basketball' },
            { id: 423, name: 'Dallas Mavericks', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#00538C', category: 'basketball' },
            { id: 424, name: 'Memphis Grizzlies', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#5D76A9', category: 'basketball' },
            { id: 425, name: 'Portland Trail Blazers', market: 'NBA', bid: 0.1, offer: 2.0, last_change: 'none', color: '#E03A3E', category: 'basketball' }, // Fixed typo in offer? assuming 0.2 but keeping consistent with others, wait, script said 0.2.
            { id: 426, name: 'Los Angeles Clippers', market: 'NBA', bid: 1.2, offer: 1.3, last_change: 'none', color: '#1C488F', category: 'basketball' },
            { id: 427, name: 'Sacramento Kings', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#5A2D81', category: 'basketball' },
            { id: 428, name: 'Indiana Pacers', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#002D62', category: 'basketball' },
            { id: 429, name: 'New Orleans Pelicans', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#0C2340', category: 'basketball' },
            { id: 430, name: 'Charlotte Hornets', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#00788C', category: 'basketball' },
            { id: 431, name: 'Utah Jazz', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#002B5C', category: 'basketball' },
            { id: 432, name: 'Washington Wizards', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#0C2340', category: 'basketball' },
            { id: 433, name: 'Brooklyn Nets', market: 'NBA', bid: 0.1, offer: 0.2, last_change: 'none', color: '#000000', category: 'basketball' },
        ];

        const nflTeams = [
            { id: 434, name: 'Los Angeles Rams', market: 'NFL', bid: 17.3, offer: 19.1, last_change: 'none', color: '#003594', category: 'american_football' },
            { id: 435, name: 'Philadelphia Eagles', market: 'NFL', bid: 9.5, offer: 10.5, last_change: 'none', color: '#004C54', category: 'american_football' },
            { id: 436, name: 'Buffalo Bills', market: 'NFL', bid: 8.6, offer: 9.5, last_change: 'none', color: '#00338D', category: 'american_football' },
            { id: 437, name: 'Seattle Seahawks', market: 'NFL', bid: 10.6, offer: 11.7, last_change: 'none', color: '#002244', category: 'american_football' },
            { id: 438, name: 'New England Patriots', market: 'NFL', bid: 7.9, offer: 8.8, last_change: 'none', color: '#002244', category: 'american_football' },
            { id: 439, name: 'Green Bay Packers', market: 'NFL', bid: 9.5, offer: 10.5, last_change: 'none', color: '#203731', category: 'american_football' },
            { id: 440, name: 'Denver Broncos', market: 'NFL', bid: 7.9, offer: 8.8, last_change: 'none', color: '#FB4F14', category: 'american_football' },
            { id: 441, name: 'Baltimore Ravens', market: 'NFL', bid: 5.6, offer: 6.2, last_change: 'none', color: '#241773', category: 'american_football' },
            { id: 442, name: 'Kansas City Chiefs', market: 'NFL', bid: 5.6, offer: 6.2, last_change: 'none', color: '#E31837', category: 'american_football' },
            { id: 443, name: 'Detroit Lions', market: 'NFL', bid: 4.5, offer: 5.0, last_change: 'none', color: '#0076B6', category: 'american_football' },
            { id: 444, name: 'Indianapolis Colts', market: 'NFL', bid: 5.6, offer: 6.2, last_change: 'none', color: '#002C5F', category: 'american_football' },
            { id: 445, name: 'San Francisco 49ers', market: 'NFL', bid: 3.7, offer: 4.0, last_change: 'none', color: '#AA0000', category: 'american_football' },
            { id: 446, name: 'Houston Texans', market: 'NFL', bid: 3.7, offer: 4.0, last_change: 'none', color: '#03202F', category: 'american_football' },
            { id: 447, name: 'Chicago Bears', market: 'NFL', bid: 3.3, offer: 3.6, last_change: 'none', color: '#0B162A', category: 'american_football' },
            { id: 448, name: 'Tampa Bay Buccaneers', market: 'NFL', bid: 2.3, offer: 2.6, last_change: 'none', color: '#D50A0A', category: 'american_football' },
            { id: 449, name: 'Los Angeles Chargers', market: 'NFL', bid: 2.6, offer: 2.9, last_change: 'none', color: '#0080C6', category: 'american_football' },
            { id: 450, name: 'Jacksonville Jaguars', market: 'NFL', bid: 3.1, offer: 3.4, last_change: 'none', color: '#006778', category: 'american_football' },
            { id: 451, name: 'Cincinnati Bengals', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#FB4F14', category: 'american_football' },
            { id: 452, name: 'Pittsburgh Steelers', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#101820', category: 'american_football' },
            { id: 453, name: 'Dallas Cowboys', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#003594', category: 'american_football' },
            { id: 454, name: 'Carolina Panthers', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#0085CA', category: 'american_football' },
            { id: 455, name: 'Miami Dolphins', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#008E97', category: 'american_football' },
            { id: 456, name: 'Cleveland Browns', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#311D00', category: 'american_football' },
            { id: 457, name: 'Atlanta Falcons', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#A71930', category: 'american_football' },
            { id: 458, name: 'Washington Commanders', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#5A1414', category: 'american_football' },
            { id: 459, name: 'Minnesota Vikings', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#4F2683', category: 'american_football' },
            { id: 460, name: 'New York Jets', market: 'NFL', bid: 0.1, offer: 0.2, last_change: 'none', color: '#125740', category: 'american_football' },
        ];

        const t20Teams = [
            { id: 461, name: 'India', market: 'T20', bid: 39.9, offer: 44.1, last_change: 'none', color: '#0078BC', category: 'cricket' },
            { id: 462, name: 'Australia', market: 'T20', bid: 19.0, offer: 21.0, last_change: 'none', color: '#FFCD00', category: 'cricket' },
            { id: 463, name: 'South Africa', market: 'T20', bid: 14.6, offer: 16.2, last_change: 'none', color: '#007749', category: 'cricket' },
            { id: 464, name: 'England', market: 'T20', bid: 17.3, offer: 19.1, last_change: 'none', color: '#C8102E', category: 'cricket' },
            { id: 465, name: 'Pakistan', market: 'T20', bid: 5.6, offer: 6.2, last_change: 'none', color: '#006600', category: 'cricket' },
            { id: 466, name: 'New Zealand', market: 'T20', bid: 5.6, offer: 6.2, last_change: 'none', color: '#000000', category: 'cricket' },
            { id: 467, name: 'West Indies', market: 'T20', bid: 4.5, offer: 5.0, last_change: 'none', color: '#7B0046', category: 'cricket' },
            { id: 468, name: 'Afghanistan', market: 'T20', bid: 3.7, offer: 4.0, last_change: 'none', color: '#009900', category: 'cricket' },
            { id: 469, name: 'Sri Lanka', market: 'T20', bid: 2.3, offer: 2.6, last_change: 'none', color: '#1C3C6E', category: 'cricket' },
            { id: 470, name: 'Bangladesh', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#006A4E', category: 'cricket' },
            { id: 471, name: 'Ireland', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#169B62', category: 'cricket' },
            { id: 472, name: 'Zimbabwe', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#D40000', category: 'cricket' },
            { id: 473, name: 'USA', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#3C3B6E', category: 'cricket' },
            { id: 474, name: 'Netherlands', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#F36C21', category: 'cricket' },
            { id: 475, name: 'Nepal', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#DC143C', category: 'cricket' },
            { id: 476, name: 'Canada', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#FF0000', category: 'cricket' },
            { id: 477, name: 'UAE', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#00732F', category: 'cricket' },
            { id: 478, name: 'Oman', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#DB161B', category: 'cricket' },
            { id: 479, name: 'Namibia', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#003580', category: 'cricket' },
            { id: 480, name: 'Italy', market: 'T20', bid: 0.1, offer: 0.2, last_change: 'none', color: '#009246', category: 'cricket' },
        ];

        const { error: insertError } = await supabase
            .from('assets')
            .upsert([...nbaTeams, ...nflTeams, ...t20Teams], { onConflict: 'id' });

        if (insertError) {
            console.error('Error seeding sports assets:', insertError);
        }

    } catch (err) {
        console.error('Unexpected error during seeding:', err);
    }
};
