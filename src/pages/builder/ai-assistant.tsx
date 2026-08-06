import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Send, Users, Mail, TrendingUp, Bot } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { callAI } from '../../lib/ai';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Input, Button, Spinner, EmptyState } from '../../components/ui';
import { useToast } from '../../components/toast';
import { cn } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

export function BuilderAiAssistant() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const { addToast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: recentLeads } = useQuery({
    queryKey: ['builder-ai-recent-leads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_leads')
        .select('name, email, phone, status, message, created_at')
        .eq('builder_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const pushAssistant = (content: string, isError = false) => {
    setMessages((m) => [...m, { role: 'assistant', content, isError }]);
  };

  const runTask = async (userLabel: string, task: Parameters<typeof callAI>[0], payload: Record<string, unknown>) => {
    if (loading) return;
    setMessages((m) => [...m, { role: 'user', content: userLabel }]);
    setLoading(true);
    try {
      const result = await callAI(task, payload);
      pushAssistant(result);
    } catch (err: any) {
      pushAssistant(err?.message || 'Something went wrong while contacting the AI assistant. Please try again.', true);
      addToast('error', 'AI request failed.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await runTask(text, 'chat', { message: text, context: 'builder' });
  };

  const quickActions = [
    {
      label: 'Summarize my leads',
      icon: <Users className="h-4 w-4" />,
      onClick: () => runTask('Summarize my leads', 'lead_summary', { leads: recentLeads ?? [] }),
    },
    {
      label: 'Draft follow-up email',
      icon: <Mail className="h-4 w-4" />,
      onClick: () => runTask('Draft a follow-up email', 'email', { purpose: 'lead follow-up' }),
    },
    {
      label: 'Market insights',
      icon: <TrendingUp className="h-4 w-4" />,
      onClick: () => runTask('Get market insights', 'market_insights', { context: 'builder projects' }),
    },
  ];

  return (
    <DashboardLayout sections={builderSections} title="AI Assistant" badge="Builder">
      <PageHeader title="AI Assistant" subtitle="Ask questions or run quick actions powered by RealtyNow AI." />

      <div className="flex flex-wrap gap-2 mb-4">
        {quickActions.map((a) => (
          <Button key={a.label} variant="secondary" size="sm" icon={a.icon} onClick={a.onClick} disabled={loading}>
            {a.label}
          </Button>
        ))}
      </div>

      <Card className="flex flex-col h-[60vh] p-0 overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="Ask me anything"
              description="Try a quick action above, or type a question about your projects, leads, or the market."
            />
          ) : (
            messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-navy-900 text-white'
                      : m.isError
                        ? 'bg-error-50 text-error-600 border border-error-200'
                        : 'bg-navy-50 text-navy-800',
                  )}
                >
                  {m.role === 'assistant' && !m.isError && (
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-navy-500">
                      <Bot className="h-3.5 w-3.5" /> RealtyNow AI
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-navy-50 px-4 py-2.5">
                <Spinner className="h-4 w-4" />
                <span className="text-sm text-navy-500">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2 border-t border-navy-100 p-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your projects, leads, or the market..."
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" icon={<Send className="h-4 w-4" />} disabled={loading || !input.trim()}>
            Send
          </Button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
