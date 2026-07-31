import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Zap, WifiOff, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if user dismissed previously in this session
      const dismissed = sessionStorage.getItem('realtynow_pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('[PWA] RealtyNow app successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        setShowPrompt(false);
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
    } catch (err) {
      console.error('[PWA] Error triggering install prompt:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('realtynow_pwa_dismissed', 'true');
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-bounce-in">
      <div className="bg-slate-900/95 backdrop-blur-md border border-red-500/30 text-white p-5 rounded-2xl shadow-2xl shadow-red-950/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="RealtyNow App"
              className="w-12 h-12 rounded-xl border border-red-500/40 shadow-md object-cover"
            />
            <div>
              <h4 className="font-bold text-base text-white flex items-center gap-1.5">
                Install RealtyNow <Smartphone className="w-4 h-4 text-red-400" />
              </h4>
              <p className="text-xs text-slate-300">Fast, offline-ready property search app</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close prompt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 py-2 border-y border-slate-800/80 space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Instant launch from your home screen</span>
          </div>
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Works offline & on weak networks</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>No app store download required</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 text-sm transition-all transform active:scale-95"
          >
            <Download className="w-4 h-4" /> Install App
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};
