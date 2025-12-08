import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const HeroSection: React.FC = () => {
    return (
        <section className="h-screen relative flex flex-col items-center justify-center overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-dark/20 via-gray-950 to-gray-950" />
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

            <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="mb-8 flex justify-center">
                        <img src="/logo-wordmark-green.png" alt="ShareMatch" className="h-12 md:h-16 rounded-lg shadow-lg shadow-brand/20" />
                    </div>

                    <span className="inline-block py-1 px-3 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-semibold tracking-wide uppercase mb-6">
                        Internal Document
                    </span>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-white mb-6 leading-tight">
                        The Strategic <br />
                        <span className="text-gradient">Position</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
                        Twelve pillars defining our trajectory to a <span className="text-brand-accent font-medium">£64M valuation</span> and beyond.
                    </p>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500"
            >
                <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                    <ChevronDown className="w-6 h-6" />
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HeroSection;
