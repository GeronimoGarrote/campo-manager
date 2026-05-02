import { Group, Title, Badge, Button, SimpleGrid, Card, Paper, Text } from '@mantine/core';
import { IconPlus, IconTag, IconHistory } from '@tabler/icons-react';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };

export default function VistaLotesActivos({ lotes, animales, eventosLotesGlobal, onAbrirHistorial, onNuevoLote, onAbrirLote }: any) {
    const haciendaActiva = animales.filter((a: any) => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO' && a.estado !== 'EN TRÁNSITO');
    
    return (
        <>
            <Group justify="space-between" mb="lg" align="center">
                <Group>
                    <Title order={3}>Lotes / Grupos</Title>
                    <Badge size="xl" color="grape" circle>{lotes.length}</Badge>
                </Group>
                <Group>
                    <Button variant="light" color="blue" leftSection={<IconHistory size={20}/>} onClick={onAbrirHistorial}>
                        Historial de Cierres
                    </Button>
                    <Button leftSection={<IconPlus size={22}/>} color="grape" size="md" variant="filled" onClick={onNuevoLote}>
                        Nuevo Lote
                    </Button>
                </Group>
            </Group>
            
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {lotes.map((lote: any) => { 
                    const animalesLote = haciendaActiva.filter((a: any) => a.lote_id === lote.id);
                    const ultEv = eventosLotesGlobal.find((e: any) => e.lote_id === lote.id);
                    return (
                        <Card key={lote.id} shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => onAbrirLote(lote)}>
                            <Group justify="space-between" mb="xs">
                                <Group gap="xs"><IconTag size={20} color="purple"/><Text fw={700} size="lg">{lote.nombre}</Text></Group>
                                <Badge color="blue" variant="light">{animalesLote.length} Cab</Badge>
                            </Group>
                            <Paper bg="gray.0" p="xs" radius="md" mt="sm">
                                <Group justify="space-between">
                                    <Text size="xs" fw={700} c="dimmed">ÚLTIMO REGISTRO</Text>
                                    {ultEv ? <Badge color="grape" variant="dot">{ultEv.tipo} ({formatDate(ultEv.fecha)})</Badge> : <Text size="xs" c="dimmed">Sin datos</Text>}
                                </Group>
                            </Paper>
                            <Button variant="light" color="grape" fullWidth mt="md" radius="md">Ver Ficha Completa</Button>
                        </Card>
                    )
                })}
            </SimpleGrid>
            {lotes.length === 0 && <Text c="dimmed" ta="center" mt="xl">No hay lotes (grupos) creados.</Text>}
        </>
    );
}