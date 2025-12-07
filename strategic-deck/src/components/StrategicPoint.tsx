import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { StrategicPoint as PointType } from '../data/strategicPoints';
import TechStackViz from './TechStackViz';
import ValuationSection from './ValuationSection';
import { Check } from 'lucide-react';

interface Props {
    data: PointType;
    index: number;
}

const StrategicPoint: React.FC<Props> = ({ data, index }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "center center"]
    });

    const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
    const x = useTransform(scrollYProgress, [0, 0.5], [index % 2 === 0 ? -50 : 50, 0]);

    return (
        <motion.section
            ref={ref}
            style={{ opacity, x }}
            className="min-h-[80vh] flex flex-col justify-center py-20 px-6 relative"
        >
            {/* Connector Line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-brand/0 via-brand/20 to-brand/0 -translate-x-1/2 hidden md:block" />

            {/* Number Badge */}
            <div className="absolute left-6 md:left-1/2 top-10 w-12 h-12 rounded-full bg-gray-900 border-2 border-brand text-brand flex items-center justify-center font-display text-xl font-bold -translate-x-1/2 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10">
                {data.id}
            </div>

            <div className={`max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:grid-flow-col-dense' : ''}`}>

                {/* Content Side */}
                <div className={`space-y-6 ${index % 2 === 1 ? 'md:col-start-2' : ''}`}>
                    <div>
                        <span className="text-brand-accent tracking-widest uppercase text-sm font-bold">{data.subtitle}</span>
                        <h2 className="text-4xl md:text-5xl font-display font-bold mt-2 text-white leading-tight">
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
                                <div className="mt-1.5 p-0.5 rounded-full bg-brand/20 text-brand">
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
                        // Default visual placeholder (could be replaced with specific icons later if desired)
                        <div className="aspect-video rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-8 flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-brand/5 group-hover:bg-brand/10 transition-colors" />
                            <h3 className="text-6xl font-display text-gray-700 font-bold opacity-30 select-none group-hover:scale-110 transition-transform duration-700">
                                {String(data.id).padStart(2, '0')}
                            </h3>
                        </div>
                    )}
                </div>

            </div>
        </motion.section>
    );
};

export default StrategicPoint;
