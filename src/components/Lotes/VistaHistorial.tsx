import { useState, useMemo } from 'react';
import { Stack, Group, ActionIcon, Title, Text, TextInput, SimpleGrid, Card, UnstyledButton, Badge, Divider, Paper, Alert } from '@mantine/core';
import { IconArrowLeft, IconArchive, IconSearch, IconSortDescending, IconSortAscending, IconTrash, IconReceipt2 } from '@tabler/icons-react';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };

export default function VistaHistorial({ todosLosHistoricos, onVolver, onBorrarHistorial, onAbrirHistorico }: any) {
    const [busquedaHist, setBusquedaHist] = useState('');
    const [ordenHist, setOrdenHist] = useState<'desc' | 'asc'>('desc');

    const historicosFiltrados = useMemo(() => {
        let filtrados = todosLosHistoricos;
        if (busquedaHist) {
            filtrados = filtrados.filter((h: any) => h.nombre_lote.toLowerCase().includes(busquedaHist.toLowerCase()));
        }
        filtrados = filtrados.sort((a: any, b: any) => {
            const dateA = new Date(a.fecha_cierre).getTime();
            const dateB = new Date(b.fecha_cierre).getTime();
            return ordenHist === 'desc' ? dateB - dateA : dateA - dateB;
        });
        return filtrados;
    }, [todosLosHistoricos, busquedaHist, ordenHist]);

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <Group align="center">
                    <ActionIcon variant="light" color="gray" size="lg" onClick={onVolver} radius="xl">
                        <IconArrowLeft size={22} />
                    </ActionIcon>
                    <IconArchive color="gray" size={28}/>
                    <Title order={2}>Historial de Lotes Cerrados</Title>
                </Group>
            </Group>

            <Group justify="space-between" align="flex-end">
                <Text c="dimmed" size="sm" maw={500}>
                    Aquí se guardan los "pantallazos" de los ciclos terminados de todos tus lotes para comparar rendimientos.
                </Text>
                <Group>
                    <TextInput 
                        placeholder="Buscar por nombre..." 
                        leftSection={<IconSearch size={16}/>}
                        value={busquedaHist}
                        onChange={(e) => setBusquedaHist(e.target.value)}
                    />
                    <ActionIcon 
                        variant="light" color="blue" size="lg" 
                        onClick={() => setOrdenHist(prev => prev === 'desc' ? 'asc' : 'desc')}
                        title={`Ordenar por fecha (${ordenHist === 'desc' ? 'Más recientes' : 'Más antiguos'})`}
                    >
                        {ordenHist === 'desc' ? <IconSortDescending size={20}/> : <IconSortAscending size={20}/>}
                    </ActionIcon>
                </Group>
            </Group>

            {historicosFiltrados.length === 0 ? (
                <Alert color="gray" icon={<IconArchive/>}>No hay ciclos cerrados que coincidan con la búsqueda.</Alert>
            ) : (
                <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }}>
                    {historicosFiltrados.map((hist: any) => (
                        <Card key={hist.id} withBorder shadow="sm" radius="md" p="md" style={{ position: 'relative' }}>
                            <Group justify="space-between" mb="xs" align="flex-start">
                                <UnstyledButton onClick={() => onAbrirHistorico(hist)} style={{ flex: 1 }}>
                                    <Text fw={800} size="lg" c="grape.9">{hist.nombre_lote}</Text>
                                </UnstyledButton>
                                <Group gap="xs">
                                    <Badge color={hist.vendido ? 'green' : 'gray'} variant="light">
                                        {hist.vendido ? 'VENDIDO' : 'CERRADO'}
                                    </Badge>
                                    <ActionIcon color="red" variant="subtle" size="sm" onClick={() => onBorrarHistorial(hist.id)}>
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Group>
                            
                            <Text size="sm" fw={700} mb="sm">{hist.cantidad_animales} cabezas</Text>
                            
                            <Divider variant="dashed" mb="sm" />
                            
                            <SimpleGrid cols={2} spacing="xs">
                                <div><Text size="xs" c="dimmed">Fecha Cierre</Text><Text fw={600} size="sm">{formatDate(hist.fecha_cierre)}</Text></div>
                                <div><Text size="xs" c="dimmed">ADPV</Text><Text fw={700} c="blue" size="sm">{hist.adpv} kg/día</Text></div>
                                <div><Text size="xs" c="dimmed">Peso Inicial (Suma)</Text><Text fw={600} size="sm">{hist.peso_inicial} kg</Text></div>
                                <div><Text size="xs" c="dimmed">Peso Final (Suma)</Text><Text fw={600} size="sm">{hist.peso_final} kg</Text></div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <Text size="xs" c="dimmed">Ganancia Total Promedio</Text>
                                    <Text fw={700} c="teal" size="sm">+{hist.ganancia_promedio} kg en {hist.dias_ciclo} días</Text>
                                </div>
                            </SimpleGrid>

                            {/* CAMBIO AQUÍ: Mostramos el costo en lugar de la venta */}
                            {hist.costo_total > 0 && (
                                <Paper bg="gray.0" mt="md" p="xs" radius="md" withBorder>
                                    <Group justify="space-between">
                                        <Group gap={6}>
                                            <IconReceipt2 size={14} color="gray"/>
                                            <Text size="xs" fw={700} c="dimmed">INVERSIÓN EN LOTE</Text>
                                        </Group>
                                        <Text size="sm" fw={800} c="dark">${Number(hist.costo_total).toLocaleString('es-AR')}</Text>
                                    </Group>
                                </Paper>
                            )}
                        </Card>
                    ))}
                </SimpleGrid>
            )}
        </Stack>
    );
}