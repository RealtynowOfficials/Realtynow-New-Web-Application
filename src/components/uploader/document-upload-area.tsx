import { Upload, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useLanguageContext } from '../../lib/i18n/language-context';

/**
 * Single-slot document upload dropzone (filename + remove, no image preview
 * grid). Extracted from src/pages/auth/partner-register.tsx so it can also be
 * used by the partner profile's post-approval document management UI.
 */
export function DocumentUploadArea({
  label,
  hint,
  file,
  onChange,
  accept = 'image/*,.pdf',
  required = false,
  error,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
  accept?: string;
  required?: boolean;
  error?: string;
}) {
  const { t } = useLanguageContext();
  return (
    <div>
      {label && (
        <p className="text-sm font-medium text-navy-600 mb-1.5">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </p>
      )}
      <label
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 cursor-pointer transition-all ${
          error
            ? 'border-red-400 bg-red-500/5'
            : file
              ? 'border-gold-400 bg-gold-500/5'
              : 'border-navy-200 bg-navy-50/50 hover:border-gold-400 hover:bg-gold-500/5'
        }`}
      >
        <input type="file" accept={accept} className="sr-only" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="flex items-center gap-2 text-gold-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(null);
              }}
              className="ml-1 text-navy-400 hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 text-navy-400" />
            <span className="text-sm text-navy-600">{t('auth.clickToUpload', 'Click to upload')}</span>
            <span className="text-xs text-navy-500">{hint}</span>
          </>
        )}
      </label>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600" role="alert" aria-live="polite">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
