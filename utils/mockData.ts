export interface HistoryPoint {
    time: string; // HH:MM or date string
    price: number;
    volume: number;
    timestamp: number; // for sorting
}

export const generateAssetHistory = (
    basePrice: number,
    period: '1h' | '24h' | '7d' | 'All' = '24h'
): HistoryPoint[] => {
    const data: HistoryPoint[] = [];
    const now = new Date();
    let currentPrice = basePrice;

    let interval = 15 * 60 * 1000; // 15 min default
    let points = 100;
    let volatility = 0.02;

    switch (period) {
        case '1h':
            interval = 1 * 60 * 1000; // 1 min
            points = 60;
            volatility = 0.005;
            break;
        case '24h':
            interval = 15 * 60 * 1000; // 15 min
            points = 96;
            volatility = 0.02;
            break;
        case '7d':
            interval = 4 * 60 * 60 * 1000; // 4 hours
            points = 42;
            volatility = 0.05;
            break;
        case 'All':
            interval = 24 * 60 * 60 * 1000; // 1 day
            points = 180; // ~6 months
            volatility = 0.1;
            break;
    }

    // Generate data going backwards from now
    for (let i = points; i >= 0; i--) {
        const time = new Date(now.getTime() - i * interval);

        // Random walk for price
        const change = (Math.random() - 0.5) * (basePrice * volatility);
        currentPrice += change;

        // Ensure positive price
        currentPrice = Math.max(0.01, currentPrice);

        // Random volume (spikes occasionally)
        const isSpike = Math.random() > 0.9;
        const baseVolume = 1000 + Math.random() * 5000;
        const volume = isSpike ? baseVolume * (2 + Math.random() * 3) : baseVolume;

        let timeLabel = '';
        if (period === '1h' || period === '24h') {
            timeLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            timeLabel = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        data.push({
            time: timeLabel,
            price: Number(currentPrice.toFixed(3)),
            volume: Math.floor(volume),
            timestamp: time.getTime()
        });
    }

    return data;
};

export const generateTradeHistory = (basePrice: number, count: number = 50) => {
    const trades = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const time = new Date(now.getTime() - i * Math.random() * 5 * 60 * 1000); // Random time within last few hours
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const priceVariance = (Math.random() - 0.5) * (basePrice * 0.01);
        const price = basePrice + priceVariance;
        const volume = 100 + Math.floor(Math.random() * 9000);

        trades.push({
            id: `trade-${i}`,
            price: Number(price.toFixed(3)),
            volume,
            side,
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            total: Number((price * volume).toFixed(2))
        });
    }
    return trades;
};
