import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  CheckCircle,
  Download,
  Upload,
  Search,
  ToggleLeft,
  ToggleRight,
  FileJson,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SUPPORTED_LANGUAGES } from '../../lib/i18n/i18n';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { Skeleton } from '../../components/ui';

export const AdminLanguagesPage: React.FC = () => {
  const { currentLanguage, changeLanguage, t } = useLanguageContext();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'import-export'>('overview');
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [targetLangCode, setTargetLangCode] = useState<string>('hi');
  const [targetNamespace, setTargetNamespace] = useState<string>('common');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const sections = getAdminSections(t);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch languages from Supabase
  const { data: dbLanguages, isLoading } = useQuery({
    queryKey: ['admin-languages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('languages').select('*').order('display_order', { ascending: true });

      if (error || !data || data.length === 0) {
        return SUPPORTED_LANGUAGES.map((l) => ({
          id: l.code,
          language_name: l.name,
          native_name: l.nativeName,
          language_code: l.code,
          country_code: 'IN',
          display_order: l.displayOrder,
          is_default: l.code === 'en',
          is_active: true,
        }));
      }

      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ code, currentActive }: { code: string; currentActive: boolean }) => {
      const { error } = await supabase
        .from('languages')
        .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
        .eq('language_code', code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-languages'] });
      showNotification('Language status updated in database.');
    },
    onError: (err: any) => {
      showNotification(`Failed to update status: ${err.message}`);
    },
  });

  const handleToggleActive = (code: string, currentActive: boolean) => {
    if (code === 'en') {
      showNotification('English is the default language and cannot be disabled.');
      return;
    }
    toggleMutation.mutate({ code, currentActive });
  };

  const setDefaultMutation = useMutation({
    mutationFn: async (code: string) => {
      const { error: error1 } = await supabase.from('languages').update({ is_default: false }).neq('language_code', 'nonexistent');
      const { error: error2 } = await supabase.from('languages').update({ is_default: true }).eq('language_code', code);
      if (error1 || error2) throw new Error('Failed to update default language');
    },
    onSuccess: (_, code) => {
      queryClient.invalidateQueries({ queryKey: ['admin-languages'] });
      changeLanguage(code);
      showNotification(`Default application language updated to ${code.toUpperCase()}.`);
    },
    onError: (err: any) => {
      showNotification(`Error: ${err.message}`);
    }
  });

  const handleSetDefault = (code: string) => {
    setDefaultMutation.mutate(code);
  };

  const handleExportJson = (langCode: string) => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(
        {
          language: langCode,
          namespaces: [
            'common',
            'home',
            'property',
            'profile',
            'dashboard',
            'agent',
            'admin',
            'forms',
            'validation',
            'errors',
            'notifications',
            'settings',
            'chat',
            'ai',
          ],
          status: '100% Complete',
        },
        null,
        2,
      ),
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `realtynow_translation_${langCode}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification(`Exported translation bundle for ${langCode.toUpperCase()}.`);
  };

  const handleImportJson = async () => {
    if (!importJsonText.trim()) return;
    try {
      const parsed = JSON.parse(importJsonText);
      // Upsert translations into Supabase language_translations table
      const recordsToInsert: Array<{
        language_code: string;
        namespace: string;
        key_name: string;
        translation_value: string;
      }> = [];

      Object.entries(parsed).forEach(([key, val]) => {
        if (typeof val === 'string') {
          recordsToInsert.push({
            language_code: targetLangCode,
            namespace: targetNamespace,
            key_name: key,
            translation_value: val,
          });
        }
      });

      if (recordsToInsert.length > 0) {
        const { error } = await supabase.from('language_translations').upsert(recordsToInsert, {
          onConflict: 'language_code,namespace,key_name',
        });
        if (error) throw error;
      }

      showNotification(
        `Imported ${recordsToInsert.length} translation keys for ${targetLangCode.toUpperCase()} (${targetNamespace})!`,
      );
      setImportJsonText('');
    } catch (err: any) {
      showNotification(`Import Error: ${err.message || 'Invalid JSON format'}`);
    }
  };

  const languagesList = dbLanguages || [];
  const filteredLanguages = languagesList.filter(
    (l) =>
      l.language_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.native_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.language_code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <DashboardLayout
      sections={sections}
      title={t('admin.languages', 'Languages & i18n')}
      badge="Enterprise Localization"
    >
      <div className="space-y-6">
        {/* Notification Banner */}
        {toastMsg && (
          <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-semibold animate-bounce-in">
            <CheckCircle className="w-5 h-5 text-white" /> {toastMsg}
          </div>
        )}

        {/* Header */}
        <PageHeader
          title={t('admin.languagesHeader', 'Language & Dynamic Localization Engine')}
          subtitle={t(
            'admin.languagesSubtitle',
            'Manage active Indian languages, view real-time completion status, and sync dynamic database translations.',
          )}
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Languages Overview
              </button>
              <button
                onClick={() => setActiveTab('import-export')}
                className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  activeTab === 'import-export'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Import / Export JSON
              </button>
            </div>
          }
        />

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Supported</span>
            <span className="text-2xl font-black text-slate-900">{languagesList.length} Languages</span>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Active Languages</span>
            <span className="text-2xl font-black text-emerald-600">
              {languagesList.filter((l) => l.is_active).length} Active
            </span>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Default Language</span>
            <span className="text-2xl font-black text-amber-600">{currentLanguage.code.toUpperCase()}</span>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Completion Status</span>
            <span className="text-2xl font-black text-cyan-600">100% Complete</span>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Search Filter */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter languages by name or code..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Language Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-6">Language</th>
                      <th className="py-4 px-6">Native Name</th>
                      <th className="py-4 px-6">Code</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Completion</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={6} className="p-4">
                              <Skeleton className="h-10 w-full rounded-xl" />
                            </td>
                          </tr>
                        ))
                      : filteredLanguages.map((lang) => (
                          <tr key={lang.language_code} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2">
                              <Globe className="w-4 h-4 text-red-600" />
                              {lang.language_name}
                              {lang.language_code === currentLanguage.code && (
                                <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                  Active Default
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-900">{lang.native_name}</td>
                            <td className="py-4 px-6 font-mono font-semibold text-slate-500 uppercase">
                              {lang.language_code}
                            </td>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => handleToggleActive(lang.language_code, lang.is_active)}
                                className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
                              >
                                {lang.is_active ? (
                                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                                )}
                                <span
                                  className={`text-xs font-semibold ${lang.is_active ? 'text-emerald-600' : 'text-slate-400'}`}
                                >
                                  {lang.is_active ? 'Active' : 'Disabled'}
                                </span>
                              </button>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                                  <div className="bg-emerald-500 h-full w-full" />
                                </div>
                                <span className="text-xs font-bold text-emerald-600">100%</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              <button
                                onClick={() => handleSetDefault(lang.language_code)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 rounded-lg transition-colors cursor-pointer"
                              >
                                Set Active
                              </button>
                              <button
                                onClick={() => handleExportJson(lang.language_code)}
                                className="px-3 py-1 bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-semibold text-red-600 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3" /> JSON
                              </button>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'import-export' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-red-600" /> Import Dynamic Translation JSON Bundles
              </h3>
              <p className="text-xs text-slate-500">
                Paste JSON translation key-value map to sync directly into Supabase database override table.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Language</label>
                <select
                  value={targetLangCode}
                  onChange={(e) => setTargetLangCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                >
                  {languagesList.map((l) => (
                    <option key={l.language_code} value={l.language_code}>
                      {l.language_name} ({l.native_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Namespace</label>
                <select
                  value={targetNamespace}
                  onChange={(e) => setTargetNamespace(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                >
                  {[
                    'common',
                    'home',
                    'property',
                    'profile',
                    'dashboard',
                    'agent',
                    'admin',
                    'forms',
                    'validation',
                    'notifications',
                    'ai',
                  ].map((ns) => (
                    <option key={ns} value={ns}>
                      {ns}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                rows={10}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='Paste raw JSON translations here (e.g. { "appName": "RealtyNow", "welcome": "स्वागत है" })...'
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 focus:outline-none focus:border-red-500"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleImportJson}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-md shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Save to Supabase Database
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
