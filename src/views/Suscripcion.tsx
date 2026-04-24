import { 
    Title, Card, Group, Text, Badge, Progress, Button, Paper, 
    Stack, Divider, ActionIcon, CopyButton, Grid 
} from '@mantine/core';
import { 
    IconCheck, IconCopy, IconCircleCheck, 
    IconBrandWhatsapp, IconMail, IconCreditCard 
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';

interface SuscripcionProps {
    animalesTotales: number;
    establecimientosTotales: number;
    datosSuscripcion: any;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const calcularProgresoSeguro = (actual: any, limite: any, esPremium: boolean) => {
    if (esPremium) return 100;
    const numActual = Number(actual) || 0;
    const numLimite = Math.max(1, Number(limite) || 100);
    const porcentaje = Math.floor((numActual / numLimite) * 100);
    return (Number.isNaN(porcentaje) || porcentaje < 0) ? 0 : Math.min(porcentaje, 100);
};

export default function Suscripcion({ animalesTotales = 0, establecimientosTotales = 0, datosSuscripcion }: SuscripcionProps) {
    // El selector de la derecha siempre arranca mostrando el BASICO para tentar al usuario
    const [planVisualizar, setPlanVisualizar] = useState<string>('BASICO');

    if (!datosSuscripcion) return null; 

    const esPremium = datosSuscripcion.plan_nombre === 'PREMIUM';

    let diasRestantes = 0;
    if (datosSuscripcion.fecha_vencimiento) {
        const diff = new Date(datosSuscripcion.fecha_vencimiento + 'T23:59:59').getTime() - new Date().getTime();
        const diasCalc = Math.ceil(diff / (1000 * 60 * 60 * 24));
        diasRestantes = (Number.isNaN(diasCalc) || diasCalc < 0) ? 0 : diasCalc;
    }

    const numAnimales = Number(animalesTotales) || 0;
    const numLimAnimales = Number(datosSuscripcion.limite_animales) || 100;
    const porcentajeAnimales = calcularProgresoSeguro(animalesTotales, datosSuscripcion.limite_animales, esPremium);

    const numEstablecimientos = Number(establecimientosTotales) || 0;
    const numLimEstablecimientos = Number(datosSuscripcion.limite_establecimientos) || 1;
    const porcentajeEstablecimientos = calcularProgresoSeguro(establecimientosTotales, datosSuscripcion.limite_establecimientos, esPremium);

    const labelLimiteAnimales = esPremium ? 'Ilimitados' : numLimAnimales;
    const labelLimiteEstablecimientos = esPremium ? 'Ilimitados' : numLimEstablecimientos;

    const planesInfo: any = {
        'PRUEBA': {
            titulo: 'Plan de Prueba',
            color: 'orange',
        },
        'BASICO': {
            titulo: 'Plan Básico',
            precio: '$ 35.000 / mes',
            color: 'teal',
            limites: 'Para productores chicos',
            caracteristicas: [
                'Hasta 100 animales por establecimiento',
                'Un solo establecimiento',
                'Transferencia de animales entre usuarios',
                'Gestión completa de Sanidad y Eventos',
                'Control de Economía y Cuentas',
                'Alerta automática de Partos Estimados',
                'Clasificación por Lotes',
                'Carga Masiva de Animales',
                'Módulo de Agricultura y Potreros',
                'Soporte de errores'
            ]
        },
        'PRO': {
            titulo: 'Plan Profesional',
            precio: '$ 50.000 / mes',
            color: 'blue',
            limites: 'Para productores medianos',
            caracteristicas: [
                'TODO lo incluido en el Plan Básico',
                'Hasta 3 establecimientos',
                'Hasta 300 animales por establecimiento',
                'Soporte técnico',
                'Backup de datos mensual'
            ]
        },
        'PREMIUM': {
            titulo: 'Plan Premium',
            precio: '$ 75.000 / mes',
            color: 'grape',
            limites: 'Para grandes productores.',
            caracteristicas: [
                'Todo lo incluido en el Plan Profesional',
                'Establecimientos ilimitados', 
                'Animales ilimitados',
                'Soporte técnico prioritario',
                'Backup de datos semanal'
            ]
        }
    };

    const handleContact = (tipo: 'WA' | 'MAIL', plan: string) => {
        const msg = `Hola! Me interesa mejorar mi cuenta de RodeoControl al Plan ${plan}. Mi ID: ${datosSuscripcion.user_id || 'Desconocido'}`;
        if (tipo === 'WA') {
            window.open(`https://wa.me/5492345505575?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            window.location.href = `mailto:rodeocontrol.app@gmail.com?subject=Cambio de Plan&body=${encodeURIComponent(msg)}`;
        }
    };

    // Fallback de seguridad por si la bdd manda fruta
    const infoPlanActual = planesInfo[datosSuscripcion.plan_nombre] || planesInfo['BASICO'];

    return (
        <Stack gap="xl">
            <div>
                <Title order={2} mb={5}>ESTADO DE LA CUENTA</Title>
                <Text c="dimmed" size="sm">Gestioná tu suscripción y visualizá los límites de tu plan actual.</Text>
            </div>

            <Grid gutter="lg" align="stretch">
                {/* COLUMNA IZQUIERDA: ESTADO ACTUAL */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Stack gap="lg" style={{ height: '100%' }}>
                        <Card withBorder shadow="sm" radius="md" p="xl">
                            <Group justify="space-between" mb="lg">
                                <div>
                                    <Text size="xs" fw={700} c="dimmed">PLAN ACTUAL</Text>
                                    <Title order={3} c={`${infoPlanActual.color}.7`}>
                                        {infoPlanActual.titulo}
                                    </Title>
                                </div>
                                <Badge size="xl" color={diasRestantes > 7 ? 'teal' : diasRestantes > 0 ? 'orange' : 'red'} variant="light">
                                    {datosSuscripcion.estado === 'ACTIVO' ? `${diasRestantes} días restantes` : 'SUSCRIPCIÓN VENCIDA'}
                                </Badge>
                            </Group>

                            <Text size="sm" c="dimmed" mb="md">
                                Vencimiento: <b>{formatDate(datosSuscripcion.fecha_vencimiento)}</b>
                            </Text>

                            <Divider my="md" />

                            <Stack gap="md">
                                <div>
                                    <Group justify="space-between" mb={5}>
                                        <Text size="sm" fw={500}>Animales</Text>
                                        <Text size="sm" fw={700}>
                                            {esPremium ? `${numAnimales} (Sin límite)` : `${numAnimales} / ${labelLimiteAnimales}`}
                                        </Text>
                                    </Group>
                                    <Progress 
                                        value={porcentajeAnimales} 
                                        color={esPremium ? 'teal.4' : (Boolean(porcentajeAnimales > 90) ? 'red' : 'teal')} 
                                        size="md" 
                                        radius="xl" 
                                        striped={esPremium}
                                        animated={esPremium}
                                    />
                                </div>

                                <div>
                                    <Group justify="space-between" mb={5}>
                                        <Text size="sm" fw={500}>Campos</Text>
                                        <Text size="sm" fw={700}>
                                            {esPremium ? `${numEstablecimientos} (Sin límite)` : `${numEstablecimientos} / ${labelLimiteEstablecimientos}`}
                                        </Text>
                                    </Group>
                                    <Progress 
                                        value={porcentajeEstablecimientos} 
                                        color={esPremium ? 'teal.4' : (Boolean(porcentajeEstablecimientos > 90) ? 'red' : 'teal')} 
                                        size="md" 
                                        radius="xl" 
                                        striped={esPremium}
                                        animated={esPremium}
                                    />
                                </div>
                            </Stack>
                        </Card>

                        <Card withBorder shadow="sm" radius="md" p="xl" bg="gray.0" style={{ flexGrow: 1 }}>
                            <Title order={4} mb="md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <IconCreditCard size={22} color="var(--mantine-color-blue-6)" /> PAGAR E INFORMAR PAGO
                            </Title>
                            
                            <Text size="xs" c="dimmed" fs="italic" mb="lg">
                                Realizá la transferencia del monto del plan elegido y envianos el comprobante por WhatsApp o Mail.
                            </Text>

                            <Paper withBorder p="sm" radius="md" bg="white" mb="lg">
                                <Stack gap="xs">
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group gap="xs" wrap="nowrap">
                                            <Text size="sm" fw={700}>CBU:</Text>
                                            <Text size="sm" ff="monospace">0000003100012241790004</Text>
                                        </Group>
                                        <CopyButton value="0000003100012241790004">
                                            {({ copied, copy }) => (
                                                <ActionIcon color={copied ? 'teal' : 'blue'} variant="light" size="sm" onClick={copy}>
                                                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                </ActionIcon>
                                            )}
                                        </CopyButton>
                                    </Group>
                                    <Divider variant="dashed" />
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group gap="xs" wrap="nowrap">
                                            <Text size="sm" fw={700}>Alias:</Text>
                                            <Text size="sm" ff="monospace" c="blue.8" fw={700}>ggeroo</Text>
                                        </Group>
                                        <CopyButton value="ggeroo">
                                            {({ copied, copy }) => (
                                                <ActionIcon color={copied ? 'teal' : 'blue'} variant="light" size="sm" onClick={copy}>
                                                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                </ActionIcon>
                                            )}
                                        </CopyButton>
                                    </Group>
                                </Stack>
                            </Paper>

                            <Divider label="ID de tu cuenta" labelPosition="center" my="sm" />

                            <Stack gap="xs" align="center">
                                <Group gap={5}>
                                    <Text size="sm" fw={800} ff="monospace" c="blue.9">{datosSuscripcion.user_id?.substring(0, 18) || 'RC-XXXX-XXXX'}</Text>
                                    <CopyButton value={datosSuscripcion.user_id || ''}>
                                        {({ copied, copy }) => (
                                            <ActionIcon color={copied ? 'teal' : 'blue'} variant="subtle" onClick={copy}>
                                                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                            </ActionIcon>
                                        )}
                                    </CopyButton>
                                </Group>
                                
                                <Group grow w="100%" mt="sm">
                                    <Button color="green" variant="light" size="sm" onClick={() => handleContact('WA', planVisualizar)}>
                                        <IconBrandWhatsapp size={16} style={{ marginRight: 6 }} /> WhatsApp
                                    </Button>
                                    <Button color="blue" variant="light" size="sm" onClick={() => handleContact('MAIL', planVisualizar)}>
                                        <IconMail size={16} style={{ marginRight: 6 }} /> Mail
                                    </Button>
                                </Group>
                            </Stack>
                        </Card>
                    </Stack>
                </Grid.Col>

                {/* COLUMNA DERECHA: SELECCIÓN DE PLANES COMPRABLES */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card withBorder shadow="sm" radius="md" p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Text fw={700} size="sm" mb="md" c="dimmed">VER DETALLES DE PLANES</Text>
                        
                        <Group grow gap="xs" mb="lg">
                            {['BASICO', 'PRO', 'PREMIUM'].map((p) => (
                                <Button 
                                    key={p} 
                                    variant={planVisualizar === p ? 'filled' : 'light'} 
                                    color={planesInfo[p].color} 
                                    onClick={() => setPlanVisualizar(p)} 
                                    size="xs"
                                >
                                    {p}
                                </Button>
                            ))}
                        </Group>

                        <Paper 
                            p="xl" 
                            bg={`${planesInfo[planVisualizar].color}.0`} 
                            radius="md" 
                            style={{ 
                                border: `1px solid var(--mantine-color-${planesInfo[planVisualizar].color}-2)`,
                                flexGrow: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={800} size="lg" c={`${planesInfo[planVisualizar].color}.9`}>
                                        {planesInfo[planVisualizar].titulo}
                                    </Text>
                                    <Badge size="lg" color={planesInfo[planVisualizar].color} variant="filled">
                                        {planesInfo[planVisualizar].precio}
                                    </Badge>
                                </Group>
                                
                                <Text size="sm" fw={700} c="dark" mb="xl" fs="italic">
                                    "{planesInfo[planVisualizar].limites}"
                                </Text>

                                <Stack gap="xs" mb="xl">
                                    {planesInfo[planVisualizar].caracteristicas.map((caract: string, idx: number) => (
                                        <Group key={idx} wrap="nowrap" align="flex-start" gap="xs">
                                            <IconCircleCheck 
                                                size={18} 
                                                color={`var(--mantine-color-${planesInfo[planVisualizar].color}-6)`} 
                                                style={{ flexShrink: 0, marginTop: 2 }} 
                                            />
                                            <Text size="sm" fw={500}>{caract}</Text>
                                        </Group>
                                    ))}
                                </Stack>
                            </div>

                            <div>
                                {planVisualizar !== datosSuscripcion.plan_nombre ? (
                                    <Button 
                                        fullWidth 
                                        color="dark" 
                                        size="md"
                                        radius="md"
                                        onClick={() => handleContact('WA', planVisualizar)}
                                    >
                                        Solicitar Cambio a {planVisualizar}
                                    </Button>
                                ) : (
                                    <Badge variant="outline" color="gray" fullWidth size="xl" p="md">
                                        Este es tu plan actual
                                    </Badge>
                                )}
                            </div>
                        </Paper>
                    </Card>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}