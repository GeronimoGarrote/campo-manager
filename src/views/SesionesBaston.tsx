import { useState, useCallback, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import {
    Title, Badge, Paper, Text, Button, Group, Stack, TextInput,
    Grid, ThemeIcon, ScrollArea, Table, ActionIcon, Switch,
    Popover, Loader, Center, Modal, Tabs, Select, Divider, Box,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
    IconScan, IconBluetooth, IconBluetoothOff, IconPlus,
    IconTrash, IconMapPin, IconTag, IconDownload, IconX, IconPlaylistAdd,
    IconTags, IconCheck,
} from '@tabler/icons-react';
import { supabase } from '../supabase';
import { useLectorAllflex } from '../hooks/useLectorAllflex';
import AllflexScanner from '../components/AllflexScanner';
import ModalAltaDesdeBaston from '../components/ModalAltaDesdeBaston';
import { esAnimalActivo } from '../types';

interface SesionBaston {
    id: string;
    nombre: string;
    establecimiento_id: string;
    creado_por: string | null;
    estado: 'ACTIVA' | 'LISTA' | 'PROCESADA';
    animales_ids: string[];
    notas: string | null;
    created_at: string;
    updated_at: string;
}

interface TagPendiente {
    id: string;
    establecimiento_id: string;
    eid: string;
    creado_por: string | null;
    asignado: boolean;
    animal_id: string | null;
    grupo_nombre: string | null;
    created_at: string;
}

interface GrupoTag {
    id: string;
    establecimiento_id: string;
    nombre: string;
    creado_por: string | null;
    created_at: string;
}

interface SesionesBastonProps {
    animales: any[];
    potreros: any[];
    lotes: any[];
    campoId: string;
    rolActual: 'DUENO' | 'PEON' | 'VETERINARIO';
    session: any;
    onCargarEnMasivos: (ids: string[]) => void;
    fetchAnimales: () => void;
    datosSuscripcion: any;
}

const ESTADO_COLOR: Record<string, string> = {
    ACTIVA: 'teal',
    LISTA: 'blue',
    PROCESADA: 'gray',
};

const ESTADO_SIGUIENTE: Record<string, 'ACTIVA' | 'LISTA' | 'PROCESADA' | null> = {
    ACTIVA: 'LISTA',
    LISTA: 'PROCESADA',
    PROCESADA: null,
};

const getHoyIso = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
};

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
};

