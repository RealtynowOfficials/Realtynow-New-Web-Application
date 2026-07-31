import React, { useState } from 'react';
import { useLanguageContext } from '../../lib/i18n/language-context';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Upload,
  Download,
  Search,
  Eye,
} from 'lucide-react';
import { uploadFile } from '../../lib/storage';

export interface FileItem {
  id: string;
  name: string;
  size: string;
  type: 'image' | 'pdf' | 'document' | 'video';
  url: string;
  folder: string;
  updatedAt: string;
}

interface EnterpriseFileManagerProps {
  files?: FileItem[];
  bucketName?: string;
  onFileUploaded?: (url: string, name: string) => void;
}

export function EnterpriseFileManager({
  files = [],
  bucketName = 'property-images',
  onFileUploaded,
}: EnterpriseFileManagerProps) {
  const { t } = useLanguageContext();
  const [activeFolder, setActiveFolder] = useState<string>('All Files');
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  const folders = ['All Files', 'Property Images', 'Floor Plans', 'Brochures', 'Legal Agreements'];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { url, error } = await uploadFile(bucketName as any, file);
    setUploading(false);
    if (!error && url && onFileUploaded) {
      onFileUploaded(url, file.name);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-md p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">Enterprise Storage File Manager</h2>
          <p className="text-xs text-slate-500">Manage property images, brochures, tax documents & sale agreements.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/30 cursor-pointer transition-all">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload Asset'}</span>
            <input type="file" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Grid: Folder Sidebar + File Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Folders */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Folders</p>
          {folders.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFolder(f)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeFolder === f ? 'bg-red-50 text-red-600 border border-red-100' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>{f}</span>
            </button>
          ))}
        </div>

        {/* Files Area */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No files uploaded in {activeFolder} yet.
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-red-200 bg-white hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                      {file.type === 'image' ? (
                        <ImageIcon className="w-5 h-5 text-red-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {file.size} • {file.updatedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </a>
                    <a href={file.url} download className="p-1 rounded text-slate-400 hover:text-slate-700">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
