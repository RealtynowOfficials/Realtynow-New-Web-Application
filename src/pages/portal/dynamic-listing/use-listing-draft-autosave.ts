import { useEffect, useRef } from 'react';
import { saveDraft } from '../../../lib/listing-drafts';

/** Debounced (1s) autosave on every change, plus a 30s safety-interval save. */
export function useListingDraftAutosave(
  draftId: string | null,
  answers: Record<string, unknown>,
  currentStepKey: string,
) {
  const answersRef = useRef(answers);
  const stepRef = useRef(currentStepKey);
  answersRef.current = answers;
  stepRef.current = currentStepKey;

  useEffect(() => {
    if (!draftId) return;
    const timer = setTimeout(() => {
      saveDraft(draftId, answersRef.current, stepRef.current).catch(() => {
        /* best-effort */
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [draftId, answers, currentStepKey]);

  useEffect(() => {
    if (!draftId) return;
    const interval = setInterval(() => {
      saveDraft(draftId, answersRef.current, stepRef.current).catch(() => {
        /* best-effort */
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [draftId]);
}
