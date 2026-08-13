import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui';

export function ServiceUnavailable({ serviceName }: { serviceName: string }) {
  return (
    <div className="min-h-screen bg-navy-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <div className="h-24 w-24 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-6">
          <AlertTriangle className="h-12 w-12 text-amber-600" />
        </div>
        <h1 className="font-display text-2xl font-bold text-navy-900">{serviceName} Temporarily Unavailable</h1>
        <p className="mt-3 text-navy-600">
          The {serviceName.toLowerCase()} is currently disabled by the administrator. Please try again later.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button variant="primary" size="lg">
            Go to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
