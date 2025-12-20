import React, { useMemo } from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Area
} from 'recharts';
import { HistoryPoint } from '../utils/mockData';

interface PriceVolumeChartProps {
    data: HistoryPoint[];
    assetName: string;
    period: '1h' | '24h' | '7d' | 'All';
    onPeriodChange: (p: '1h' | '24h' | '7d' | 'All') => void;
}

const PriceVolumeChart: React.FC<PriceVolumeChartProps> = ({ data, assetName, period, onPeriodChange }) => {

    const minPrice = useMemo(() => Math.min(...data.map(d => d.price)) * 0.95, [data]);
    const maxPrice = useMemo(() => Math.max(...data.map(d => d.price)) * 1.05, [data]);

    const formattedData = useMemo(() => {
        return data.map(item => ({
            ...item,
            priceDisplay: item.price,
            volumeDisplay: item.volume
        }));
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0B1221] border border-[#005430] p-3 rounded shadow-xl text-xs">
                    <p className="text-gray-400 mb-1">{label}</p>
                    <div className="flex flex-col gap-1">
                        <p className="text-white font-bold flex justify-between gap-4">
                            <span>Price:</span>
                            <span className="text-[#00A651]">${payload[0].value.toFixed(3)}</span>
                        </p>
                        {payload[1] && (
                            <p className="text-gray-300 flex justify-between gap-4">
                                <span>Volume:</span>
                                <span className="text-blue-400">{payload[1].value.toLocaleString()}</span>
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-[400px] bg-[#02060a] rounded-xl border border-gray-800 p-4 relative overflow-hidden group">
            {/* Chart Header Controls (Static for now as per plan) */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    Price/Volume over time
                </h3>
                <div className="flex gap-2">
                    {(['1h', '24h', '7d', 'All'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => onPeriodChange(p)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${period === p
                                ? 'bg-[#005430] text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis
                            dataKey="time"
                            tick={{ fill: '#6b7280', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        {/* Price Y Axis */}
                        <YAxis
                            yAxisId="left"
                            domain={[minPrice, maxPrice]}
                            orientation="left"
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => val.toFixed(2)}
                        />
                        {/* Volume Y Axis (Hidden or Right aligned, scaled down) */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={false} // Hide volume ticks to keep it clean like typical financial charts
                        />

                        <Tooltip content={<CustomTooltip />} />

                        {/* Volume Bars */}
                        <Bar
                            yAxisId="right"
                            dataKey="volume"
                            fill="#3b82f6"
                            opacity={0.3}
                            barSize={4}
                        />

                        {/* Price Line */}
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="price"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                            animationDuration={500}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PriceVolumeChart;
