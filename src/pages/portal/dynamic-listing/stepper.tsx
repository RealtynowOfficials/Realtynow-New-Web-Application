import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface StepperProps {
  steps: { key: string; label: string }[];
  currentIndex: number;
  completedKeys: string[];
}

/** Reusable horizontal progress stepper — no equivalent existed in the codebase before this. */
export function Stepper({ steps, currentIndex, completedKeys }: StepperProps) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-navy-500">
        <span>
          Step {currentIndex + 1} of {steps.length}
        </span>
        <span>{steps[currentIndex]?.label}</span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((step, i) => {
          const done = completedKeys.includes(step.key) || i < currentIndex;
          const active = i === currentIndex;
          return (
            <div
              key={step.key}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                done ? 'bg-red-500' : active ? 'bg-red-300' : 'bg-navy-150',
              )}
            />
          );
        })}
      </div>
      <div className="mt-3 hidden items-center gap-2 sm:flex">
        {steps.map((step, i) => {
          const done = completedKeys.includes(step.key) || i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step.key} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  done
                    ? 'bg-red-600 text-white'
                    : active
                      ? 'border-2 border-red-500 text-red-600'
                      : 'border-2 border-navy-200 text-navy-400',
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className={cn('truncate text-[11px] font-semibold', active ? 'text-navy-900' : 'text-navy-400')}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
