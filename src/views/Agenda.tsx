import { useState, useEffect } from 'react';
import {
    Group, Title, Badge, TextInput, Button, Stack, Text, Card, Checkbox,
    ActionIcon, Modal, Textarea, ThemeIcon, Box, Paper, Collapse, Select,
    SegmentedControl, Tabs,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconSearch, IconPlus, IconTrash, IconClock, IconCheck, IconChevronDown, IconTag, IconTractor, IconPackage, IconNote, IconEdit } from '@tabler/icons-react';
import { supabase } from '../supabase';

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
};

const getLocalDateForInput = (date: Date | null) => {
    if (!date) return '';
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
};

const getHoyIso = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
};

const getOffsetDiasIso = (n: number) => {
    const parts = getHoyIso().split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + n);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
};

type FiltroActivo = 'todas' | 'vencidas' | 'hoy' | 'semana';

interface NotaCampo {
    id: string;
    establecimiento_id: string;
    contenido: string;
    created_at: string;
}

export default function Agenda({ campoId, agenda, fetchAgenda, animales, abrirFichaVaca, potreros, lotes, onAbrirPotrero, onAbrirLote }: any) {
    const isMobile = useMediaQuery('(max-width: 768px)');

    const [busqueda, setBusqueda] = useState('');
    const [filtro, setFiltro] = useState<FiltroActivo>('todas');
    const [loading, setLoading] = useState(false);
    const [completadasOpen, { toggle: toggleCompletadas }] = useDisclosure(false);
    const [confirmModal, setConfirmModal] = useState<{ mensaje: string; onConfirm: () => void; color?: string } | null>(null);

    const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);
    const [nuevaTareaTitulo, setNuevaTareaTitulo] = useState('');
    const [nuevaTareaDesc, setNuevaTareaDesc] = useState('');
    const [nuevaTareaFecha, setNuevaTareaFecha] = useState<Date | null>(new Date());
    const [nuevaTareaAnimalId, setNuevaTareaAnimalId] = useState<string | null>(null);
    const [vinculoTipo, setVinculoTipo] = useState<'ninguno' | 'animal' | 'potrero' | 'lote'>('ninguno');
    const [nuevaTareaPotreroId, setNuevaTareaPotreroId] = useState<string | null>(null);
    const [nuevaTareaLoteId, setNuevaTareaLoteId] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<string | null>('tareas');
    const [notas, setNotas] = useState<NotaCampo[]>([]);
    const [loadingNotas, setLoadingNotas] = useState(false);
    const [nuevaNota, setNuevaNota] = useState('');
    const [guardandoNota, setGuardandoNota] = useState(false);
    const [editandoNotaId, setEditandoNotaId] = useState<string | null>(null);
    const [editandoContenido, setEditandoContenido] = useState('');

    const hoyIso = getHoyIso();
    const enSieteDiasIso = getOffsetDiasIso(7);
    const haceUnaSemanaIso = getOffsetDiasIso(-7);

    const coincideBusqueda = (t: any) =>
        t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(busqueda.toLowerCase()));

    const pendientesFiltradas = agenda
        .filter((t: any) => !t.completado && coincideBusqueda(t))
        .filter((t: any) => {
            if (filtro === 'vencidas') return t.fecha_programada < hoyIso;
            if (filtro === 'hoy') return t.fecha_programada === hoyIso;
            if (filtro === 'semana') return t.fecha_programada <= enSieteDiasIso;
            return true;
        });

    const completadas = agenda.filter((t: any) => t.completado && coincideBusqueda(t));
    const completadasEstaSemana = agenda.filter(
        (t: any) => t.completado && t.fecha_programada >= haceUnaSemanaIso && t.fecha_programada <= hoyIso
    ).length;

    const vencidas = pendientesFiltradas.filter((t: any) => t.fecha_programada < hoyIso);
    const paraHoy = pendientesFiltradas.filter((t: any) => t.fecha_programada === hoyIso);
    const estaSemana = pendientesFiltradas.filter((t: any) => t.fecha_programada > hoyIso && t.fecha_programada <= enSieteDiasIso);
    const masAdelante = pendientesFiltradas.filter((t: any) => t.fecha_programada > enSieteDiasIso);
    const hayPendientes = pendientesFiltradas.length > 0;

    function cardBorderColor(tarea: any) {
        if (tarea.fecha_programada < hoyIso) return '#E24B4A';
        if (tarea.fecha_programada === hoyIso) return '#EF9F27';
        return '#378ADD';
    }

    async function guardarTareaAgenda() {
        if (!nuevaTareaTitulo || !nuevaTareaFecha || !campoId) return;
        setLoading(true);
        const payload: any = {
            establecimiento_id: campoId,
            titulo: nuevaTareaTitulo,
            descripcion: nuevaTareaDesc,
            fecha_programada: nuevaTareaFecha.toISOString().split('T')[0],
            tipo: 'MANUAL',
        };
        if (vinculoTipo === 'animal' && nuevaTareaAnimalId) payload.animal_id = nuevaTareaAnimalId;
        if (vinculoTipo === 'potrero' && nuevaTareaPotreroId) payload.potrero_id = nuevaTareaPotreroId;
        if (vinculoTipo === 'lote' && nuevaTareaLoteId) payload.lote_id = nuevaTareaLoteId;
        const { error } = await supabase.from('agenda').insert([payload]);
        setLoading(false);
        if (!error) {
            setNuevaTareaTitulo('');
            setNuevaTareaDesc('');
            setNuevaTareaAnimalId(null);
            setNuevaTareaPotreroId(null);
            setNuevaTareaLoteId(null);
            setVinculoTipo('ninguno');
            closeModal();
            fetchAgenda();
        }
    }

    async function toggleCompletadoTarea(id: string, completadoActual: boolean) {
        await supabase.from('agenda').update({ completado: !completadoActual }).eq('id', id);
        fetchAgenda();
    }

    function borrarTareaAgenda(id: string) {
        setConfirmModal({
            mensaje: '¿Borrar esta tarea de la agenda?',
            color: 'red',
            onConfirm: async () => {
                await supabase.from('agenda').delete().eq('id', id);
                fetchAgenda();
            },
        });
    }

    async function postergarTarea(id: string, fechaActual: string) {
        const p = fechaActual.split('-').map(Number);
        const d = new Date(p[0], p[1] - 1, p[2] + 1);
        const offset = d.getTimezoneOffset();
        const nuevaFecha = new Date(d.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
        const { error } = await supabase.from('agenda').update({ fecha_programada: nuevaFecha }).eq('id', id);
        if (!error) {
            notifications.show({ message: `Tarea postergada al ${formatDate(nuevaFecha)}`, color: 'teal' });
            fetchAgenda();
        }
    }

    async function fetchNotas() {
        if (!campoId) return;
        setLoadingNotas(true);
        const { data, error } = await supabase
            .from('notas_campo')
            .select('*')
            .eq('establecimiento_id', campoId)
            .order('created_at', { ascending: false });
        if (error) console.error('[fetchNotas]', error);
        setNotas(data || []);
        setLoadingNotas(false);
    }

    useEffect(() => { fetchNotas(); }, [campoId]);

    async function guardarNota() {
        if (!nuevaNota.trim() || !campoId) return;
        setGuardandoNota(true);
        const { error } = await supabase
            .from('notas_campo')
            .insert({ establecimiento_id: campoId, contenido: nuevaNota.trim() });
        setGuardandoNota(false);
        if (!error) { setNuevaNota(''); fetchNotas(); }
    }

    async function guardarEdicionNota() {
        if (!editandoNotaId || !editandoContenido.trim()) return;
        await supabase
            .from('notas_campo')
            .update({ contenido: editandoContenido.trim() })
            .eq('id', editandoNotaId);
        setEditandoNotaId(null);
        setEditandoContenido('');
        fetchNotas();
    }

    function borrarNota(id: string) {
        setConfirmModal({
            mensaje: '¿Borrar esta nota?',
            color: 'red',
            onConfirm: async () => {
                await supabase.from('notas_campo').delete().eq('id', id);
                fetchNotas();
            },
        });
    }

    function AnimalBadge({ animalId }: { animalId: string }) {
        const animal = (animales || []).find((a: any) => a.id === animalId);
        if (!animal) return null;
        const esBaja = ['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(animal.estado);
        return (
            <Badge
                size="xs"
                variant={esBaja ? 'outline' : 'light'}
                color={esBaja ? 'gray' : 'teal'}
                leftSection={<IconTag size={10} />}
                style={{ cursor: 'pointer' }}
                mt={4}
                onClick={(e) => { e.stopPropagation(); abrirFichaVaca && abrirFichaVaca(animal); }}
            >
                {animal.caravana}{esBaja ? ' (baja)' : ''}
            </Badge>
        );
    }

    function PotreroBadge({ potreroId }: { potreroId: string }) {
        const potrero = (potreros || []).find((p: any) => p.id === potreroId);
        if (!potrero) return null;
        return (
            <Badge
                size="xs" variant="light" color="lime"
                leftSection={<IconTractor size={10} />}
                style={{ cursor: 'pointer' }}
                mt={4}
                onClick={(e) => { e.stopPropagation(); onAbrirPotrero && onAbrirPotrero(potreroId); }}
            >
                {potrero.nombre}
            </Badge>
        );
    }

    function LoteBadge({ loteId }: { loteId: string }) {
        const lote = (lotes || []).find((l: any) => l.id === loteId);
        if (!lote) return null;
        return (
            <Badge
                size="xs" variant="light" color="grape"
                leftSection={<IconPackage size={10} />}
                style={{ cursor: 'pointer' }}
                mt={4}
                onClick={(e) => { e.stopPropagation(); onAbrirLote && onAbrirLote(loteId); }}
            >
                {lote.nombre}
            </Badge>
        );
    }

    function TareaCard({ tarea, mostrarPostergar }: { tarea: any; mostrarPostergar?: boolean }) {
        const isParto = tarea.tipo === 'PARTO_ESTIMADO';
        const isVencida = tarea.fecha_programada < hoyIso;
        const isHoy = tarea.fecha_programada === hoyIso;

        return (
            <Card shadow="sm" radius="md" withBorder style={{ borderLeft: `4px solid ${cardBorderColor(tarea)}` }}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Checkbox
                        size="lg" color="green"
                        checked={tarea.completado}
                        onChange={() => toggleCompletadoTarea(tarea.id, tarea.completado)}
                        mt={4}
                    />
                    <div style={{ flex: 1 }}>
                        <Group gap="xs" mb={4}>
                            <Badge color={isParto ? 'red' : 'blue'} variant="light" size="sm">
                                {isParto ? 'ALERTA AUTOMÁTICA' : 'MANUAL'}
                            </Badge>
                            <Text size="xs" c={isVencida ? 'red.7' : isHoy ? 'teal.7' : 'dimmed'} fw={700}>
                                {formatDate(tarea.fecha_programada)}
                                {isVencida && ' (Vencida)'}
                                {isHoy && ' (Para hoy)'}
                            </Text>
                        </Group>
                        <Text fw={700} size="md" c={isParto ? 'red.8' : 'dark'}>{tarea.titulo}</Text>
                        {tarea.descripcion && <Text size="sm" c="dimmed" mt={4}>{tarea.descripcion}</Text>}
                        {tarea.animal_id && <AnimalBadge animalId={tarea.animal_id} />}
                        {tarea.potrero_id && <PotreroBadge potreroId={tarea.potrero_id} />}
                        {tarea.lote_id && <LoteBadge loteId={tarea.lote_id} />}
                    </div>
                    <Group gap={4} align="flex-start" wrap="nowrap">
                        {mostrarPostergar && (
                            <ActionIcon
                                variant="subtle" color="gray"
                                title="Postergar 1 día"
                                onClick={() => postergarTarea(tarea.id, tarea.fecha_programada)}
                            >
                                <IconClock size={16} />
                            </ActionIcon>
                        )}
                        <ActionIcon variant="subtle" color="red" onClick={() => borrarTareaAgenda(tarea.id)}>
                            <IconTrash size={18} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Card>
        );
    }

    function SeccionPendientes({
        label, color, tareas,
    }: { label: string; color: string; tareas: any[] }) {
        if (tareas.length === 0) return null;
        return (
            <>
                <Group gap="xs" mb="sm" mt="md">
                    <Box w={8} h={8} style={{ borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">{label}</Text>
                    <Badge size="xs" variant="light" color="gray">{tareas.length}</Badge>
                </Group>
                <Stack gap="sm">
                    {tareas.map((t: any) => <TareaCard key={t.id} tarea={t} mostrarPostergar />)}
                </Stack>
            </>
        );
    }

    return (
        <>
            <Tabs value={activeTab} onChange={setActiveTab} color="orange">
                <Tabs.List mb="md" grow>
                    <Tabs.Tab value="tareas" leftSection={<IconClock size={16} />}>
                        Tareas
                    </Tabs.Tab>
                    <Tabs.Tab value="notas" leftSection={<IconNote size={16} />}>
                        Notas
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="tareas">
            {/* Header */}
            {!!isMobile ? (
                <Stack mb="lg" gap="sm">
                    <Group>
                        <Title order={3}>Agenda y Tareas</Title>
                        <Badge size="xl" color="orange" circle>
                            {agenda.filter((t: any) => !t.completado).length}
                        </Badge>
                    </Group>
                    <SegmentedControl
                        size="sm"
                        fullWidth
                        value={filtro}
                        onChange={(v) => setFiltro(v as FiltroActivo)}
                        data={[
                            { label: 'Todas', value: 'todas' },
                            { label: 'Vencidas', value: 'vencidas' },
                            { label: 'Hoy', value: 'hoy' },
                            { label: 'Semana', value: 'semana' },
                        ]}
                        color="orange"
                    />
                    <TextInput
                        placeholder="Buscar tarea..."
                        leftSection={<IconSearch size={16} />}
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    <Button leftSection={<IconPlus size={22} />} color="orange" size="md" variant="filled" fullWidth onClick={openModal}>
                        Nueva Tarea
                    </Button>
                </Stack>
            ) : (
                <Group justify="space-between" mb="lg" align="center">
                    <Group>
                        <Title order={3}>Agenda y Tareas</Title>
                        <Badge size="xl" color="orange" circle>
                            {agenda.filter((t: any) => !t.completado).length}
                        </Badge>
                    </Group>
                    <Group gap="md" align="center">
                        <SegmentedControl
                            size="sm"
                            value={filtro}
                            onChange={(v) => setFiltro(v as FiltroActivo)}
                            data={[
                                { label: 'Todas', value: 'todas' },
                                { label: 'Vencidas', value: 'vencidas' },
                                { label: 'Hoy', value: 'hoy' },
                                { label: 'Semana', value: 'semana' },
                            ]}
                            color="orange"
                        />
                        <TextInput
                            placeholder="Buscar tarea..."
                            leftSection={<IconSearch size={16} />}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <Button leftSection={<IconPlus size={22} />} color="orange" size="md" variant="filled" onClick={openModal}>
                            Nueva Tarea
                        </Button>
                    </Group>
                </Group>
            )}

            {/* Tareas pendientes */}
            {!hayPendientes ? (
                <Stack align="center" py="xl">
                    <ThemeIcon size={50} radius="xl" color="teal" variant="light">
                        <IconCheck size={26} />
                    </ThemeIcon>
                    <Text fw={600}>¡Estás al día!</Text>
                    <Text size="sm" c="dimmed">No tenés tareas pendientes.</Text>
                </Stack>
            ) : (
                <>
                    <SeccionPendientes label="Vencidas" color="#E24B4A" tareas={vencidas} />
                    <SeccionPendientes label="Para hoy" color="#EF9F27" tareas={paraHoy} />
                    <SeccionPendientes label="Esta semana" color="#378ADD" tareas={estaSemana} />
                    <SeccionPendientes label="Más adelante" color="#868e96" tareas={masAdelante} />
                </>
            )}

            {/* Bloque colapsable de completadas */}
            {completadas.length > 0 && (
                <>
                    <Paper
                        withBorder p="sm" radius="md" mt="lg"
                        style={{ cursor: 'pointer' }}
                        onClick={toggleCompletadas}
                    >
                        <Group justify="space-between">
                            <Group gap="xs">
                                <IconChevronDown
                                    size={16}
                                    style={{
                                        transform: completadasOpen ? 'rotate(180deg)' : 'none',
                                        transition: 'transform 0.2s',
                                    }}
                                />
                                <Text size="sm" c="dimmed">Completadas recientes</Text>
                            </Group>
                            <Badge color="teal" variant="light" size="sm">
                                {completadasEstaSemana} esta semana
                            </Badge>
                        </Group>
                    </Paper>
                    <Collapse in={completadasOpen}>
                        <Stack gap="sm" mt="sm">
                            {completadas.map((tarea: any) => (
                                <Card key={tarea.id} shadow="none" radius="md" withBorder bg="gray.0" style={{ opacity: 0.6 }}>
                                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                                        <Checkbox
                                            size="lg" color="green"
                                            checked={tarea.completado}
                                            onChange={() => toggleCompletadoTarea(tarea.id, tarea.completado)}
                                            mt={4}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <Text fw={700} size="md" style={{ textDecoration: 'line-through' }}>
                                                {tarea.titulo}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Programada para: {formatDate(tarea.fecha_programada)}
                                            </Text>
                                            {tarea.animal_id && <AnimalBadge animalId={tarea.animal_id} />}
                                            {tarea.potrero_id && <PotreroBadge potreroId={tarea.potrero_id} />}
                                            {tarea.lote_id && <LoteBadge loteId={tarea.lote_id} />}
                                        </div>
                                        <ActionIcon variant="subtle" color="red" onClick={() => borrarTareaAgenda(tarea.id)}>
                                            <IconTrash size={18} />
                                        </ActionIcon>
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    </Collapse>
                </>
            )}
                </Tabs.Panel>

                <Tabs.Panel value="notas">
                    <Stack gap="md" pt="sm">
                        {/* Input nueva nota */}
                        <Paper withBorder p="md" radius="md">
                            <Stack gap="xs">
                                <Textarea
                                    placeholder="Escribí una nota... Ej: Dejé las llaves en el galpón"
                                    value={nuevaNota}
                                    onChange={(e) => setNuevaNota(e.target.value)}
                                    minRows={2}
                                    autosize
                                    maxRows={6}
                                />
                                <Button
                                    color="orange"
                                    loading={guardandoNota}
                                    disabled={!nuevaNota.trim()}
                                    onClick={guardarNota}
                                    leftSection={<IconPlus size={16} />}
                                >
                                    Guardar nota
                                </Button>
                            </Stack>
                        </Paper>

                        {/* Lista de notas */}
                        {loadingNotas ? (
                            <Stack align="center" py="xl">
                                <Text size="sm" c="dimmed">Cargando...</Text>
                            </Stack>
                        ) : notas.length === 0 ? (
                            <Stack align="center" py="xl">
                                <ThemeIcon size={50} radius="xl" color="blue" variant="light">
                                    <IconNote size={26} />
                                </ThemeIcon>
                                <Text fw={600}>Sin notas todavía</Text>
                                <Text size="sm" c="dimmed" ta="center">
                                    Dejá notas rápidas para vos o tu equipo.
                                </Text>
                            </Stack>
                        ) : (
                            <Stack gap="sm">
                                {notas.map(nota => (
                                    <Card key={nota.id} withBorder radius="md" p="md">
                                        {editandoNotaId === nota.id ? (
                                            <Stack gap="xs">
                                                <Textarea
                                                    value={editandoContenido}
                                                    onChange={(e) => setEditandoContenido(e.target.value)}
                                                    minRows={2}
                                                    autosize
                                                    maxRows={8}
                                                    autoFocus
                                                />
                                                <Group gap="xs">
                                                    <Button
                                                        size="xs"
                                                        color="teal"
                                                        leftSection={<IconCheck size={14} />}
                                                        onClick={guardarEdicionNota}
                                                        disabled={!editandoContenido.trim()}
                                                    >
                                                        Guardar
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="subtle"
                                                        color="gray"
                                                        onClick={() => { setEditandoNotaId(null); setEditandoContenido(''); }}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                </Group>
                                            </Stack>
                                        ) : (
                                            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                                                <Text
                                                    size="sm"
                                                    style={{ flex: 1, whiteSpace: 'pre-wrap', cursor: 'pointer' }}
                                                    onClick={() => { setEditandoNotaId(nota.id); setEditandoContenido(nota.contenido); }}
                                                >
                                                    {nota.contenido}
                                                </Text>
                                                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                                                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                                        {formatDate(nota.created_at)}
                                                    </Text>
                                                    <ActionIcon
                                                        size="sm"
                                                        variant="subtle"
                                                        color="blue"
                                                        onClick={() => { setEditandoNotaId(nota.id); setEditandoContenido(nota.contenido); }}
                                                    >
                                                        <IconEdit size={14} />
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        size="sm"
                                                        variant="subtle"
                                                        color="red"
                                                        onClick={() => borrarNota(nota.id)}
                                                    >
                                                        <IconTrash size={14} />
                                                    </ActionIcon>
                                                </Group>
                                            </Group>
                                        )}
                                    </Card>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Tabs.Panel>
            </Tabs>

            {/* Modal confirmación */}
            <Modal opened={!!confirmModal} onClose={() => setConfirmModal(null)} title={<Text fw={700}>Confirmar acción</Text>} centered size="sm">
                <Stack>
                    <Text>{confirmModal?.mensaje}</Text>
                    <Group grow mt="sm">
                        <Button variant="default" onClick={() => setConfirmModal(null)}>Cancelar</Button>
                        <Button color={confirmModal?.color || 'red'} onClick={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>Confirmar</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal Nueva Tarea */}
            <Modal
                opened={modalOpen}
                onClose={() => { closeModal(); setNuevaTareaAnimalId(null); setNuevaTareaPotreroId(null); setNuevaTareaLoteId(null); setVinculoTipo('ninguno'); }}
                title={<Text fw={700} size="lg">Nueva Tarea Programada</Text>}
                centered
            >
                <Stack>
                    <TextInput
                        label="Título de la Tarea"
                        placeholder="Ej: Vacunar Lote Recría"
                        value={nuevaTareaTitulo}
                        onChange={(e) => setNuevaTareaTitulo(e.target.value)}
                        required
                    />
                    <TextInput
                        label="Fecha de Ejecución"
                        type="date"
                        value={getLocalDateForInput(nuevaTareaFecha)}
                        onChange={(e) => setNuevaTareaFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                        required
                    />
                    <Select
                        label="Vincular a"
                        data={[
                            { value: 'ninguno', label: 'Ninguno' },
                            { value: 'animal', label: 'Animal' },
                            { value: 'potrero', label: 'Potrero' },
                            { value: 'lote', label: 'Lote' },
                        ]}
                        value={vinculoTipo}
                        onChange={(v) => {
                            setVinculoTipo((v || 'ninguno') as any);
                            setNuevaTareaAnimalId(null);
                            setNuevaTareaPotreroId(null);
                            setNuevaTareaLoteId(null);
                        }}
                    />
                    {vinculoTipo === 'animal' && (
                        <Select
                            label="Animal"
                            placeholder="Buscá por caravana..."
                            data={(animales || [])
                                .filter((a: any) => !['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(a.estado))
                                .map((a: any) => ({ value: a.id, label: a.caravana }))}
                            value={nuevaTareaAnimalId}
                            onChange={setNuevaTareaAnimalId}
                            searchable
                            clearable
                            nothingFoundMessage="No se encontró ningún animal"
                        />
                    )}
                    {vinculoTipo === 'potrero' && (
                        <Select
                            label="Potrero"
                            placeholder="Seleccioná un potrero..."
                            data={(potreros || []).map((p: any) => ({ value: p.id, label: p.nombre }))}
                            value={nuevaTareaPotreroId}
                            onChange={setNuevaTareaPotreroId}
                            searchable
                            clearable
                            nothingFoundMessage="No se encontró ningún potrero"
                        />
                    )}
                    {vinculoTipo === 'lote' && (
                        <Select
                            label="Lote"
                            placeholder="Seleccioná un lote..."
                            data={(lotes || []).map((l: any) => ({ value: l.id, label: l.nombre }))}
                            value={nuevaTareaLoteId}
                            onChange={setNuevaTareaLoteId}
                            searchable
                            clearable
                            nothingFoundMessage="No se encontró ningún lote"
                        />
                    )}
                    <Textarea
                        label="Detalle (Opcional)"
                        placeholder="Escribir observaciones..."
                        value={nuevaTareaDesc}
                        onChange={(e) => setNuevaTareaDesc(e.target.value)}
                        minRows={3}
                    />
                    <Button onClick={guardarTareaAgenda} loading={loading} color="orange" fullWidth mt="md">
                        Programar Tarea
                    </Button>
                </Stack>
            </Modal>
        </>
    );
}
