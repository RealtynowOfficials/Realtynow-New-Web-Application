import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { DashboardLayout, PageHeader } from '../../../components/dashboard-layout';
import { Button, Spinner } from '../../../components/ui';
import { getPortalSections } from '../sections';
import { useAuth } from '../../../lib/auth';
import { useLanguageContext } from '../../../lib/i18n/language-context';
import { useToast } from '../../../hooks/useToast';
import {
  getListingPurposes,
  getWorkflowForPurpose,
  type ListingPurpose,
  type WorkflowStep,
  type WorkflowField,
} from '../../../lib/listing-config';
import { createDraft, getDraft } from '../../../lib/listing-drafts';
import { PurposeSelector } from './purpose-selector';
import { Stepper } from './stepper';
import { DynamicStepRenderer } from './dynamic-step-renderer';
import { AiContentStep } from './ai-content-step';
import { PreviewStep } from './preview-step';
import { validateStep } from './field-schema-builder';
import { publishDraft } from './publish';
import { useListingDraftAutosave } from './use-listing-draft-autosave';

export function NewListingWizard() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const sections = getPortalSections(t);

  const draftIdParam = params.get('draft_id');
  const purposeKeyParam = params.get('purpose');

  const [loading, setLoading] = useState(true);
  const [purpose, setPurpose] = useState<ListingPurpose | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [fieldsByStep, setFieldsByStep] = useState<Record<string, WorkflowField[]>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [completedKeys, setCompletedKeys] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);

  const currentStep = steps[stepIndex];
  useListingDraftAutosave(draftId, answers, currentStep?.step_key ?? '');

  // Resume from ?draft_id=, or start fresh once a purpose is chosen via ?purpose=
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!draftIdParam && !purposeKeyParam) {
        setPurpose(null);
        setLoading(false);
        return;
      }
      if (!user) return;

      setLoading(true);
      try {
        if (draftIdParam) {
          const draft = await getDraft(draftIdParam);
          if (!draft) throw new Error('Draft not found');
          const purposes = await getListingPurposes();
          const found = purposes.find((p) => p.id === draft.purpose_id) ?? null;
          if (!found) throw new Error("This draft's listing purpose is no longer available");
          const { steps: loadedSteps, fieldsByStep: loadedFields } = await getWorkflowForPurpose(found.id);
          if (cancelled) return;

          const resumeIndex = loadedSteps.findIndex((s) => s.step_key === draft.current_step);
          setPurpose(found);
          setSteps(loadedSteps);
          setFieldsByStep(loadedFields);
          setAnswers(draft.answers ?? {});
          setDraftId(draft.id);
          setStepIndex(resumeIndex >= 0 ? resumeIndex : 0);
          setCompletedKeys(loadedSteps.slice(0, resumeIndex >= 0 ? resumeIndex : 0).map((s) => s.step_key));
        } else if (purposeKeyParam) {
          const purposes = await getListingPurposes();
          const found = purposes.find((p) => p.key === purposeKeyParam) ?? null;
          if (!found) throw new Error('Unknown listing purpose');
          const { steps: loadedSteps, fieldsByStep: loadedFields } = await getWorkflowForPurpose(found.id);
          const draft = await createDraft(user.id, found.id);
          if (cancelled) return;

          setPurpose(found);
          setSteps(loadedSteps);
          setFieldsByStep(loadedFields);
          setAnswers({});
          setStepIndex(0);
          setCompletedKeys([]);
          setDraftId(draft.id);
          setParams({ purpose: purposeKeyParam, draft_id: draft.id }, { replace: true });
        }
      } catch (err) {
        toast.addToast('error', err instanceof Error ? err.message : 'Could not load listing wizard');
        setParams({}, { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftIdParam, purposeKeyParam, user?.id]);

  const handleSelectPurpose = useCallback(
    (p: ListingPurpose) => {
      setParams({ purpose: p.key });
    },
    [setParams],
  );

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (!currentStep) return;
    const fields = fieldsByStep[currentStep.id] ?? [];
    const stepErrors = validateStep(fields, answers);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast.addToast('error', 'Please fix the highlighted fields');
      return;
    }
    setErrors({});
    setCompletedKeys((prev) => (prev.includes(currentStep.step_key) ? prev : [...prev, currentStep.step_key]));
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [currentStep, fieldsByStep, answers, steps.length, toast]);

  const handleBack = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handlePublish = useCallback(async () => {
    if (!purpose || !draftId || !user) return;
    setPublishing(true);
    try {
      const allFields = Object.values(fieldsByStep).flat();
      await publishDraft({ draftId, ownerId: user.id, purpose, answers, allFields });
      toast.addToast('success', 'Listing submitted for review!');
      navigate('/portal/my-properties');
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Could not publish listing');
    } finally {
      setPublishing(false);
    }
  }, [purpose, draftId, user, fieldsByStep, answers, navigate, toast]);

  if (loading) {
    return (
      <DashboardLayout sections={sections} title="New Listing">
        <div className="flex justify-center py-24">
          <Spinner className="h-6 w-6" />
        </div>
      </DashboardLayout>
    );
  }

  if (!purpose) {
    return (
      <DashboardLayout sections={sections} title="New Listing">
        <PageHeader title="New Listing (Beta)" subtitle="A dynamic, purpose-driven listing flow." />
        <PurposeSelector onSelect={handleSelectPurpose} />
      </DashboardLayout>
    );
  }

  const stepperSteps = steps.map((s) => ({ key: s.step_key, label: s.label }));
  const fields = fieldsByStep[currentStep?.id ?? ''] ?? [];

  return (
    <DashboardLayout sections={sections} title="New Listing">
      <PageHeader title={purpose.label} subtitle="New Listing (Beta)" />
      <div className="mx-auto max-w-2xl">
        <Stepper steps={stepperSteps} currentIndex={stepIndex} completedKeys={completedKeys} />

        <div className="rounded-2xl border border-navy-150 bg-white p-5 sm:p-7">
          {currentStep?.step_key === 'ai_content' ? (
            <AiContentStep answers={answers} onApply={handleFieldChange} />
          ) : currentStep?.step_key === 'review' ? (
            <PreviewStep
              steps={steps}
              fieldsByStep={fieldsByStep}
              answers={answers}
              onPublish={handlePublish}
              publishing={publishing}
            />
          ) : (
            <DynamicStepRenderer fields={fields} values={answers} errors={errors} onChange={handleFieldChange} />
          )}
        </div>

        {currentStep?.step_key !== 'review' && (
          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={handleBack} disabled={stepIndex === 0}>
              Back
            </Button>
            <Button variant="primary" icon={<ArrowRight className="h-4 w-4" />} onClick={handleNext}>
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
