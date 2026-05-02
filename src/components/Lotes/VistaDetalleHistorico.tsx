import { useState, useEffect } from 'react';
import { Group, Title, Badge, SimpleGrid, Paper, Text, ActionIcon, Tabs, Table, Stack, Alert} from '@mantine/core';
import { IconArrowLeft, IconArchive, IconList, IconChartDots, IconInfoCircle} from '@tabler/icons-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../supabase';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };

const CustomTooltipMulti = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const animalKeys = Object.keys(data).filter(k => k !== 'fecha' && k !== '_meta' && k !== 'Promedio Lote');
        const pesoTotal = animalKeys.reduce((acc: number, curr: string) => acc + (Number(data[curr]) || 0), 0);
        const cantAnimales = animalKeys.length;
        const promedioLote = data['Promedio Lote'];

        return (
            <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '220px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '6px', marginBottom: '8px', fontSize: '14px', color: '#343a40' }}>Fecha: {label}</p>
                {cantAnimales > 0 && (<div style={{ marginBottom: '10px' }}><p style={{ margin: 0, fontSize: '13px', color: '#495057', marginBottom: '4px' }}>Animales pesados: <b>{cantAnimales}</b></p><p style={{ margin: 0, fontSize: '13px', color: '#495057' }}>Sumatoria: <b>{pesoTotal} kg</b></p></div>)}
                {promedioLote && (<div style={{ borderTop: '1px dashed #ced4da', paddingTop: '8px' }}><p style={{ margin: 0, color: '#be4bdb', fontWeight: 'bold', fontSize: '14px' }}>Promedio Lote: {promedioLote} kg</p></div>)}
            </div>
        );
    }
    return null;
};

