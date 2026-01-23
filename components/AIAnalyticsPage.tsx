import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, AlertTriangle, Send, ChevronDown, User } from 'lucide-react';
import { FaCheck } from 'react-icons/fa6';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Team } from '../types';
import { supabase } from '../lib/supabase';

interface AIAnalyticsPageProps {
    teams: Team[];
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    market?: string;
    timestamp: Date;
}

// Market labels for display
const MARKET_LABELS: Record<string, string> = {
    EPL: 'Premier League',
    SPL: 'Saudi Pro League',
    UCL: 'Champions League',
    F1: 'Formula 1',
    NBA: 'NBA',
    NFL: 'NFL',
    T20: 'T20 World Cup',
    ISL: 'Indonesia Super League',
};

// Category configuration with their markets
const CATEGORIES = [
    {
        id: 'all',
        label: 'All Index Tokens',
        markets: ['EPL', 'SPL', 'UCL', 'ISL', 'F1', 'NBA', 'NFL', 'T20'],
    },
    {
        id: 'football',
        label: 'Football',
        markets: ['EPL', 'SPL', 'UCL', 'ISL'],
    },
    {
        id: 'motorsport',
        label: 'Motorsport',
        markets: ['F1'],
    },
    {
        id: 'basketball',
        label: 'Basketball',
        markets: ['NBA'],
    },
    {
        id: 'american_football',
        label: 'American Football',
        markets: ['NFL'],
    },
    {
        id: 'cricket',
        label: 'Cricket',
        markets: ['T20'],
    },
];

// Suggested questions for initial state
const SUGGESTED_QUESTIONS = [
    { text: 'Which EPL team is most undervalued right now?', market: 'EPL' },
    { text: 'Analyze the top F1 performers this season', market: 'F1' },
    { text: 'Compare the Saudi Pro League top 5 teams', market: 'SPL' },
    { text: 'Champions League quarter-finals preview', market: 'UCL' },
];

