export interface StrategicPoint {
    id: number;
    title: string;
    subtitle?: string;
    points: string[];
    icon?: string;
    specialComponent?: 'tech-stack' | 'valuation';
}

export const strategicPoints: StrategicPoint[] = [
    {
        id: 1,
        title: "Formal Shariah Approval from World-Renowned Scholars (SAHL)",
        subtitle: "Regulatory Moat",
        icon: "Scroll",
        points: [
            "Verified by a Shariah Supervisory Board with regional credibility.",
            "First and only Shariah-compliant prediction market globally.",
            "Creates an immediate regulatory moat across GCC, especially KSA.",
            "Zero credible competition in the only market that matters."
        ]
    },
    {
        id: 2,
        title: "ShareMatch, Today: The Tech Stack",
        subtitle: "Current Status & Architecture",
        icon: "Cpu",
        points: [
            "A stable, high-frequency trading platform built on modern rails."
        ],
        specialComponent: 'tech-stack'
    },
    {
        id: 3,
        title: "Saudi Royal Family Shareholder, Delivering the First 1,000 VIPs",
        subtitle: "Unmatched Market Access",
        icon: "Crown",
        points: [
            "Direct cap table involvement from the House of Saud.",
            "Pre-committed pipeline of the first 1,000 high-value VIP accounts.",
            "Removes the single biggest risk in any marketplace: initial liquidity and user acquisition."
        ]
    },
    {
        id: 4,
        title: "Patent Pending on Core Matching and Tokenisation Technology",
        subtitle: "Defensible IP",
        icon: "FileBadge",
        points: [
            "Protects the underlying economic engine and settlement layer.",
            "Raises defensibility well beyond simple 'sports trading'.",
            "Gives institutional investors clarity on long-term IP value."
        ]
    },
    {
        id: 5,
        title: "World-First: All Trades Written to Proprietary Smart Contracts",
        subtitle: "Web3 Infrastructure",
        icon: "Blocks",
        points: [
            "Entire market runs on fully-owned smart contract rails.",
            "Immutable audit trail, provable ownership, instant settlement logic.",
            "A technical moat that makes Web2 incumbents obsolete."
        ]
    },
    {
        id: 6,
        title: "Custody Partner: OKX Institutional",
        subtitle: "Bank-Grade Security",
        icon: "Vault",
        points: [
            "One of the most secure and reputable global custodians.",
            "Infrastructure ready for eight and nine-figure AUM flows.",
            "Removes counterparty risk concerns for VIPs and regulators."
        ]
    },
    {
        id: 7,
        title: "Liquidity Provision from Atlascope",
        subtitle: "Institutional Liquidity",
        icon: "AreaChart",
        points: [
            "Largest iGaming Broker Worldwide guarantees depth of markets from day one.",
            "Allows tight spreads, fast fills, and institutional-grade execution quality.",
            "Instantly elevates ShareMatch from 'startup' to 'professional venue'."
        ]
    },
    {
        id: 8,
        title: "Regulatory Architecture: Two Compliance Entities Fully Owned",
        subtitle: "Global Access",
        icon: "Globe2",
        points: [
            "Canada: MSB-licensed subsidiary handles fiat banking rails.",
            "Poland: CASP-licensed subsidiary covers crypto operations.",
            "Combined structure gives ShareMatch operational freedom across all on/off-ramps.",
            "Removes a typical 18 to 24 month regulatory build window."
        ]
    },
    {
        id: 9,
        title: "KYC and OTP Infrastructure in Place",
        subtitle: "Enterprise Onboarding",
        icon: "ScanFace",
        points: [
            "Sumsub for global identity verification.",
            "My Inbox Media for OTP and 2FA delivery.",
            "Enterprise-grade onboarding ready for mass VIP throughput."
        ]
    },
    {
        id: 10,
        title: "Self-Funded to Date, Now Raising £4M at £64M Post",
        subtitle: "The Ask",
        icon: "TrendingUp",
        points: [
            "Founders have funded product, compliance, and market entry themselves.",
            "Zero external capital until a high-confidence inflection point.",
            "Raise is for global scale, not survival."
        ],
        specialComponent: 'valuation'
    },
    {
        id: 11,
        title: "Institutional Data Room Live",
        subtitle: "Operational Readiness",
        icon: "FolderLock",
        points: [
            "Full institutional-grade data room already assembled.",
            "Includes audited-style financial projections, regulatory documents, tech architecture, and detailed unit economics.",
            "Shows we are operating like a Series A company at seed stage."
        ]
    },
    {
        id: 12,
        title: "Capital Roadmap",
        subtitle: "Forward Outlook",
        icon: "Milestone",
        points: [
            "Seed Round: December 2025 (Current). Executing now to finalize compliance and launch.",
            "Series A: February 2026. Scheduled rapidly post-launch to fuel KSA expansion.",
            "Series B: May 2026. Targeted for global institutional scaling once volume critical mass is hit."
        ]
    }
];
