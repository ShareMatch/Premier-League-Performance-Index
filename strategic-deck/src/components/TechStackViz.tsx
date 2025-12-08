import React from 'react';
import { motion } from 'framer-motion';
import { Database, Monitor, BrainCircuit, Activity, Zap, Server } from 'lucide-react';

const TechStackViz: React.FC = () => {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="w-full max-w-4xl mx-auto py-8">
            <motion.div
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {/* Frontend */}
                <motion.div variants={item} className="bg-gray-800/50 p-5 rounded-xl border border-brand-emerald900/50 hover:border-brand-emerald500/50 transition-colors h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-sans font-semibold text-white">Frontend</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-400 flex-1">
                        <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> React 19 (Vite)</li>
                        <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> TypeScript</li>
                        <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Tailwind CSS</li>
                        <li className="flex items-start gap-2"><Zap className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Lucide Icons</li>
                    </ul>
                </motion.div>

                {/* Backend */}
                <motion.div variants={item} className="bg-gray-800/50 p-5 rounded-xl border border-brand-emerald900/50 hover:border-brand-emerald500/50 transition-colors h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-brand-emerald500/10 rounded-lg text-brand-emerald500 shrink-0">
                            <Database className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-sans font-semibold text-white">Backend</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-400 flex-1">
                        <li className="flex items-start gap-2"><Server className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Supabase Platform</li>
                        <li className="flex items-start gap-2"><Server className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Realtime Subs</li>
                        <li className="flex items-start gap-2"><Server className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Edge Functions</li>
                        <li className="flex items-start gap-2"><Server className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Auth & RLS</li>
                    </ul>
                </motion.div>

                {/* AI & Data */}
                <motion.div variants={item} className="bg-gray-800/50 p-5 rounded-xl border border-brand-emerald900/50 hover:border-brand-emerald500/50 transition-colors h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-violet-500/10 rounded-lg text-violet-400 shrink-0">
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-sans font-semibold text-white">AI Engine</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-400 flex-1">
                        <li className="flex items-start gap-2"><Activity className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Google Gemini Pro</li>
                        <li className="flex items-start gap-2"><Activity className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Live Analysis</li>
                        <li className="flex items-start gap-2"><Activity className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Context-Aware</li>
                        <li className="flex items-start gap-2"><Activity className="w-4 h-4 text-brand-emerald500 mt-0.5 shrink-0" /> Multi-Sport Seed</li>
                    </ul>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default TechStackViz;
