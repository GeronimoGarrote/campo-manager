import {
    Title, Card, Group, Text, Badge, Button, Paper,
    Stack, Divider, ActionIcon, CopyButton, ThemeIcon,
    SimpleGrid, Tooltip
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
    IconCheck, IconCopy, IconBrandWhatsapp, IconMail,
    IconGift, IconCalendar, IconMilk, IconBuilding,
    IconInfinity, IconQuestionMark
} from '@tabler/icons-react';
import { useRef, useState } from 'react';

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
    const pagoRef = useRef<HTMLDivElement>(null);
    const [highlightPago, setHighlightPago] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)', false);

    if (!datosSuscripcion) return null;

    const esPremium = datosSuscripcion.plan_nombre === 'PREMIUM';

    let diasRestantes = 0;
    if (datosSuscripcion.fecha_vencimiento) {
        const diff = new Date(datosSuscripcion.fecha_vencimiento + 'T23:59:59').getTime() - new Date().getTime();
        const diasCalc = Math.floor(diff / (1000 * 60 * 60 * 24));
        diasRestantes = (Number.isNaN(diasCalc) || diasCalc < 0) ? 0 : diasCalc;
    }

    const planesInfo: any = {
        'PRUEBA': { titulo: 'Plan de Prueba', color: 'orange' },
        'BASICO': {
            titulo: 'Plan Básico',
            precio: '$ 35.000 / mes',
            tagline: 'Para productores chicos',
            color: 'teal',
            caracteristicas: [
                'Hasta 100 animales por establecimiento',
                'Un solo establecimiento',
                'Transferencia de animales entre usuarios',
                'Gestión completa de Sanidad e Historial',
                'Control de Economía y Cuentas',
                'Alerta automática de Partos Estimados',
                'Clasificación por Lotes y Nutrición',
                'Carga Masiva de Animales',
                'Módulo de Agricultura y Potreros',
                'Soporte técnico'
            ]
        },
        'PRO': {
            titulo: 'Plan Profesional',
            precio: '$ 50.000 / mes',
            tagline: 'Para productores medianos',
            color: 'blue',
            caracteristicas: [
                'TODO lo incluido en el Plan Básico',
                'Hasta 3 establecimientos',
                'Hasta 300 animales por establecimiento',
                'Soporte técnico prioritario',
                'Backup de datos mensual'
            ]
        },
        'PREMIUM': {
            titulo: 'Plan Premium',
            precio: '$ 75.000 / mes',
            tagline: 'Para grandes productores',
            color: 'teal',
            caracteristicas: [
                'Todo lo incluido en el Plan Profesional',
                'Establecimientos ilimitados',
                'Animales ilimitados',
                'Soporte técnico VIP',
                'Backup de datos semanal'
            ]
        }
    };

    const handleContact = (tipo: 'WA' | 'MAIL', plan: string, extraMsg: string = "") => {
        const userIdAbreviado = datosSuscripcion.user_id ? datosSuscripcion.user_id.substring(0, 8) + '...' : 'Desconocido';
        const msg = `Hola! Me interesa ${extraMsg || `mejorar mi cuenta de RodeoControl al Plan ${plan}`}. Mi ID de cuenta es: ${userIdAbreviado}`;
        if (tipo === 'WA') {
            window.open(`https://wa.me/5492345505575?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            window.location.href = `mailto:rodeocontrol.app@gmail.com?subject=Suscripcion&body=${encodeURIComponent(msg)}`;
        }
    };

    const scrollToPago = () => {
        pagoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightPago(true);
        setTimeout(() => setHighlightPago(false), 1600);
    };

    const planActual = datosSuscripcion.plan_nombre;
    const planOrder = ['PRUEBA', 'BASICO', 'PRO', 'PREMIUM'];
    const currentPlanIndex = planOrder.indexOf(planActual);
    const infoPlanActual = planesInfo[planActual] || planesInfo['BASICO'];
    const _rawRef = datosSuscripcion.user_id?.substring(0, 8).toUpperCase() ?? '';
    const codigoReferido = _rawRef.substring(0, 4) + '-' + _rawRef.substring(4, 8);

    // Unused in render but kept as existing business logic
    void calcularProgresoSeguro;

    const getPlanCTA = (planKey: string) => {
        const planIdx = planOrder.indexOf(planKey);
        const planColor = planesInfo[planKey]?.color || 'teal';

        if (planActual === 'PRUEBA') {
            return <Button fullWidth variant="filled" color="teal" onClick={() => handleContact('WA', planKey)}>Iniciar plan</Button>;
        }

        if (planKey === planActual) {
            return <Button fullWidth variant="outline" color={planColor} onClick={scrollToPago}>Renovar</Button>;
        }

        if (planIdx < currentPlanIndex) {
            return <Button fullWidth variant="subtle" color="gray" onClick={() => handleContact('WA', planKey)}>Contactar</Button>;
        }

        return <Button fullWidth variant="light" color={planColor} onClick={() => handleContact('WA', planKey)}>Cambiar · Contactar</Button>;
    };

    const basicoFeatures = [
        { icon: <IconCheck size={13} />, text: '100 animales' },
        { icon: <IconCheck size={13} />, text: '1 establecimiento' },
        { icon: <IconCheck size={13} />, text: 'Historial y sanidad' },
        { icon: <IconCheck size={13} />, text: 'Economía y caja' },
        { icon: <IconCheck size={13} />, text: 'Lotes y agricultura' },
        { icon: <IconCheck size={13} />, text: 'Transferencia entre usuarios' },
    ];

    const proFeatures = [
        { icon: <IconCheck size={13} />, text: '300 animales por campo' },
        { icon: <IconCheck size={13} />, text: '3 establecimientos' },
        { icon: <IconCheck size={13} />, text: 'Todo lo del plan Básico' },
        { icon: <IconCheck size={13} />, text: 'Soporte prioritario' },
        { icon: <IconCheck size={13} />, text: 'Backup mensual' },
    ];

    const premiumFeatures = [
        { icon: <IconInfinity size={22} style={{ flexShrink: 0 }} />, text: 'Animales ilimitados', direct: true },
        { icon: <IconInfinity size={22} style={{ flexShrink: 0 }} />, text: 'Campos ilimitados', direct: true },
        { icon: <IconCheck size={13} />, text: 'Todo lo del plan Pro', direct: false },
        { icon: <IconCheck size={13} />, text: 'Soporte VIP', direct: false },
        { icon: <IconCheck size={13} />, text: 'Backup semanal', direct: false },
    ];

    const bannerStats = (
        <Group gap="xl" wrap={isMobile ? 'wrap' : 'nowrap'}>
            <Stack gap={2} align="center">
                <Group gap={4} align="center" wrap="nowrap">
                    <IconMilk size={18} />
                    <Text size="sm" c="dimmed">Animales activos</Text>
                </Group>
                {esPremium
                    ? <Text style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>∞</Text>
                    : <Text size="lg" fw={600}>{animalesTotales} / {datosSuscripcion.limite_animales}</Text>
                }
            </Stack>
            <Stack gap={2} align="center">
                <Group gap={4} align="center" wrap="nowrap">
                    <IconBuilding size={18} />
                    <Text size="sm" c="dimmed">Establecimientos</Text>
                </Group>
                {esPremium
                    ? <Text style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>∞</Text>
                    : <Text size="lg" fw={600}>{establecimientosTotales} / {datosSuscripcion.limite_establecimientos}</Text>
                }
            </Stack>
            <Stack gap={2} align="center">
                <Group gap={4} align="center" wrap="nowrap">
                    <IconCalendar size={18} />
                    <Text size="sm" c="dimmed">Vencimiento</Text>
                </Group>
                <Text size="lg" fw={600}>{formatDate(datosSuscripcion.fecha_vencimiento)}</Text>
            </Stack>
        </Group>
    );

    const stepDot = (num: string) => (
        <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'var(--mantine-color-blue-6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
            <Text size="xs" fw={700} c="white">{num}</Text>
        </div>
    );

    return (
        <Stack gap="xl">

            {/* ── SECCIÓN 1: BANNER PLAN ACTUAL ── */}
            <Card withBorder shadow="sm" radius="md" p="md">
                {isMobile ? (
                    <Stack gap="sm">
                        <div>
                            <Text size="xs" c="dimmed">PLAN ACTUAL</Text>
                            <Title order={4} c={`${infoPlanActual.color}.7`}>{infoPlanActual.titulo}</Title>
                        </div>
                        {bannerStats}
                        <Group justify="space-between">
                            <Badge color={diasRestantes > 2 ? 'teal' : 'red'} variant="light" size="lg">
                                {datosSuscripcion.estado === 'ACTIVO' ? `${diasRestantes} días restantes` : 'VENCIDO'}
                            </Badge>
                            <Button variant="outline" color={infoPlanActual.color} size="sm" onClick={scrollToPago}>Renovar</Button>
                        </Group>
                    </Stack>
                ) : (
                    <Group justify="space-between" wrap="nowrap">
                        <div style={{ minWidth: 150 }}>
                            <Text size="xs" c="dimmed">PLAN ACTUAL</Text>
                            <Title order={4} c={`${infoPlanActual.color}.7`}>{infoPlanActual.titulo}</Title>
                        </div>
                        {bannerStats}
                        <Group gap="sm" wrap="nowrap">
                            <Badge color={diasRestantes > 2 ? 'teal' : 'red'} variant="light" size="lg">
                                {datosSuscripcion.estado === 'ACTIVO' ? `${diasRestantes} días restantes` : 'VENCIDO'}
                            </Badge>
                            <Button variant="outline" color={infoPlanActual.color} size="sm" onClick={scrollToPago}>Renovar</Button>
                        </Group>
                    </Group>
                )}
            </Card>

            {/* ── SECCIÓN 2: TRES PLANES LADO A LADO ── */}
            <div>
                <Text size="xs" c="dimmed" mb="sm">PLANES DISPONIBLES</Text>
                <SimpleGrid cols={isMobile ? 1 : 3} spacing="md">

                    {/* BÁSICO */}
                    <Card withBorder shadow="sm" radius="md" p="md" style={{ display: 'flex', flexDirection: 'column' }}>
                        <Title order={4} mb={4}>Plan Básico</Title>
                        <Text size="xl" fw={900} mb={2}>
                            $ 35.000<Text span size="sm" fw={400} c="dimmed"> / mes</Text>
                        </Text>
                        <Text size="xs" c="dimmed" mb="md">Para productores chicos</Text>
                        <Divider mb="md" />
                        <Stack gap="xs" mb="lg" style={{ flexGrow: 1 }}>
                            {basicoFeatures.map((f, i) => (
                                <Group key={i} gap="xs" wrap="nowrap">
                                    <ThemeIcon size={18} radius="xl" color="teal" variant="light">{f.icon}</ThemeIcon>
                                    <Text size="sm">{f.text}</Text>
                                </Group>
                            ))}
                        </Stack>
                        {getPlanCTA('BASICO')}
                    </Card>

                    {/* PRO (destacada) */}
                    <Card
                        withBorder shadow="sm" radius="md" p="md"
                        style={{ display: 'flex', flexDirection: 'column', border: '2px solid var(--mantine-color-blue-6)' }}
                    >
                        <div style={{ textAlign: 'center', marginBottom: 8 }}>
                            <Badge color="blue" variant="filled">Más popular</Badge>
                        </div>
                        <Title order={4} mb={4} c="blue.7">Plan Profesional</Title>
                        <Text size="xl" fw={900} mb={2} c="blue.7">
                            $ 50.000<Text span size="sm" fw={400} c="dimmed"> / mes</Text>
                        </Text>
                        <Text size="xs" c="dimmed" mb="md">Para productores medianos</Text>
                        <Divider mb="md" />
                        <Stack gap="xs" mb="lg" style={{ flexGrow: 1 }}>
                            {proFeatures.map((f, i) => (
                                <Group key={i} gap="xs" wrap="nowrap">
                                    <ThemeIcon size={18} radius="xl" color="blue" variant="light">{f.icon}</ThemeIcon>
                                    <Text size="sm">{f.text}</Text>
                                </Group>
                            ))}
                        </Stack>
                        {getPlanCTA('PRO')}
                    </Card>

                    {/* PREMIUM */}
                    <Card
                        withBorder shadow="sm" radius="md" p="md"
                        style={{
                            display: 'flex', flexDirection: 'column',
                            ...(planActual === 'PREMIUM' ? { border: '2px solid var(--mantine-color-teal-6)' } : {})
                        }}
                    >
                        {planActual === 'PREMIUM' && (
                            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                                <Badge color="teal" variant="filled">Tu plan actual</Badge>
                            </div>
                        )}
                        <Title order={4} mb={4} c="teal.7">Plan Premium</Title>
                        <Text size="xl" fw={900} mb={2} c="teal.7">
                            $ 75.000<Text span size="sm" fw={400} c="dimmed"> / mes</Text>
                        </Text>
                        <Text size="xs" c="dimmed" mb="md">Para grandes productores</Text>
                        <Divider mb="md" />
                        <Stack gap="xs" mb="lg" style={{ flexGrow: 1 }}>
                            {premiumFeatures.map((f, i) => (
                                <Group key={i} gap="xs" wrap="nowrap">
                                    {f.direct
                                        ? f.icon
                                        : <ThemeIcon size={18} radius="xl" color="teal" variant="light">{f.icon}</ThemeIcon>
                                    }
                                    <Text size="sm">{f.text}</Text>
                                </Group>
                            ))}
                        </Stack>
                        {getPlanCTA('PREMIUM')}
                    </Card>

                </SimpleGrid>
            </div>

            {/* ── SECCIÓN 3: GRID INFERIOR ── */}
            <SimpleGrid cols={isMobile ? 1 : 2} spacing="md">

                {/* Columna izquierda: Información de pago */}
                <Card
                    withBorder shadow="sm" radius="md" p="md" ref={pagoRef}
                    style={{
                        transition: 'box-shadow 0.4s ease',
                        boxShadow: highlightPago ? '0 0 0 3px var(--mantine-color-teal-5)' : undefined,
                    }}
                >
                    <Group gap="xs" mb="sm" align="center">
                        <Text fw={700} size="sm">¿Cómo renovar o cambiar de plan?</Text>
                        <Tooltip
                            label="Procesamos los pagos por transferencia bancaria. Es simple: transferís, nos mandás el comprobante y activamos tu plan en menos de 24hs."
                            multiline
                            w={280}
                            withArrow
                        >
                            <ThemeIcon size="md" color="blue" variant="filled" radius="xl">
                                <IconQuestionMark size={16} />
                            </ThemeIcon>
                        </Tooltip>
                    </Group>

                    <Text size="xs" c="dimmed" mb="md">
                        Hacé la transferencia al alias y mandanos el comprobante con tu ID de cuenta.
                    </Text>

                    <Paper withBorder p="sm" radius="md" mb="sm">
                        <Stack gap="xs">
                            <Group justify="space-between" wrap="nowrap">
                                <Text size="sm" ff="monospace">CBU: 0000003100012241790004</Text>
                                <CopyButton value="0000003100012241790004">
                                    {({ copied, copy }) => (
                                        <ActionIcon color={copied ? 'teal' : 'blue'} variant="subtle" onClick={copy}>
                                            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                        </ActionIcon>
                                    )}
                                </CopyButton>
                            </Group>
                            <Divider variant="dashed" />
                            <Group justify="space-between" wrap="nowrap">
                                <Text size="sm" ff="monospace">
                                    Alias: <Text span fw={700} c="blue.8">Rodeocontrol</Text>
                                </Text>
                                <CopyButton value="ggeroo">
                                    {({ copied, copy }) => (
                                        <ActionIcon color={copied ? 'teal' : 'blue'} variant="subtle" onClick={copy}>
                                            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                        </ActionIcon>
                                    )}
                                </CopyButton>
                            </Group>
                        </Stack>
                    </Paper>

                    <Group gap={6} mb="md">
                        <Text size="xs" c="dimmed">ID DE CUENTA:</Text>
                        <Text size="xs" fw={700} ff="monospace" c="dimmed">
                            {datosSuscripcion.user_id?.substring(0, 15)}...
                        </Text>
                        <CopyButton value={datosSuscripcion.user_id || ''}>
                            {({ copied, copy }) => (
                                <ActionIcon color={copied ? 'teal' : 'blue'} variant="subtle" onClick={copy} title="Copiar ID completo">
                                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                </ActionIcon>
                            )}
                        </CopyButton>
                    </Group>

                    <Group grow>
                        <Button
                            color="green" variant="light" size="sm"
                            leftSection={<IconBrandWhatsapp size={16} />}
                            onClick={() => handleContact('WA', planActual)}
                        >
                            WhatsApp
                        </Button>
                        <Button
                            color="blue" variant="light" size="sm"
                            leftSection={<IconMail size={16} />}
                            onClick={() => handleContact('MAIL', planActual)}
                        >
                            Email
                        </Button>
                    </Group>
                </Card>

                {/* Columna derecha: Referidos */}
                <Card withBorder shadow="sm" radius="md" p="md">
                    <Group gap="sm" mb="sm" align="center">
                        <ThemeIcon size={42} radius="xl" color="blue" variant="filled">
                            <IconGift size={24} />
                        </ThemeIcon>
                        <Title order={4}>Traé un colega, ganá un mes gratis</Title>
                    </Group>

                    <Text size="sm" c="dimmed" mb="md">
                        Cuando un colega activa su cuenta mencionando tu código al pagar,
                        te regalamos el siguiente mes de tu plan.
                    </Text>

                    <Group justify="center" gap="sm" mb="md" wrap="wrap">
                        <Group gap="xs" wrap="nowrap">
                            {stepDot('1')}
                            <Text size="xs">Compartí tu código</Text>
                        </Group>
                        <Text c="dimmed" size="sm">→</Text>
                        <Group gap="xs" wrap="nowrap">
                            {stepDot('2')}
                            <Text size="xs">Tu colega lo menciona al pagar</Text>
                        </Group>
                        <Text c="dimmed" size="sm">→</Text>
                        <Group gap="xs" wrap="nowrap">
                            {stepDot('3')}
                            <Text size="xs">Recibís un mes gratis</Text>
                        </Group>
                    </Group>

                    <Paper withBorder p="sm" mb="md">
                        <Text size="xs" c="dimmed" mb={4}>TU CÓDIGO DE REFERIDO</Text>
                        <Group justify="space-between">
                            <Text fw={700} ff="monospace" size="lg">{codigoReferido}</Text>
                            <CopyButton value={codigoReferido}>
                                {({ copied, copy }) => (
                                    <ActionIcon color={copied ? 'teal' : 'blue'} variant="subtle" onClick={copy}>
                                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                    </ActionIcon>
                                )}
                            </CopyButton>
                        </Group>
                    </Paper>

                    <Text size="xs" c="dimmed" ta="center">
                        Compartilo por WhatsApp o de palabra con tus colegas.
                    </Text>
                </Card>

            </SimpleGrid>
        </Stack>
    );
}
