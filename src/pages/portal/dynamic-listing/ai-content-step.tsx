import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, Input, Textarea } from '../../../components/ui';
import { callAI } from '../../../lib/ai';
import { useToast } from '../../../hooks/useToast';

interface AiContentStepProps {
  answers: Record<string, unknown>;
  onApply: (key: string, value: unknown) => void;
}

type AiTaskKey = 'title' | 'description' | 'seo';

/** AI step: reuses the existing callAI('title'|'description'|'seo', payload) from src/lib/ai.ts. */
export function AiContentStep({ answers, onApply }: AiContentStepProps) {
  const toast = useToast();
  const [loading, setLoading] = useState<AiTaskKey | null>(null);
  const [seoPreview, setSeoPreview] = useState<string>((answers.seo_preview as string) ?? '');

  const location = (answers.location as { city_id?: string; locality_id?: string } | undefined) ?? {};
  const basePayload = {
    title: answers.title,
    bedrooms: answers.bedrooms,
    bathrooms: answers.bathrooms,
    area: answers.built_up_area,
    furnishing: answers.furnishing,
    amenities: answers.amenities,
    city: location.city_id,
    locality: location.locality_id,
  };

  const generate = async (task: AiTaskKey) => {
    setLoading(task);
    try {
      const result = await callAI(task, basePayload);
      const trimmed = result.trim();
      if (task === 'title') onApply('title', trimmed);
      else if (task === 'description') onApply('description', trimmed);
      else {
        setSeoPreview(trimmed);
        onApply('seo_preview', trimmed);
      }
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-navy-500">
        Let AI suggest a title, description, and SEO summary from what you've entered so far — you can edit anything
        afterwards.
      </p>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label !mb-0">Title</label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            loading={loading === 'title'}
            onClick={() => generate('title')}
          >
            {answers.title ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
        <Input value={(answers.title as string) ?? ''} onChange={(e) => onApply('title', e.target.value)} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label !mb-0">Description</label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            loading={loading === 'description'}
            onClick={() => generate('description')}
          >
            {answers.description ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
        <Textarea value={(answers.description as string) ?? ''} onChange={(e) => onApply('description', e.target.value)} rows={5} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label !mb-0">SEO Summary (preview)</label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Sparkles className="h-3.5 w-3.5" />}
            loading={loading === 'seo'}
            onClick={() => generate('seo')}
          >
            {seoPreview ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
        <Textarea
          value={seoPreview}
          onChange={(e) => {
            setSeoPreview(e.target.value);
            onApply('seo_preview', e.target.value);
          }}
          rows={3}
        />
        <p className="mt-1 text-xs text-navy-400">
          The final published listing's SEO fields are generated automatically after publish — this is just a preview.
        </p>
      </div>
    </div>
  );
}
