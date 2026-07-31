import React, { useState } from 'react';
import { useLanguageContext } from '../../lib/i18n/language-context';
import {
  Bold,
  Italic,
  Underline,
  List,
  Code,
} from 'lucide-react';

interface EnterpriseRichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}

export function EnterpriseRichTextEditor({ value, onChange, label, placeholder }: EnterpriseRichTextEditorProps) {
  const { t } = useLanguageContext();
  const [htmlMode, setHtmlMode] = useState(false);

  const applyTag = (tag: string) => {
    if (tag === 'b') onChange(`<b>${value}</b>`);
    else if (tag === 'i') onChange(`<i>${value}</i>`);
    else if (tag === 'u') onChange(`<u>${value}</u>`);
    else if (tag === 'h2') onChange(`<h2>${value}</h2>`);
    else if (tag === 'ul') onChange(`<ul>\n  <li>${value || 'List item'}</li>\n</ul>`);
  };

  return (
    <div className="w-full font-sans">
      {label && <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{label}</label>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden focus-within:border-red-600 transition-all">
        {/* Editor Toolbar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyTag('b')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTag('i')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 italic transition-colors cursor-pointer"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTag('u')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 underline transition-colors cursor-pointer"
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={() => applyTag('ul')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyTag('h2')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              title="Heading 2"
            >
              H2
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHtmlMode(!htmlMode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                htmlMode ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>{htmlMode ? 'Visual Mode' : 'HTML Mode'}</span>
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Write content using rich editor...'}
          className="w-full p-4 min-h-[160px] max-h-[350px] text-sm text-slate-900 focus:outline-none placeholder-slate-400 font-normal resize-y"
        />
      </div>
    </div>
  );
}
