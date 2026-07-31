/**
 * 360° Virtual Tour Upload Section for Property Listing Form
 * Supports: Drag & Drop, Multiple Upload, Reorder, Preview, Room Name, Floor, Cover Selection
 */
import React, { useState, useCallback, useRef } from 'react';
import type { VirtualTourUploadItem } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import {
  Camera,
  Upload,
  X,
  Star,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Eye,
  Info,
} from 'lucide-react';
import { Spinner } from '../ui';

const ROOM_OPTIONS = [
  'Living Room',
  'Master Bedroom',
  'Bedroom 2',
  'Bedroom 3',
  'Kitchen',
  'Bathroom',
  'Dining Room',
  'Balcony',
  'Terrace',
  'Lobby',
  'Gym',
  'Study Room',
  'Pooja Room',
  'Store Room',
];

const ACCEPTED_FORMATS = '.jpg,.jpeg,.png,.webp';
const MAX_SIZE_MB = 20;
const BUCKET = 'property-360';

interface VirtualTourUploadSectionProps {
  propertyId?: string;
  value: VirtualTourUploadItem[];
  onChange: (items: VirtualTourUploadItem[]) => void;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
}

export function VirtualTourUploadSection({
  propertyId,
  value,
  onChange,
  enabled,
  onEnabledChange,
}: VirtualTourUploadSectionProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewItem, setPreviewItem] = useState<VirtualTourUploadItem | null>(null);
  const [uploadingAll, setUploadingAll] = useState(false);

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return `Invalid type: ${file.type}. Use JPG, PNG, or WebP.`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large (max ${MAX_SIZE_MB}MB).`;
    }
    return null;
  };

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const newItems: VirtualTourUploadItem[] = fileArr.map((file, i) => {
        const err = validateFile(file);
        return {
          file,
          preview: URL.createObjectURL(file),
          room_name: ROOM_OPTIONS[Math.min(value.length + i, ROOM_OPTIONS.length - 1)],
          title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          floor_number: 1,
          is_cover: value.length === 0 && i === 0,
          sort_order: value.length + i,
          error: err || undefined,
        };
      });
      onChange([...value, ...newItems]);
    },
    [value, onChange],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const removeItem = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    // Re-assign cover if needed
    if (value[idx].is_cover && next.length > 0) next[0].is_cover = true;
    onChange(next);
  };

  const updateItem = (idx: number, patch: Partial<VirtualTourUploadItem>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    // Ensure only one cover
    if (patch.is_cover) {
      next.forEach((item, i) => {
        if (i !== idx) item.is_cover = false;
      });
    }
    onChange(next);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = [...value];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((item, i) => {
      item.sort_order = i;
    });
    onChange(next);
  };

  const uploadAll = async () => {
    if (!propertyId) return;
    setUploadingAll(true);

    const updated = [...value];
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (item.uploaded || item.error) continue;

      updated[i] = { ...item, uploading: true };
      onChange([...updated]);

      try {
        const ext = item.file.name.split('.').pop();
        const path = `${propertyId}/${Date.now()}-${i}.${ext}`;
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .upload(path, item.file, { upsert: true, contentType: item.file.type });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
        updated[i] = { ...item, uploading: false, uploaded: true, url: urlData.publicUrl };
        onChange([...updated]);

        // Insert into DB
        await supabase.from('property_virtual_tours').insert({
          property_id: propertyId,
          room_name: item.room_name,
          title: item.title,
          image_url: urlData.publicUrl,
          thumbnail_url: urlData.publicUrl,
          sort_order: item.sort_order,
          is_cover: item.is_cover,
          floor_number: item.floor_number,
          created_by: user?.id,
        });
      } catch (err: any) {
        updated[i] = { ...updated[i], uploading: false, error: err?.message ?? 'Upload failed' };
        onChange([...updated]);
      }
    }
    setUploadingAll(false);
  };

  const pendingCount = value.filter((v) => !v.uploaded && !v.error).length;

  return (
    <div className="w-full font-sans space-y-5">
      {/* Section Header + Toggle */}
      <div className="flex items-center justify-between gap-4 p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/30">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              360° Virtual Tour
              <span className="text-[10px] font-black uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 tracking-wider">
                Premium
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload equirectangular panoramas to give buyers an immersive walkthrough.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs font-bold text-slate-400">Enable Tour</span>
          <div
            onClick={() => onEnabledChange(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-all cursor-pointer ${enabled ? 'bg-red-600' : 'bg-slate-700'}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${enabled ? 'left-7' : 'left-1'}`}
            />
          </div>
        </label>
      </div>

      {!enabled ? (
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-500">
          <Info className="w-5 h-5 text-slate-400 shrink-0" />
          Enable the toggle above to add 360° panorama images to your listing.
        </div>
      ) : (
        <>
          {/* Upload Guidelines */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              'Equirectangular Format Recommended',
              'Max 20MB per image',
              'JPG / JPEG / PNG / WebP',
              'Aspect Ratio 2:1 ideal',
            ].map((tip) => (
              <span
                key={tip}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200 font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {tip}
              </span>
            ))}
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
              isDragOver
                ? 'border-red-500 bg-red-50/50 scale-[1.01]'
                : 'border-slate-300 bg-slate-50/50 hover:border-red-400 hover:bg-red-50/30'
            }`}
          >
            <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center shadow-lg shadow-red-100">
              <Upload className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">
                {isDragOver ? 'Drop panorama images here' : 'Drag & drop 360° images or click to browse'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Equirectangular panoramas work best (2:1 aspect ratio)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* Uploaded Items Grid */}
          {value.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800">
                  {value.length} panorama{value.length !== 1 ? 's' : ''} added
                </h4>
                {pendingCount > 0 && propertyId && (
                  <button
                    type="button"
                    onClick={uploadAll}
                    disabled={uploadingAll}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/30 transition-all cursor-pointer"
                  >
                    {uploadingAll ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    Upload {pendingCount} Image{pendingCount !== 1 ? 's' : ''} to Cloud
                  </button>
                )}
              </div>

              {value.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border transition-all ${
                    item.error
                      ? 'border-red-200 bg-red-50'
                      : item.uploaded
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : item.is_cover
                          ? 'border-red-300 bg-red-50/50'
                          : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-full sm:w-28 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                    <img
                      src={item.preview}
                      alt={item.room_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {item.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Spinner className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {item.uploaded && (
                      <div className="absolute top-1.5 right-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 bg-white rounded-full" />
                      </div>
                    )}
                    {item.is_cover && (
                      <div className="absolute bottom-1 left-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        COVER
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Room Name</label>
                      <select
                        value={item.room_name}
                        onChange={(e) => updateItem(idx, { room_name: e.target.value })}
                        className="w-full mt-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-red-600"
                      >
                        {ROOM_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Title / Label
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                        placeholder="e.g. Spacious Living Area"
                        className="w-full mt-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-red-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Floor</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={item.floor_number}
                        onChange={(e) => updateItem(idx, { floor_number: Number(e.target.value) })}
                        className="w-full mt-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>

                  {/* Error */}
                  {item.error && (
                    <div className="col-span-full flex items-center gap-2 text-xs text-red-600 font-semibold mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {item.error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center justify-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateItem(idx, { is_cover: true })}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${item.is_cover ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600'}`}
                      title={item.is_cover ? 'Cover Image' : 'Set as Cover'}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-30"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === value.length - 1}
                      className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-30"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 rounded-xl bg-slate-100 text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preview Modal */}
          {previewItem && (
            <div
              className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setPreviewItem(null)}
            >
              <div
                className="relative max-w-3xl w-full rounded-3xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <img src={previewItem.preview} alt={previewItem.room_name} className="w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="absolute top-4 right-4 p-2 bg-black/70 rounded-full text-white hover:bg-black cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  {previewItem.room_name} · Floor {previewItem.floor_number}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
