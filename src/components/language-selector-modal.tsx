import React, { useState } from 'react';
import { Globe, Search, Check, X } from 'lucide-react';
import { useLanguageContext } from '../lib/i18n/language-context';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({ isOpen, onClose }) => {
  const { currentLanguage, changeLanguage, supportedLanguages, loading, t } = useLanguageContext();
  const [selectedCode, setSelectedCode] = useState<string>(currentLanguage.code);
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredLanguages = supportedLanguages.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleApply = async () => {
    if (selectedCode !== currentLanguage.code) {
      await changeLanguage(selectedCode);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transform transition-all animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {t('common.selectLanguage', 'Select Language')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('langModal.subtitle', 'Choose your preferred Indian language')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('langModal.searchPlaceholder', 'Search language (e.g. Telugu, हिन्दी)...')}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
            />
          </div>
        </div>

        {/* Language List */}
        <div className="max-h-80 overflow-y-auto p-4 space-y-2">
          {filteredLanguages.map((lang) => {
            const isSelected = selectedCode === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedCode(lang.code)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'border-red-600 bg-red-50/60 shadow-sm'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">{lang.nativeName}</span>
                    <span className="text-xs text-slate-500 block">{lang.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {lang.code}
                  </span>
                  {isSelected && (
                    <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      {t('langModal.selectedBadge', 'Selected')}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {filteredLanguages.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm">
              {t('langModal.noLangFound', 'No language found matching')} &quot;{searchQuery}&quot;
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-lg shadow-red-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            {loading ? t('common.loading', 'Applying...') : t('langModal.applyBtn', 'Apply Language')}
          </button>
        </div>
      </div>
    </div>
  );
};
