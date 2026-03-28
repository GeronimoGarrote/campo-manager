import { useState } from 'react';
import { Group, TextInput, Select, Paper, Table, Text, Badge } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };

export default function Actividad({ eventosGlobales }: any) {
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipoEvento, setFiltroTipoEvento] = useState<string | null>(''); 

    const eventosFiltrados = eventosGlobales.filter((ev: any) => {
        const coincideTexto = ev.animales?.caravana.toLowerCase().includes(busqueda.toLowerCase()) || ev.tipo.toLowerCase().includes(busqueda.toLowerCase());
        const coincideTipo = filtroTipoEvento ? ev.tipo === filtroTipoEvento : true;
        return coincideTexto && coincideTipo;
    });

    return (
        <>
            <Group mb="md">
                <TextInput style={{flex: 2}} leftSection={<IconSearch size={16}/>} placeholder="Buscar por Caravana..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                <Select style={{flex: 1}} placeholder="Filtrar Actividad" data={['PESAJE', 'TACTO', 'SERVICIO', 'PARTO', 'BAJA', 'VACUNACION', 'ENFERMEDAD', 'CURACION', 'CAPADO', 'TRATAMIENTO', 'MOVIMIENTO_POTRERO', 'CAMBIO_LOTE', 'OTRO']} value={filtroTipoEvento} onChange={setFiltroTipoEvento} clearable />
            </Group>
            <Paper radius="md" withBorder>
                <Table>
                    <Table.Thead><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Ref</Table.Th><Table.Th>Evento</Table.Th><Table.Th>Detalle</Table.Th><Table.Th>Costo</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                        {eventosFiltrados.map((ev: any) => (
                            <Table.Tr key={ev.id}>
                                <Table.Td><Text size="sm" c="dimmed">{formatDate(ev.fecha_evento)}</Text></Table.Td>
                                <Table.Td><Text fw={700}>{ev.animales?.caravana || '-'}</Text></Table.Td>
                                <Table.Td><Badge variant="outline" size="sm">{ev.tipo}</Badge></Table.Td>
                                <Table.Td>
                                    <Text size="sm" fw={500}>{ev.resultado}</Text>
                                    {ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}
                                    {ev.datos_extra?.toros_caravanas && <Text size="xs" c="dimmed">Toro/s: {ev.datos_extra.toros_caravanas}</Text>}
                                    {ev.datos_extra?.potrero_destino && <Text size="xs" c="dimmed">Destino: {ev.datos_extra.potrero_destino} {ev.datos_extra.parcela_destino ? `(${ev.datos_extra.parcela_destino})` : ''}</Text>}
                                    {ev.datos_extra?.lote_destino && <Text size="xs" c="dimmed">Grupo: {ev.datos_extra.lote_destino}</Text>}
                                </Table.Td>
                                <Table.Td><Text size="sm" c="dimmed">${ev.costo || 0}</Text></Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Paper>
        </>
    )
}