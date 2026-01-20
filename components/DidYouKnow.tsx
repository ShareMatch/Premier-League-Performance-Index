import React, { useState, useEffect } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { saveAssetFact } from '../lib/api';
import { supabase } from '../lib/supabase';

interface DidYouKnowProps {
    assetName: string;
    market?: string;
    className?: string;
}

const DidYouKnow: React.FC<DidYouKnowProps> = ({ assetName, market, className = '' }) => {
    const [fact, setFact] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchFact = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.functions.invoke('did-you-know', {
                    body: {
                        assetName,
                        market
                    }
                });

                if (error) throw error;

                const generatedFact = data?.fact || `Did you know? ${assetName} is a key asset in the Performance Index.`;
                setFact(generatedFact);

                // Save to Supabase (fire and forget)
                if (generatedFact && generatedFact.length > 10) {
                    saveAssetFact(assetName, market || 'General', generatedFact);
                }

            } catch (error) {
                console.error("Error generating fact:", error);
                setFact(`Did you know? ${assetName} is a key asset in the Performance Index.`);
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
            <div className="absolute top-0 right-0 -mr-[clamp(0.75rem,2vw,1rem)] -mt-[clamp(0.75rem,2vw,1rem)] w-[clamp(4rem,12vw,6rem)] h-[clamp(4rem,12vw,6rem)] bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors duration-500"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-[clamp(0.5rem,1.5vw,0.75rem)] mb-[clamp(0.5rem,1.5vw,0.75rem)]">
                    <div className="p-[clamp(0.375rem,1vw,0.5rem)] bg-yellow-500/10 rounded-[clamp(0.375rem,1vw,0.5rem)] text-yellow-500 flex-shrink-0">
                        <Lightbulb className="w-[clamp(1rem,2.5vw,1.25rem)] h-[clamp(1rem,2.5vw,1.25rem)]" />
                    </div>
                    <h3 className="text-white font-bold text-[clamp(0.7rem,1.75vw,0.875rem)] flex items-center gap-[clamp(0.375rem,1vw,0.5rem)]">
                        Did You Know?
                        <Sparkles className="w-[clamp(0.625rem,1.5vw,0.75rem)] h-[clamp(0.625rem,1.5vw,0.75rem)] text-yellow-500/50" />
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
                            <Sparkles className="w-[clamp(0.375rem,1vw,0.5rem)] h-[clamp(0.375rem,1vw,0.5rem)]" />
                            AI Generated Fact
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DidYouKnow;
