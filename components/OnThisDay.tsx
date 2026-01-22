import React, { useState, useEffect } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { saveAssetFact } from '../lib/api';
import { supabase } from '../lib/supabase';

interface OnThisDayProps {
    assetName: string;
    market?: string;
    className?: string;
}

const OnThisDay: React.FC<OnThisDayProps> = ({ assetName, market, className = '' }) => {
    const [fact, setFact] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchFact = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.functions.invoke('on-this-day', {
                    body: {
                        assetName,
                        market
                    }
                });

                if (error) throw error;

                const generatedFact = data?.fact || `On this day, ${assetName} continues to make history.`;
                setFact(generatedFact);

                // We can treat this as a fact to save, maybe prefix with "On This Day:"
                if (generatedFact && generatedFact.length > 10) {
                    saveAssetFact(assetName, market || 'General', `On This Day: ${generatedFact}`);
                }

            } catch (error) {
                console.error("Error generating On This Day fact:", error);
                setFact(`On this day, ${assetName} continues to build its legacy.`);
            } finally {
                setLoading(false);
            }
        };

        if (assetName) {
            fetchFact();
        }
    }, [assetName, market]);

    return (
        <div className={`bg-gradient-to-br from-[#0B1221] to-[#0f192b] border border-gray-800 rounded-[clamp(0.5rem,1.5vw,0.75rem)] p-[clamp(0.75rem,2vw,1.25rem)] relative overflow-hidden group ${className}`}>
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 -mr-[clamp(0.75rem,2vw,1rem)] -mt-[clamp(0.75rem,2vw,1rem)] w-[clamp(4rem,12vw,6rem)] h-[clamp(4rem,12vw,6rem)] bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] mb-[clamp(0.5rem,1.5vw,0.75rem)]">
                    <div className="p-[clamp(0.375rem,1vw,0.5rem)] bg-blue-500/10 rounded-[clamp(0.375rem,1vw,0.5rem)] text-blue-500 flex-shrink-0">
                        <Calendar className="w-[clamp(1rem,2.5vw,1.25rem)] h-[clamp(1rem,2.5vw,1.25rem)]" />
                    </div>
                    <h3 className="text-white font-bold text-[clamp(0.7rem,1.75vw,0.875rem)] flex items-center gap-[clamp(0.375rem,1vw,0.5rem)]">
                        On This Day
                        <span className="text-[clamp(0.55rem,1.25vw,0.75rem)] font-normal text-gray-400 bg-blue-500/10 px-[clamp(0.375rem,1vw,0.5rem)] py-[clamp(0.0625rem,0.25vw,0.125rem)] rounded-full border border-blue-500/20">
                            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    </h3>
                </div>

                <div className="min-w-0">
                    {loading ? (
                        <div className="space-y-[clamp(0.375rem,1vw,0.5rem)] animate-pulse">
                            <div className="h-[clamp(0.625rem,1.5vw,0.75rem)] bg-gray-700/50 rounded w-full"></div>
                            <div className="h-[clamp(0.625rem,1.5vw,0.75rem)] bg-gray-700/50 rounded w-3/4"></div>
                        </div>
                    ) : (
                        <p className="text-gray-300 text-[clamp(0.6rem,1.5vw,0.875rem)] leading-relaxed italic">
                            "{fact}"
                        </p>
                    )}

                    <div className="mt-[clamp(0.5rem,1.5vw,0.75rem)] flex justify-end">
                        <span className="text-[clamp(0.5rem,1vw,0.625rem)] text-gray-600 flex items-center gap-[clamp(0.125rem,0.5vw,0.25rem)]">
                            <CalendarDays className="w-[clamp(0.375rem,1vw,0.5rem)] h-[clamp(0.375rem,1vw,0.5rem)]" />
                            AI Historical Event
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnThisDay;
