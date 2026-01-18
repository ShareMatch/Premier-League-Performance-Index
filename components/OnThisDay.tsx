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
        <div className={`bg-gradient-to-br from-[#0B1221] to-[#0f192b] border border-gray-800 rounded-xl p-5 relative overflow-hidden group ${className}`}>
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>

            <div className="flex items-start gap-3 relative z-10">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                        On This Day
                        <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    </h3>

                    {loading ? (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-3 bg-gray-700/50 rounded w-full"></div>
                            <div className="h-3 bg-gray-700/50 rounded w-3/4"></div>
                        </div>
                    ) : (
                        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed italic">
                            "{fact}"
                        </p>
                    )}

                    <div className="mt-3 flex justify-end">
                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                            <CalendarDays className="w-2 h-2" />
                            AI Historical Event
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnThisDay;
