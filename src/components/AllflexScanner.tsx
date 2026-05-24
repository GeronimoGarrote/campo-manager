import { useState } from 'react';
import { Alert, Badge, Button, Group, Paper, Text, ActionIcon, Tooltip } from '@mantine/core';
import { IconBluetooth, IconBluetoothOff, IconPlugConnected, IconPlugConnectedX, IconAlertCircle } from '@tabler/icons-react';
import { useWebSerialAllflex } from '../hooks/useWebSerialAllflex';

interface Props {
    onScan: (eid: string) => void;
    baudRate?: number;
}

export default function AllflexScanner({ onScan, baudRate }: Props) {
    const { isConectado, error, conectarPuerto, desconectar } = useWebSerialAllflex({ onScan, baudRate });
    const [errorDismissed, setErrorDismissed] = useState(false);

    // Cuando cambia el error (nuevo intento) volvemos a mostrar el Alert
    const errorVisible = !!error && !errorDismissed;

    return (
        <Paper
            withBorder
            p="xs"
            radius="md"
            style={{
                borderColor: isConectado
                    ? 'var(--mantine-color-teal-5)'
                    : 'var(--mantine-color-gray-3)',
                background: isConectado
                    ? 'var(--mantine-color-teal-0)'
                    : 'var(--mantine-color-gray-0)',
                transition: 'all 0.2s ease',
            }}
        >
            <Group gap="sm" wrap="nowrap">
                <Badge
                    size="md"
                    color={isConectado ? 'teal' : 'gray'}
                    variant="dot"
                    leftSection={
                        isConectado
                            ? <IconBluetooth size={11} />
                            : <IconBluetoothOff size={11} />
                    }
                >
                    {isConectado ? 'SPP conectado' : 'Sin conexión SPP'}
                </Badge>

                {isConectado ? (
                    <Tooltip label="Cerrar puerto y desconectar" withArrow>
                        <ActionIcon
                            color="red"
                            variant="light"
                            size="sm"
                            onClick={desconectar}
                        >
                            <IconPlugConnectedX size={14} />
                        </ActionIcon>
                    </Tooltip>
                ) : (
                    <Button
                        size="xs"
                        color="teal"
                        variant="filled"
                        leftSection={<IconPlugConnected size={14} />}
                        onClick={() => { setErrorDismissed(false); conectarPuerto(); }}
                    >
                        Conectar bastón (COM)
                    </Button>
                )}
            </Group>

            {errorVisible && (
                <Alert
                    icon={<IconAlertCircle size={14} />}
                    color="red"
                    variant="light"
                    mt="xs"
                    p="xs"
                    withCloseButton
                    onClose={() => setErrorDismissed(true)}
                >
                    <Text size="xs">{error}</Text>
                </Alert>
            )}
        </Paper>
    );
}
