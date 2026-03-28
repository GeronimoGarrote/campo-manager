import { useState } from 'react';
import { Group, Title, Badge, TextInput, Button, SimpleGrid, Stack, Text, Card, Checkbox, ActionIcon, Modal, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconPlus, IconTrash } from '@tabler/icons-react';
import { supabase } from '../supabase';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };
const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };
const getHoyIso = () => { const d = new Date(); const offset = d.getTimezoneOffset(); return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]; };

export default function Agenda({ campoId, agenda, fetchAgenda }: any) {
    const [busquedaAgenda, setBusquedaAgenda] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Modal y Estados de Nueva Tarea (mudados desde App.tsx)
    const [modalAgendaOpen, { open: openModalAgenda, close: closeModalAgenda }] = useDisclosure(false);
    const [nuevaTareaTitulo, setNuevaTareaTitulo] = useState('');
    const [nuevaTareaDesc, setNuevaTareaDesc] = useState('');
    const [nuevaTareaFecha, setNuevaTareaFecha] = useState<Date | null>(new Date());

    const hoyFormateado = getHoyIso();

    async function guardarTareaAgenda() {
        if (!nuevaTareaTitulo || !nuevaTareaFecha || !campoId) return;
        setLoading(true);
        const { error } = await supabase.from('agenda').insert([{
            establecimiento_id: campoId, titulo: nuevaTareaTitulo, descripcion: nuevaTareaDesc, fecha_programada: nuevaTareaFecha.toISOString().split('T')[0], tipo: 'MANUAL'
        }]);
        setLoading(false);
        if (!error) { setNuevaTareaTitulo(''); setNuevaTareaDesc(''); closeModalAgenda(); fetchAgenda(); }
    }

    async function toggleCompletadoTarea(id: string, completadoActual: boolean) {
        await supabase.from('agenda').update({ completado: !completadoActual }).eq('id', id);
        fetchAgenda();
    }

    async function borrarTareaAgenda(id: string) {
        if(!confirm("¿Borrar tarea de la agenda?")) return;
        await supabase.from('agenda').delete().eq('id', id);
        fetchAgenda();
    }

    return (
        <>
            <Group justify="space-between" mb="lg" align="center">
                <Group>
                    <Title order={3}>Agenda y Tareas</Title>
                    <Badge size="xl" color="orange" circle>{agenda.filter((t: any) => !t.completado).length}</Badge>
                </Group>
                <Group gap="sm">
                    <TextInput 
                        placeholder="Buscar tarea..." 
                        leftSection={<IconSearch size={16}/>} 
                        value={busquedaAgenda} 
                        onChange={(e) => setBusquedaAgenda(e.target.value)} 
                    />
                    <Button leftSection={<IconPlus size={22}/>} color="orange" size="md" variant="filled" onClick={openModalAgenda}>Nueva Tarea</Button>
                </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                <Stack>
                    <Text fw={700} c="dimmed">Pendientes</Text>
                    {agenda.filter((t: any) => !t.completado && (t.titulo.toLowerCase().includes(busquedaAgenda.toLowerCase()) || (t.descripcion && t.descripcion.toLowerCase().includes(busquedaAgenda.toLowerCase())))).length === 0 ? <Text c="dimmed" size="sm">No hay tareas pendientes.</Text> : 
                     agenda.filter((t: any) => !t.completado && (t.titulo.toLowerCase().includes(busquedaAgenda.toLowerCase()) || (t.descripcion && t.descripcion.toLowerCase().includes(busquedaAgenda.toLowerCase())))).map((tarea: any) => {
                         const isParto = tarea.tipo === 'PARTO_ESTIMADO';
                         const colorTag = isParto ? 'red' : 'blue';
                         
                         const isHoy = tarea.fecha_programada === hoyFormateado;
                         const isVencida = tarea.fecha_programada < hoyFormateado;
                         
                         return (
                             <Card key={tarea.id} shadow="sm" radius="md" withBorder style={{ borderLeft: `4px solid ${isParto ? '#fa5252' : '#228be6'}` }}>
                                 <Group justify="space-between" align="flex-start" wrap="nowrap">
                                     <Checkbox size="lg" color="green" checked={tarea.completado} onChange={() => toggleCompletadoTarea(tarea.id, tarea.completado)} mt={4}/>
                                     <div style={{ flex: 1 }}>
                                         <Group gap="xs" mb={4}>
                                             <Badge color={colorTag} variant="light" size="sm">{isParto ? 'ALERTA AUTOMÁTICA' : 'MANUAL'}</Badge>
                                             <Text size="xs" c={isVencida ? 'red.7' : isHoy ? 'teal.7' : 'dimmed'} fw={700}>
                                                 {formatDate(tarea.fecha_programada)} {isVencida && '(Vencida)'} {isHoy && '(Para hoy)'}
                                             </Text>
                                         </Group>
                                         <Text fw={700} size="md" c={isParto ? 'red.8' : 'dark'}>{tarea.titulo}</Text>
                                         {tarea.descripcion && <Text size="sm" c="dimmed" mt={4}>{tarea.descripcion}</Text>}
                                     </div>
                                     <ActionIcon variant="subtle" color="red" onClick={() => borrarTareaAgenda(tarea.id)}><IconTrash size={18}/></ActionIcon>
                                 </Group>
                             </Card>
                         )
                     })
                    }
                </Stack>

                <Stack>
                    <Text fw={700} c="dimmed">Completadas Recientes</Text>
                    {agenda.filter((t: any) => t.completado && (t.titulo.toLowerCase().includes(busquedaAgenda.toLowerCase()) || (t.descripcion && t.descripcion.toLowerCase().includes(busquedaAgenda.toLowerCase())))).length === 0 ? <Text c="dimmed" size="sm">Sin tareas completadas.</Text> : 
                     agenda.filter((t: any) => t.completado && (t.titulo.toLowerCase().includes(busquedaAgenda.toLowerCase()) || (t.descripcion && t.descripcion.toLowerCase().includes(busquedaAgenda.toLowerCase())))).map((tarea: any) => (
                         <Card key={tarea.id} shadow="none" radius="md" withBorder bg="gray.0" style={{ opacity: 0.6 }}>
                             <Group justify="space-between" align="flex-start" wrap="nowrap">
                                 <Checkbox size="lg" color="green" checked={tarea.completado} onChange={() => toggleCompletadoTarea(tarea.id, tarea.completado)} mt={4}/>
                                 <div style={{ flex: 1 }}>
                                     <Text fw={700} size="md" style={{ textDecoration: 'line-through' }}>{tarea.titulo}</Text>
                                     <Text size="xs" c="dimmed">Programada para: {formatDate(tarea.fecha_programada)}</Text>
                                 </div>
                                 <ActionIcon variant="subtle" color="red" onClick={() => borrarTareaAgenda(tarea.id)}><IconTrash size={18}/></ActionIcon>
                             </Group>
                         </Card>
                     ))
                    }
                </Stack>
            </SimpleGrid>

            <Modal opened={modalAgendaOpen} onClose={closeModalAgenda} title={<Text fw={700} size="lg">Nueva Tarea Programada</Text>} centered>
                <Stack>
                    <TextInput label="Título de la Tarea" placeholder="Ej: Vacunar Lote Recría" value={nuevaTareaTitulo} onChange={(e) => setNuevaTareaTitulo(e.target.value)} required/>
                    <TextInput label="Fecha de Ejecución" type="date" value={getLocalDateForInput(nuevaTareaFecha)} onChange={(e) => setNuevaTareaFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} required/>
                    <Textarea label="Detalle (Opcional)" placeholder="Escribir observaciones..." value={nuevaTareaDesc} onChange={(e) => setNuevaTareaDesc(e.target.value)} minRows={3}/>
                    <Button onClick={guardarTareaAgenda} loading={loading} color="orange" fullWidth mt="md">Programar Tarea</Button>
                </Stack>
            </Modal>
        </>
    );
}