import { useState } from 'react';
import { Title, Grid, SimpleGrid, Card, Group, RingProgress, Center, Text, ThemeIcon, Badge, ScrollArea, Table, Stack, Paper, Button } from '@mantine/core';
import { IconBabyCarriage, IconHeartbeat, IconCalendarEvent, IconCheck, IconActivity, IconChartDots, IconMapPin, IconCurrencyDollar, IconSkull } from '@tabler/icons-react';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };
const diasDiferencia = (fechaFuturaStr: string) => { const hoy = new Date(); hoy.setHours(0,0,0,0); const fechaParto = new Date(fechaFuturaStr); fechaParto.setHours(0,0,0,0); const diffTime = fechaParto.getTime() - hoy.getTime(); return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); };

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

    const haciendaActiva = animales.filter((a: any) => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO');
    const stats = {
        total: haciendaActiva.length,
        vacas: haciendaActiva.filter((a: any) => a.categoria === 'Vaca').length,
        vaquillonas: haciendaActiva.filter((a: any) => a.categoria === 'Vaquillona').length,
        prenadas: haciendaActiva.filter((a: any) => a.estado === 'PREÑADA').length,
        enfermos: haciendaActiva.filter((a: any) => a.condicion && a.condicion.includes('ENFERMA')).length,
        terneros: haciendaActiva.filter((a: any) => a.categoria === 'Ternero').length,
        ternerosM: haciendaActiva.filter((a: any) => a.categoria === 'Ternero' && a.sexo === 'M').length,
        ternerosH: haciendaActiva.filter((a: any) => a.categoria === 'Ternero' && a.sexo === 'H').length,
        novillos: haciendaActiva.filter((a: any) => a.categoria === 'Novillo').length,
        toros: haciendaActiva.filter((a: any) => a.categoria === 'Toro').length,
    };
    const totalVientres = stats.vacas + stats.vaquillonas; 
    const prenadaPct = totalVientres > 0 ? Math.round((stats.prenadas / totalVientres) * 100) : 0;

    const hoyFormateado = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60 * 1000)).toISOString().split('T')[0];
    
    const tareasParaHoy = agenda.filter((t: any) => !t.completado && t.fecha_programada === hoyFormateado);
    const partosProximos = agenda.filter((tarea: any) => 
        tarea.tipo === 'PARTO_ESTIMADO' && !tarea.completado && tarea.fecha_programada >= hoyFormateado && animales.some((a: any) => a.id === tarea.animal_id)
    ).sort((a: any, b: any) => a.fecha_programada.localeCompare(b.fecha_programada));

    return (
        <>
            <Title order={2} mb="lg">Resumen General</Title>
            <Grid gutter="lg">
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
                        <Card shadow="sm" radius="md" p="md" withBorder>
                            <Group wrap="nowrap" gap="xs">
                                <RingProgress size={54} thickness={5} sections={[{ value: prenadaPct, color: 'teal' }]} label={<Center><Text size="xs" fw={700}>{prenadaPct}%</Text></Center>} />
                                <div><Text size="xs" c="dimmed" fw={700} lh={1.2} mb={2}>PREÑEZ (VIENTRES)</Text><Text fw={700} size="lg" c="teal" lh={1}>{stats.prenadas} / {totalVientres}</Text></div>
                            </Group>
                        </Card>
                        <Card shadow="sm" radius="md" p="md" withBorder>
                            <Group wrap="nowrap" gap="sm"><ThemeIcon size="xl" radius="md" color="teal"><IconBabyCarriage/></ThemeIcon><div><Text size="xs" c="dimmed" fw={700} lh={1.2} mb={2}>TERNEROS</Text><Text fw={700} size="lg" lh={1}>{stats.terneros}</Text><Text size="xs" c="dimmed" lh={1}>({stats.ternerosM} M / {stats.ternerosH} H)</Text></div></Group>
                        </Card>
                        <Card shadow="sm" radius="md" p="md" withBorder>
                            <Group wrap="nowrap" gap="sm"><ThemeIcon size="xl" radius="md" color={stats.enfermos > 0 ? 'red' : 'gray'}><IconHeartbeat/></ThemeIcon><div><Text size="xs" c="dimmed" fw={700} lh={1.2} mb={2}>ENFERMOS</Text><Text fw={700} size="lg" c={stats.enfermos > 0 ? 'red' : 'dimmed'} lh={1}>{stats.enfermos}</Text></div></Group>
                        </Card>
                    </SimpleGrid>

                    <Card shadow="sm" radius="md" p="md" withBorder>
                        <Group gap="xs" mb="sm">
                            <ThemeIcon size="lg" radius="md" color={partosProximos.length > 0 ? "teal" : "orange"}>{partosProximos.length > 0 ? <IconBabyCarriage size={20} /> : <IconCalendarEvent size={20} />}</ThemeIcon>
                            <Text fw={700} size="xl">{partosProximos.length > 0 ? "Próximos Partos" : "Tareas para Hoy"}</Text>
                            {partosProximos.length > 0 && <Badge color="teal" variant="light">{partosProximos.length} en espera</Badge>}
                            {partosProximos.length === 0 && tareasParaHoy.length > 0 && <Badge color="orange" variant="light">{tareasParaHoy.length} pendientes</Badge>}
                        </Group>
                        <ScrollArea h={583} offsetScrollbars>
                            {partosProximos.length > 0 ? (
                                <Table striped stickyHeader>
                                    <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Fecha Est.</Table.Th><Table.Th>Vaca</Table.Th></Table.Tr></Table.Thead>
                                    <Table.Tbody>
                                        {partosProximos.map((parto: any) => {
                                            const vacaVal = animales.find((a: any) => a.id === parto.animal_id);
                                            const diasFaltan = diasDiferencia(parto.fecha_programada); const colorBadge = diasFaltan < 7 ? 'red' : diasFaltan < 15 ? 'orange' : 'teal';
                                            return (<Table.Tr key={parto.id}><Table.Td><Group gap="xs"><Text size="sm" fw={700} c={colorBadge}>{formatDate(parto.fecha_programada)}</Text><Badge size="xs" color={colorBadge} variant="light">{diasFaltan} días</Badge></Group></Table.Td><Table.Td><Text fw={700} size="sm">{vacaVal?.caravana || '?'}</Text></Table.Td></Table.Tr>);
                                        })}
                                    </Table.Tbody>
                                </Table>
                            ) : tareasParaHoy.length > 0 ? (
                                <Stack gap="xs" p="xs" mt="sm">
                                    {tareasParaHoy.map((tarea: any) => (
                                        <Paper key={tarea.id} p="md" withBorder shadow="sm" radius="md" style={{ borderLeft: `4px solid #fd7e14` }}><Group justify="space-between" align="center" wrap="nowrap"><div style={{ flex: 1 }}><Text fw={700} size="md" c="dark">{tarea.titulo}</Text></div></Group></Paper>
                                    ))}
                                </Stack>
                            ) : (
                                <Center h="100%" style={{ display: 'flex', flexDirection: 'column', paddingTop: '2rem' }}><ThemeIcon size={80} radius="100%" variant="light" color="gray" mb="md"><IconCheck size={40} /></ThemeIcon><Text c="dimmed" size="lg" fw={700}>¡Todo al día!</Text></Center>
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
                                    { value: (stats.vacas / stats.total) * 100, color: 'blue', onMouseEnter: () => setChartHover({label: 'VACAS', value: stats.vacas}), onMouseLeave: () => setChartHover(null) },
                                    { value: (stats.vaquillonas / stats.total) * 100, color: 'pink', onMouseEnter: () => setChartHover({label: 'VAQUILLONAS', value: stats.vaquillonas}), onMouseLeave: () => setChartHover(null) },
                                    { value: (stats.terneros / stats.total) * 100, color: 'teal', onMouseEnter: () => setChartHover({label: 'TERNEROS', value: stats.terneros}), onMouseLeave: () => setChartHover(null) },
                                    { value: (stats.novillos / stats.total) * 100, color: 'orange', onMouseEnter: () => setChartHover({label: 'NOVILLOS', value: stats.novillos}), onMouseLeave: () => setChartHover(null) },
                                    { value: (stats.toros / stats.total) * 100, color: 'grape', onMouseEnter: () => setChartHover({label: 'TOROS', value: stats.toros}), onMouseLeave: () => setChartHover(null) }
                                ]}
                            />
                        </Center>
                        <Group justify="center" gap="xs" mt="sm"><Group gap={4}><Badge size="xs" circle color="blue"/><Text size="xs">Vacas</Text></Group><Group gap={4}><Badge size="xs" circle color="pink"/><Text size="xs">Vaq.</Text></Group><Group gap={4}><Badge size="xs" circle color="teal"/><Text size="xs">Terneros</Text></Group><Group gap={4}><Badge size="xs" circle color="orange"/><Text size="xs">Novillos</Text></Group><Group gap={4}><Badge size="xs" circle color="grape"/><Text size="xs">Toros</Text></Group></Group>
                    </Card>

                    <Card shadow="sm" radius="md" p="md" withBorder>
                        <Group gap="xs" mb="sm"><ThemeIcon size="lg" radius="md" color="blue"><IconActivity size={20} /></ThemeIcon><Text fw={700} size="lg">Últimos Movimientos</Text></Group>
                        <ScrollArea h={320} offsetScrollbars>
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
        </>
    );
}