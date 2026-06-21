import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Singleton compartido entre todas las instancias del hook.
// El evento se registra una sola vez a nivel módulo.
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
const _subscribers = new Set<() => void>();

const _notify = () => _subscribers.forEach(fn => fn());
const _clearPrompt = () => { _deferredPrompt = null; _notify(); };

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
    _notify();
  });
}

const isStandalone =
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true);

const isIOS =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod/.test(navigator.userAgent) &&
  !(window as any).MSStream;

export function useInstallPrompt() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1);
    _subscribers.add(fn);
    return () => { _subscribers.delete(fn); };
  }, []);

  const canInstall = !isStandalone && (!!_deferredPrompt || (isIOS && !isStandalone));

  const instalar = async (): Promise<'native' | 'ios' | null> => {
    if (_deferredPrompt) {
      await _deferredPrompt.prompt();
      await _deferredPrompt.userChoice;
      _clearPrompt();
      return 'native';
    }
    if (isIOS) return 'ios';
    return null;
  };

  return { isStandalone, isIOS, canInstall, instalar, deferredPrompt: _deferredPrompt };
}
