import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Home, Check } from 'lucide-react';
import { Card, Spinner } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { getListingPurposes, type ListingPurpose } from '../../../lib/listing-config';

interface PurposeSelectorProps {
  onSelect: (purpose: ListingPurpose) => void;
}

function iconFor(name: string | null) {
  const Icon = (name && (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]) || Home;
  return Icon;
}

export function PurposeSelector({ onSelect }: PurposeSelectorProps) {
  const [purposes, setPurposes] = useState<ListingPurpose[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    getListingPurposes()
      .then(setPurposes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load listing options'));
  }, []);

  if (error) {
    return <p className="text-sm font-semibold text-error-600">{error}</p>;
  }

  if (!purposes) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900">What is the purpose of your listing?</h1>
      <p className="mt-1.5 text-sm text-navy-500">Choose one to see the steps tailored to it.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {purposes.map((purpose) => {
          const Icon = iconFor(purpose.icon);
          const selected = selectedKey === purpose.key;
          return (
            <Card
              key={purpose.id}
              onClick={() => {
                setSelectedKey(purpose.key);
                onSelect(purpose);
              }}
              className={cn(
                'relative cursor-pointer border-2 p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md',
                selected ? 'border-red-500 shadow-md' : 'border-transparent',
              )}
            >
              {selected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white"
                >
                  <Check className="h-3 w-3" />
                </motion.span>
              )}
              <Icon className="mx-auto h-7 w-7 text-red-600" />
              <p className="mt-2 text-sm font-bold text-navy-900">{purpose.label}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
