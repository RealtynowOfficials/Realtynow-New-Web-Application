import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Search,
  FileText,
  Languages,
  TrendingUp,
  UserCheck,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { callAI } from '../../lib/ai';
import { VoiceSearchButton } from '../../components/voice-search-button';
import { useLanguageContext } from '../../lib/i18n/language-context';

export const AIHubPage: React.FC = () => {
  const { t } = useLanguageContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const defaultTab = searchParams.get('tab') as 'assistant' | 'smart-search' | 'recommendations' | 'generator' | 'lead-summary' | 'translation' | 'market';
  
  const [activeTab, setActiveTab] = useState<
    'assistant' | 'smart-search' | 'recommendations' | 'generator' | 'lead-summary' | 'translation' | 'market'
  >(defaultTab || 'assistant');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  /** Renders AI text with [label](url) links as clickable elements. */
  const renderAIText = (text: string) => {
    const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = LINK_RE.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const [, label, href] = match;
      const isInternal = href.startsWith('/');
      parts.push(
        isInternal ? (
          <Link
            key={key++}
            to={href}
            className="text-red-400 underline hover:text-red-300 font-medium transition-colors"
          >
            {label}
          </Link>
        ) : (
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 underline hover:text-red-300 font-medium transition-colors"
          >
            {label}
          </a>
        ),
      );
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    // Split on newlines and re-insert <br /> so whitespace-pre-line still works
    const withBreaks: React.ReactNode[] = [];
    parts.forEach((part, idx) => {
      if (typeof part === 'string') {
        const lines = part.split('\n');
        lines.forEach((line, li) => {
          withBreaks.push(line);
          if (li < lines.length - 1) withBreaks.push(<br key={`br-${idx}-${li}`} />);
        });
      } else {
        withBreaks.push(part);
      }
    });
    return <>{withBreaks}</>;
  };

  // Chat State
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Hello! I am your RealtyNow AI Property Advisor. Ask me anything about property prices, buying vs renting in India, home loans, or top localities!',
    },
  ]);

  // Smart Search State
  const [searchQuery, setSearchQuery] = useState<string>(
    'Looking for a 3 BHK luxury apartment in Worli Mumbai under 2.5 Cr with swimming pool',
  );
  const [smartSearchAnswer, setSmartSearchAnswer] = useState<string>('');

  // Generator State
  const [genTitle, setGenTitle] = useState<string>('Luxury 3BHK Apartment');
  const [genCity, setGenCity] = useState<string>('Mumbai');
  const [genLocality, setGenLocality] = useState<string>('Worli');
  const [genType, setGenType] = useState<string>('Residential Apartment');
  const [genBedrooms, setGenBedrooms] = useState<number>(3);
  const [genOutput, setGenOutput] = useState<{ title?: string; description?: string; seo?: string } | null>(null);

  // Lead Summary State
  const [leadText, setLeadText] = useState<string>(
    'Hi, I am Rahul Verma interested in buying a 3BHK in HSR Layout Bengaluru. My budget is around 1.2 Crore. Looking for ready-to-move properties with bank pre-approval ready.',
  );
  const [leadSummaryOutput, setLeadSummaryOutput] = useState<string>('');

  // Translation State
  const [transText, setTransText] = useState<string>(
    'Spacious 3 BHK sea-facing apartment in Worli with modern amenities, gated security, and covered parking.',
  );
  const [transLang, setTransLang] = useState<string>('Hindi');
  const [transOutput, setTransOutput] = useState<string>('');

  // Market Insights State
  const [marketCity, setMarketCity] = useState<string>('Bengaluru');
  const [marketLocality, setMarketLocality] = useState<string>('HSR Layout');
  const [marketOutput, setMarketOutput] = useState<string>('');

  // Recommendation State
  const [recInput, setRecInput] = useState<string>(
    '2BHK apartment in IT corridors under 80 Lakhs with metro connectivity',
  );
  const [recOutput, setRecOutput] = useState<string>('');

  // Handlers
  const handleChatSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const userText = chatInput.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setLoading(true);

    try {
      const res = await callAI('chat', { message: userText });
      setMessages((prev) => [...prev, { role: 'assistant', text: res }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, I encountered an issue. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartSearch = async () => {
    if (!searchQuery.trim() || loading) return;

    setLoading(true);
    setSmartSearchAnswer('');
    try {
      const res = await callAI('chat', { message: searchQuery });
      setSmartSearchAnswer(res);
    } catch {
      setSmartSearchAnswer('Sorry, I could not search for properties right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCopy = async () => {
    setLoading(true);
    try {
      const desc = await callAI('description', {
        title: genTitle,
        city: genCity,
        locality: genLocality,
        type: genType,
        bedrooms: genBedrooms,
      });
      const title = await callAI('title', {
        city: genCity,
        locality: genLocality,
        type: genType,
        bedrooms: genBedrooms,
        purpose: 'Sale',
      });
      const seo = await callAI('seo', {
        title: genTitle,
        city: genCity,
        locality: genLocality,
      });
      setGenOutput({ title, description: desc, seo });
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeLead = async () => {
    setLoading(true);
    try {
      const res = await callAI('lead_summary', { message: leadText });
      setLeadSummaryOutput(res);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    setLoading(true);
    try {
      const res = await callAI('translate', { text: transText, language: transLang });
      setTransOutput(res);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketInsights = async () => {
    setLoading(true);
    try {
      const res = await callAI('market_insights', { city: marketCity, locality: marketLocality });
      setMarketOutput(res);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendations = async () => {
    setLoading(true);
    try {
      const res = await callAI('recommend', { message: recInput });
      setRecOutput(res);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-red-400" /> {t('ai.phase1', 'Phase 1 — AI Foundation Suite')}
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            RealtyNow{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-400">
              {t('ai.subtitle', 'AI Property Advisor')}
            </span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            {t(
              'ai.description',
              'Powered by OpenRouter AI (GPT-4o Mini). Search using voice, generate property copy, summarize customer leads, and analyze locality price trends in real-time.',
            )}
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg w-fit mx-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />{' '}
            {t('ai.activeStatus', 'Active & Connected to OpenRouter AI Engine')}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
          {[
            { id: 'assistant', label: 'AI Assistant', icon: Bot },
            { id: 'smart-search', label: 'Smart Search', icon: Search },
            { id: 'recommendations', label: 'Recommendations', icon: Zap },
            { id: 'generator', label: 'Copy Generator', icon: FileText },
            { id: 'lead-summary', label: 'Lead Summary', icon: UserCheck },
            { id: 'translation', label: 'AI Translation', icon: Languages },
            { id: 'market', label: 'Market Insights', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as typeof activeTab);
                  setSearchParams({ tab: tab.id });
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                  active
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: AI Assistant Chat */}
        {activeTab === 'assistant' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-red-500" /> Interactive AI Real Estate Assistant
              </h3>
              <span className="text-xs text-slate-400">Ask in English or Voice</span>
            </div>

            <div className="h-80 overflow-y-auto space-y-4 pr-2">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-md p-4 rounded-2xl text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-red-600 text-white rounded-br-none'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                    }`}
                  >
                    {renderAIText(m.text)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" /> Thinking...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about properties in Mumbai, buying guide, home loans..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
              <VoiceSearchButton onResult={(text) => setChatInput(text)} />
              <button
                type="submit"
                disabled={loading || !chatInput.trim()}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl transition-all text-sm flex items-center gap-1.5"
              >
                Send <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: AI Property Search */}
        {activeTab === 'smart-search' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-red-500" /> AI Property Search
              </h3>
              <p className="text-xs text-slate-400">
                Describe the property you need and the AI will search RealtyNow listings and give you a clear answer.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">What property are you looking for?</label>
              <div className="flex gap-2">
                <textarea
                  rows={3}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
                />
                <VoiceSearchButton onResult={(t) => setSearchQuery(t)} />
              </div>
              <button
                onClick={handleSmartSearch}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:from-red-500 hover:to-rose-500 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Find Properties
              </button>
            </div>

            {smartSearchAnswer && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  AI Property Answer
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed bg-slate-900 p-4 rounded-lg border border-slate-800">
                  {renderAIText(smartSearchAnswer)}
                </p>
              </div>
            )}
};
