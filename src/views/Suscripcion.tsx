import { Title, Card, Group, Text, Badge, Progress, Button, SimpleGrid, Paper, Select, Stack, Divider, ActionIcon, CopyButton, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy, IconCircleCheck, IconInfoCircle, IconBrandWhatsapp, IconMail } from '@tabler/icons-react';
import { useState } from 'react';

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function Suscripcion({ animalesTotales = 0, establecimientosTotales = 0, datosSuscripcion }: any) {
    const [planVisualizar, setPlanVisualizar] = useState<string | null>(datosSuscripcion?.plan_nombre || 'BASICO');

    if (!datosSuscripcion) return <Text mt="xl" ta="center" c="dimmed">Cargando datos de suscripción...</Text>;

    const estaVencido = datosSuscripcion.fecha_vencimiento ? new Date(datosSuscripcion.fecha_vencimiento + 'T23:59:59') < new Date() : false;

    const planesInfo: any = {
        'BASICO': {
            precio: '$40.000',
            animales: 100,
            campos: 1,
            features: ['Gestión integral de Hacienda', 'Agenda Sanitaria automatizada', 'Control de Caja y Economía', 'Respaldo seguro de Base de Datos', 'Soporte técnico ante errores'],
            color: 'blue'
        },
        'PRO': {
            precio: '$65.000',
            animales: 300,
            campos: 3,
            features: ['Todo lo del plan Básico', 'Módulo de Lotes y Nutrición', 'Carga de eventos Masivos', 'Soporte prioritario y atención rápida'],
            color: 'violet'
        },
        'PREMIUM': {
            precio: '$90.000',
            animales: 'Ilimitados',
            campos: 'Ilimitados',
            features: ['Hasta ilimitados animales', 'Hasta ilimitados establecimientos', 'Todo lo del plan Pro', 'Transferencias en red a otros usuarios', 'Reportes de métricas avanzadas', 'Soporte VIP y atención personalizada'],
            color: 'teal'
        }
    };

    const planActualInfo = planesInfo[datosSuscripcion.plan_nombre || 'BASICO'] || planesInfo['BASICO'];
    const planVistoInfo = planesInfo[planVisualizar || 'BASICO'];

    const pctAnimales = planActualInfo.animales === 'Ilimitados' ? 0 : Math.min((animalesTotales / planActualInfo.animales) * 100, 100);
    const pctCampos = planActualInfo.campos === 'Ilimitados' ? 0 : Math.min((establecimientosTotales / planActualInfo.campos) * 100, 100);

    return (
        <>
            <Title order={2} mb="lg">Suscripción y Estado de Cuenta</Title>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* COLUMNA IZQUIERDA - ESTADO ACTUAL */}
                <Card shadow="sm" p="lg" radius="md" withBorder>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="xs">Plan Actual</Text>
                    <Group justify="space-between" mb="md" align="center">
                        <Title order={3}>Plan {datosSuscripcion.plan_nombre}</Title>
                        <Badge color={estaVencido ? 'red' : 'teal'} size="lg" variant="light">{estaVencido ? 'VENCIDO' : 'ACTIVO'}</Badge>
                    </Group>

                    <Paper bg="gray.0" p="sm" radius="md" mb="xl">
                        <Group justify="space-between">
                            <Text size="sm" c="dimmed">Próximo Vencimiento</Text>
                            <Text fw={700} c={estaVencido ? 'red' : 'dark'}>{formatDate(datosSuscripcion.fecha_vencimiento)}</Text>
                        </Group>
                    </Paper>

                    <Text fw={700} mb="sm">Consumo de Recursos</Text>
                    <Stack gap="xs" mb="xl">
                        <div>
                            <Group justify="space-between" mb={5}>
                                <Text size="sm">Animales ({animalesTotales} / {planActualInfo.animales})</Text>
                                <Text size="xs" c="dimmed">{Math.round(pctAnimales)}%</Text>
                            </Group>
                            {/* Acá restauramos el tamaño de la barra original */}
                            <Progress value={pctAnimales} color={pctAnimales > 90 ? 'red' : 'blue'} size="lg" />
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <Group justify="space-between" mb={5}>
                                <Text size="sm">Establecimientos ({establecimientosTotales} / {planActualInfo.campos})</Text>
                                <Text size="xs" c="dimmed">{Math.round(pctCampos)}%</Text>
                            </Group>
                            {/* Acá restauramos el tamaño de la barra original */}
                            <Progress value={pctCampos} color={pctCampos > 90 ? 'red' : 'teal'} size="lg" />
                        </div>
                    </Stack>

                    {/* BLOQUE DE PAGO POR TRANSFERENCIA DIRECTA (SIN COMISIONES) */}
                    <Paper withBorder p="md" radius="md" bg="gray.0">
                        <Text fw={700} mb="xs">Pagar Mensualidad</Text>
                        <Text size="sm" c="dimmed" mb="md">Transferí el monto de tu plan y envianos el comprobante para habilitarte el mes.</Text>

                        <Group mb="xs" align="center">
                            <Text size="sm" fw={600} w={40}>Alias:</Text>
                            {/* Alias sin badge/recuadro */}
                            <Text size="sm" ff="monospace" fw={500}>ggeroo</Text>
                            <CopyButton value="ggeroo" timeout={2000}>
                                {({ copied, copy }) => (
                                    <Tooltip label={copied ? 'Copiado' : 'Copiar Alias'} withArrow position="right">
                                        <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                                            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </CopyButton>
                        </Group>

                        <Group mb="md" align="center">
                            <Text size="sm" fw={600} w={40}>CBU:</Text>
                            <Text size="sm" ff="monospace" fw={500}>0000003100012241790004</Text>
                            <CopyButton value="0000003100012241790004" timeout={2000}>
                                {({ copied, copy }) => (
                                    <Tooltip label={copied ? 'Copiado' : 'Copiar CBU'} withArrow position="right">
                                        <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                                            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </CopyButton>
                        </Group>

                        <Divider my="sm" />
                        <Text size="sm" fw={600} mb="sm">Informar Pago:</Text>
                        <Group>
                            <Button
                                variant="light"
                                color="green"
                                leftSection={<IconBrandWhatsapp size={16} />}
                                onClick={() => window.open(`https://wa.me/5492345505575?text=Hola! Te paso el comprobante de pago de mi suscripción.%0A%0A*ID de Usuario:* ${datosSuscripcion?.user_id}`, '_blank')}
                            >
                                WhatsApp
                            </Button>
                            <Button
                                variant="light"
                                color="dark"
                                leftSection={<IconMail size={16} />}
                                onClick={() => window.open(`mailto:rodeocontrol.app@gmail.com?subject=Comprobante de Pago&body=Hola! Adjunto el comprobante de pago de mi suscripción.%0A%0AMi ID de usuario es: ${datosSuscripcion?.user_id}`)}
                            >
                                Email
                            </Button>
                        </Group>
                    </Paper>
                </Card>

                {/* COLUMNA DERECHA - COMPARATIVA */}
                <Stack>
                    <Card shadow="sm" p="lg" radius="md" withBorder>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="xs">Explorar otros niveles</Text>
                        <Select
                            label="Ver detalles del plan:"
                            data={['BASICO', 'PRO', 'PREMIUM']}
                            value={planVisualizar}
                            onChange={setPlanVisualizar}
                            mb="md"
                        />

                        <Paper p="md" radius="md" bg={`${planVistoInfo.color}.0`} style={{ border: `1px solid var(--mantine-color-${planVistoInfo.color}-3)` }}>
                            <Group justify="space-between" mb="lg">
                                <Title order={4} c={`${planVistoInfo.color}.9`}>Plan {planVisualizar}</Title>
                                <Text fw={800} size="xl" c={`${planVistoInfo.color}.9`}>{planVistoInfo.precio}<Text span size="sm" c="dimmed" fw={400}>/mes</Text></Text>
                            </Group>

                            <Stack gap="sm">
                                {planVistoInfo.features.map((feat: string, idx: number) => (
                                    <Group key={idx} gap="sm" wrap="nowrap" align="flex-start">
                                        <IconCircleCheck size={18} color={`var(--mantine-color-${planVistoInfo.color}-6)`} style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <Text size="sm" c="dark.4">{feat}</Text>
                                    </Group>
                                ))}
                            </Stack>
                        </Paper>
                    </Card>

                    <Paper withBorder p="md" radius="md" bg="gray.0">
                        <Group gap="sm" mb="xs" wrap="nowrap">
                            <IconInfoCircle size={20} color="gray" />
                            <Text fw={700} size="sm">¿Querés cambiar de plan?</Text>
                        </Group>
                        <Text size="sm" c="dimmed" mb="md" pl={34}>
                            Para realizar un upgrade/downgrade de tu plan o extender tus límites, contactanos directamente. Nosotros nos encargamos de actualizar tu cuenta y enviarte el nuevo enlace de facturación.
                        </Text>
                        <Group pl={34}>
                            <Button variant="default" size="xs" leftSection={<IconBrandWhatsapp size={14} />} onClick={() => window.open(`https://wa.me/5492345505575`, '_blank')}>+54 9 2345 505575</Button>
                            <Button variant="default" size="xs" leftSection={<IconMail size={14} />} onClick={() => window.open(`mailto:rodeocontrol.app@gmail.com`)}>rodeocontrol.app@gmail.com</Button>
                        </Group>
                    </Paper>
                </Stack>
            </SimpleGrid>
        </>
    );
}