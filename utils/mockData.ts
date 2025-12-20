export interface HistoryPoint {
    time: string; // HH:MM or date string
    price: number;
    volume: number;
    timestamp: number; // for sorting
}

export const generateAssetHistory = (
    basePrice: number,
    points: number = 100
): HistoryPoint[] => {
    const data: HistoryPoint[] = [];
    const now = new Date();
    let currentPrice = basePrice;

    // Generate data going backwards from now
    for (let i = points; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 15 * 60 * 1000); // 15 min intervals

        // Random walk for price
        const change = (Math.random() - 0.5) * (basePrice * 0.02); // 2% max volatility per step
        currentPrice += change;

        // Ensure positive price
        currentPrice = Math.max(0.01, currentPrice);

        // Random volume (spikes occasionally)
        const isSpike = Math.random() > 0.9;
        const baseVolume = 1000 + Math.random() * 5000;
        const volume = isSpike ? baseVolume * (2 + Math.random() * 3) : baseVolume;

        data.push({
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
