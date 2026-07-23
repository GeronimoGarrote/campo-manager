import { Modal, Stack, Paper, Group, ThemeIcon, Text, Button } from '@mantine/core';
import { IconScan, IconPlugConnected, IconKeyboard } from '@tabler/icons-react';
import type { ModoBaston } from '../hooks/useWebSerialAllflex';

interface Props {
    opened: boolean;
    onClose: () => void;
    isConectadoCOM: boolean;
    metodoBaston: ModoBaston;
    error: string | null;
    onConectarRC: () => void;
    onConectarCOM: () => void;
    onDesconectar: () => void;
}

export default function BastonModal({
    opened, onClose, isConectadoCOM, metodoBaston, error,
    onConectarRC, onConectarCOM, onDesconectar
}: Props) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="¿Qué bastón vas a usar?"
            size="sm"
            centered
        >
            <Stack gap="sm">
                {/* RodeoControl */}
                <Paper
                    withBorder p="md" radius="md"
                    style={{ borderColor: isConectadoCOM && metodoBaston === 'rodeocontrol' ? 'var(--mantine-color-teal-5)' : undefined }}
                >
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                        <Stack gap={4}>
                            <Group gap="xs">
                                <ThemeIcon color="teal" size="md" variant="light" radius="xl">
                                    <IconScan size={16} />
                                </ThemeIcon>
                                <Text fw={700} size="sm">Bastón RodeoControl</Text>
                            </Group>
                            <Text size="xs" c="dimmed" ml={32}>
                                {isConectadoCOM && metodoBaston === 'rodeocontrol'
                                    ? '✓ Conectado y listo para escanear'
                                    : 'Conectalo por Bluetooth y tocá Conectar'}
                            </Text>
                        </Stack>
                        {isConectadoCOM && metodoBaston === 'rodeocontrol' ? (
                            <Button size="xs" color="red" variant="subtle" onClick={onDesconectar}>
                                Desconectar
                            </Button>
                        ) : (
                            <Button size="xs" color="teal" onClick={() => { onConectarRC(); onClose(); }}>
                                Conectar
                            </Button>
                        )}
                    </Group>
                </Paper>

                {/* Allflex */}
                <Paper
                    withBorder p="md" radius="md"
                    style={{ borderColor: isConectadoCOM && metodoBaston === 'com' ? 'var(--mantine-color-blue-5)' : undefined }}
                >
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                        <Stack gap={4}>
                            <Group gap="xs">
                                <ThemeIcon color="blue" size="md" variant="light" radius="xl">
                                    <IconPlugConnected size={16} />
                                </ThemeIcon>
                                <Text fw={700} size="sm">Bastónes antiguos</Text>
                            </Group>
                            <Text size="xs" c="dimmed" ml={32}>
                                {isConectadoCOM && metodoBaston === 'com'
                                    ? '✓ Conectado y listo para escanear'
                                    : 'Conectalo al puerto COM y tocá Conectar'}
                            </Text>
                        </Stack>
                        {isConectadoCOM && metodoBaston === 'com' ? (
                            <Button size="xs" color="red" variant="subtle" onClick={onDesconectar}>
                                Desconectar
                            </Button>
                        ) : (
                            <Button size="xs" color="blue" variant="outline" onClick={() => { onConectarCOM(); onClose(); }}>
                                Conectar
                            </Button>
                        )}
                    </Group>
                </Paper>

                {/* HID */}
                <Paper withBorder p="md" radius="md" bg="gray.0">
                    <Group gap="xs">
                        <ThemeIcon color="gray" size="md" variant="light" radius="xl">
                            <IconKeyboard size={16} />
                        </ThemeIcon>
                        <Stack gap={2}>
                            <Text fw={700} size="sm" c="dimmed">Bastones HID modernos</Text>
                            <Text size="xs" c="dimmed">
                                Con conectarlos al Bluetooth del equipo y activar el lector ya esta listo.
                            </Text>
                        </Stack>
                    </Group>
                </Paper>

                {error && (
                    <Text size="xs" c="red" ta="center">{error}</Text>
                )}
            </Stack>
        </Modal>
    );
}
