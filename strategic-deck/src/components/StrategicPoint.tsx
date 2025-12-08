import React from 'react';
import { motion } from 'framer-motion';
import type { StrategicPoint as PointType } from '../data/strategicPoints';
import TechStackViz from './TechStackViz';
import ValuationSection from './ValuationSection';
import { Check, Scroll, Cpu, Crown, FileBadge, Blocks, Vault, AreaChart as ArearChart, Globe2, ScanFace, TrendingUp, FolderLock, Milestone } from 'lucide-react';

// Map icon strings to components
const IconMap: { [key: string]: React.ElementType } = {
    Scroll, Cpu, Crown, FileBadge, Blocks, Vault, ArearChart, Globe2, ScanFace, TrendingUp, FolderLock, Milestone
};

interface Props {
    data: PointType;
    index: number;
}

const StrategicPoint: React.FC<Props> = ({ data, index }) => {
    const IconComponent = data.icon ? IconMap[data.icon] : null;

    return (
        <motion.section
            className="py-16 px-6 relative"
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
        >
            {/* Connector Line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-brand-emerald500/0 via-brand-emerald500/20 to-brand-emerald500/0 -translate-x-1/2 hidden md:block" />

            {/* Number Badge */}
            <div className="relative mb-6 md:mb-0 md:absolute md:left-1/2 md:top-[4rem] w-12 h-12 rounded-full bg-gray-900 border-2 border-brand-emerald500 text-brand-emerald500 flex items-center justify-center font-sans text-xl font-bold md:-translate-x-1/2 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10 pb-1 leading-none">
                {data.id}
            </div>

            <div className={`max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:grid-flow-col-dense' : ''}`}>

                {/* Content Side */}
                <div className={`space-y-6 ${index % 2 === 1 ? 'md:col-start-2' : ''}`}>
                    <div>
                        <span className="text-brand-amber400 tracking-widest uppercase text-sm font-bold">{data.subtitle}</span>
                        <h2 className="text-4xl md:text-5xl font-sans font-bold mt-2 text-white leading-tight">
                            {data.title}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {data.points.map((point, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 + 0.3 }}
                                className="flex items-start gap-3"
                            >
                                <div className="mt-1.5 p-0.5 rounded-full bg-brand-emerald500/20 text-brand-emerald500 flex-shrink-0">
                                    <Check className="w-4 h-4" />
                                </div>
                                <p className="text-lg text-gray-300 leading-relaxed">{point}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Visual/Special Component Side */}
                <div className={`relative ${index % 2 === 1 ? 'md:col-start-1' : ''}`}>
                    {data.specialComponent === 'tech-stack' ? (
                        <TechStackViz />
                    ) : data.specialComponent === 'valuation' ? (
                        <ValuationSection />
                    ) : (
                        // Improved Visual Placeholder using Icons
                        <div className="aspect-video rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-8 flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-brand-emerald500/5 group-hover:bg-brand-emerald500/10 transition-colors" />

                            {/* Central Icon */}
                            {IconComponent ? (
                                <IconComponent className="w-32 h-32 text-gray-700 group-hover:text-brand-emerald500/20 transition-colors duration-500" strokeWidth={1} />
                            ) : (
                                <h3 className="text-6xl font-sans text-gray-700 font-bold opacity-30 select-none group-hover:scale-110 transition-transform duration-700">
                                    {String(data.id).padStart(2, '0')}
                                </h3>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </motion.section >
    );
};

export default StrategicPoint;