const AIAnalyticsPage: React.FC<AIAnalyticsPageProps> = ({ teams }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('football');
    const [selectedMarket, setSelectedMarket] = useState('EPL');
    const [isLoading, setIsLoading] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasStartedChat = messages.length > 0;

    // Get current category config
    const currentCategory = useMemo(() => {
        return CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];
    }, [selectedCategory]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Update selected market when category changes
    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategory(categoryId);
        const category = CATEGORIES.find(c => c.id === categoryId);
        if (category && category.markets.length > 0) {
            setSelectedMarket(category.markets[0]);
        }
        setOpenDropdown(null);
    };

    const handleMarketSelect = (marketId: string) => {
        setSelectedMarket(marketId);
        setOpenDropdown(null);
    };

    const handleSendMessage = async (messageText?: string) => {
        const text = messageText || inputValue.trim();
        if (!text || isLoading) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: text,
            market: selectedMarket,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('ai-analytics', {
                body: {
                    teams: teams.filter(t => t.market === selectedMarket),
                    selectedMarket,
                    userQuery: text,
                }
            });

            if (error) throw error;

            const assistantMessage: ChatMessage = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: data?.analysis || 'Analysis currently unavailable. Please try again.',
                market: selectedMarket,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err: any) {
            console.error(err);
            const errorMessage: ChatMessage = {
                id: `error_${Date.now()}`,
                role: 'assistant',
                content: 'Unable to generate analysis at this time. Please try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleSuggestedQuestion = (question: typeof SUGGESTED_QUESTIONS[0]) => {
        // Update market if different
        const category = CATEGORIES.find(c => c.markets.includes(question.market));
        if (category) {
            setSelectedCategory(category.id);
            setSelectedMarket(question.market);
        }
        // Send the question
        handleSendMessage(question.text);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
            {/* Header - Simplified */}
            <div className="flex-shrink-0 p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur-xl">
                <div className="flex items-center gap-3 max-w-4xl mx-auto">
                    <div className="w-10 h-10 rounded-full bg-brand-emerald500/10 flex items-center justify-center ring-1 ring-brand-emerald500/20">
                        <Sparkles className="w-5 h-5 text-brand-emerald500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">AI Analytics</h1>
                        <p className="text-xs text-gray-500">Powered by real-time market data</p>
                    </div>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="max-w-4xl mx-auto p-4 pb-0">
                    {!hasStartedChat ? (
                        /* Initial Welcome State */
                        <div className="flex flex-col items-center justify-center min-h-[50vh] py-8">
                            <div className="inline-flex items-center justify-center p-4 bg-brand-emerald500/10 rounded-full mb-6 ring-1 ring-brand-emerald500/20">
                                <Sparkles className="w-10 h-10 text-brand-emerald500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 text-center">What would you like to analyze?</h2>
                            <p className="text-gray-400 text-sm mb-8 text-center max-w-md">
                                Ask me anything about sports markets, team performance, or player stats.
                            </p>

                            {/* Suggested Questions Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                                {SUGGESTED_QUESTIONS.map((question, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSuggestedQuestion(question)}
                                        className="group p-4 text-left bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-brand-emerald500/30 rounded-xl transition-all duration-200"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-emerald500/10 flex items-center justify-center group-hover:bg-brand-emerald500/20 transition-colors">
                                                <Sparkles className="w-4 h-4 text-brand-emerald500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-300 group-hover:text-white transition-colors leading-tight">
                                                    {question.text}
                                                </p>
                                                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-gray-700/50 text-gray-500 rounded-full uppercase tracking-wider">
                                                    {question.market}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Chat Messages */
                        <div className="space-y-4 pb-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                >
                                    {message.role === 'assistant' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-emerald500/20 flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-brand-emerald500" />
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                            ? 'bg-brand-emerald500 text-white rounded-tr-sm'
                                            : 'bg-gray-800/80 text-gray-200 rounded-tl-sm border border-gray-700/50'
                                            }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mb-3 border-b border-gray-700 pb-2" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-brand-emerald500 mt-4 mb-2" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-white mt-3 mb-1.5" {...props} />,
                                                    p: ({ node, ...props }) => <p className="text-sm text-gray-300 leading-relaxed mb-2" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 space-y-1 mb-3 text-sm text-gray-300" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 space-y-1 mb-3 text-sm text-gray-300" {...props} />,
                                                    li: ({ node, ...props }) => <li className="pl-1 text-sm" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="text-white font-semibold" {...props} />,
                                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-brand-emerald500 pl-3 italic text-sm text-gray-400 my-3 bg-gray-900/50 p-2 rounded-r-lg" {...props} />,
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        ) : (
                                            <p className="text-sm leading-relaxed">{message.content}</p>
                                        )}
                                        {message.market && (
                                            <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${message.role === 'user'
                                                ? 'bg-white/20 text-white/70'
                                                : 'bg-gray-700/50 text-gray-500'
                                                }`}>
                                                {message.market}
                                            </span>
                                        )}
                                    </div>

                                    {message.role === 'user' && (
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                                            <User className="w-4 h-4 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-emerald500/20 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-brand-emerald500" />
                                    </div>
                                    <div className="bg-gray-800/80 px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-700/50">
                                        <div className="flex gap-1.5">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input Container - Sticky Bottom */}
            <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/95 backdrop-blur-xl p-4">
                <div className="max-w-4xl mx-auto space-y-3">
                    {/* Category Pills with Dropdown */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {CATEGORIES.map((category) => {
                            const isActive = selectedCategory === category.id;
                            const hasMultipleMarkets = category.markets.length > 1;

                            if (!hasMultipleMarkets) {
                                // Simple pill without dropdown
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryChange(category.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${isActive
                                            ? 'bg-brand-emerald500 text-white border-brand-emerald500 shadow-lg shadow-brand-emerald500/20'
                                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
                                            }`}
                                    >
                                        {category.label}
                                    </button>
                                );
                            }

                            // Pill with dropdown for multiple markets
                            return (
                                <DropdownMenu.Root
                                    key={category.id}
                                    open={openDropdown === category.id}
                                    onOpenChange={(open) => setOpenDropdown(open ? category.id : null)}
                                >
                                    <DropdownMenu.Trigger asChild>
                                        <button
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${isActive
                                                ? 'bg-brand-emerald500 text-white border-brand-emerald500 shadow-lg shadow-brand-emerald500/20'
                                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
                                                }`}
                                        >
                                            <span>{category.label}</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === category.id ? 'rotate-180' : ''}`} />
                                        </button>
                                    </DropdownMenu.Trigger>

                                    <DropdownMenu.Portal>
                                        <DropdownMenu.Content
                                            className="z-50 min-w-[180px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top"
                                            sideOffset={8}
                                            align="start"
                                        >
                                            {/* All option for the category */}
                                            <DropdownMenu.Item
                                                onClick={() => {
                                                    handleCategoryChange(category.id);
                                                    handleMarketSelect('ALL');
                                                }}
                                                className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors outline-none mb-0.5 ${selectedMarket === 'ALL' && isActive
                                                    ? 'bg-brand-emerald500 text-white'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                <span>All {category.label}</span>
                                                {selectedMarket === 'ALL' && isActive && <FaCheck className="w-3 h-3" />}
                                            </DropdownMenu.Item>
                                            <div className="h-px bg-gray-700/50 my-1" />
                                            {category.markets.map((marketId) => {
                                                const isSelected = selectedMarket === marketId && isActive;
                                                return (
                                                    <DropdownMenu.Item
                                                        key={marketId}
                                                        onClick={() => {
                                                            handleCategoryChange(category.id);
                                                            handleMarketSelect(marketId);
                                                        }}
                                                        className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors outline-none mb-0.5 ${isSelected
                                                            ? 'bg-brand-emerald500 text-white'
                                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <span>{MARKET_LABELS[marketId] || marketId}</span>
                                                        {isSelected && <FaCheck className="w-3 h-3" />}
                                                    </DropdownMenu.Item>
                                                );
                                            })}
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                            );
                        })}
                    </div>

                    {/* Input Field */}
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Ask about ${selectedMarket === 'ALL' ? currentCategory.label : (MARKET_LABELS[selectedMarket] || selectedMarket)}...`}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-emerald500/50 focus:border-brand-emerald500 disabled:opacity-50 transition-all"
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || isLoading}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-brand-emerald500 hover:bg-brand-emerald500/90 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-emerald500/20"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {/* Disclaimer */}
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-600">
                        <AlertTriangle className="w-3 h-3 text-amber-500/50" />
                        <span>AI-generated analysis. Not financial advice.</span>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AIAnalyticsPage;
