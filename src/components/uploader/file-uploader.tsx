import { useRef, useState } from 'react';
import { UploadCloud, X, Loader2, FileText } from 'lucide-react';
import { uploadFile, deleteFile, type StorageBucket } from '../../lib/storage';
import { cn } from '../../lib/utils';

interface UploadedItem {
  url: string;
  path: string;
}

interface FileUploaderProps {
  bucket: StorageBucket;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  value: UploadedItem[];
  onChange: (items: UploadedItem[]) => void;
  label?: string;
  helpText?: string;
}

/**
 * Generalized image/video/document uploader shared by the dynamic listing
 * engine, extracted from the inline pattern in list-property.tsx (which
 * calls uploadFile()/deleteFile() from src/lib/storage.ts directly).
 */
export function FileUploader({
  bucket,
  accept,
  multiple = true,
  maxFiles = 10,
  value,
  onChange,
  label,
  helpText,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = bucket === 'property-images' || bucket === 'profile-images';

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const remaining = maxFiles - value.length;
    if (remaining <= 0) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }
    const files = Array.from(fileList).slice(0, remaining);
    setUploading(true);
    const uploaded: UploadedItem[] = [];
    for (const file of files) {
      const { url, path, error: uploadErr } = await uploadFile(bucket, file);
      if (uploadErr) {
        setError(uploadErr);
        continue;
      }
      uploaded.push({ url, path });
    }
    setUploading(false);
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = async (item: UploadedItem) => {
    onChange(value.filter((v) => v.path !== item.path));
    deleteFile(bucket, item.path).catch(() => {
      /* best-effort */
    });
  };

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/50 p-6 text-center transition-colors hover:border-red-300 hover:bg-red-50/40',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        {uploading ? <Loader2 className="h-6 w-6 animate-spin text-navy-400" /> : <UploadCloud className="h-6 w-6 text-navy-400" />}
        <p className="text-sm font-semibold text-navy-600">
          {uploading ? 'Uploading...' : `Click to upload (max ${maxFiles})`}
        </p>
        {helpText && <p className="text-xs text-navy-400">{helpText}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-error-600">{error}</p>}

      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((item) => (
            <div key={item.path} className="group relative aspect-square overflow-hidden rounded-lg border border-navy-150 bg-navy-50">
              {isImage ? (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
                  <FileText className="h-6 w-6 text-navy-400" />
                  <span className="truncate text-[10px] text-navy-500">{item.path}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="absolute right-1 top-1 rounded-full bg-navy-900/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
