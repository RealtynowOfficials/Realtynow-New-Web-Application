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
import { callAI } from '../../lib/ai';
import { VoiceSearchButton } from '../../components/voice-search-button';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { useSearchParams } from 'react-router-dom';

export const AIHubPage: React.FC = () => {
  const { t } = useLanguageContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const defaultTab = searchParams.get('tab') as 'assistant' | 'smart-search' | 'recommendations' | 'generator' | 'lead-summary' | 'translation' | 'market';
  
  const [activeTab, setActiveTab] = useState<
    'assistant' | 'smart-search' | 'recommendations' | 'generator' | 'lead-summary' | 'translation' | 'market'
  >(defaultTab || 'assistant');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

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
  const [parsedFilter, setParsedFilter] = useState<Record<string, unknown> | null>(null);

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
    setLoading(true);
    try {
      const res = await callAI('parse_search', { query: searchQuery });
      try {
        setParsedFilter(JSON.parse(res));
      } catch {
        setParsedFilter({ raw: res });
      }
    } catch {
      setParsedFilter({ error: 'Failed to parse query.' });
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
                    {m.text}
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

        {/* TAB 2: AI Smart Search Filter Extractor */}
        {activeTab === 'smart-search' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-red-500" /> AI Natural Language Search Extractor
              </h3>
              <p className="text-xs text-slate-400">
                Type freeform natural text to automatically parse city, BHK, budget, and property types.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Natural Language Search Query:</label>
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
                <Sparkles className="w-4 h-4" /> Extract Search Filters
              </button>
            </div>

            {parsedFilter && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Parsed Filter Output (JSON):
                </h4>
                <pre className="text-xs text-slate-200 overflow-x-auto bg-slate-900 p-3 rounded-lg border border-slate-800">
                  {JSON.stringify(parsedFilter, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Recommendations */}
        {activeTab === 'recommendations' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-500" /> AI Property Matchmaker & Locality Recommendations
              </h3>
              <p className="text-xs text-slate-400">
                Receive customized locality and property recommendations based on your preferences.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={recInput}
                onChange={(e) => setRecInput(e.target.value)}
                placeholder="e.g. 3 BHK in IT hubs with high appreciation under 1.5 Cr"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleRecommendations}
                disabled={loading}
                className="bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-red-500 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Generate Recommendations
              </button>
            </div>

            {recOutput && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {recOutput}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Copy Generator */}
        {activeTab === 'generator' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" /> AI Property Copy & SEO Generator
              </h3>
              <p className="text-xs text-slate-400">
                Generate high-converting property titles, descriptions, and SEO meta copy for your listings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Property Title Baseline:</label>
                <input
                  type="text"
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">City:</label>
                <input
                  type="text"
                  value={genCity}
                  onChange={(e) => setGenCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Locality:</label>
                <input
                  type="text"
                  value={genLocality}
                  onChange={(e) => setGenLocality(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Property Type:</label>
                <input
                  type="text"
                  value={genType}
                  onChange={(e) => setGenType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white mt-1"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateCopy}
              disabled={loading}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Generate Copy & SEO
            </button>

            {genOutput && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div>
                  <span className="text-xs font-bold text-red-400 uppercase">Generated Title:</span>
                  <p className="text-sm font-semibold text-white mt-1">{genOutput.title}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase">Generated Description:</span>
                  <p className="text-sm text-slate-300 leading-relaxed mt-1">{genOutput.description}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase">SEO Meta Description:</span>
                  <p className="text-xs text-slate-400 mt-1">{genOutput.seo}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Lead Summary */}
        {activeTab === 'lead-summary' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-red-500" /> AI Customer Lead Summarizer
              </h3>
              <p className="text-xs text-slate-400">
                Summarize long customer inquiry messages into quick actionable bullet points for agents.
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                rows={4}
                value={leadText}
                onChange={(e) => setLeadText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleSummarizeLead}
                disabled={loading}
                className="bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-red-500 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Summarize Lead
              </button>
            </div>

            {leadSummaryOutput && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {leadSummaryOutput}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: AI Translation */}
        {activeTab === 'translation' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Languages className="w-5 h-5 text-red-500" /> AI Multilingual Real Estate Translator
              </h3>
              <p className="text-xs text-slate-400">Translate property copy into major Indian languages.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Target Language:</label>
                <select
                  value={transLang}
                  onChange={(e) => setTransLang(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white mt-1"
                >
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Kannada">Kannada (కన్నడ)</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                  <option value="Bengali">Bengali (বাংলা)</option>
                </select>
              </div>

              <textarea
                rows={3}
                value={transText}
                onChange={(e) => setTransText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
              />

              <button
                onClick={handleTranslate}
                disabled={loading}
                className="bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-red-500 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Translate Text
              </button>

              {transOutput && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200">
                  {transOutput}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: Market Insights */}
        {activeTab === 'market' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" /> AI Market & Locality Insights Generator
              </h3>
              <p className="text-xs text-slate-400">
                Generate price per sqft trends, appreciation estimates, and locality advantages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">City:</label>
                <input
                  type="text"
                  value={marketCity}
                  onChange={(e) => setMarketCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Locality:</label>
                <input
                  type="text"
                  value={marketLocality}
                  onChange={(e) => setMarketLocality(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white mt-1"
                />
              </div>
            </div>

            <button
              onClick={handleMarketInsights}
              disabled={loading}
              className="bg-red-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-red-500 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Analyze Market
            </button>

            {marketOutput && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {marketOutput}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
