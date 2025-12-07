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
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
                {/* Frontend */}
                <motion.div variants={item} className="bg-gray-800/50 p-6 rounded-xl border border-brand-dark/50 hover:border-brand/50 transition-colors h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                            <Monitor className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-display font-semibold text-white">Frontend</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-400 flex-1">
                        <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-brand" /> React 19 (Vite)</li>
                        <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-brand" /> TypeScript</li>
                        <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-brand" /> Tailwind CSS (Emerald/Amber)</li>
                        <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-brand" /> Lucide Icons</li>
                    </ul>
                </motion.div>

                {/* Backend */}
                <motion.div variants={item} className="bg-gray-800/50 p-6 rounded-xl border border-brand-dark/50 hover:border-brand/50 transition-colors h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-brand/10 rounded-lg text-brand">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-display font-semibold text-white">Backend</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-400 flex-1">
                        <li className="flex items-center gap-2"><Server className="w-4 h-4 text-brand" /> Supabase Platform</li>
                        <li className="flex items-center gap-2"><Server className="w-4 h-4 text-brand" /> Realtime Subscriptions</li>
                        <li className="flex items-center gap-2"><Server className="w-4 h-4 text-brand" /> Edge Functions</li>
                        <li className="flex items-center gap-2"><Server className="w-4 h-4 text-brand" /> Auth & RLS Security</li>
                    </ul>
                </motion.div>

                {/* AI & Data */}
                <motion.div variants={item} className="bg-gray-800/50 p-6 rounded-xl border border-brand-dark/50 hover:border-brand/50 transition-colors h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-lg text-brand-accent">
                            <BrainCircuit className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-display font-semibold text-white">AI Engine</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-400 flex-1">
                        <li className="flex items-center gap-2"><Activity className="w-4 h-4 text-brand" /> Google Gemini Pro</li>
                        <li className="flex items-center gap-2"><Activity className="w-4 h-4 text-brand" /> Live Performance Analysis</li>
                        <li className="flex items-center gap-2"><Activity className="w-4 h-4 text-brand" /> Context-Aware Analytics</li>
                        <li className="flex items-center gap-2"><Activity className="w-4 h-4 text-brand" /> Multi-Sport Seeding</li>
                    </ul>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default TechStackViz;