export default function VistaDetalleHistorico({ historialSel, onVolver, abrirFichaVaca }: any) {
    const [animalesHist, setAnimalesHist] = useState<any[]>([]);
    const [datosGrafico, setDatosGrafico] = useState<any[]>([]);
    const [lineasAnimales, setLineasAnimales] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!historialSel || !historialSel.animales_ids || historialSel.animales_ids.length === 0) {
            setLoading(false);
            return;
        }

        async function reconstruirHistoria() {
            setLoading(true);
            const { data: anims } = await supabase.from('animales').select('*').in('id', historialSel.animales_ids);
            if (anims) setAnimalesHist(anims);

            const { data: pesajes } = await supabase
                .from('eventos')
                .select('*, animales!inner(caravana)')
                .in('animal_id', historialSel.animales_ids)
                .eq('tipo', 'PESAJE')
                .lte('fecha_evento', historialSel.fecha_cierre + 'T23:59:59')
                .order('fecha_evento', { ascending: true });

            if (pesajes && pesajes.length > 0) {
                const fechasUnicas = [...new Set(pesajes.map((p: any) => p.fecha_evento.split('T')[0]))].sort();
                const caravanasPresentes = new Set<string>();
                const ultimoPesoConocido: Record<string, number> = {};

                const dataGraf = fechasUnicas.map((fechaStr: any) => {
                    const pesajesDelDia = pesajes.filter((p: any) => p.fecha_evento.startsWith(fechaStr));
                    const objParaElGrafico: any = { fecha: formatDate(fechaStr) };
                    pesajesDelDia.forEach((p: any) => {
                        const pesoNum = parseFloat(p.resultado.replace(/[^0-9.]/g, '')); 
                        const caravana = (p.animales as any)?.caravana || 'Desc';
                        if(!isNaN(pesoNum)) { ultimoPesoConocido[caravana] = pesoNum; caravanasPresentes.add(caravana); objParaElGrafico[caravana] = pesoNum; }
                    });
                    const pesosActivos = Object.values(ultimoPesoConocido);
                    if (pesosActivos.length > 0) { 
                        const sumaTotal = pesosActivos.reduce((a: number, b: number) => a + b, 0); 
                        objParaElGrafico['Promedio Lote'] = Math.round(sumaTotal / pesosActivos.length); 
                    }
                    return objParaElGrafico;
                });
                setLineasAnimales(Array.from(caravanasPresentes));
                setDatosGrafico(dataGraf);
            }
            setLoading(false);
        }
        reconstruirHistoria();
    }, [historialSel]);

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <Group align="center">
                    <ActionIcon variant="light" color="gray" size="lg" onClick={onVolver} radius="xl"><IconArrowLeft size={22} /></ActionIcon>
                    <IconArchive color="gray" size={28}/>
                    <Title order={2}>Historial: {historialSel.nombre_lote}</Title>
                    <Badge color={historialSel.vendido ? 'green' : 'gray'} variant="light">{historialSel.vendido ? 'VENDIDO' : 'CERRADO'}</Badge>
                </Group>
            </Group>

            <Paper withBorder radius="md" p="md" bg="white">
                <Tabs defaultValue="resumen" color="grape">
                    <Tabs.List grow mb="md">
                        <Tabs.Tab value="resumen" leftSection={<IconChartDots size={16}/>}>Resumen y Rendimiento</Tabs.Tab>
                        <Tabs.Tab value="hacienda" leftSection={<IconList size={16}/>}>Hacienda Original ({historialSel.cantidad_animales})</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="resumen">
                        <SimpleGrid cols={{ base: 2, sm: 5 }} mt="sm" mb="xl">
                            <Paper withBorder p="md" ta="center" radius="md">
                                <Text size="sm" c="dimmed" fw={700} tt="uppercase">Peso Inicial</Text>
                                <Text fw={700} size="xl">{historialSel.peso_inicial} kg</Text>
                            </Paper>
                            <Paper withBorder p="md" ta="center" radius="md">
                                <Text size="sm" c="dimmed" fw={700} tt="uppercase">Peso Final</Text>
                                <Text fw={700} size="xl">{historialSel.peso_final} kg</Text>
                            </Paper>
                            <Paper withBorder p="md" ta="center" radius="md">
                                <Text size="sm" c="dimmed" fw={700} tt="uppercase">Ganancia</Text>
                                <Text fw={700} size="xl" c="teal">+{historialSel.ganancia_promedio} kg</Text>
                            </Paper>
                            <Paper withBorder p="md" ta="center" radius="md">
                                <Text size="sm" c="dimmed" fw={700} tt="uppercase">ADPV</Text>
                                <Text fw={700} size="xl" c="blue">{historialSel.adpv} kg/d</Text>
                            </Paper>
                            {/* NUEVO CUADRO DE COSTO */}
                            <Paper withBorder p="md" ta="center" radius="md" bg="gray.0">
                                <Text size="sm" c="dimmed" fw={700} tt="uppercase">Inversión (Costos)</Text>
                                <Text fw={700} size="xl" c="red">${Number(historialSel.costo_total || 0).toLocaleString('es-AR')}</Text>
                            </Paper>
                        </SimpleGrid>

                        {loading ? (<Text ta="center" c="dimmed" my="xl">Reconstruyendo gráfico histórico...</Text>) : 
                         datosGrafico.length > 0 ? (
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={datosGrafico} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fecha" /><YAxis domain={['auto', 'auto']} /><RechartsTooltip content={<CustomTooltipMulti />} />
                                        {lineasAnimales.map((caravana, idx) => (<Line key={idx} type="monotone" dataKey={caravana} stroke="#ced4da" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />))}
                                        <Line type="monotone" dataKey="Promedio Lote" stroke="#be4bdb" strokeWidth={4} activeDot={{ r: 8 }} connectNulls />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (<Alert color="grape" title="Sin datos de pesaje" mt="md" icon={<IconInfoCircle/>}>No se encontraron registros de pesaje para este ciclo.</Alert>)}
                    </Tabs.Panel>

                    <Tabs.Panel value="hacienda">
                        <Table striped highlightOnHover mt="md">
                            <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Caravana</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Sexo</Table.Th><Table.Th>Estado Actual</Table.Th></Table.Tr></Table.Thead>
                            <Table.Tbody>
                                {animalesHist.map((a: any) => (
                                    <Table.Tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => abrirFichaVaca(a)}>
                                        <Table.Td fw={700}>{a.caravana}</Table.Td><Table.Td>{a.categoria}</Table.Td>
                                        <Table.Td><Badge color={a.sexo === 'M' ? 'blue' : 'pink'} variant="light">{a.sexo === 'M' ? 'MACHO' : 'HEMBRA'}</Badge></Table.Td>
                                        <Table.Td><Badge color={a.estado === 'VENDIDO' ? 'green' : 'blue'}>{a.estado}</Badge></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Tabs.Panel>
                </Tabs>
            </Paper>
        </Stack>
    );
}