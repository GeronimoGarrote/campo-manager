import { useEffect, useState } from 'react';
import { Paper, Group, Text, Button, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconX, IconDownload } from '@tabler/icons-react';

const DISMISSED_KEY = 'rc_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISSED_KEY));

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    if (isStandalone || dismissed) return;

    if (isIOS) {
      setShowIOS(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isStandalone, dismissed, isIOS]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOS(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
    setDeferredPrompt(null);
  };

  if (!isMobile || isStandalone || dismissed) return null;
  if (!deferredPrompt && !showIOS) return null;

  return (
    <Paper
      withBorder
      shadow="md"
      p="sm"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        {showIOS ? (
          <Text size="sm" style={{ flex: 1 }}>
            Para instalar RodeoControl: tocá el botón Compartir (□↑) y elegí{' '}
            <strong>"Agregar a pantalla de inicio"</strong>.
          </Text>
        ) : (
          <Group gap="xs" style={{ flex: 1 }} wrap="nowrap">
            <IconDownload size={18} style={{ flexShrink: 0 }} />
            <Text size="sm">Instalá RodeoControl como app para acceso más rápido.</Text>
          </Group>
        )}
        <Group gap={6} wrap="nowrap">
          {!showIOS && (
            <Button size="xs" variant="filled" color="teal" onClick={handleInstall}>
              Instalar
            </Button>
          )}
          <ActionIcon variant="subtle" color="gray" size="sm" onClick={dismiss}>
            <IconX size={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}
