import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../components/ui';
import { Star, Phone, MessageCircle, Building2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['all-agents'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'agent')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12">
      <div className="container-wide">
        <div className="mb-8">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Our Top Agents
          </h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Meet our experienced real estate professionals ready to help you find your dream property.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {agents?.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col sm:flex-row gap-6 p-6 rounded-3xl bg-white shadow-sm border border-slate-200 hover:shadow-lg transition-all"
            >
              {/* Agent Avatar */}
              <div className="shrink-0 flex flex-col items-center gap-4 sm:w-48">
                {agent.avatar_url ? (
                  <img
                    src={agent.avatar_url}
                    alt={`${agent.first_name ?? ''} ${agent.last_name ?? ''}`}
                    className="h-32 w-32 rounded-full object-cover border-4 border-slate-50 shadow-md"
                  />
                ) : (
                  <div className="grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-5xl font-bold text-white shadow-md">
                    {agent.first_name?.[0] ?? 'A'}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <a href={`tel:${agent.phone ?? ''}`} className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors">
                    <Phone className="h-4 w-4" />
                  </a>
                  <a href={`https://wa.me/${agent.phone ?? ''}`} className="grid h-10 w-10 place-items-center rounded-full bg-success-50 text-success-600 hover:bg-success-100 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                  <a href={`mailto:${agent.email ?? ''}`} className="grid h-10 w-10 place-items-center rounded-full bg-secondary-50 text-secondary-600 hover:bg-secondary-100 transition-colors">
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Agent Details */}
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-slate-900">
                      {agent.first_name} {agent.last_name}
                    </h3>
                    <p className="text-primary-600 font-medium text-sm flex items-center gap-1 mt-1">
                      <Building2 className="h-4 w-4" /> {agent.company || 'Independent Agent'}
                    </p>
                  </div>
                  <div className="flex bg-gold-50 px-2 py-1 rounded-lg border border-gold-200">
                    <Star className="h-4 w-4 fill-gold-400 text-gold-400 mr-1" />
                    <span className="text-xs font-bold text-gold-700">5.0</span>
                  </div>
                </div>

                {agent.specialization && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {agent.specialization.split(',').map((spec: string, idx: number) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-medium">
                        {spec.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 prose prose-sm text-slate-600 max-w-none">
                  <p className="line-clamp-4 leading-relaxed">
                    {agent.bio || 'This agent is highly experienced and ready to assist you with all your real estate needs. They bring a wealth of knowledge about local markets and a commitment to helping clients find the perfect property.'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