export default function SesionesBaston({
    animales, potreros, lotes, campoId, rolActual, session, onCargarEnMasivos,
    fetchAnimales, datosSuscripcion,
}: SesionesBastonProps) {
    const isMobile = useMediaQuery('(max-width: 48em)');

    const [activeTab, setActiveTab] = useState<string | null>('sesiones');

    // Sesiones
    const [sesiones, setSesiones] = useState<SesionBaston[]>([]);
    const [sesionActiva, setSesionActiva] = useState<SesionBaston | null>(null);
    const [lectorActivo, setLectorActivo] = useState(false);
    const [ultimoEidLeido, setUltimoEidLeido] = useState<string | null>(null);
    const [loadingSesiones, setLoadingSesiones] = useState(false);
    const [nombreNuevaSesion, setNombreNuevaSesion] = useState('');
    const [creandoSesion, setCreandoSesion] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [eidsPendientes, setEidsPendientes] = useState<string[]>([]);
    const [modalPendientesOpen, setModalPendientesOpen] = useState(false);
    const [eidParaVincular, setEidParaVincular] = useState<string | null>(null);
    const [modalVincularOpen, setModalVincularOpen] = useState(false);

    // Tags
    const [tagsPendientes, setTagsPendientes] = useState<TagPendiente[]>([]);
    const [loadingTags, setLoadingTags] = useState(false);
    const [lectorTagsActivo, setLectorTagsActivo] = useState(false);
    const [ultimoEidTag, setUltimoEidTag] = useState<string | null>(null);
    const [eidsYaRegistrados, setEidsYaRegistrados] = useState<string[]>([]);
    const [grupos, setGrupos] = useState<GrupoTag[]>([]);
    const [loadingGrupos, setLoadingGrupos] = useState(false);
    const [grupoSeleccionado, setGrupoSeleccionado] = useState<GrupoTag | null>(null);
    const grupoActualRef = useRef<string>('');
    const [popoverGrupoOpen, setPopoverGrupoOpen] = useState(false);
    const [nombreNuevoGrupo, setNombreNuevoGrupo] = useState('');
    const [tagParaAsignarModal, setTagParaAsignarModal] = useState<TagPendiente | null>(null);
    const [modalAsignarCEOpen, setModalAsignarCEOpen] = useState(false);

    async function fetchSesiones() {
        setLoadingSesiones(true);
        const { data, error } = await supabase
            .from('sesiones_baston')
            .select('*')
            .eq('establecimiento_id', campoId)
            .order('created_at', { ascending: false });
        if (error) console.error('[fetchSesiones]', error);
        setSesiones(data || []);
        setLoadingSesiones(false);
    }

    async function fetchTags() {
        setLoadingTags(true);
        const { data, error } = await supabase
            .from('tags_pendientes')
            .select('*')
            .eq('establecimiento_id', campoId)
            .eq('asignado', false)
            .order('created_at', { ascending: false });
        if (error) console.error('[fetchTags]', error);
        setTagsPendientes(data || []);
        setLoadingTags(false);
    }

    async function fetchGrupos() {
        setLoadingGrupos(true);
        const { data, error } = await supabase
            .from('grupos_tags')
            .select('*')
            .eq('establecimiento_id', campoId)
            .order('created_at', { ascending: false });
        if (error) console.error('[fetchGrupos]', error);
        setGrupos(data || []);
        setLoadingGrupos(false);
    }

    useEffect(() => {
        fetchSesiones();
        fetchTags();
        fetchGrupos();
    }, [campoId]);

    async function crearGrupo() {
        if (!nombreNuevoGrupo.trim()) return;
        const { data, error } = await supabase
            .from('grupos_tags')
            .insert({
                establecimiento_id: campoId,
                nombre: nombreNuevoGrupo.trim(),
                creado_por: session?.user?.id ?? null,
            })
            .select()
            .single();
        if (error) {
            console.error('[crearGrupo]', error);
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
            return;
        }
        setNombreNuevoGrupo('');
        setPopoverGrupoOpen(false);
        await fetchGrupos();
        if (data) {
            setGrupoSeleccionado(data);
            grupoActualRef.current = data.nombre;
        }
    }

    async function eliminarGrupo(grupo: GrupoTag) {
        await supabase
            .from('tags_pendientes')
            .delete()
            .eq('establecimiento_id', campoId)
            .eq('grupo_nombre', grupo.nombre);
        await supabase
            .from('grupos_tags')
            .delete()
            .eq('id', grupo.id);
        if (grupoSeleccionado?.id === grupo.id) {
            setGrupoSeleccionado(null);
            grupoActualRef.current = '';
        }
        fetchGrupos();
        fetchTags();
    }

    async function crearSesion() {
        if (!nombreNuevaSesion.trim()) return;
        setCreandoSesion(true);
        const { data, error } = await supabase
            .from('sesiones_baston')
            .insert({
                nombre: nombreNuevaSesion.trim(),
                establecimiento_id: campoId,
                creado_por: session?.user?.id ?? null,
                estado: 'ACTIVA',
                animales_ids: [],
            })
            .select()
            .single();
        setCreandoSesion(false);
        if (error) {
            console.error('[crearSesion]', error);
            notifications.show({ title: 'Error al crear sesión', message: error.message, color: 'red' });
            return;
        }
        setNombreNuevaSesion('');
        setPopoverOpen(false);
        await fetchSesiones();
        if (data) setSesionActiva(data as SesionBaston);
    }

    async function eliminarSesion() {
        if (!sesionActiva) return;
        const { error } = await supabase.from('sesiones_baston').delete().eq('id', sesionActiva.id);
        if (error) { console.error('[eliminarSesion]', error); return; }
        setSesionActiva(null);
        setLectorActivo(false);
        fetchSesiones();
    }

    async function avanzarEstado() {
        if (!sesionActiva) return;
        const siguiente = ESTADO_SIGUIENTE[sesionActiva.estado];
        if (!siguiente) return;
        const { error } = await supabase
            .from('sesiones_baston')
            .update({ estado: siguiente, updated_at: new Date().toISOString() })
            .eq('id', sesionActiva.id);
        if (error) { console.error('[avanzarEstado]', error); return; }
        const actualizada = { ...sesionActiva, estado: siguiente };
        setSesionActiva(actualizada);
        setSesiones(prev => prev.map(s => s.id === sesionActiva.id ? actualizada : s));
    }

    async function quitarAnimal(animalId: string) {
        if (!sesionActiva) return;
        const nuevosIds = sesionActiva.animales_ids.filter(id => id !== animalId);
        const { error } = await supabase
            .from('sesiones_baston')
            .update({ animales_ids: nuevosIds, updated_at: new Date().toISOString() })
            .eq('id', sesionActiva.id);
        if (error) { console.error('[quitarAnimal]', error); return; }
        const actualizada = { ...sesionActiva, animales_ids: nuevosIds };
        setSesionActiva(actualizada);
        setSesiones(prev => prev.map(s => s.id === sesionActiva.id ? actualizada : s));
    }

    const manejarEscaneo = useCallback(async (eid: string) => {
        if (!sesionActiva) return;
        const eidNorm = eid.trim().toLowerCase();

        const animal = animales.find((a: any) =>
            a.caravana_electronica?.trim().toLowerCase() === eidNorm ||
            a.caravana?.trim().toLowerCase() === eidNorm
        );

        if (!animal) {
            setUltimoEidLeido('❌ No encontrada: ' + eid);
            notifications.show({
                title: 'Caravana no encontrada',
                message: `"${eid}" no está registrada en este campo.`,
                color: 'orange', autoClose: 3000,
            });
            setEidsPendientes(prev => prev.includes(eid) ? prev : [...prev, eid]);
            return;
        }

        const esActivo = !['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(animal.estado) && !animal.en_transito;
        if (!esActivo) {
            setUltimoEidLeido('⚠️ ' + animal.caravana + ' — inactivo');
            notifications.show({
                title: 'Animal inactivo',
                message: `${animal.caravana} está ${animal.estado} y no puede agregarse.`,
                color: 'orange', autoClose: 3000,
            });
            return;
        }

        if (sesionActiva.animales_ids.includes(animal.id)) {
            setUltimoEidLeido('ℹ️ ' + animal.caravana + ' — ya en la lista');
            notifications.show({
                message: `${animal.caravana} ya estaba en la sesión.`,
                color: 'blue', autoClose: 2000,
            });
            return;
        }

        const nuevosIds = [...sesionActiva.animales_ids, animal.id];
        const { error } = await supabase
            .from('sesiones_baston')
            .update({ animales_ids: nuevosIds, updated_at: new Date().toISOString() })
            .eq('id', sesionActiva.id);
        if (error) { console.error('[manejarEscaneo]', error); return; }

        const actualizada = { ...sesionActiva, animales_ids: nuevosIds };
        setSesionActiva(actualizada);
        setSesiones(prev => prev.map(s => s.id === sesionActiva.id ? actualizada : s));
        setUltimoEidLeido('✅ ' + animal.caravana + ' — ' + animal.categoria);
        notifications.show({ message: `${animal.caravana} agregado`, color: 'teal', autoClose: 1500 });
    }, [sesionActiva, animales]);

    const manejarEscaneoTags = useCallback(async (eid: string) => {
        const eidNorm = eid.trim().toLowerCase();
        setUltimoEidTag(eid);

        const yaRegistrado = animales.some(
            (a: any) => a.caravana_electronica?.trim().toLowerCase() === eidNorm
        );

        if (yaRegistrado) {
            setEidsYaRegistrados(prev => prev.includes(eid) ? prev : [...prev, eid]);
            notifications.show({
                title: 'Ya registrada',
                message: `El EID "${eid}" ya está asignado a un animal en este campo.`,
                color: 'orange',
                autoClose: 3000,
            });
            return;
        }

        const yaEnLista = tagsPendientes.some(t => t.eid.trim().toLowerCase() === eidNorm);
        if (yaEnLista) {
            notifications.show({ message: 'Este tag ya está en la lista.', color: 'blue', autoClose: 2000 });
            return;
        }

        const { error } = await supabase
            .from('tags_pendientes')
            .insert({
                establecimiento_id: campoId,
                eid: eid.trim(),
                creado_por: session?.user?.id ?? null,
                asignado: false,
                grupo_nombre: grupoActualRef.current.trim() || null,
            });

        if (error) {
            console.error('[manejarEscaneoTags]', error);
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
            return;
        }

        notifications.show({ message: `Tag "${eid}" guardado`, color: 'teal', autoClose: 1500 });
        fetchTags();
    }, [animales, tagsPendientes, campoId, session]);

    useLectorAllflex({ isActive: lectorActivo && !!sesionActiva && sesionActiva.estado !== 'PROCESADA', onScan: manejarEscaneo });
    useLectorAllflex({ isActive: lectorTagsActivo && activeTab === 'tags', onScan: manejarEscaneoTags });

    function exportarCSV() {
        if (!sesionActiva || sesionActiva.animales_ids.length === 0) return;
        const cabeceras = ['Sesión', 'Fecha', 'Caravana', 'Categoría', 'Sexo', 'Estado', 'Potrero', 'Lote'];
        const filas = sesionActiva.animales_ids.map(id => {
            const a = animales.find((x: any) => x.id === id);
            if (!a) return null;
            return [
                sesionActiva.nombre,
                formatDate(sesionActiva.created_at),
                a.caravana,
                a.categoria,
                a.sexo === 'M' ? 'Macho' : a.sexo === 'H' ? 'Hembra' : '-',
                a.estado,
                potreros.find((p: any) => p.id === a.potrero_id)?.nombre || '-',
                lotes.find((l: any) => l.id === a.lote_id)?.nombre || '-',
            ];
        }).filter(Boolean);
        const contenido = [cabeceras.join(';'), ...filas.map((f: any) => f.join(';'))].join('\n');
        const blob = new Blob(['﻿', contenido], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Sesion_${sesionActiva.nombre.replace(/\s+/g, '_')}_${getHoyIso()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const animalesDeSesion = sesionActiva
        ? sesionActiva.animales_ids.map(id => animales.find((a: any) => a.id === id)).filter(Boolean)
        : [];

    const siguienteEstado = sesionActiva ? ESTADO_SIGUIENTE[sesionActiva.estado] : null;

    return (
        <>
        <Stack gap="md">
            <Tabs value={activeTab} onChange={setActiveTab} color="teal">
                <Tabs.List>
                    <Tabs.Tab value="sesiones" leftSection={<IconScan size={16} />}>
                        Sesiones
                    </Tabs.Tab>
                    <Tabs.Tab value="tags" leftSection={<IconTags size={16} />}>
                        C.E sin asignar
                        {tagsPendientes.length > 0 && (
                            <Badge ml="xs" color="orange" size="xs">{tagsPendientes.length}</Badge>
                        )}
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="sesiones" pt="md">
                    <Grid gutter="md">
                        {/* COLUMNA IZQUIERDA — lista de sesiones */}
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                            <Paper withBorder p="md" radius="md">
                                <Group justify="space-between" mb="md">
                                    <Group gap="xs">
                                        <Title order={4}>Sesiones de Bastón</Title>
                                        <Badge color="teal" variant="filled">{sesiones.length}</Badge>
                                    </Group>
                                    <Popover
                                        opened={popoverOpen}
                                        onChange={setPopoverOpen}
                                        position="bottom-end"
                                        withArrow
                                        shadow="md"
                                        width={260}
                                    >
                                        <Popover.Target>
                                            <Button size="xs" leftSection={<IconPlus size={14} />} color="teal" onClick={() => setPopoverOpen(o => !o)}>
                                                Nueva
                                            </Button>
                                        </Popover.Target>
                                        <Popover.Dropdown>
                                            <Stack gap="xs">
                                                <Text size="sm" fw={600}>Nombre de la sesión</Text>
                                                <TextInput
                                                    placeholder="Ej: Vacunación lote Norte"
                                                    value={nombreNuevaSesion}
                                                    onChange={(e) => setNombreNuevaSesion(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') crearSesion(); }}
                                                    autoFocus
                                                />
                                                <Button
                                                    fullWidth
                                                    color="teal"
                                                    loading={creandoSesion}
                                                    onClick={crearSesion}
                                                    disabled={!nombreNuevaSesion.trim()}
                                                >
                                                    Crear sesión
                                                </Button>
                                            </Stack>
                                        </Popover.Dropdown>
                                    </Popover>
                                </Group>

                                {loadingSesiones ? (
                                    <Center py="xl"><Loader size="sm" color="teal" /></Center>
                                ) : sesiones.length === 0 ? (
                                    <Stack align="center" py="xl" gap="xs">
                                        <ThemeIcon size={48} radius="xl" color="teal" variant="light">
                                            <IconScan size={28} />
                                        </ThemeIcon>
                                        <Text size="sm" c="dimmed" ta="center">
                                            No hay sesiones todavía.<br />Creá una para empezar.
                                        </Text>
                                    </Stack>
                                ) : (
                                    <ScrollArea h={isMobile ? undefined : 500}>
                                        <Stack gap="xs">
                                            {sesiones.map(s => (
                                                <Paper
                                                    key={s.id}
                                                    withBorder
                                                    p="sm"
                                                    radius="md"
                                                    onClick={() => {
                                                        setSesionActiva(s);
                                                        setLectorActivo(false);
                                                        setUltimoEidLeido(null);
                                                    }}
                                                    style={{
                                                        cursor: 'pointer',
                                                        borderColor: sesionActiva?.id === s.id ? 'var(--mantine-color-teal-4)' : undefined,
                                                        background: sesionActiva?.id === s.id ? 'var(--mantine-color-teal-0)' : undefined,
                                                    }}
                                                >
                                                    <Group justify="space-between" mb={4} wrap="nowrap">
                                                        <Text fw={700} size="sm" style={{ flex: 1 }} lineClamp={1}>{s.nombre}</Text>
                                                        <Badge color={ESTADO_COLOR[s.estado]} size="xs" variant="filled">{s.estado}</Badge>
                                                    </Group>
                                                    <Group gap="xs">
                                                        <Text size="xs" c="dimmed">{formatDate(s.created_at)}</Text>
                                                        <Badge size="xs" variant="outline" color="gray">{s.animales_ids.length} animales</Badge>
                                                    </Group>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </ScrollArea>
                                )}
                            </Paper>
                        </Grid.Col>

                        {/* COLUMNA DERECHA — detalle */}
                        <Grid.Col span={{ base: 12, sm: 8 }}>
                            {!sesionActiva ? (
                                <Paper withBorder p="xl" radius="md">
                                    <Center h={300}>
                                        <Stack align="center" gap="xs">
                                            <ThemeIcon size={64} radius="xl" color="gray" variant="light">
                                                <IconScan size={36} />
                                            </ThemeIcon>
                                            <Text c="dimmed" fw={500}>Seleccioná una sesión para ver el detalle</Text>
                                        </Stack>
                                    </Center>
                                </Paper>
                            ) : (
                                <Paper withBorder p="md" radius="md">
                                    {/* Header */}
                                    <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
                                        <Group gap="xs">
                                            <Title order={4}>{sesionActiva.nombre}</Title>
                                            <Badge color={ESTADO_COLOR[sesionActiva.estado]} variant="filled">
                                                {sesionActiva.estado}
                                            </Badge>
                                        </Group>
                                        <Text size="xs" c="dimmed">Creada el {formatDate(sesionActiva.created_at)}</Text>
                                    </Group>

                                    {/* Panel lector */}
                                    <Paper
                                        withBorder p="sm" radius="md" mb="md"
                                        bg={lectorActivo ? 'teal.0' : undefined}
                                        style={{ borderColor: lectorActivo ? 'var(--mantine-color-teal-4)' : undefined }}
                                    >
                                        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                                            <Group gap="md" align="center" wrap="nowrap">
                                                <Switch
                                                    checked={lectorActivo}
                                                    onChange={(e) => { setLectorActivo(e.currentTarget.checked); setUltimoEidLeido(null); }}
                                                    color="teal"
                                                    size="md"
                                                    label={lectorActivo ? 'Lector ON' : 'Lector OFF'}
                                                    thumbIcon={lectorActivo
                                                        ? <IconBluetooth size={12} color="white" />
                                                        : <IconBluetoothOff size={12} />}
                                                    disabled={sesionActiva.estado === 'PROCESADA'}
                                                />
                                                {lectorActivo && (
                                                    <>
                                                        <Badge color="teal" variant="light" size="sm"
                                                            leftSection={<IconBluetooth size={11} />}>
                                                            HID activo
                                                        </Badge>
                                                        {eidsPendientes.length > 0 && (
                                                            <Badge color="orange" variant="light" size="sm">
                                                                {eidsPendientes.length} sin registrar
                                                            </Badge>
                                                        )}
                                                        <Text size="xs" c="dimmed" style={{ borderLeft: '1px solid var(--mantine-color-teal-3)', paddingLeft: 12 }}>
                                                            SPP:
                                                        </Text>
                                                        <AllflexScanner onScan={manejarEscaneo} />
                                                    </>
                                                )}
                                            </Group>
                                            {lectorActivo && (
                                                <Text size="xs" c={ultimoEidLeido ? 'teal.8' : 'dimmed'}>
                                                    {ultimoEidLeido ?? 'Apuntá el bastón y escaneá'}
                                                </Text>
                                            )}
                                        </Group>
                                    </Paper>

                                    {/* Tabla de animales */}
                                    <Paper withBorder radius="md" mb="md" style={{ overflow: 'hidden' }}>
                                        {animalesDeSesion.length === 0 ? (
                                            <Center py="xl">
                                                <Stack align="center" gap="xs">
                                                    <ThemeIcon size={40} radius="xl" color="teal" variant="light">
                                                        <IconScan size={22} />
                                                    </ThemeIcon>
                                                    <Text size="sm" c="dimmed">Empezá a escanear para agregar animales</Text>
                                                </Stack>
                                            </Center>
                                        ) : (
                                            <ScrollArea h={isMobile ? undefined : 300}>
                                                <Table stickyHeader>
                                                    <Table.Thead bg="gray.1">
                                                        <Table.Tr>
                                                            <Table.Th>Caravana</Table.Th>
                                                            <Table.Th>Categoría</Table.Th>
                                                            <Table.Th>Sexo</Table.Th>
                                                            <Table.Th>Estado</Table.Th>
                                                            <Table.Th>Potrero</Table.Th>
                                                            <Table.Th>Lote</Table.Th>
                                                            <Table.Th w={40}></Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {animalesDeSesion.map((a: any) => {
                                                            const potreroNombre = potreros.find((p: any) => p.id === a.potrero_id)?.nombre;
                                                            const loteNombre = lotes.find((l: any) => l.id === a.lote_id)?.nombre;
                                                            return (
                                                                <Table.Tr key={a.id}>
                                                                    <Table.Td><Text fw={700} size="sm">{a.caravana}</Text></Table.Td>
                                                                    <Table.Td><Text size="sm">{a.categoria}</Text></Table.Td>
                                                                    <Table.Td>
                                                                        <Text size="sm">{a.sexo === 'M' ? 'Macho' : a.sexo === 'H' ? 'Hembra' : '-'}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Badge size="sm" color="blue" variant="light">{a.estado}</Badge>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        {potreroNombre
                                                                            ? <Badge size="sm" variant="outline" color="lime" leftSection={<IconMapPin size={10} />}>{potreroNombre}</Badge>
                                                                            : <Text size="xs" c="dimmed">-</Text>}
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        {loteNombre
                                                                            ? <Badge size="sm" variant="outline" color="grape" leftSection={<IconTag size={10} />}>{loteNombre}</Badge>
                                                                            : <Text size="xs" c="dimmed">-</Text>}
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        {sesionActiva.estado !== 'PROCESADA' && (
                                                                            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => quitarAnimal(a.id)} title="Quitar de la sesión">
                                                                                <IconX size={14} />
                                                                            </ActionIcon>
                                                                        )}
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            );
                                                        })}
                                                    </Table.Tbody>
                                                </Table>
                                            </ScrollArea>
                                        )}
                                    </Paper>

                                    {/* Footer de acciones */}
                                    <Group justify="space-between" wrap="wrap" gap="xs">
                                        <Group gap="xs" wrap="wrap">
                                            {sesionActiva.animales_ids.length > 0 && (
                                                <>
                                                    <Button
                                                        color="violet"
                                                        leftSection={<IconPlaylistAdd size={16} />}
                                                        onClick={() => onCargarEnMasivos(sesionActiva.animales_ids)}
                                                    >
                                                        Cargar en Masivos
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        color="blue"
                                                        leftSection={<IconDownload size={16} />}
                                                        onClick={exportarCSV}
                                                    >
                                                        Exportar Excel
                                                    </Button>
                                                </>
                                            )}
                                            {eidsPendientes.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    color="orange"
                                                    onClick={() => setModalPendientesOpen(true)}
                                                >
                                                    Sin registrar ({eidsPendientes.length})
                                                </Button>
                                            )}
                                            {siguienteEstado && (
                                                <Button
                                                    variant="outline"
                                                    color={ESTADO_COLOR[siguienteEstado]}
                                                    onClick={avanzarEstado}
                                                >
                                                    Marcar como {siguienteEstado}
                                                </Button>
                                            )}
                                        </Group>
                                        {rolActual === 'DUENO' && (
                                            <Button
                                                variant="subtle"
                                                color="red"
                                                leftSection={<IconTrash size={14} />}
                                                onClick={eliminarSesion}
                                            >
                                                Eliminar sesión
                                            </Button>
                                        )}
                                    </Group>
                                </Paper>
                            )}
                        </Grid.Col>
                    </Grid>
                </Tabs.Panel>

                <Tabs.Panel value="tags" pt="md">
                    <Grid gutter="md">
                        {/* COLUMNA IZQUIERDA — lista de grupos */}
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                            <Stack gap="md">
                                <Paper withBorder p="md" radius="md">
                                    <Group justify="space-between" mb="md">
                                        <Group gap="xs">
                                            <Title order={4}>Grupos Caravana Electrónica</Title>
                                            <Badge color="teal" variant="filled">{grupos.length}</Badge>
                                        </Group>
                                        <Popover
                                            opened={popoverGrupoOpen}
                                            onChange={setPopoverGrupoOpen}
                                            position="bottom-end"
                                            withArrow
                                            shadow="md"
                                            width={260}
                                        >
                                            <Popover.Target>
                                                <Button size="xs" leftSection={<IconPlus size={14} />} color="teal" onClick={() => setPopoverGrupoOpen(o => !o)}>
                                                    Nueva
                                                </Button>
                                            </Popover.Target>
                                            <Popover.Dropdown>
                                                <Stack gap="xs">
                                                    <Text size="sm" fw={600}>Nombre del grupo</Text>
                                                    <TextInput
                                                        placeholder="Ej: Vacas campo norte"
                                                        value={nombreNuevoGrupo}
                                                        onChange={(e) => setNombreNuevoGrupo(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && nombreNuevoGrupo.trim()) {
                                                                crearGrupo();
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                    <Button
                                                        fullWidth
                                                        color="teal"
                                                        disabled={!nombreNuevoGrupo.trim()}
                                                        onClick={crearGrupo}
                                                    >
                                                        Crear grupo
                                                    </Button>
                                                </Stack>
                                            </Popover.Dropdown>
                                        </Popover>
                                    </Group>

                                    {loadingGrupos ? (
                                        <Center py="xl"><Loader size="sm" color="teal" /></Center>
                                    ) : grupos.length === 0 ? (
                                        <Stack align="center" py="xl" gap="xs">
                                            <ThemeIcon size={48} radius="xl" color="teal" variant="light">
                                                <IconTags size={28} />
                                            </ThemeIcon>
                                            <Text size="sm" c="dimmed" ta="center">
                                                No hay C.E todavía.<br />Creá un grupo y empezá a escanear.
                                            </Text>
                                        </Stack>
                                    ) : (
                                        <ScrollArea h={isMobile ? undefined : 500}>
                                            <Stack gap="xs">
                                                {grupos.map(grupo => {
                                                    const countDelGrupo = tagsPendientes.filter(
                                                        t => t.grupo_nombre === grupo.nombre
                                                    ).length;
                                                    return (
                                                        <Paper
                                                            key={grupo.id}
                                                            withBorder
                                                            p="sm"
                                                            radius="md"
                                                            onClick={() => {
                                                                setGrupoSeleccionado(grupo);
                                                                grupoActualRef.current = grupo.nombre;
                                                                setUltimoEidTag(null);
                                                            }}
                                                            style={{
                                                                cursor: 'pointer',
                                                                borderColor: grupoSeleccionado?.id === grupo.id ? 'var(--mantine-color-teal-4)' : undefined,
                                                                background: grupoSeleccionado?.id === grupo.id ? 'var(--mantine-color-teal-0)' : undefined,
                                                            }}
                                                        >
                                                            <Group justify="space-between" mb={4} wrap="nowrap">
                                                                <Text fw={700} size="sm" lineClamp={1} style={{ flex: 1 }}>{grupo.nombre}</Text>
                                                                <Group gap={4} wrap="nowrap">
                                                                    <Badge color="orange" size="xs" variant="filled">{countDelGrupo}</Badge>
                                                                    {rolActual === 'DUENO' && (
                                                                        <ActionIcon
                                                                            size="sm"
                                                                            color="red"
                                                                            variant="subtle"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                eliminarGrupo(grupo);
                                                                            }}
                                                                            title="Eliminar grupo"
                                                                        >
                                                                            <IconTrash size={14} />
                                                                        </ActionIcon>
                                                                    )}
                                                                </Group>
                                                            </Group>
                                                        </Paper>
                                                    );
                                                })}
                                            </Stack>
                                        </ScrollArea>
                                    )}
                                </Paper>

                                {eidsYaRegistrados.length > 0 && (
                                    <Paper withBorder p="md" radius="md" bg="orange.0">
                                        <Group justify="space-between" mb="xs">
                                            <Text size="sm" fw={600} c="orange.8">Ya registrados ({eidsYaRegistrados.length})</Text>
                                            <Button size="xs" variant="subtle" color="gray" onClick={() => setEidsYaRegistrados([])}>
                                                Limpiar
                                            </Button>
                                        </Group>
                                        <Stack gap={4}>
                                            {eidsYaRegistrados.map(eid => (
                                                <Text key={eid} size="xs" c="dimmed">{eid}</Text>
                                            ))}
                                        </Stack>
                                    </Paper>
                                )}
                            </Stack>
                        </Grid.Col>

                        {/* COLUMNA DERECHA — detalle del grupo seleccionado */}
                        <Grid.Col span={{ base: 12, sm: 8 }}>
                            {!grupoSeleccionado ? (
                                <Paper withBorder p="xl" radius="md">
                                    <Center h={300}>
                                        <Stack align="center" gap="xs">
                                            <ThemeIcon size={64} radius="xl" color="gray" variant="light">
                                                <IconTags size={36} />
                                            </ThemeIcon>
                                            <Text c="dimmed" fw={500}>Seleccioná un grupo para ver y escanear C.E</Text>
                                        </Stack>
                                    </Center>
                                </Paper>
                            ) : (() => {
                                const tagsDelGrupo = tagsPendientes.filter(t => t.grupo_nombre === grupoSeleccionado?.nombre);
                                return (
                                    <Paper withBorder p="md" radius="md">
                                        <Group justify="space-between" mb="md" wrap="wrap" gap="xs">
                                            <Group gap="xs">
                                                <Title order={4}>{grupoSeleccionado.nombre}</Title>
                                                <Badge color="orange" variant="filled">{tagsDelGrupo.length}</Badge>
                                            </Group>
                                            <Text size="xs" c="dimmed">Creado el {new Date(grupoSeleccionado.created_at).toLocaleDateString('es-AR')}</Text>
                                        </Group>

                                        {/* Panel escáner */}
                                        <Paper
                                            withBorder p="sm" radius="md" mb="md"
                                            bg={lectorTagsActivo ? 'teal.0' : undefined}
                                            style={{ borderColor: lectorTagsActivo ? 'var(--mantine-color-teal-4)' : undefined }}
                                        >
                                            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                                                <Group gap="md" align="center" wrap="nowrap">
                                                    <Switch
                                                        checked={lectorTagsActivo}
                                                        onChange={e => { setLectorTagsActivo(e.currentTarget.checked); setUltimoEidTag(null); }}
                                                        color="teal"
                                                        size="md"
                                                        label={lectorTagsActivo ? 'Lector ON' : 'Lector OFF'}
                                                        thumbIcon={lectorTagsActivo
                                                            ? <IconBluetooth size={12} color="white" />
                                                            : <IconBluetoothOff size={12} />}
                                                    />
                                                    {lectorTagsActivo && (
                                                        <>
                                                            <Badge color="teal" variant="light" size="sm" leftSection={<IconBluetooth size={11} />}>
                                                                HID activo
                                                            </Badge>
                                                            <Text size="xs" c="dimmed" style={{ borderLeft: '1px solid var(--mantine-color-teal-3)', paddingLeft: 12 }}>
                                                                SPP:
                                                            </Text>
                                                            <AllflexScanner onScan={activeTab === 'tags' ? manejarEscaneoTags : () => {}} />
                                                        </>
                                                    )}
                                                </Group>
                                                {lectorTagsActivo && (
                                                    <Text size="xs" c={ultimoEidTag ? 'teal.8' : 'dimmed'}>
                                                        {ultimoEidTag ?? 'Apuntá el bastón y escaneá'}
                                                    </Text>
                                                )}
                                            </Group>
                                        </Paper>

                                        {/* Tabla C.E del grupo */}
                                        <ScrollArea h={isMobile ? undefined : 340}>
                                            <Table striped highlightOnHover>
                                                <Table.Thead bg="gray.1">
                                                    <Table.Tr>
                                                        <Table.Th>EID</Table.Th>
                                                        <Table.Th>Fecha</Table.Th>
                                                        {rolActual === 'DUENO' && <Table.Th>Acción</Table.Th>}
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {tagsDelGrupo.length === 0 ? (
                                                        <Table.Tr>
                                                            <Table.Td colSpan={rolActual === 'DUENO' ? 3 : 2}>
                                                                <Text size="sm" c="dimmed" ta="center" py="md">
                                                                    Activá el lector y escaneá para agregar C.E a este grupo
                                                                </Text>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    ) : tagsDelGrupo.map(tag => (
                                                        <Table.Tr key={tag.id}>
                                                            <Table.Td>
                                                                <Text size="sm" ff="monospace">{tag.eid}</Text>
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <Text size="sm" c="dimmed">
                                                                    {new Date(tag.created_at).toLocaleDateString('es-AR')}
                                                                </Text>
                                                            </Table.Td>
                                                            {rolActual === 'DUENO' && (
                                                                <Table.Td>
                                                                    <Group gap="xs">
                                                                        <Button
                                                                            size="xs"
                                                                            color="teal"
                                                                            variant="light"
                                                                            leftSection={<IconCheck size={12} />}
                                                                            onClick={() => {
                                                                                setTagParaAsignarModal(tag);
                                                                                setModalAsignarCEOpen(true);
                                                                            }}
                                                                        >
                                                                            Asignar
                                                                        </Button>
                                                                        <ActionIcon
                                                                            size="sm"
                                                                            color="red"
                                                                            variant="subtle"
                                                                            onClick={async () => {
                                                                                await supabase
                                                                                    .from('tags_pendientes')
                                                                                    .delete()
                                                                                    .eq('id', tag.id);
                                                                                fetchTags();
                                                                            }}
                                                                        >
                                                                            <IconX size={12} />
                                                                        </ActionIcon>
                                                                    </Group>
                                                                </Table.Td>
                                                            )}
                                                        </Table.Tr>
                                                    ))}
                                                </Table.Tbody>
                                            </Table>
                                        </ScrollArea>
                                    </Paper>
                                );
                            })()}
                        </Grid.Col>
                    </Grid>
                </Tabs.Panel>
            </Tabs>
        </Stack>

        {/* Modal: caravanas no reconocidas */}
        <Modal
            opened={modalPendientesOpen}
            onClose={() => setModalPendientesOpen(false)}
            title="Caravanas no reconocidas"
            centered
            size="sm"
        >
            <Stack gap="xs">
                {eidsPendientes.map(eid => (
                    <Group key={eid} justify="space-between" wrap="nowrap">
                        <Text ff="monospace" size="sm">{eid}</Text>
                        <Button
                            size="xs"
                            variant="outline"
                            color="teal"
                            onClick={() => {
                                setEidParaVincular(eid);
                                setModalPendientesOpen(false);
                                setModalVincularOpen(true);
                            }}
                        >
                            Registrar / Vincular
                        </Button>
                    </Group>
                ))}
                <Button
                    variant="subtle"
                    color="gray"
                    mt="xs"
                    onClick={() => { setEidsPendientes([]); setModalPendientesOpen(false); }}
                >
                    Ignorar todos
                </Button>
            </Stack>
        </Modal>

        <ModalAltaDesdeBaston
            opened={modalVincularOpen}
            onClose={() => { setModalVincularOpen(false); setEidParaVincular(null); }}
            caravanaElectronica={eidParaVincular ?? ''}
            campoId={campoId}
            animales={animales}
            lotes={lotes}
            potreros={potreros}
            datosSuscripcion={datosSuscripcion}
            onSuccess={async (nuevoAnimalId: string) => {
                setEidsPendientes(prev => prev.filter(e => e !== eidParaVincular));
                setModalVincularOpen(false);
                setEidParaVincular(null);
                if (!sesionActiva) return;
                const nuevosIds = [...sesionActiva.animales_ids, nuevoAnimalId];
                await supabase
                    .from('sesiones_baston')
                    .update({ animales_ids: nuevosIds, updated_at: new Date().toISOString() })
                    .eq('id', sesionActiva.id);
                const actualizada = { ...sesionActiva, animales_ids: nuevosIds };
                setSesionActiva(actualizada);
                setSesiones(prev => prev.map(s => s.id === sesionActiva.id ? actualizada : s));
                fetchAnimales();
                notifications.show({ message: 'Animal registrado y agregado a la sesión', color: 'teal', autoClose: 2000 });
            }}
        />

        {tagParaAsignarModal && (
            <ModalAltaDesdeBaston
                opened={modalAsignarCEOpen}
                onClose={() => {
                    setModalAsignarCEOpen(false);
                    setTagParaAsignarModal(null);
                }}
                caravanaElectronica={tagParaAsignarModal.eid}
                campoId={campoId}
                animales={animales}
                lotes={lotes}
                potreros={potreros}
                datosSuscripcion={datosSuscripcion}
                soloVincular={true}
                onSuccess={async (animalId: string) => {
                    if (!tagParaAsignarModal) return;
                    await supabase
                        .from('tags_pendientes')
                        .update({ asignado: true, animal_id: animalId })
                        .eq('id', tagParaAsignarModal.id);
                    setModalAsignarCEOpen(false);
                    setTagParaAsignarModal(null);
                    fetchTags();
                    fetchAnimales();
                    notifications.show({
                        message: 'Caravana electrónica asignada correctamente',
                        color: 'teal',
                        autoClose: 2500,
                    });
                }}
            />
        )}
        </>
    );
}
