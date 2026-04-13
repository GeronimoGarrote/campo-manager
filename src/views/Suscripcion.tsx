import { Title, Card, Group, Text, Badge, Progress, Button, SimpleGrid, Paper, Select, Stack, Divider, Alert } from '@mantine/core';
import { IconCreditCard, IconAlertTriangle, IconCheck, IconCircleCheck, IconInfoCircle, IconBrandWhatsapp, IconMail } from '@tabler/icons-react';
import { useState } from 'react';

const formatDate = (dateString: string) => { 
    if (!dateString) return '-'; 
    const parts = dateString.split('-'); 
    return `${parts[2]}/${parts[1]}/${parts[0]}`; 
};

export default function Suscripcion({ animalesTotales, establecimientosTotales, datosSuscripcion }: any) {
    const [planVisualizar, setPlanVisualizar] = useState<string | null>(datosSuscripcion?.plan_nombre || 'BASICO');

    if (!datosSuscripcion) return <Text mt="xl" ta="center" c="dimmed">Cargando datos de suscripción...</Text>;

    const estaVencido = datosSuscripcion.fecha_vencimiento ? new Date(datosSuscripcion.fecha_vencimiento + 'T23:59:59') < new Date() : false;

    // Data de los planes para la comparativa (Actualizados)
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
            features: ['Todo lo del plan Pro', 'Transferencias en red a otros usuarios', 'Reportes de métricas avanzadas', 'Soporte VIP y atención personalizada'], 
            color: 'teal' 
        }
    };

    // --- MAGIA ANTI-ERRORES (Convierte a mayúscula y elimina espacios) ---
    const planSeguro = (planVisualizar || 'BASICO').toString().toUpperCase().trim();
    const infoActual = planesInfo[planSeguro] || planesInfo['BASICO'];
    
    // Formateo del nombre del plan de la base de datos para mostrarlo lindo
    const nombrePlanDB = (datosSuscripcion.plan_nombre || 'BASICO').toString().toUpperCase().trim();

    return (
        <Stack gap="lg">
            <Title order={2}>Suscripción y Estado de Cuenta</Title>

            {estaVencido && (
                <Alert icon={<IconAlertTriangle size="1rem" />} title="Cuenta Vencida" color="red" variant="filled">
                    Tu acceso ha sido limitado porque el ciclo de facturación ha finalizado. Por favor, regularizá tu pago para continuar operando.
                </Alert>
            )}

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* ESTADO ACTUAL */}
                <Card shadow="sm" radius="md" p="xl" withBorder>
                    <Group justify="space-between" mb="md">
                        <Stack gap={0}>
                            <Text size="xs" fw={700} c="dimmed">PLAN ACTUAL</Text>
                            <Text fw={800} size="xl">Plan {nombrePlanDB}</Text>
                        </Stack>
                        <Badge size="xl" color={estaVencido ? 'red' : 'teal'} variant="light" p="md">
                            {estaVencido ? 'VENCIDO' : 'ACTIVO'}
                        </Badge>
                    </Group>

                    <Paper bg="gray.0" p="md" radius="md" mb="xl">
                        <Group justify="space-between">
                            <Text size="sm" fw={700} c="dimmed">Próximo Vencimiento</Text>
                            <Text fw={700} c={estaVencido ? 'red' : 'dark'}>
                                {datosSuscripcion.fecha_vencimiento ? formatDate(datosSuscripcion.fecha_vencimiento) : 'No registrado'}
                            </Text>
                        </Group>
                    </Paper>

                    <Text fw={700} mb="xs" size="sm">Consumo de Recursos</Text>
                    
                    <Group justify="space-between" mt="sm">
                        <Text size="xs" fw={600}>Animales ({animalesTotales} / {datosSuscripcion.limite_animales})</Text>
                        <Text size="xs" c="dimmed">{Math.round((animalesTotales/datosSuscripcion.limite_animales)*100)}%</Text>
                    </Group>
                    <Progress value={(animalesTotales/datosSuscripcion.limite_animales)*100} mt={5} size="lg" color="blue" radius="xl" />

                    <Group justify="space-between" mt="md">
                        <Text size="xs" fw={600}>Establecimientos ({establecimientosTotales} / {datosSuscripcion.limite_establecimientos})</Text>
                        <Text size="xs" c="dimmed">{Math.round((establecimientosTotales/datosSuscripcion.limite_establecimientos)*100)}%</Text>
                    </Group>
                    <Progress value={(establecimientosTotales/datosSuscripcion.limite_establecimientos)*100} mt={5} size="lg" color="teal" radius="xl" />

                    <Button fullWidth size="lg" mt="xl" color="blue" leftSection={<IconCreditCard size={20}/>} onClick={() => window.open(datosSuscripcion.link_pago_mp, '_blank')}>
                        Pagar Mensualidad
                    </Button>
                </Card>

                {/* EXPLORADOR DE PLANES Y CONTACTO */}
                <Stack gap="lg">
                    <Card shadow="sm" radius="md" p="xl" withBorder>
                        <Text size="xs" fw={700} c="dimmed" mb="xs">EXPLORAR OTROS NIVELES</Text>
                        <Select 
                            label="Ver detalles del plan:"
                            data={['BASICO', 'PRO', 'PREMIUM']}
                            value={planSeguro === 'PRO' || planSeguro === 'PREMIUM' ? planSeguro : 'BASICO'}
                            onChange={setPlanVisualizar}
                            mb="md"
                        />

                        <Paper withBorder p="md" radius="md" bg={`${infoActual.color}.0`} style={{ borderColor: `var(--mantine-color-${infoActual.color}-2)` }}>
                            <Group justify="space-between" mb="xs">
                                <Text fw={700} c={`${infoActual.color}.9`}>Plan {planSeguro === planVisualizar ? planSeguro : (planVisualizar || 'BASICO')}</Text>
                                <Text fw={800} size="lg" c={`${infoActual.color}.9`}>{infoActual.precio}<Text span size="xs" fw={500}> /mes</Text></Text>
                            </Group>
                            <Divider mb="sm" />
                            <Stack gap="xs">
                                <Group gap="xs">
                                    <IconCircleCheck size={16} color={`var(--mantine-color-${infoActual.color}-6)`} />
                                    <Text size="sm">Hasta <b>{infoActual.animales}</b> animales</Text>
                                </Group>
                                <Group gap="xs">
                                    <IconCircleCheck size={16} color={`var(--mantine-color-${infoActual.color}-6)`} />
                                    <Text size="sm">Hasta <b>{infoActual.campos}</b> establecimientos</Text>
                                </Group>
                                {infoActual.features.map((f: string) => (
                                    <Group gap="xs" key={f}>
                                        <IconCheck size={16} color="gray" />
                                        <Text size="sm">{f}</Text>
                                    </Group>
                                ))}
                            </Stack>
                        </Paper>
                    </Card>

                    {/* TARJETA DE CONTACTO PARA CAMBIO DE PLAN */}
                    <Alert icon={<IconInfoCircle size="1.2rem" />} title="¿Querés cambiar de plan?" color="gray" variant="light" style={{ border: '1px solid #dee2e6' }}>
                        <Text size="sm" mb="sm">
                            Para realizar un upgrade/downgrade de tu plan o extender tus límites, contactanos directamente. Nosotros nos encargamos de actualizar tu cuenta y enviarte el nuevo enlace de facturación.
                        </Text>
                        <Group mt="md">
                            <Badge 
                                component="a" 
                                href="https://wa.me/5492345505575" 
                                target="_blank"
                                size="lg" 
                                variant="outline" 
                                color="dark" 
                                leftSection={<IconBrandWhatsapp size={14}/>}
                                style={{ cursor: 'pointer' }}
                            >
                                +54 9 2345 505575
                            </Badge>
                            <Badge 
                                component="a" 
                                href="mailto:rodeocontrol.app@gmail.com" 
                                size="lg" 
                                variant="outline" 
                                color="dark" 
                                leftSection={<IconMail size={14}/>} 
                                style={{ textTransform: 'none', cursor: 'pointer' }}
                            >
                                rodeocontrol.app@gmail.com
                            </Badge>
                        </Group>
                    </Alert>
                </Stack>
            </SimpleGrid>
        </Stack>
    );
}