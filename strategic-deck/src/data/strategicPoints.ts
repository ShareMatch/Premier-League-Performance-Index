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
            "World's first fully Shariah-compliant digital markets platform, built on an asset-backed framework.",
            "Creates an immediate regulatory moat across GCC, especially KSA.",
            "Zero credible competition in the only market that matters."
        ]
    },
    {
        id: 2,
        title: "ShareMatch, Today: The Tech Stack",
        subtitle: "Enterprise Grade Architecture",
        icon: "Cpu",
        points: [
            "A stable, high-frequency exchange engine built on modern rails."
        ],
        specialComponent: 'tech-stack'
    },
    {
        id: 3,
        title: "Saudi Royal Family Shareholder: Strategic Access to First 1,000 VIPs",
        subtitle: "Unmatched Market Access",
        icon: "Crown",
        points: [
            "Direct cap table involvement from the House of Saud.",
            "Secured pipeline of the first 1,000 high-value VIP accounts.",
            "Eliminates the 'cold start' liquidity risk inherent in new marketplaces."
        ]
    },
    {
        id: 4,
        title: "Patent Pending on Core Matching and Tokenisation Technology",
        subtitle: "Defensible IP",
        icon: "FileBadge",
        points: [
            "Protects the underlying economic engine and settlement layer.",
            "Fundamentally elevates the proposition to a 'proprietary asset class'.",
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
            "A structural moat that renders Web2 legacy architectures obsolete."
        ]
    },
    {
        id: 6,
        title: "Custody Partner: OKX Institutional",
        subtitle: "Bank-Grade Security",
        icon: "Vault",
        points: [
            "Partnered with one of the most secure global custodians.",
            "Infrastructure ready for eight and nine-figure AUM flows.",
            "Eliminates counterparty risk concerns for VIPs and regulators."
        ]
    },
    {
        id: 7,
        title: "Liquidity Provision from Atlascope",
        subtitle: "Institutional Liquidity",
        icon: "AreaChart",
        points: [
            "Global iGaming Broker guarantees depth of markets from day one.",
            "Ensures tight spreads, fast fills, and institutional-grade execution.",
            "Instantly elevates ShareMatch to a professional trading venue."
        ]
    },
    {
        id: 8,
        title: "Regulatory Architecture: Two Compliance Entities Fully Owned",
        subtitle: "Global Access",
        icon: "Globe2",
        points: [
            "Canada: MSB-licensed subsidiary handles fiat banking rails.",
            "Poland: VASP-licensed subsidiary covers crypto operations.",
            "Dual structure grants operational independence across all payment corridors.",
            "Bypasses the typical 18-24 month regulatory lead time."
        ]
    },
    {
        id: 9,
        title: "KYC and OTP Infrastructure in Place",
        subtitle: "Enterprise Onboarding",
        icon: "ScanFace",
        points: [
            "Sumsub integration for global identity verification.",
            "My Inbox Media for enterprise-grade OTP and 2FA delivery.",
            "Onboarding flow stress-tested for mass VIP throughput."
        ]
    },
    {
        id: 10,
        title: "Capital Strategy: Raising £4M at £64M Post-Money",
        subtitle: "Investment Opportunity",
        icon: "TrendingUp",
        points: [
            "Founders have self-funded product, compliance, and market entry.",
            "Zero external dilution until this high-confidence inflection point.",
            "Capital is deployed strictly for global scale, not validation."
        ],
        specialComponent: 'valuation'
    },
    {
        id: 11,
        title: "Institutional Data Room Live",
        subtitle: "Due Diligence Ready",
        icon: "FolderLock",
        points: [
            "Comprehensive institutional data room fully assembled.",
            "Includes audited financial models, regulatory legal opinions, and tech architecture.",
            "Demonstrates Series A operational maturity at Seed stage."
        ]
    },
    {
        id: 12,
        title: "Capital Roadmap",
        subtitle: "Forward Outlook",
        icon: "Milestone",
        points: [
            "Seed Round: December 2025 (Current). Finalizing launch logistics.",
            "Series A: February 2026. Acceleration capital to capture KSA market share.",
            "Series B: May 2026. Global expansion once critical liquidity mass is achieved."
        ]
    }
];
