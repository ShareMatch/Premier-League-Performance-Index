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
        <div className={`bg-gradient-to-br from-[#0B1221] to-[#0f192b] border border-gray-800 rounded-xl p-5 relative overflow-hidden group ${className}`}>
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors duration-500"></div>

            <div className="flex items-start gap-3 relative z-10">
                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 flex-shrink-0">
                    <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                        Did You Know?
                        <Sparkles className="w-3 h-3 text-yellow-500/50" />
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
                            <Sparkles className="w-2 h-2" />
                            AI Generated Fact
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DidYouKnow;
