import { useState } from 'react';
import { Title, Grid, Card, Group, RingProgress, Center, Text, ThemeIcon, Badge, ScrollArea, Table, Stack, Button } from '@mantine/core';
import { IconBabyCarriage, IconHeartbeat, IconCalendarEvent, IconCheck, IconActivity, IconChartDots, IconMapPin, IconCurrencyDollar, IconSkull } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`; };

const diasDiferencia = (fechaFuturaStr: string) => { 
    const hoy = new Date(); hoy.setHours(0,0,0,0); 
    const fechaParto = new Date(fechaFuturaStr + 'T12:00:00'); 
    fechaParto.setHours(0,0,0,0); 
    const diffTime = fechaParto.getTime() - hoy.getTime(); 
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

const calcularFechaParto = (fechaServicio: string) => {
    const d = new Date(fechaServicio + 'T12:00:00');
    d.setDate(d.getDate() + 283);
    return d.toISOString().split('T')[0];
};

const getIconoEvento = (tipo: string) => {
    switch(tipo) {
        case 'PESAJE': return <ThemeIcon color="blue" size="md" variant="light" radius="xl"><IconChartDots size={14}/></ThemeIcon>;
        case 'VACUNACION': case 'SANIDAD': case 'TRATAMIENTO': case 'ENFERMEDAD': case 'LESION': case 'CURACION': return <ThemeIcon color="red" size="md" variant="light" radius="xl"><IconHeartbeat size={14}/></ThemeIcon>;
        case 'TACTO': case 'SERVICIO': case 'PARTO': return <ThemeIcon color="pink" size="md" variant="light" radius="xl"><IconBabyCarriage size={14}/></ThemeIcon>;
        case 'MOVIMIENTO_POTRERO': case 'CAMBIO_LOTE': return <ThemeIcon color="orange" size="md" variant="light" radius="xl"><IconMapPin size={14}/></ThemeIcon>;
        case 'VENTA': return <ThemeIcon color="green" size="md" variant="light" radius="xl"><IconCurrencyDollar size={14}/></ThemeIcon>;
        case 'BAJA': case 'MUERTO': case 'BORRADO': return <ThemeIcon color="dark" size="md" variant="light" radius="xl"><IconSkull size={14}/></ThemeIcon>;
        default: return <ThemeIcon color="gray" size="md" variant="light" radius="xl"><IconActivity size={14}/></ThemeIcon>;
    }
};

export default function Inicio({ animales, agenda, eventosGlobales, setActiveSection }: any) {
    const [chartHover, setChartHover] = useState<{ label: string, value: number | string } | null>(null);
    const isMobile = useMediaQuery('(max-width: 48em)');

    const haciendaActiva = animales.filter((a: any) => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO');
    
    // RESTAURÉ TODOS LOS DATOS PARA QUE EL GRÁFICO NO EXPLOTE
    const stats = {
        total: haciendaActiva.length,
        vacas: haciendaActiva.filter((a: any) => a.categoria === 'Vaca').length,
        vaquillonas: haciendaActiva.filter((a: any) => a.categoria === 'Vaquillona').length,
        prenadas: haciendaActiva.filter((a: any) => a.estado && a.estado.includes('PREÑADA')).length,
        enfermos: haciendaActiva.filter((a: any) => a.condicion && a.condicion.includes('ENFERMA')).length,
        lactando: haciendaActiva.filter((a: any) => ['Vaca', 'Vaquillona'].includes(a.categoria) && a.estado && a.estado.includes('LACTAN')).length,
        terneros: haciendaActiva.filter((a: any) => a.categoria === 'Ternero').length,
        novillos: haciendaActiva.filter((a: any) => a.categoria === 'Novillo').length,
        toros: haciendaActiva.filter((a: any) => a.categoria === 'Toro').length,
    };
    
    const totalVientres = stats.vacas + stats.vaquillonas; 
    const prenadaPct = totalVientres > 0 ? Math.round((stats.prenadas / totalVientres) * 100) : 0;

    const baseDate = new Date();
    const offset = baseDate.getTimezoneOffset() * 60 * 1000;
    const hoyDate = new Date(baseDate.getTime() - offset);
    const hoyFormateado = hoyDate.toISOString().split('T')[0];
    const date7 = new Date(hoyDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const limite7Dias = date7.toISOString().split('T')[0];
    
    const tareasNormales = agenda.filter((tarea: any) => {
        if (tarea.completado) return false;
        if (tarea.tipo === 'PARTO_ESTIMADO') return false; 
        return tarea.fecha_programada >= hoyFormateado && tarea.fecha_programada <= limite7Dias;
    });

    const partosDinamicos = haciendaActiva
        .filter((a: any) => (a.estado === 'PREÑADA' || a.estado === 'PREÑADA Y LACTANDO') && a.fecha_servicio)
        .map((a: any) => ({
            id: 'dinamico-' + a.id,
            tipo: 'PARTO_ESTIMADO',
            animal_id: a.id,
            fecha_programada: calcularFechaParto(a.fecha_servicio),
            titulo: 'Parto Estimado'
        }))
        .filter((p: any) => p.fecha_programada >= hoyFormateado && p.fecha_programada <= limite7Dias);

    const eventos7Dias: any[] = [...tareasNormales, ...partosDinamicos].sort((a: any, b: any) => a.fecha_programada.localeCompare(b.fecha_programada));

    return (
        <Stack gap="lg">
            <Title order={2}>Resumen General</Title>
            <Grid gutter="lg">
                <Grid.Col span={{ base: 12, md: 7 }}>
                    
                    <Grid gutter="sm" mb="lg">
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                            <Card shadow="sm" radius="md" p="md" withBorder h="100%">
                                <Group wrap="nowrap" gap="xs">
                                    <RingProgress size={54} thickness={5} sections={[{ value: prenadaPct, color: 'teal' }]} label={<Center><Text size="xs" fw={700}>{prenadaPct}%</Text></Center>} />
                                    <div><Text size="xs" c="dimmed" fw={700} lh={1.2} mb={2}>PREÑEZ (VIENTRES)</Text><Text fw={700} size="lg" c="teal" lh={1}>{stats.prenadas} / {totalVientres}</Text></div>
                                </Group>
                            </Card>
                        </Grid.Col>

                        <Grid.Col span={{ base: 6, sm: 4 }}>
                            <Card shadow="sm" radius="md" p={isMobile ? "sm" : "md"} withBorder h={isMobile ? 120 : '100%'}>
                                <Stack gap={4} align="center" justify="center" h="100%" hiddenFrom="sm">
                                    <ThemeIcon size="lg" radius="md" color="indigo" variant="light" mb={4}><IconBabyCarriage size={20}/></ThemeIcon>
                                    <Text size="xs" c="dimmed" fw={700} lh={1.1} ta="center">EN LACTANCIA</Text>
                                    <Text fw={700} size="xl" lh={1}>{stats.lactando}</Text>
                                </Stack>
                                <Group wrap="nowrap" gap="sm" h="100%" visibleFrom="sm">
                                    <ThemeIcon size="xl" radius="md" color="indigo"><IconBabyCarriage/></ThemeIcon>
                                    <div>
                                        <Text size="xs" c="dimmed" fw={700} lh={1.2} mb={2}>EN LACTANCIA</Text>
                                        <Text fw={700} size="lg" lh={1}>{stats.lactando}</Text>
                                        <Text size="xs" c="dimmed" lh={1}>Vientres con cría</Text>
                                    </div>
                                </Group>
                            </Card>
                        </Grid.Col>

                        <Grid.Col span={{ base: 6, sm: 4 }}>
                            <Card shadow="sm" radius="md" p={isMobile ? "sm" : "md"} withBorder h={isMobile ? 120 : '100%'}>
                                <Stack gap={4} align="center" justify="center" h="100%" hiddenFrom="sm">
                                    <ThemeIcon size="lg" radius="md" color={stats.enfermos > 0 ? 'red' : 'gray'} variant="light" mb={4}><IconHeartbeat size={20}/></ThemeIcon>
                                    <Text size="xs" c="dimmed" fw={700} lh={1.1} ta="center">ENFERMOS</Text>
                                    <Text fw={700} size="xl" lh={1}>{stats.enfermos}</Text>
                                </Stack>
                                <Group wrap="nowrap" gap="sm" h="100%" visibleFrom="sm">
                                    <ThemeIcon size="xl" radius="md" color={stats.enfermos > 0 ? 'red' : 'gray'}><IconHeartbeat/></ThemeIcon>
                                    <div>
                                        <Text size="xs" c="dimmed" fw={700} lh={1.2} mb={2}>ENFERMOS</Text>
                                        <Text fw={700} size="lg" c={stats.enfermos > 0 ? 'red' : 'dimmed'} lh={1}>{stats.enfermos}</Text>
                                    </div>
                                </Group>
                            </Card>
                        </Grid.Col>
                    </Grid>

                    <Card shadow="sm" radius="md" p="md" withBorder>
                        <Group gap="xs" mb="sm">
                            <ThemeIcon size="lg" radius="md" color={eventos7Dias.length > 0 ? "orange" : "teal"}>
                                <IconCalendarEvent size={20} />
                            </ThemeIcon>
                            <Text fw={700} size="xl">Agenda: Próximos 7 Días</Text>
                            {eventos7Dias.length > 0 && <Badge color="orange" variant="light">{eventos7Dias.length} pendientes</Badge>}
                        </Group>
                        
                        <ScrollArea h={isMobile ? undefined : 583} mah={isMobile ? 583 : undefined} offsetScrollbars>
                            {eventos7Dias.length > 0 ? (
                                <Table striped stickyHeader>
                                    <Table.Thead bg="gray.1">
                                        <Table.Tr>
                                            <Table.Th>Fecha</Table.Th>
                                            <Table.Th>Evento / Tarea</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {eventos7Dias.map((tarea: any) => {
                                            const vacaVal = tarea.animal_id ? animales.find((a: any) => a.id === tarea.animal_id) : null;
                                            const diasFaltan = diasDiferencia(tarea.fecha_programada); 
                                            const colorBadge = diasFaltan <= 0 ? 'red' : diasFaltan <= 2 ? 'orange' : 'teal';
                                            const textoDias = diasFaltan <= 0 ? 'Hoy' : diasFaltan === 1 ? 'Mañana' : `En ${diasFaltan} días`;
                                            return (
                                                <Table.Tr key={tarea.id}>
                                                    <Table.Td>
                                                        <Group gap="xs">
                                                            <Text size="sm" fw={700} c={colorBadge}>{formatDate(tarea.fecha_programada)}</Text>
                                                            <Badge size="xs" color={colorBadge} variant="light">{textoDias}</Badge>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        {tarea.tipo === 'PARTO_ESTIMADO' ? (
                                                            <Group gap={6}>
                                                                <ThemeIcon size="sm" color="pink" variant="light" radius="xl"><IconBabyCarriage size={12}/></ThemeIcon>
                                                                <div>
                                                                    <Text fw={700} size="sm" c="dark" lh={1.2}>Parto Estimado</Text>
                                                                    <Text size="xs" c="dimmed">Caravana: {vacaVal?.caravana || '?'}</Text>
                                                                </div>
                                                            </Group>
                                                        ) : (
                                                            <Text fw={700} size="sm" c="dark">{tarea.titulo}</Text>
                                                        )}
                                                    </Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            ) : (
                                <Center style={{ display: 'flex', flexDirection: 'column', padding: '3rem 0' }}>
                                    <ThemeIcon size={80} radius="100%" variant="light" color="teal" mb="md"><IconCheck size={40} /></ThemeIcon>
                                    <Text c="dimmed" size="lg" fw={700}>¡Semana libre!</Text>
                                    <Text c="dimmed" size="sm">No hay tareas ni partos en los próximos 7 días.</Text>
                                </Center>
                            )}
                        </ScrollArea>
                    </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Card shadow="sm" radius="md" p="md" withBorder mb="lg">
                        <Text fw={700} mb="sm">Distribución del Rodeo</Text>
                        <Center>
                            <RingProgress size={200} thickness={18} label={<Center><Stack gap={0} align="center"><Text size="xs" c="dimmed" fw={700}>{chartHover ? chartHover.label : 'TOTAL'}</Text><Text fw={700} size="xl">{chartHover ? chartHover.value : stats.total}</Text></Stack></Center>}
                                sections={[
                                    { value: stats.total > 0 ? (stats.vacas / stats.total) * 100 : 0, color: 'blue', onMouseEnter: () => setChartHover({label: 'VACAS', value: stats.vacas}), onMouseLeave: () => setChartHover(null) },
                                    { value: stats.total > 0 ? (stats.vaquillonas / stats.total) * 100 : 0, color: 'pink', onMouseEnter: () => setChartHover({label: 'VAQUILLONAS', value: stats.vaquillonas}), onMouseLeave: () => setChartHover(null) },
                                    { value: stats.total > 0 ? (stats.terneros / stats.total) * 100 : 0, color: 'teal', onMouseEnter: () => setChartHover({label: 'TERNEROS', value: stats.terneros}), onMouseLeave: () => setChartHover(null) },
                                    { value: stats.total > 0 ? (stats.novillos / stats.total) * 100 : 0, color: 'orange', onMouseEnter: () => setChartHover({label: 'NOVILLOS', value: stats.novillos}), onMouseLeave: () => setChartHover(null) },
                                    { value: stats.total > 0 ? (stats.toros / stats.total) * 100 : 0, color: 'grape', onMouseEnter: () => setChartHover({label: 'TOROS', value: stats.toros}), onMouseLeave: () => setChartHover(null) }
                                ]}
                            />
                        </Center>
                        <Group justify="center" gap="xs" mt="sm"><Group gap={4}><Badge size="xs" circle color="blue"/><Text size="xs">Vacas</Text></Group><Group gap={4}><Badge size="xs" circle color="pink"/><Text size="xs">Vaq.</Text></Group><Group gap={4}><Badge size="xs" circle color="teal"/><Text size="xs">Terneros</Text></Group><Group gap={4}><Badge size="xs" circle color="orange"/><Text size="xs">Novillos</Text></Group><Group gap={4}><Badge size="xs" circle color="grape"/><Text size="xs">Toros</Text></Group></Group>
                    </Card>

                    <Card shadow="sm" radius="md" p="md" withBorder>
                        <Group gap="xs" mb="sm"><ThemeIcon size="lg" radius="md" color="blue"><IconActivity size={20} /></ThemeIcon><Text fw={700} size="lg">Últimos Movimientos</Text></Group>
                        <ScrollArea mah={320} offsetScrollbars>
                            <Stack gap="xs" mt="xs">
                                {eventosGlobales.slice(0, 15).map((ev: any) => (
                                    <Group key={ev.id} wrap="nowrap" align="flex-start" gap="sm" p="xs" bg="gray.0" style={{borderRadius: 8}}>
                                        {getIconoEvento(ev.tipo)}
                                        <div style={{ flex: 1 }}><Group justify="space-between" mb={2}><Text size="sm" fw={700}>{ev.tipo} <Text span c="dimmed" fw={400}>• {ev.animales?.caravana || 'Lote'}</Text></Text><Text size="xs" c="dimmed">{formatDate(ev.fecha_evento)}</Text></Group><Text size="xs" c="dimmed" lineClamp={1}>{ev.resultado} {ev.detalle ? `- ${ev.detalle}` : ''}</Text></div>
                                    </Group>
                                ))}
                            </Stack>
                        </ScrollArea>
                        <Button variant="light" fullWidth mt="md" onClick={() => setActiveSection('actividad')}>Ver Todo</Button>
                    </Card>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}