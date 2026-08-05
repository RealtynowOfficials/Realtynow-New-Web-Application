import { useEffect, useState } from 'react';
import { Input, Textarea, Select } from '../../../components/ui';
import { FileUploader } from '../../../components/uploader/file-uploader';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import type { WorkflowField } from '../../../lib/listing-config';
import type { StorageBucket } from '../../../lib/storage';

interface LocationValue {
  city_id?: string;
  locality_id?: string;
  address?: string;
}

interface DynamicStepRendererProps {
  fields: WorkflowField[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
}

const FIELD_KEY_BUCKET: Record<string, StorageBucket> = {
  images: 'property-images',
  videos: 'property-videos',
  documents: 'property-documents',
};

export function DynamicStepRenderer({ fields, values, errors, onChange }: DynamicStepRendererProps) {
  return (
    <div className="space-y-5">
      {fields.map((field) => (
        <FieldInput
          key={field.id}
          field={field}
          value={values[field.field_key]}
          error={errors[field.field_key]}
          onChange={(v) => onChange(field.field_key, v)}
        />
      ))}
    </div>
  );
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: WorkflowField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  const labelText = field.label + (field.is_required ? ' *' : '');

  switch (field.field_type) {
    case 'text':
      return (
        <Input
          label={labelText}
          placeholder={field.placeholder ?? undefined}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          error={error}
        />
      );
    case 'textarea':
      return (
        <Textarea
          label={labelText}
          placeholder={field.placeholder ?? undefined}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          rows={5}
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          label={labelText}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          error={error}
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          label={labelText}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          error={error}
        />
      );
    case 'boolean':
      return (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-navy-700">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-navy-300 text-red-600 focus:ring-red-400"
          />
          {field.label}
        </label>
      );
    case 'select':
      if (field.field_key === 'property_type_id') {
        return <PropertyTypeSelect label={labelText} value={value as string} error={error} onChange={onChange} />;
      }
      return (
        <Select label={labelText} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} error={error}>
          <option value="">Select...</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      );
    case 'multiselect':
    case 'checklist':
      return (
        <MultiChoice
          label={labelText}
          options={field.options}
          value={(value as string[]) ?? []}
          error={error}
          onChange={onChange}
        />
      );
    case 'file': {
      const bucket = FIELD_KEY_BUCKET[field.field_key] ?? 'property-documents';
      return (
        <FileUploader
          bucket={bucket}
          label={labelText}
          helpText={field.help_text ?? undefined}
          accept={field.validation.accept}
          multiple={field.validation.multiple ?? true}
          maxFiles={field.validation.maxFiles ?? 10}
          value={(value as { url: string; path: string }[]) ?? []}
          onChange={onChange}
        />
      );
    }
    case 'location':
      return (
        <LocationField
          label={labelText}
          value={(value as LocationValue) ?? {}}
          error={error}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

function PropertyTypeSelect({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from('property_types')
      .select('id,name')
      .order('name')
      .then(({ data }) => setTypes((data as { id: string; name: string }[]) ?? []));
  }, []);

  return (
    <Select label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} error={error}>
      <option value="">Select property type...</option>
      {types.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </Select>
  );
}

function LocationField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: LocationValue;
  error?: string;
  onChange: (value: LocationValue) => void;
}) {
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [localities, setLocalities] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from('cities')
      .select('id,name')
      .order('name')
      .then(({ data }) => setCities((data as { id: string; name: string }[]) ?? []));
  }, []);

  useEffect(() => {
    if (!value.city_id) {
      setLocalities([]);
      return;
    }
    supabase
      .from('localities')
      .select('id,name')
      .eq('city_id', value.city_id)
      .order('name')
      .then(({ data }) => setLocalities((data as { id: string; name: string }[]) ?? []));
  }, [value.city_id]);

  return (
    <div className="space-y-3 rounded-xl border border-navy-150 p-4">
      <p className="text-sm font-bold text-navy-800">{label}</p>
      <Select
        label="City"
        value={value.city_id ?? ''}
        onChange={(e) => onChange({ ...value, city_id: e.target.value, locality_id: undefined })}
      >
        <option value="">Select city...</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        label="Locality"
        value={value.locality_id ?? ''}
        onChange={(e) => onChange({ ...value, locality_id: e.target.value })}
        disabled={!value.city_id}
      >
        <option value="">Select locality...</option>
        {localities.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </Select>
      <Textarea
        label="Address"
        value={value.address ?? ''}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
        rows={2}
      />
      {error && <p className="text-xs font-semibold text-error-600">{error}</p>}
    </div>
  );
}

function MultiChoice({
  label,
  options,
  value,
  error,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  error?: string;
  onChange: (value: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  return (
    <div>
      <p className="label">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((opt) => (
          <label
            key={opt}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
              value.includes(opt) ? 'border-red-400 bg-red-50 text-red-700' : 'border-navy-150 text-navy-600 hover:bg-navy-50',
            )}
          >
            <input type="checkbox" className="sr-only" checked={value.includes(opt)} onChange={() => toggle(opt)} />
            {opt}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-error-600">{error}</p>}
    </div>
  );
}
