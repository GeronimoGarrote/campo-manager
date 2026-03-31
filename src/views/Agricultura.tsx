import { useState } from 'react';
import { Group, Title, Badge, Button, SimpleGrid, Card, Paper, Text, ActionIcon, Tabs, TextInput, Select, Table, Modal, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTractor, IconEdit, IconArrowLeft, IconLeaf, IconMapPin, IconList, IconCurrencyDollar, IconCheck, IconTrash } from '@tabler/icons-react';
import { supabase } from '../supabase';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };
const getHoyIso = () => { const d = new Date(); const offset = d.getTimezoneOffset(); return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]; };

export default function Agricultura({ 
    campoId, potreros, parcelas, animales, 
    fetchPotreros, fetchParcelas, abrirFichaVaca 
}: any) {
    const [loading, setLoading] = useState(false);
    
    // Navegación interna
    const [potreroSel, setPotreroSel] = useState<any | null>(null);

    // Modal Nuevo Potrero
    const [modalPotreroOpen, { open: openModalPotrero, close: closeModalPotrero }] = useDisclosure(false);
    const [nombrePotrero, setNombrePotrero] = useState('');
    const [hasPotrero, setHasPotrero] = useState<string | number>('');

    // Ficha Potrero - Estados
    const [laboresFicha, setLaboresFicha] = useState<any[]>([]);
    const [fechaLabor, setFechaLabor] = useState(getHoyIso());
    const [actividadPotrero, setActividadPotrero] = useState<string | null>('FUMIGADA');
    const [cultivoInput, setCultivoInput] = useState('');
    const [detalleLabor, setDetalleLabor] = useState('');
    const [costoLabor, setCostoLabor] = useState<string | number>('');
    const [nuevaParcelaNombre, setNuevaParcelaNombre] = useState('');
    const [nuevaParcelaHas, setNuevaParcelaHas] = useState<string | number>('');

    const haciendaActiva = animales.filter((a: any) => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO');

    // --- FUNCIONES POTREROS ---
    async function guardarPotrero() { 
        if (!nombrePotrero || !campoId) return; 
        setLoading(true); 
        const { error } = await supabase.from('potreros').insert([{ nombre: nombrePotrero, hectareas: Number(hasPotrero), estado: 'DESCANSO', establecimiento_id: campoId }]); 
        setLoading(false); 
        if (!error) { setNombrePotrero(''); setHasPotrero(''); fetchPotreros(); closeModalPotrero(); } 
    }

    async function editarPotrero(id: string, nombreActual: string, hasActual: number) {
        const nuevoNombre = prompt("Nuevo nombre del Potrero:", nombreActual);
        if (!nuevoNombre) return;
        const nuevasHas = prompt("Hectáreas totales:", hasActual.toString());
        if (nuevasHas === null) return;
        await supabase.from('potreros').update({ nombre: nuevoNombre, hectareas: Number(nuevasHas) }).eq('id', id);
        fetchPotreros();
        if (potreroSel?.id === id) setPotreroSel({ ...potreroSel, nombre: nuevoNombre, hectareas: Number(nuevasHas) });
    }

    async function borrarPotrero(id: string) { 
        if(!confirm("¿BORRAR POTRERO? Se perderán las labores y parcelas.")) return; 
        await supabase.from('potreros').delete().eq('id', id); 
        fetchPotreros(); fetchParcelas(); setPotreroSel(null); 
    }

    async function abrirFicha(potrero: any) { 
        setPotreroSel(potrero); setLaboresFicha([]); setNuevaParcelaNombre(''); setNuevaParcelaHas('');
        const { data } = await supabase.from('labores').select('*').eq('potrero_id', potrero.id).order('fecha', { ascending: false }); 
        if (data) setLaboresFicha(data); 
    }

    // --- FUNCIONES LABORES ---
    async function guardarLabor() { 
        if (!potreroSel || !actividadPotrero || !campoId) return; 
        const { error } = await supabase.from('labores').insert([{ potrero_id: potreroSel.id, fecha: fechaLabor, actividad: actividadPotrero, cultivo: cultivoInput, detalle: detalleLabor, costo: Number(costoLabor), establecimiento_id: campoId }]); 
        if (!error) { 
            if (actividadPotrero === 'SIEMBRA') { 
                await supabase.from('potreros').update({ estado: 'SEMBRADO', cultivo_actual: cultivoInput }).eq('id', potreroSel.id); 
                setPotreroSel({...potreroSel, estado: 'SEMBRADO', cultivo_actual: cultivoInput}); fetchPotreros(); 
            } 
            else if (actividadPotrero === 'COSECHA') { 
                await supabase.from('potreros').update({ estado: 'DESCANSO', cultivo_actual: null }).eq('id', potreroSel.id); 
                setPotreroSel({...potreroSel, estado: 'DESCANSO', cultivo_actual: ''}); fetchPotreros(); 
            } 
            const { data } = await supabase.from('labores').select('*').eq('potrero_id', potreroSel.id).order('fecha', { ascending: false }); 
            if (data) setLaboresFicha(data); setDetalleLabor(''); setCostoLabor('');
        } 
    }

    async function borrarLabor(id: string) { 
        if(!confirm("¿Borrar?")) return; 
        await supabase.from('labores').delete().eq('id', id); 
        setLaboresFicha(laboresFicha.filter(l => l.id !== id)); 
    }

    // --- FUNCIONES PARCELAS ---
    async function crearParcela() {
        if(!potreroSel || !nuevaParcelaNombre || !campoId) return;
        await supabase.from('parcelas').insert([{ nombre: nuevaParcelaNombre, hectareas: Number(nuevaParcelaHas), potrero_id: potreroSel.id, establecimiento_id: campoId }]);
        setNuevaParcelaNombre(''); setNuevaParcelaHas(''); fetchParcelas();
    }

    async function borrarParcela(id: string) {
        if(!confirm("¿Borrar parcela? Los animales adentro quedarán asignados solo al potrero general.")) return;
        await supabase.from('parcelas').delete().eq('id', id); fetchParcelas();
    }

    const getNombreParcela = (id?: string) => { if(!id) return null; const p = parcelas.find((parc: any) => parc.id === id); return p ? p.nombre : null; };

    // Si hay un potrero seleccionado, mostramos su detalle
    if (potreroSel) {
        return (
            <>
                <Group justify="space-between" mb="lg">
                    <Group align="center">
                        <ActionIcon variant="light" color="gray" size="lg" onClick={() => setPotreroSel(null)} radius="xl">
                            <IconArrowLeft size={22} />
                        </ActionIcon>
                        <IconTractor color="green" size={28}/>
                        <Title order={2}>Potrero: {potreroSel.nombre}</Title>
                        <Badge color="gray" variant="outline" size="lg">{potreroSel.hectareas} Has</Badge>
                        <ActionIcon variant="subtle" color="lime" onClick={() => editarPotrero(potreroSel.id, potreroSel.nombre, potreroSel.hectareas)}>
                            <IconEdit size={20}/>
                        </ActionIcon>
                    </Group>
                </Group>

                <Paper withBorder radius="md" p="md" bg="white">
                    <Tabs defaultValue="labores" color="lime">
                        <Tabs.List grow mb="md">
                            <Tabs.Tab value="labores" leftSection={<IconLeaf size={16}/>}>Labores y Cultivos</Tabs.Tab>
                            <Tabs.Tab value="parcelas" leftSection={<IconMapPin size={16}/>}>Parcelas Internas ({parcelas.filter((p: any) => p.potrero_id === potreroSel.id).length})</Tabs.Tab>
                            <Tabs.Tab value="animales" leftSection={<IconList size={16}/>}>Hacienda ({haciendaActiva.filter((a: any) => a.potrero_id === potreroSel.id).length})</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="labores">
                            <Paper withBorder p="md" bg="lime.0" mb="lg" radius="md">
                                <Text size="sm" fw={700} mb="xs" c="lime.9">Registrar Nueva Labor</Text>
                                
                                <Group grow mb="sm">
                                    <Select data={['SIEMBRA', 'FUMIGADA', 'COSECHA', 'FERTILIZACION', 'DESMALEZADA', 'OTRO']} value={actividadPotrero} onChange={setActividadPotrero}/>
                                    <TextInput placeholder="Cultivo / Producto" value={cultivoInput} onChange={(e) => setCultivoInput(e.target.value)} />
                                </Group>
                                
                                <Group mb="sm" align="flex-start" style={{ display: 'flex', width: '100%' }}>
                                    <TextInput placeholder="Costo Total ($)" type="number" leftSection={<IconCurrencyDollar size={14}/>} value={costoLabor} onChange={(e) => setCostoLabor(e.target.value)} style={{ flex: 1 }}/>
                                    <TextInput placeholder="Detalle / Observaciones..." value={detalleLabor} onChange={(e) => setDetalleLabor(e.target.value)} style={{ flex: 2 }}/>
                                    <TextInput type="date" value={fechaLabor} onChange={(e) => setFechaLabor(e.target.value)} style={{ flex: 1 }}/>
                                </Group>

                                <Button onClick={guardarLabor} color="lime" variant="filled" leftSection={<IconCheck size={16}/>}>Guardar Labor</Button>
                            </Paper>

                            <Text fw={700} mb="sm">Historial Agrícola</Text>
                            {laboresFicha.length === 0 ? <Text c="dimmed" size="sm" p="md" bg="gray.0" style={{borderRadius: 8}}>Sin labores registradas en este potrero.</Text> : (
                                <Table striped>
                                    <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Labor</Table.Th><Table.Th>Detalle</Table.Th><Table.Th>Costo</Table.Th><Table.Th w={50}></Table.Th></Table.Tr></Table.Thead>
                                    <Table.Tbody>
                                        {laboresFicha.map(labor => (
                                            <Table.Tr key={labor.id}>
                                                <Table.Td><Text size="sm" c="dimmed">{formatDate(labor.fecha)}</Text></Table.Td>
                                                <Table.Td><Text fw={700} size="sm">{labor.actividad}</Text>{labor.cultivo && <Badge size="xs" color="lime" ml="xs">{labor.cultivo}</Badge>}</Table.Td>
                                                <Table.Td><Text size="sm">{labor.detalle}</Text></Table.Td>
                                                <Table.Td><Text size="sm" fw={700} c="dimmed">${labor.costo || 0}</Text></Table.Td>
                                                <Table.Td align="right"><ActionIcon color="red" variant="subtle" size="sm" onClick={() => borrarLabor(labor.id)}><IconTrash size={16}/></ActionIcon></Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            )}
                            <Button fullWidth color="red" variant="subtle" mt="xl" onClick={() => borrarPotrero(potreroSel.id)}>Eliminar Potrero del Sistema</Button>
                        </Tabs.Panel>

                        <Tabs.Panel value="parcelas">
                            <Paper withBorder p="md" bg="gray.0" mb="lg" radius="md">
                                <Text size="sm" fw={700} mb="xs">Crear Parcela Interna (Sub-división)</Text>
                                <Group align="flex-end">
                                    <TextInput label="Nombre/Número" placeholder="Ej: Parcela 1" value={nuevaParcelaNombre} onChange={(e) => setNuevaParcelaNombre(e.target.value)} style={{flex: 2}}/>
                                    <TextInput label="Hectáreas" type="number" placeholder="Ej: 10" value={nuevaParcelaHas} onChange={(e) => setNuevaParcelaHas(e.target.value)} style={{flex: 1}}/>
                                    <Button onClick={crearParcela} color="blue" leftSection={<IconPlus size={16}/>}>Agregar</Button>
                                </Group>
                            </Paper>

                            <Table striped highlightOnHover>
                                <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Nombre Parcela</Table.Th><Table.Th>Hectáreas</Table.Th><Table.Th>Animales Adentro</Table.Th><Table.Th w={80}></Table.Th></Table.Tr></Table.Thead>
                                <Table.Tbody>
                                    {parcelas.filter((p: any) => p.potrero_id === potreroSel.id).length > 0 ? (
                                        parcelas.filter((p: any) => p.potrero_id === potreroSel.id).map((parc: any) => {
                                            const animalesAca = haciendaActiva.filter((a: any) => a.parcela_id === parc.id).length;
                                            return (
                                                <Table.Tr key={parc.id}>
                                                    <Table.Td fw={700}>{parc.nombre}</Table.Td>
                                                    <Table.Td>{parc.hectareas} Has</Table.Td>
                                                    <Table.Td><Badge color="blue" variant="light">{animalesAca} Cabezas</Badge></Table.Td>
                                                    <Table.Td align="right">
                                                        <ActionIcon color="red" variant="subtle" onClick={() => borrarParcela(parc.id)}><IconTrash size={16}/></ActionIcon>
                                                    </Table.Td>
                                                </Table.Tr>
                                            )
                                        })
                                    ) : (
                                        <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" size="sm" p="md" ta="center">No hay parcelas creadas. El potrero se está usando entero.</Text></Table.Td></Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </Tabs.Panel>

                        <Tabs.Panel value="animales">
                            <Table striped highlightOnHover>
                                <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Caravana</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Parcela</Table.Th></Table.Tr></Table.Thead>
                                <Table.Tbody>
                                    {haciendaActiva.filter((a: any) => a.potrero_id === potreroSel.id).length > 0 ? (
                                        haciendaActiva.filter((a: any) => a.potrero_id === potreroSel.id).map((a: any) => (
                                            <Table.Tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => abrirFichaVaca(a)}>
                                                <Table.Td fw={700}>{a.caravana}</Table.Td>
                                                <Table.Td>{a.categoria}</Table.Td>
                                                <Table.Td>{getNombreParcela(a.parcela_id) || <Text size="xs" c="dimmed">Suelto (General)</Text>}</Table.Td>
                                            </Table.Tr>
                                        ))
                                    ) : (
                                        <Table.Tr><Table.Td colSpan={3}><Text c="dimmed" size="sm" p="md" ta="center">No hay animales pastando en este potrero.</Text></Table.Td></Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </Tabs.Panel>
                    </Tabs>
                </Paper>
            </>
        );
    }

    // Vista Principal (Lista de Potreros)
    return (
        <>
            <Group justify="space-between" mb="lg" align="center">
                <Group>
                    <Title order={3}>Agricultura / Potreros</Title>
                    <Badge size="xl" color="lime" circle>{potreros.length}</Badge>
                </Group>
                <Button leftSection={<IconPlus size={22}/>} color="lime" size="md" variant="filled" onClick={openModalPotrero} w={180} mr="md">Nuevo Potrero</Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {potreros.map((potrero: any) => { 
                    const animalesEnPotrero = haciendaActiva.filter((a: any) => a.potrero_id === potrero.id).length; 
                    return (
                        <Card key={potrero.id} shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => abrirFicha(potrero)}>
                            <Group justify="space-between" mb="xs">
                                <Text fw={700} size="lg">{potrero.nombre}</Text>
                                <Badge color={potrero.estado === 'SEMBRADO' ? 'green' : 'yellow'}>{potrero.estado}</Badge>
                            </Group>
                            <Group mb="md" gap="xs">
                                <Badge variant="outline" color="gray">{potrero.hectareas} Has</Badge>
                                {potrero.cultivo_actual && <Badge variant="dot" color="lime">{potrero.cultivo_actual}</Badge>}
                            </Group>
                            <Paper bg="gray.0" p="xs" radius="md" mt="sm">
                                <Group justify="space-between">
                                    <Text size="xs" fw={700} c="dimmed">CARGA ANIMAL</Text>
                                    <Badge color="blue" variant="light">{animalesEnPotrero} Cab</Badge>
                                </Group>
                            </Paper>
                            <Button variant="light" color="lime" fullWidth mt="md" radius="md">Gestionar Potrero</Button>
                        </Card>
                    )
                })}
            </SimpleGrid>

            {potreros.length === 0 && <Text c="dimmed" ta="center" mt="xl">No hay potreros cargados.</Text>} 

            <Modal opened={modalPotreroOpen} onClose={closeModalPotrero} title={<Text fw={700} size="lg">Nuevo Potrero</Text>} centered>
                <Stack>
                    <TextInput label="Nombre del Potrero" placeholder="Ej: Potrero del Fondo" value={nombrePotrero} onChange={(e) => setNombrePotrero(e.target.value)} />
                    <TextInput label="Hectáreas" type="number" placeholder="Ej: 50" value={hasPotrero} onChange={(e) => setHasPotrero(e.target.value)} />
                    <Button onClick={guardarPotrero} loading={loading} color="lime" fullWidth mt="md">Crear Potrero</Button>
                </Stack>
            </Modal>
        </>
    );
}