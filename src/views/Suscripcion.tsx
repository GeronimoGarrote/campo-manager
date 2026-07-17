import {
    Title, Card, Group, Text, Badge, Button, Paper,
    Stack, Divider, ActionIcon, CopyButton, ThemeIcon,
    SimpleGrid, Center, Alert, Progress
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
    IconCheck, IconCopy, IconBrandWhatsapp, IconMail,
    IconGift, IconCalendar, IconMilk, IconBuilding,
    IconInfinity, IconCreditCard, IconAlertTriangle
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { type Suscripcion as SuscripcionData, type PlanSuscripcion } from '../types';

interface SuscripcionProps {
    animalesTotales: number;
    establecimientosTotales: number;
    datosSuscripcion: SuscripcionData | null;
    rolActual?: 'DUENO' | 'PEON' | 'VETERINARIO';
    estaVencido: boolean;
}

interface PlanInfo {
    titulo: string;
    color: string;
    precio?: string;
    tagline?: string;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function Suscripcion({ animalesTotales = 0, establecimientosTotales = 0, datosSuscripcion, rolActual = 'DUENO', estaVencido }: SuscripcionProps) {
    const pagoRef = useRef<HTMLDivElement>(null);
    const planesRef = useRef<HTMLDivElement>(null);
    const [highlightPago, setHighlightPago] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)', false);

    if (!datosSuscripcion) return null;

    if (rolActual !== 'DUENO' && estaVencido) {
        return (
            <Center h={400}>
                <Stack align="center" gap="md" maw={380} ta="center">
                    <ThemeIcon size={64} radius="xl" color="orange" variant="light">
                        <IconCreditCard size={32} />
                    </ThemeIcon>
                    <Title order={3}>Acceso temporalmente suspendido</Title>
                    <Text c="dimmed" size="sm">
                        El dueño de este campo necesita renovar su suscripción
                        para que puedas seguir trabajando. Avisale para que
                        pueda regularizar el pago.
                    </Text>
                    <Text size="xs" c="dimmed" mt="sm">
                        Podés cambiar a otro campo desde el selector
                        de abajo a la izquierda.
                    </Text>
                </Stack>
            </Center>
        );
    }

    const esPremium = datosSuscripcion.plan_nombre === 'PREMIUM';

    let diasRestantes = 0;
    if (datosSuscripcion.fecha_vencimiento) {
        const diff = new Date(datosSuscripcion.fecha_vencimiento + 'T23:59:59').getTime() - new Date().getTime();
        const diasCalc = Math.floor(diff / (1000 * 60 * 60 * 24));
        diasRestantes = (Number.isNaN(diasCalc) || diasCalc < 0) ? 0 : diasCalc;
    }

    // Única fuente de títulos, precios y taglines de los planes (las cards leen de acá)
    const planesInfo: Record<string, PlanInfo> = {
        'PRUEBA': { titulo: 'Plan de Prueba', color: 'orange' },
        'BASICO': { titulo: 'Plan Básico', color: 'teal', precio: '$ 35.000', tagline: 'Para productores chicos' },
        'PRO': { titulo: 'Plan Profesional', color: 'blue', precio: '$ 50.000', tagline: 'Para productores medianos' },
        'PREMIUM': { titulo: 'Plan Premium', color: 'teal', precio: '$ 75.000', tagline: 'Para grandes productores' },
    };

    const handleContact = (tipo: 'WA' | 'MAIL', plan: string, extraMsg: string = "") => {
        const userIdAbreviado = datosSuscripcion.user_id ? datosSuscripcion.user_id.substring(0, 8) + '...' : 'Desconocido';
        const msg = `Hola! Me interesa ${extraMsg || `mejorar mi cuenta de RodeoControl al ${planesInfo[plan]?.titulo ?? plan}`}. Mi ID de cuenta es: ${userIdAbreviado}`;
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

    const scrollToPlanes = () => {
        planesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const planActual: PlanSuscripcion = datosSuscripcion.plan_nombre ?? 'BASICO';
    const esPrueba = planActual === 'PRUEBA';
    const planOrder = ['PRUEBA', 'BASICO', 'PRO', 'PREMIUM'];
    const currentPlanIndex = planOrder.indexOf(planActual);
    const infoPlanActual = planesInfo[planActual] || planesInfo['BASICO'];
    const _rawRef = datosSuscripcion.user_id?.substring(0, 8).toUpperCase() ?? '';
    const codigoReferido = _rawRef.substring(0, 4) + '-' + _rawRef.substring(4, 8);

    const getPlanCTA = (planKey: string) => {
        const planIdx = planOrder.indexOf(planKey);
        const planColor = planesInfo[planKey]?.color || 'teal';

        if (planActual === 'PRUEBA') {
            return <Button fullWidth variant="filled" color="teal" onClick={() => handleContact('WA', planKey, `iniciar el ${planesInfo[planKey]?.titulo ?? planKey} de RodeoControl`)}>Iniciar plan</Button>;
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

    const badgeEstado = estaVencido ? (
        <Badge color="red" variant="light" size="lg">VENCIDO</Badge>
    ) : !datosSuscripcion.fecha_vencimiento ? (
        <Badge color="gray" variant="light" size="lg">Sin vencimiento</Badge>
    ) : diasRestantes === 0 ? (
        <Badge color="red" variant="light" size="lg">Vence hoy</Badge>
    ) : diasRestantes <= 7 ? (
        <Badge color="orange" variant="light" size="lg">
            Vence en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
        </Badge>
    ) : (
        <Badge color="teal" variant="light" size="lg">
            {diasRestantes} días restantes
        </Badge>
    );

    const botonBanner = esPrueba ? (
        <Button variant="filled" color="teal" size="sm" onClick={scrollToPlanes}>Elegir plan</Button>
    ) : (
        <Button variant="outline" color={infoPlanActual.color} size="sm" onClick={scrollToPago}>Renovar</Button>
    );

    // Mensaje para los botones genéricos de contacto de la card de pago
    const msgContactoGeneral = esPrueba
        ? 'activar un plan de RodeoControl'
        : `renovar o cambiar mi ${infoPlanActual.titulo} de RodeoControl`;

    const pctAnimales = esPremium
        ? 0
        : Math.min(100, Math.floor((animalesTotales / Math.max(1, datosSuscripcion.limite_animales)) * 100));
    const colorUsoAnimales = pctAnimales >= 90 ? 'red' : pctAnimales >= 70 ? 'orange' : 'teal';
    const cercaDelLimite = !esPremium && !estaVencido && pctAnimales >= 90;

    const bannerStats = (
        <Group gap="xl" wrap={isMobile ? 'wrap' : 'nowrap'}>
            <Stack gap={2} align="center">
                <Group gap={4} align="center" wrap="nowrap">
                    <IconMilk size={18} />
                    <Text size="sm" c="dimmed">Animales activos</Text>
                </Group>
                {esPremium
                    ? <Text style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>∞</Text>
                    : (
                        <>
                            <Text size="lg" fw={600}>{animalesTotales} / {datosSuscripcion.limite_animales}</Text>
                            <Progress value={pctAnimales} color={colorUsoAnimales} size="sm" radius="xl" w={110} />
                        </>
                    )
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

            {/* ── AVISO DE CUENTA VENCIDA ── */}
            {estaVencido && (
                <Alert
                    color="red"
                    variant="light"
                    radius="md"
                    icon={<IconAlertTriangle size={22} />}
                    title={esPrueba
                        ? 'Tu período de prueba terminó'
                        : `Tu plan venció el ${formatDate(datosSuscripcion.fecha_vencimiento)}`}
                >
                    <Stack gap="sm">
                        <Text size="sm">
                            {esPrueba
                                ? 'Para seguir usando RodeoControl elegí uno de los planes de abajo, transferí al alias y mandanos el comprobante por WhatsApp. Activamos tu cuenta en menos de 24 horas.'
                                : 'Para seguir usando RodeoControl transferí el valor de tu plan al alias y mandanos el comprobante por WhatsApp. Reactivamos tu cuenta en menos de 24 horas.'}
                        </Text>
                        <Group gap="sm">
                            <Button
                                color="green"
                                leftSection={<IconBrandWhatsapp size={16} />}
                                onClick={() => handleContact('WA', planActual, esPrueba
                                    ? 'activar un plan de RodeoControl, mi período de prueba terminó'
                                    : `renovar mi ${infoPlanActual.titulo} de RodeoControl, ya hice la transferencia y mando el comprobante`)}
                            >
                                {esPrueba ? 'Contactar por WhatsApp' : 'Ya pagué, enviar comprobante'}
                            </Button>
                            <Button variant="outline" color="red" onClick={scrollToPago}>
                                Ver datos de pago
                            </Button>
                        </Group>
                    </Stack>
                </Alert>
            )}

            {/* ── AVISO PREVIO AL VENCIMIENTO (7 días) ── */}
            {!estaVencido && datosSuscripcion.fecha_vencimiento && diasRestantes <= 7 && (
                <Alert
                    color="orange"
                    variant="light"
                    radius="md"
                    icon={<IconAlertTriangle size={22} />}
                    title={diasRestantes === 0
                        ? 'Tu plan vence hoy'
                        : `Tu plan vence el ${formatDate(datosSuscripcion.fecha_vencimiento)}`}
                >
                    <Stack gap="sm">
                        <Text size="sm">
                            Renovalo antes para no quedarte sin acceso: transferí al alias
                            y mandanos el comprobante por WhatsApp.
                        </Text>
                        <Group gap="sm">
                            <Button
                                color="green"
                                leftSection={<IconBrandWhatsapp size={16} />}
                                onClick={() => handleContact('WA', planActual, `renovar mi ${infoPlanActual.titulo} de RodeoControl`)}
                            >
                                Renovar por WhatsApp
                            </Button>
                            <Button variant="outline" color="orange" onClick={scrollToPago}>
                                Ver datos de pago
                            </Button>
                        </Group>
                    </Stack>
                </Alert>
            )}

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
                            {badgeEstado}
                            {botonBanner}
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
                            {badgeEstado}
                            {botonBanner}
                        </Group>
                    </Group>
                )}
            </Card>

            {/* ── AVISO DE CERCANÍA AL LÍMITE DE ANIMALES (upsell) ── */}
            {cercaDelLimite && (
                <Alert
                    color="orange"
                    variant="light"
                    radius="md"
                    icon={<IconMilk size={22} />}
                    title="Estás cerca del límite de animales"
                >
                    <Stack gap="sm">
                        <Text size="sm">
                            Tenés {animalesTotales} de los {datosSuscripcion.limite_animales} animales
                            que permite tu plan.{' '}
                            {esPrueba
                                ? 'Activá un plan para seguir sumando animales.'
                                : planActual === 'PRO'
                                    ? 'El Plan Premium te da animales y establecimientos ilimitados.'
                                    : 'El Plan Profesional te da hasta 300 animales por establecimiento.'}
                        </Text>
                        <Group gap="sm">
                            {esPrueba ? (
                                <Button color="teal" onClick={scrollToPlanes}>Ver planes</Button>
                            ) : (
                                <Button
                                    color="teal"
                                    leftSection={<IconBrandWhatsapp size={16} />}
                                    onClick={() => handleContact('WA', planActual === 'PRO' ? 'PREMIUM' : 'PRO')}
                                >
                                    {planActual === 'PRO' ? 'Consultar por el Premium' : 'Consultar por el Profesional'}
                                </Button>
                            )}
                        </Group>
                    </Stack>
                </Alert>
            )}

            {/* ── SECCIÓN 2: TRES PLANES LADO A LADO ── */}
            <div ref={planesRef}>
                <Text size="xs" c="dimmed" mb="sm">PLANES DISPONIBLES</Text>
                <SimpleGrid cols={isMobile ? 1 : 3} spacing="md">

                    {/* BÁSICO */}
                    <Card
                        withBorder shadow="sm" radius="md" p="md"
                        style={{
                            display: 'flex', flexDirection: 'column',
                            ...(planActual === 'BASICO' ? { border: '2px solid var(--mantine-color-teal-6)' } : {})
                        }}
                    >
                        {planActual === 'BASICO' && (
                            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                                <Badge color="teal" variant="filled">Tu plan actual</Badge>
                            </div>
                        )}
                        <Title order={4} mb={4}>{planesInfo['BASICO'].titulo}</Title>
                        <Text size="xl" fw={900} mb={2}>
                            {planesInfo['BASICO'].precio}<Text span size="sm" fw={400} c="dimmed"> / mes</Text>
                        </Text>
                        <Text size="xs" c="dimmed" mb="md">{planesInfo['BASICO'].tagline}</Text>
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
                            <Badge color="blue" variant="filled">
                                {planActual === 'PRO' ? 'Tu plan actual' : 'Más popular'}
                            </Badge>
                        </div>
                        <Title order={4} mb={4} c="blue.7">{planesInfo['PRO'].titulo}</Title>
                        <Text size="xl" fw={900} mb={2} c="blue.7">
                            {planesInfo['PRO'].precio}<Text span size="sm" fw={400} c="dimmed"> / mes</Text>
                        </Text>
                        <Text size="xs" c="dimmed" mb="md">{planesInfo['PRO'].tagline}</Text>
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
                        <Title order={4} mb={4} c="teal.7">{planesInfo['PREMIUM'].titulo}</Title>
                        <Text size="xl" fw={900} mb={2} c="teal.7">
                            {planesInfo['PREMIUM'].precio}<Text span size="sm" fw={400} c="dimmed"> / mes</Text>
                        </Text>
                        <Text size="xs" c="dimmed" mb="md">{planesInfo['PREMIUM'].tagline}</Text>
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
                    <Text fw={700} size="sm" mb="sm">¿Cómo renovar o cambiar de plan?</Text>

                    <Stack gap={8} mb="md">
                        <Group gap="xs" wrap="nowrap">
                            {stepDot('1')}
                            <Text size="xs">Transferí el valor de tu plan al alias o CBU de abajo</Text>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                            {stepDot('2')}
                            <Text size="xs">Mandanos el comprobante por WhatsApp junto con tu ID de cuenta</Text>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                            {stepDot('3')}
                            <Text size="xs">Activamos tu plan en menos de 24 horas</Text>
                        </Group>
                    </Stack>

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
                                <CopyButton value="Rodeocontrol">
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
                            onClick={() => handleContact('WA', planActual, msgContactoGeneral)}
                        >
                            WhatsApp
                        </Button>
                        <Button
                            color="blue" variant="light" size="sm"
                            leftSection={<IconMail size={16} />}
                            onClick={() => handleContact('MAIL', planActual, msgContactoGeneral)}
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

                    <Button
                        fullWidth color="green" variant="light"
                        leftSection={<IconBrandWhatsapp size={16} />}
                        onClick={() => {
                            const msg = `Hola! Te recomiendo RodeoControl para llevar el control del campo desde el celular: ${window.location.origin}. Si te suscribís, mencioná mi código de referido ${codigoReferido} al pagar.`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                    >
                        Compartir por WhatsApp
                    </Button>
                    <Text size="xs" c="dimmed" ta="center" mt="xs">
                        También podés pasarle el código de palabra.
                    </Text>
                </Card>

            </SimpleGrid>
        </Stack>
    );
}
