export interface HistoryPoint {
    time: string; // HH:MM or date string
    price: number;
    volume: number;
    timestamp: number; // for sorting
}

export const generateAssetHistory = (
    basePrice: number,
    period: '1h' | '24h' | '7d' | 'All' = '24h',
    assetName?: string
): HistoryPoint[] => {
    const data: HistoryPoint[] = [];
    const now = new Date();

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

    // Special logic for Arsenal 'All' time chart to show rise from ~$30
    const isArsenalAll = assetName === 'Arsenal' && period === 'All';
    const startPrice = isArsenalAll ? 30 : basePrice * 0.8; // Start lower generally, but specifically 30 for Arsenal
    const endPrice = basePrice;

    // Generate data going backwards from now
    // If Arsenal All, we generate forward from start to get the trend right
    if (isArsenalAll) {
        for (let i = 0; i <= points; i++) {
            // Calculate time: Start date (points days ago) + i days
            const time = new Date(now.getTime() - (points - i) * interval);

            // Linear trend from 30 to current basePrice
            const trend = startPrice + ((endPrice - startPrice) * (i / points));

            // Add noise
            const noise = (Math.random() - 0.5) * (basePrice * 0.1); // 10% volatility noise

            let price = trend + noise;
            price = Math.max(0.01, price);

            // Ensure the last point is close to current price
            if (i === points) price = basePrice;

            const baseVolume = 1000 + Math.random() * 5000;
            const isSpike = Math.random() > 0.9;
            const volume = isSpike ? baseVolume * (2 + Math.random() * 3) : baseVolume;

            data.push({
                time: time.toLocaleDateString([], { day: 'numeric', month: 'short' }),
                price: Number(price.toFixed(3)),
                volume: Math.floor(volume),
                timestamp: time.getTime()
            });
        }
    } else {
        // Standard random walk backwards (existing logic)
        let currentPrice = basePrice;
        for (let i = 0; i < points; i++) { // Generate points backwards, but push to array (reversed later or handled by unshift)
            // ... wait, existing logic was: for loop backwards, pushing to array. 
            // Time: now - i * interval.
            // Price: currentPrice += change (random walk backwards from NOW).
            // This ensures chart ends at current price on the right.
        }

        // Let's rewrite standard logic clearly to ensure 'end' is 'now' and correct
        currentPrice = basePrice;
        for (let i = 0; i <= points; i++) {
            const time = new Date(now.getTime() - i * interval);

            // Random walk logic backwards
            const change = (Math.random() - 0.5) * (basePrice * volatility);
            currentPrice += change; // This effectively walks 'away' from current price into the past

            // Re-calc to ensure positivity
            currentPrice = Math.max(0.01, currentPrice);

            // Random volume 
            const isSpike = Math.random() > 0.9;
            const baseVolume = 1000 + Math.random() * 5000;
            const volume = isSpike ? baseVolume * (2 + Math.random() * 3) : baseVolume;

            let timeLabel = '';
            if (period === '1h' || period === '24h') {
                timeLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                timeLabel = time.toLocaleDateString([], { day: 'numeric', month: 'short' });
            }

            // We are generating backwards, so unshift to put earlier dates first
            data.unshift({
                time: timeLabel,
                price: Number(currentPrice.toFixed(3)),
                volume: Math.floor(volume),
                timestamp: time.getTime()
            });
        }
        // Fix last point to be exactly basePrice for consistency?
        // The backwards walk starts at basePrice (i=0), so the LAST item in the array (which corresponds to i=0, time=now) IS basePrice + first random change. 
        // Actually, let's force the last point (now) to be exactly basePrice.
        if (data.length > 0) {
            data[data.length - 1].price = basePrice;
        }
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
