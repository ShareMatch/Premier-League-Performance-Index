import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, TrendingUp, ShieldCheck, Crown } from 'lucide-react';

const ValuationSection: React.FC = () => {
    const reasons = [
        { title: "Category Monopoly", desc: "Blockchain-based trading venue.", icon: Crown },
        { title: "Regulatory Certainty", desc: "Operates under strict Shariah-compliant classification.", icon: ShieldCheck },
        { title: "Pre-sold Demand", desc: "1,000 VIPs on day one.", icon: TrendingUp },
        { title: "Institutional Infra", desc: "Custody, KYC, Liquidity already built.", icon: ShieldCheck },
        { title: "Defendable IP", desc: "Patent and proprietary smart contracts.", icon: ShieldCheck },
        { title: "Zero Red Flags", desc: "KSA, GCC, and Canada alignment.", icon: CheckCircle2 },
        { title: "Path to Unicorn", desc: "The CME of sports outcomes for the Middle East.", icon: TrendingUp },
    ];

    return (
        <div className="mt-8">
            <h3 className="text-2xl font-display text-brand-accent mb-6">Why £64M Post-Money Valuation Is Justified</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reasons.map((reason, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        viewport={{ once: true }}
                        className="p-4 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-brand-accent/30 transition-colors"
                    >
                        <div className="flex items-start gap-3">
                            <reason.icon className="w-5 h-5 text-brand-accent mt-1 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-gray-100">{reason.title}</h4>
                                <p className="text-sm text-gray-400 mt-1">{reason.desc}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ValuationSection;
