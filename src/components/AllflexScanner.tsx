import { useState } from 'react';
import { Alert, Button, Group, Text, ActionIcon, Tooltip, ThemeIcon } from '@mantine/core';
import { IconBluetooth, IconBluetoothOff, IconPlugConnected, IconX, IconAlertCircle } from '@tabler/icons-react';
import { useWebSerialAllflex } from '../hooks/useWebSerialAllflex';

interface Props {
    onScan: (eid: string) => void;
    baudRate?: number;
}

export default function AllflexScanner({ onScan, baudRate }: Props) {
    const { isConectado, error, conectarPuerto, desconectar } = useWebSerialAllflex({ onScan, baudRate });
    const [errorDismissed, setErrorDismissed] = useState(false);
    const errorVisible = !!error && !errorDismissed;

    return (
        <Group gap="xs" wrap="nowrap" align="center">
            {isConectado ? (
                <>
                    <ThemeIcon color="teal" variant="light" size="sm" radius="xl">
                        <IconBluetooth size={12} />
                    </ThemeIcon>
                    <Text size="sm" c="teal" fw={600} style={{ whiteSpace: 'nowrap' }}>
                        COM conectado
                    </Text>
                    <Tooltip label="Desconectar puerto COM" withArrow>
                        <ActionIcon size="sm" color="red" variant="subtle" onClick={desconectar}>
                            <IconX size={12} />
                        </ActionIcon>
                    </Tooltip>
                </>
            ) : (
                <Group gap="xs" wrap="nowrap" align="center">
                    <ThemeIcon color="gray" variant="light" size="sm" radius="xl">
                        <IconBluetoothOff size={12} />
                    </ThemeIcon>
                    <Button
                        size="xs"
                        variant="outline"
                        color="teal"
                        leftSection={<IconPlugConnected size={13} />}
                        onClick={() => { setErrorDismissed(false); conectarPuerto(); }}
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        Conectar COM
                    </Button>
                </Group>
            )}

            {errorVisible && (
                <Alert
                    icon={<IconAlertCircle size={12} />}
                    color="red"
                    variant="light"
                    p="xs"
                    withCloseButton
                    onClose={() => setErrorDismissed(true)}
                    style={{ flex: 1 }}
                >
                    <Text size="xs" lineClamp={2}>{error}</Text>
                </Alert>
            )}
        </Group>
    );
}
