import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useAdminAuth } from '../contexts/admin-auth-context';

export function GlobalAppLoader({ children }: { children: React.ReactNode }) {
  const { loading: authLoading } = useAuth();
  const { loading: adminLoading } = useAdminAuth();

  const [showLoader, setShowLoader] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Proceed when both authentication contexts have resolved their initial state
    if (!authLoading && !adminLoading) {
      setIsReady(true);
      // Wait for the 500ms CSS transition to finish before completely unmounting the loader
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [authLoading, adminLoading]);

  return (
    <>
      {showLoader && (
        <div
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-in-out ${
            isReady ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            <p className="animate-pulse font-medium text-navy-900">Initializing RealtyNow...</p>
          </div>
        </div>
      )}
      
      {/* The main application content mounts here and fades in */}
      <div
        className={`h-full w-full transition-opacity duration-500 ease-in-out ${
          isReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {isReady && children}
      </div>
    </>
  );
}
