import { 
    Title, Card, Group, Text, Badge, Progress, Button, Paper, 
    Stack, Divider, ActionIcon, CopyButton, Grid, ThemeIcon, List
} from '@mantine/core';
import { 
    IconCheck, IconCopy, IconBrandWhatsapp, IconMail, IconCreditCard,
    IconRocket, IconGift, IconChartBar
} from '@tabler/icons-react';
import { useState } from 'react';

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
    const [planVisualizar, setPlanVisualizar] = useState<string>('BASICO');

    if (!datosSuscripcion) return null; 

    const esPremium = datosSuscripcion.plan_nombre === 'PREMIUM';
    const esPrueba = datosSuscripcion.plan_nombre === 'PRUEBA';

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
            color: 'teal',
            limites: 'Para productores chicos',
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
            color: 'blue',
            limites: 'Para productores medianos',
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
            color: 'grape',
            limites: 'Para grandes productores.',
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

    const infoPlanActual = planesInfo[datosSuscripcion.plan_nombre] || planesInfo['BASICO'];

    return (
        <Stack gap="xl">
            {/* ENCABEZADO */}
            <div>
                <Title order={2} mb={5}>ESTADO DE LA CUENTA</Title>
                <Text c="dimmed" size="sm">Gestioná tu suscripción y visualizá los límites de tu plan actual.</Text>
            </div>

            {/* TARJETA DE ALTA DIVIDIDA EN 2 COLUMNAS 50/50 (Solo en Prueba) */}
            {esPrueba && (
                <Card w="100%" withBorder shadow="md" radius="md" p={0} style={{ borderTop: '6px solid var(--mantine-color-teal-6)', overflow: 'hidden' }}>
                    <Grid gutter={0}>
                        {/* COLUMNA IZQUIERDA: VENTAJAS (Mitad del espacio: md={6}) */}
                        <Grid.Col span={{ base: 12, md: 6 }} p="xl" bg="teal.0">
                            <Stack gap="md" style={{ height: '100%', justifyContent: 'center' }}>
                                <Group gap="xs">
                                    <ThemeIcon size="lg" color="teal" variant="filled" radius="md"><IconChartBar size={20}/></ThemeIcon>
                                    <Title order={3} c="teal.9">¿Por qué digitalizar tu campo?</Title>
                                </Group>
                                <Text size="sm" c="dark" fw={500}>
                                    Manejar la información de forma profesional es la única manera de <b>EVITAR PÉRDIDAS</b> económicas por falta de control.
                                </Text>
                                <List
                                    spacing="sm"
                                    size="sm"
                                    icon={<ThemeIcon color="teal" size={20} radius="xl"><IconCheck size={12} /></ThemeIcon>}
                                >
                                    <List.Item><b>Información en tiempo real:</b> Tomá decisiones basadas en datos, no en suposiciones.</List.Item>
                                    <List.Item><b>Trazabilidad Sanitaria:</b> Control absoluto de vacunas y tratamientos para evitar muertes evitables.</List.Item>
                                    <List.Item><b>Agenda Inteligente:</b> Alertas de partos y tareas para que nada se te pase por alto.</List.Item>
                                    <List.Item><b>Control Financiero:</b> Seguimiento exacto de cada peso invertido en tu hacienda.</List.Item>
                                </List>
                            </Stack>
                        </Grid.Col>

                        {/* COLUMNA DERECHA: PAGO Y ACCIÓN (Mitad del espacio: md={6}) */}
                        <Grid.Col span={{ base: 12, md: 6 }} p="xl">
                            <Stack align="center" justify="center" h="100%" gap="md">
                                <ThemeIcon size={50} radius="100%" color="teal" variant="light">
                                    <IconRocket size={26} />
                                </ThemeIcon>
                                
                                {/* ACÁ ESTÁ EL FIX DEL CENTRADO (align="center") */}
                                <Stack gap={5} ta="center" align="center">
                                    <Text fw={700} size="lg">Activá tu cuenta ahora</Text>
                                    <Badge size="xl" variant="filled" color="teal" h={30} px="xl">Suscripcion por promo lanzamiento: $ 50.000</Badge>
                                    <Text size="xs" c="dimmed">Activá tu cuenta para siempre, selecciona tu plan y llevá la gestión de tu campo a primera división.</Text>
                                </Stack>
                                
                                <Group grow w="100%" mt="sm">
                                    <Button variant="light" color="teal" size="md" leftSection={<IconBrandWhatsapp size={20}/>} onClick={() => handleContact('WA', '', "pagar el alta de mi cuenta")}>
                                        WhatsApp
                                    </Button>
                                    <Button variant="light" color="blue" size="md" leftSection={<IconMail size={20}/>} onClick={() => handleContact('MAIL', '', "pagar el alta de mi cuenta")}>
                                        Email
                                    </Button>
                                </Group>
                            </Stack>
                        </Grid.Col>
                    </Grid>
                </Card>
            )}

            {/* GRILLA DE DOS COLUMNAS (ESTADO Y PLANES) */}
            <Grid gutter="lg" align="stretch">
                <Grid.Col span={{ base: 12, md: 6 }}>
                    {/* El flexGrow: 1 se aplica al padre para que las tarjetas internas se estiren */}
                    <Stack gap="lg" style={{ height: '100%', flexGrow: 1 }}>
                        <Card withBorder shadow="sm" radius="md" p="xl">
                            <Group justify="space-between" mb="lg">
                                <div>
                                    <Text size="xs" fw={700} c="dimmed">PLAN ACTUAL</Text>
                                    <Title order={3} c={`${infoPlanActual.color}.7`}>{infoPlanActual.titulo}</Title>
                                </div>
                                <Badge size="xl" color={diasRestantes > 2 ? 'teal' : 'red'} variant="light">
                                    {datosSuscripcion.estado === 'ACTIVO' ? `${diasRestantes} días restantes` : 'VENCIDO'}
                                </Badge>
                            </Group>
                            <Text size="sm" c="dimmed" mb="md">Vencimiento: <b>{formatDate(datosSuscripcion.fecha_vencimiento)}</b></Text>
                            <Divider my="md" />
                            <Stack gap="md">
                                <div>
                                    <Group justify="space-between" mb={5}>
                                        <Text size="sm" fw={500}>Animales Activos</Text>
                                        <Text size="sm" fw={700}>{esPremium ? 'Ilimitados' : `${animalesTotales} / ${datosSuscripcion.limite_animales}`}</Text>
                                    </Group>
                                    <Progress value={calcularProgresoSeguro(animalesTotales, datosSuscripcion.limite_animales, esPremium)} color="teal" size="md" radius="xl" />
                                </div>
                                <div>
                                    <Group justify="space-between" mb={5}>
                                        <Text size="sm" fw={500}>Establecimientos</Text>
                                        <Text size="sm" fw={700}>{esPremium ? 'Ilimitados' : `${establecimientosTotales} / ${datosSuscripcion.limite_establecimientos}`}</Text>
                                    </Group>
                                    <Progress value={calcularProgresoSeguro(establecimientosTotales, datosSuscripcion.limite_establecimientos, esPremium)} color="teal" size="md" radius="xl" />
                                </div>
                            </Stack>
                        </Card>

                        {/* Acá está el flexGrow: 1 para rellenar el espacio vertical en pantallas grandes */}
                        <Card withBorder shadow="sm" radius="md" p="xl" bg="gray.0" style={{ flexGrow: 1 }}>
                            <Title order={4} mb="md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <IconCreditCard size={22} color="var(--mantine-color-blue-6)" /> INFORMACIÓN DE PAGO
                            </Title>
                            <Paper withBorder p="sm" radius="md" bg="white" mb="md">
                                <Stack gap="xs">
                                    <Group justify="space-between" wrap="nowrap">
                                        <Text size="sm" ff="monospace">CBU: 0000003100012241790004</Text>
                                        <CopyButton value="0000003100012241790004">{({ copied, copy }) => (<ActionIcon color={copied ? 'teal' : 'blue'} variant="subtle" onClick={copy}>{copied ? <IconCheck size={14} /> : <IconCopy size={14} />}</ActionIcon>)}</CopyButton>
                                    </Group>
                                    <Divider variant="dashed" />
                                    <Group justify="space-between" wrap="nowrap">
                                        <Text size="sm" ff="monospace">Alias: <Text span fw={700} c="blue.8">ggeroo</Text></Text>
                                        <CopyButton value="ggeroo">{({ copied, copy }) => (<ActionIcon color={copied ? 'teal' : 'blue'} variant="subtle" onClick={copy}>{copied ? <IconCheck size={14} /> : <IconCopy size={14} />}</ActionIcon>)}</CopyButton>
                                    </Group>
                                </Stack>
                            </Paper>
                            <Stack gap="xs" align="center" style={{ marginTop: 'auto' }}>
                                <Text size="xs" c="dimmed">ID DE CUENTA: <b>{datosSuscripcion.user_id?.substring(0, 18)}...</b></Text>
                                <Group grow w="100%">
                                    <Button color="green" variant="light" size="sm" leftSection={<IconBrandWhatsapp size={16}/>} onClick={() => handleContact('WA', planVisualizar)}>WhatsApp</Button>
                                    <Button color="blue" variant="light" size="sm" leftSection={<IconMail size={16}/>} onClick={() => handleContact('MAIL', planVisualizar)}>Email</Button>
                                </Group>
                            </Stack>
                        </Card>
                    </Stack>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Card withBorder shadow="sm" radius="md" p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Text fw={700} size="sm" mb="md" c="dimmed">EXPLORAR PLANES</Text>
                        <Group grow gap="xs" mb="lg">
                            {['BASICO', 'PRO', 'PREMIUM'].map((p) => (
                                <Button key={p} variant={planVisualizar === p ? 'filled' : 'light'} color={planesInfo[p].color} onClick={() => setPlanVisualizar(p)} size="xs">{p}</Button>
                            ))}
                        </Group>
                        <Paper p="xl" bg={`${planesInfo[planVisualizar].color}.0`} radius="md" style={{ border: `1px solid var(--mantine-color-${planesInfo[planVisualizar].color}-2)`, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <Stack>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={800} size="lg" c={`${planesInfo[planVisualizar].color}.9`}>{planesInfo[planVisualizar].titulo}</Text>
                                    <Badge size="lg" color={planesInfo[planVisualizar].color}>{planesInfo[planVisualizar].precio}</Badge>
                                </Group>
                                <Text size="sm" fw={700} c="dark" fs="italic" mb="sm">"{planesInfo[planVisualizar].limites}"</Text>
                                <List spacing="xs" size="sm" icon={<ThemeIcon color={planesInfo[planVisualizar].color} size={20} radius="xl"><IconCheck size={12} /></ThemeIcon>}>
                                    {planesInfo[planVisualizar].caracteristicas.map((caract: string, idx: number) => (<List.Item key={idx}><Text size="sm" fw={500}>{caract}</Text></List.Item>))}
                                </List>
                            </Stack>
                            <Button mt="xl" fullWidth color="dark" size="md" onClick={() => handleContact('WA', planVisualizar)}>{planVisualizar === datosSuscripcion.plan_nombre ? 'Renovar este Plan' : `Pasar a Plan ${planVisualizar}`}</Button>
                        </Paper>
                    </Card>
                </Grid.Col>
            </Grid>

            {/* CARTEL DE REFERIDOS: SIEMPRE ABAJO DE TODO Y CENTRADO */}
            <Card w="100%" withBorder shadow="sm" radius="md" p="xl" bg="blue.0" style={{ border: '1px dashed var(--mantine-color-blue-4)' }}>
                <Stack align="center" gap="xs">
                    <Group gap="sm" align="center">
                        <ThemeIcon size={42} radius="xl" color="blue" variant="filled"><IconGift size={24} /></ThemeIcon>
                        <Title order={3} ta="center" c="blue.9">¡Traé un amigo y ganá un mes gratis!</Title>
                    </Group>
                    <Text size="md" c="dimmed" ta="center" maw={650}>
                        Si un colega o conocido activa su cuenta de parte tuya, te <b>regalamos</b> automáticamente el siguiente mes de tu <b>Plan</b>. ¡Sin vueltas ni letras chicas!
                    </Text>
                </Stack>
            </Card>
        </Stack>
    );
}