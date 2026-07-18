import { useState, useCallback, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import {
    Title, Badge, Paper, Text, Button, Group, Stack, TextInput,
    Grid, ThemeIcon, ScrollArea, Table, ActionIcon, Switch,
    Popover, Loader, Center,
} from '@mantine/core';
import {
    IconScan, IconBluetooth, IconBluetoothOff, IconPlus,
    IconTrash, IconMapPin, IconTag, IconDownload, IconX, IconPlaylistAdd,
} from '@tabler/icons-react';
import { supabase } from '../supabase';
import { useLectorAllflex } from '../hooks/useLectorAllflex';
import AllflexScanner from '../components/AllflexScanner';

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

interface SesionesBastonProps {
    animales: any[];
    potreros: any[];
    lotes: any[];
    campoId: string;
    rolActual: 'DUENO' | 'PEON' | 'VETERINARIO';
    session: any;
    onCargarEnMasivos: (ids: string[]) => void;
    fetchAnimales: () => void;
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
}: SesionesBastonProps) {
    const [sesiones, setSesiones] = useState<SesionBaston[]>([]);
    const [sesionActiva, setSesionActiva] = useState<SesionBaston | null>(null);
    const [lectorActivo, setLectorActivo] = useState(false);
    const [ultimoEidLeido, setUltimoEidLeido] = useState<string | null>(null);
    const [loadingSesiones, setLoadingSesiones] = useState(false);
    const [nombreNuevaSesion, setNombreNuevaSesion] = useState('');
    const [creandoSesion, setCreandoSesion] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);

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

    useEffect(() => { fetchSesiones(); }, [campoId]);

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

    useLectorAllflex({ isActive: lectorActivo && !!sesionActiva && sesionActiva.estado !== 'PROCESADA', onScan: manejarEscaneo });

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
        <Stack gap="md">
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
                            <ScrollArea h={500}>
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
                                    <ScrollArea h={300}>
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
                                    {rolActual === 'DUENO' && sesionActiva.animales_ids.length > 0 && (
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
        </Stack>
    );
}
