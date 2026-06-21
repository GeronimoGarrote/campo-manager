import { useState } from 'react';
import { Group, Text, Button, ActionIcon } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconX, IconDeviceMobile } from '@tabler/icons-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const SESSION_KEY = 'rc_install_dismissed_session';

export default function SugerenciaDescarga() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isStandalone, isIOS, canInstall, instalar } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem(SESSION_KEY));

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    await instalar();
    dismiss();
  };

  if (!isMobile || isStandalone || dismissed || !canInstall) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 60,
        left: 0,
        right: 0,
        zIndex: 150,
        backgroundColor: 'var(--mantine-color-teal-7)',
        padding: '10px 16px',
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
          <IconDeviceMobile size={22} color="white" style={{ flexShrink: 0, opacity: 0.9 }} />
          <div>
            {isIOS ? (
              <>
                <Text size="sm" fw={700} c="white" lh={1.3}>
                  Llevá RodeoControl en tu bolsillo
                </Text>
                <Text size="xs" c="white" style={{ opacity: 0.85 }} lh={1.3}>
                  Tocá Compartir (□↑) → "Agregar a pantalla de inicio". Quedará como una app, sin abrir el navegador.
                </Text>
              </>
            ) : (
              <>
                <Text size="sm" fw={700} c="white" lh={1.3}>
                  Descargalo y aprovechá RodeoControl al máximo
                </Text>
                <Text size="xs" c="white" style={{ opacity: 0.85 }} lh={1.3}>
                  Instalá RodeoControl y entrá con un toque, directo desde tu pantalla de inicio.
                </Text>
              </>
            )}
          </div>
        </Group>
        <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
          {!isIOS && (
            <Button size="xs" variant="white" c="teal.8" fw={700} onClick={handleInstall}>
              Instalar ahora
            </Button>
          )}
          <ActionIcon variant="transparent" c="white" size="sm" onClick={dismiss}>
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </div>
  );
}
