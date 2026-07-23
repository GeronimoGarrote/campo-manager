import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Group, Title, Badge, Button, Paper, TextInput, Select, MultiSelect, Menu, Tooltip, ActionIcon, Table, Text, UnstyledButton, Center, rem, SimpleGrid, Stack, Modal, Switch, Indicator } from '@mantine/core';
import { useMediaQuery, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconPlus, IconSearch, IconFilter, IconTag, IconSortAscending, IconSortDescending, IconTrash, IconStarFilled, IconStar, IconChevronUp, IconChevronDown, IconSelector, IconMapPin, IconBabyCarriage, IconFileSpreadsheet, IconScan, IconBluetooth, IconBluetoothOff } from '@tabler/icons-react';
import { useLectorAllflex } from '../hooks/useLectorAllflex';
import ModalAltaDesdeBaston from '../components/ModalAltaDesdeBaston';
import { supabase } from '../supabase';
import ModalImportarExcel from '../components/Hacienda/ModalImportarExcel';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };

const calcularEdad = (nacimiento?: string, ingreso?: string) => {
    const fechaStr = nacimiento || ingreso;
    if (!fechaStr) return { texto: '-', dias: -1 }; 
    const hoy = new Date(); const fecha = new Date(fechaStr + 'T12:00:00');
    if (fecha > hoy) return { texto: 'Recién nacido', dias: 0 };
    const diffTime = Math.abs(hoy.getTime() - fecha.getTime());
    return { dias: Math.floor(diffTime / (1000 * 60 * 60 * 24)) };
};

const calcularDiasFaltantesParto = (fechaServicio?: string) => {
    if (!fechaServicio) return null;
    const hoy = new Date();
    const servicio = new Date(fechaServicio + 'T12:00:00');
    const diasTranscurridos = Math.floor((hoy.getTime() - servicio.getTime()) / (1000 * 60 * 60 * 24));
    return 283 - diasTranscurridos;
};

function Th({ children, reversed, sorted, onSort }: any) {
    const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
    return (
        <Table.Th>
            <UnstyledButton onClick={onSort} style={{ width: '100%' }}>
                <Group justify="space-between"><Text fw={700} size="sm">{children}</Text><Center><Icon style={{ width: rem(16), height: rem(16) }} stroke={1.5} /></Center></Group>
            </UnstyledButton>
        </Table.Th>
    );
}

export const RenderEstadoBadge = ({ estado }: { estado: string | undefined }) => {
    if (!estado) return null;
    if (estado === 'PREÑADA Y LACTANDO') {
        return ( <> <Badge color="teal">PREÑADA</Badge> <Badge color="grape" ml={5}>LACTANCIA</Badge> </> );
    }
    let color = 'blue';
    if (estado === 'PREÑADA') color = 'teal';
    else if (estado === 'VACÍA') color = 'yellow';
    else if (estado === 'EN LACTANCIA') color = 'grape';
    else if (estado === 'LACTANTE') color = 'cyan';
    else if (estado === 'EN SERVICIO') color = 'pink'; 
    else if (estado === 'APARTADO') color = 'orange'; 
    return <Badge color={color}>{estado === 'EN LACTANCIA' ? 'LACTANCIA' : estado}</Badge>;
};

export default function Hacienda({
    animales, potreros, parcelas, lotes, activeSection,
    abrirFichaVaca, openModalAlta, setAnimales,
    datosSuscripcion, campoId, fetchAnimales,
    rolActual = 'DUENO' as 'DUENO' | 'PEON' | 'VETERINARIO',
    registrarScanHandler, onLectorChange, isConectadoCOM, metodoBaston,
}: any) {
    const [busqueda, setBusqueda] = useState('');
    const [importarExcelAbierto, setImportarExcelAbierto] = useState(false);
    const [animalParaEid, setAnimalParaEid] = useState<any>(null);
    const [eidInputVal, setEidInputVal] = useState('');
    const [savingEid, setSavingEid] = useState(false);
    const eidInputRef = useRef<HTMLInputElement>(null);
    const [filtrosDrawerOpen, { open: abrirFiltros, close: cerrarFiltros }] = useDisclosure(false);

    // ── Lector RFID ──────────────────────────────────────────────────────────
    const [lectorActivo, setLectorActivo] = useState(false);

    // Al conectarse el bastón, encender el lector automáticamente (el usuario puede apagarlo después)
    useEffect(() => {
        if (isConectadoCOM) {
            setLectorActivo(true);
            onLectorChange(true);
        }
    }, [isConectadoCOM]);
    const [eidPendiente, setEidPendiente] = useState('');
    const [modalAltaBastonOpen, setModalAltaBastonOpen] = useState(false);

    const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
    const [filterAtributos, setFilterAtributos] = useState<string[]>([]);
    const [filterLote, setFilterLote] = useState<string | null>(null); 
    const [ordenEdad, setOrdenEdad] = useState<string | null>(null); 
    const [ordenParto, setOrdenParto] = useState(false);
    const [sortBy, setSortBy] = useState<string | null>(null); 
    const [reverseSortDirection, setReverseSortDirection] = useState(false);

    const isMobile = useMediaQuery('(max-width: 48em)');

    const setSorting = (field: string) => {
        const reversed = field === sortBy ? !reverseSortDirection : false;
        setReverseSortDirection(reversed); setSortBy(field); setOrdenEdad(null); setOrdenParto(false);
    };

    const cantFiltrosActivos = [
        filterCategoria ? 1 : 0,
        filterAtributos.length,
        filterLote ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const animalesParaModalBaston = useMemo(() => {
        return animales.filter((animal: any) => {
            if (['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(animal.estado)) return false;
            if (filterCategoria && animal.categoria !== filterCategoria) return false;
            if (filterLote && animal.lote_id !== filterLote) return false;
            if (filterAtributos.length > 0) {
                const tags: string[] = [];
                if (animal.estado === 'PREÑADA Y LACTANDO') tags.push('PREÑADA', 'EN LACTANCIA'); else tags.push(animal.estado);
                if (animal.condicion) tags.push(...animal.condicion.split(', '));
                if (animal.sexo === 'M') tags.push('MACHO');
                else if (animal.sexo === 'H') tags.push('HEMBRA');
                else if (animal.sexo === 'I') tags.push('NO DEFINIDO');
                if (animal.castrado) tags.push('CAPADO');
                if (animal.destacado) tags.push('DESTACADO');
                if (animal.en_transito) tags.push('EN TRÁNSITO');
                if (!filterAtributos.every((f: string) => tags.includes(f))) return false;
            }
            return true;
        });
    }, [animales, filterCategoria, filterAtributos, filterLote]);

    const animalesFiltrados = useMemo(() => {
        return animales.filter((animal: any) => {
            const matchSeccion = activeSection === 'hacienda' 
                ? (animal.estado !== 'VENDIDO' && animal.estado !== 'MUERTO' && animal.estado !== 'ELIMINADO')
                : (animal.estado === 'VENDIDO' || animal.estado === 'MUERTO');

            const q = busqueda.trim().toLowerCase();
            const matchBusqueda = !q ||
                animal.caravana.trim().toLowerCase().includes(q) ||
                (animal.caravana_electronica?.trim().toLowerCase().includes(q) ?? false);
            const matchCategoria = filterCategoria ? animal.categoria === filterCategoria : true;
            const matchLote = filterLote ? animal.lote_id === filterLote : true; 
            
            let matchAtributos = true;
            if (filterAtributos.length > 0) {
                const tagsDelAnimal: string[] = [];
                if (animal.estado === 'PREÑADA Y LACTANDO') tagsDelAnimal.push('PREÑADA', 'EN LACTANCIA'); else tagsDelAnimal.push(animal.estado);
                if (animal.condicion) tagsDelAnimal.push(...animal.condicion.split(', '));
                if (animal.sexo === 'M') tagsDelAnimal.push('MACHO');
                else if (animal.sexo === 'H') tagsDelAnimal.push('HEMBRA');
                else if (animal.sexo === 'I') tagsDelAnimal.push('NO DEFINIDO');
                if (animal.castrado) tagsDelAnimal.push('CAPADO');
                if (animal.destacado) tagsDelAnimal.push('DESTACADO');
                if (animal.en_transito) tagsDelAnimal.push('EN TRÁNSITO'); 
                matchAtributos = filterAtributos.every((filtro: string) => tagsDelAnimal.includes(filtro));
            }
            return matchSeccion && matchBusqueda && matchCategoria && matchLote && matchAtributos;
        }).sort((a: any, b: any) => {
            if (busqueda) { const q2 = busqueda.trim().toLowerCase(); const exactA = a.caravana.trim().toLowerCase() === q2 || a.caravana_electronica?.trim().toLowerCase() === q2; const exactB = b.caravana.trim().toLowerCase() === q2 || b.caravana_electronica?.trim().toLowerCase() === q2; if (exactA && !exactB) return -1; if (!exactA && exactB) return 1; }
            
            if (ordenParto) {
                const diasA = calcularDiasFaltantesParto(a.fecha_servicio);
                const diasB = calcularDiasFaltantesParto(b.fecha_servicio);
                if (diasA === null && diasB === null) return 0;
                if (diasA === null) return 1; 
                if (diasB === null) return -1;
                return diasA - diasB; 
            }

            if (ordenEdad) {
                const diasA = calcularEdad(a.fecha_nacimiento, a.fecha_ingreso).dias; const diasB = calcularEdad(b.fecha_nacimiento, b.fecha_ingreso).dias;
                if (diasA === -1 && diasB !== -1) return 1; if (diasB === -1 && diasA !== -1) return -1;
                return ordenEdad === 'desc' ? diasB - diasA : diasA - diasB;
            }
            if (sortBy) {
                if (sortBy === 'caravana') { const numA = parseInt(a.caravana.replace(/\D/g,'')) || 0; const numB = parseInt(b.caravana.replace(/\D/g,'')) || 0; if (numA !== numB) return reverseSortDirection ? numB - numA : numA - numB; }
                const valA = a[sortBy]?.toString().toLowerCase() || ''; const valB = b[sortBy]?.toString().toLowerCase() || ''; return reverseSortDirection ? valB.localeCompare(valA) : valA.localeCompare(valB);
            }
            return 0;
        });
    }, [animales, busqueda, filterCategoria, filterAtributos, filterLote, ordenEdad, ordenParto, sortBy, reverseSortDirection, activeSection]);

    const manejarEscaneoHacienda = useCallback((eid: string) => {
        const eidNorm = eid.trim().toLowerCase();
        const animal = animales.find((a: any) =>
            a.caravana_electronica?.trim().toLowerCase() === eidNorm ||
            a.caravana?.trim().toLowerCase() === eidNorm
        );

        if (animal) {
            const hayFiltrosActivos = !!(filterCategoria || filterLote || filterAtributos.length > 0);
            const estaEnVista = animalesFiltrados.some((a: any) => a.id === animal.id);

            if (hayFiltrosActivos && !estaEnVista && activeSection === 'hacienda') {
                notifications.show({
                    title: `${animal.categoria} fuera de los filtros`,
                    message: `${animal.caravana} no está entre los animales filtrados.`,
                    color: 'orange',
                    autoClose: 7000,
                });
                return;
            }

            abrirFichaVaca(animal);
        } else {
            setEidPendiente(eid);
            setModalAltaBastonOpen(true);
        }
    }, [animales, animalesFiltrados, filterCategoria, filterLote, filterAtributos, activeSection, abrirFichaVaca]);

    useLectorAllflex({ isActive: lectorActivo, onScan: manejarEscaneoHacienda });

    // Registra el handler de escaneo COM global mientras esta vista está activa
    useEffect(() => {
        if (activeSection === 'hacienda' || activeSection === 'bajas') {
            registrarScanHandler(manejarEscaneoHacienda);
        }
        return () => registrarScanHandler(null);
    }, [activeSection, manejarEscaneoHacienda]);

    // AQUÍ ESTÁ EL CAMBIO A VIOLET PARA LASTIMADA
    const renderCondicionBadges = (condStr: string) => { 
        if (!condStr || condStr === 'SANA') return null; 
        return condStr.split(', ').map((c: any, i: number) => ( 
            <Badge key={i} color={c === 'ENFERMA' ? 'red' : 'violet'} variant="filled" size="sm">{c}</Badge> 
        )); 
    };

    const getNombrePotrero = (id?: string) => { if(!id) return null; const p = potreros.find((pot: any) => pot.id === id); return p ? p.nombre : null; };
    const getNombreParcela = (id?: string) => { if(!id) return null; const p = parcelas.find((parc: any) => parc.id === id); return p ? p.nombre : null; };
    const getNombreLote = (id?: string) => { if(!id) return null; const l = lotes.find((lot: any) => lot.id === id); return l ? l.nombre : null; };
    
    const getUbicacionCompleta = (potrero_id?: string, parcela_id?: string) => {
        if(!potrero_id) return <Text size="xs" c="dimmed">-</Text>;
        const pNom = getNombrePotrero(potrero_id);
        const parcNom = getNombreParcela(parcela_id);
        return <Badge size="sm" variant="outline" color="lime" leftSection={<IconMapPin size={10}/>}>{parcNom ? `${pNom} (${parcNom})` : pNom}</Badge>;
    }

    async function toggleDestacado(id: string, estadoActual: boolean) { 
        setAnimales((prev: any) => prev.map((a: any) => a.id === id ? { ...a, destacado: !estadoActual } : a)); 
        const { error } = await supabase.from('animales').update({ destacado: !estadoActual }).eq('id', id);
        if (error) { console.error("Error:", error); setAnimales((prev: any) => prev.map((a: any) => a.id === id ? { ...a, destacado: estadoActual } : a)); }
    }

    function abrirVincularEid(e: React.MouseEvent, animal: any) {
        e.stopPropagation();
        setAnimalParaEid(animal);
        setEidInputVal(animal.caravana_electronica || '');
        setTimeout(() => eidInputRef.current?.focus(), 100);
    }

    async function guardarEid() {
        if (!animalParaEid) return;
        const eidLimpio = eidInputVal.trim();

        // No permitir vincular un EID que ya está asignado a otro animal
        if (eidLimpio) {
            const eidNorm = eidLimpio.toLowerCase();
            const duplicado = animales.find((a: any) =>
                a.id !== animalParaEid.id &&
                a.caravana_electronica?.trim().toLowerCase() === eidNorm
            );
            if (duplicado) {
                notifications.show({
                    title: 'EID ya asignado',
                    message: `Ya hay un animal con ese EID (caravana ${duplicado.caravana}). No se puede repetir.`,
                    color: 'red',
                });
                return;
            }
        }

        setSavingEid(true);
        const { error } = await supabase.from('animales')
            .update({ caravana_electronica: eidLimpio || null })
            .eq('id', animalParaEid.id);
        setSavingEid(false);
        if (error) { notifications.show({ title: 'Error', message: error.message, color: 'red' }); return; }
        fetchAnimales();
        setAnimalParaEid(null);
        setEidInputVal('');
    }

    const exportarAExcel = () => {
        if (animalesFiltrados.length === 0) { notifications.show({ title: 'Sin datos', message: 'No hay animales para exportar con los filtros actuales.', color: 'orange' }); return; }
        const cabeceras = ['Caravana', 'Categoria', 'Sexo', 'Estado', 'Condicion Sanitaria', 'Anotaciones', 'Ubicacion (Potrero)', 'Parcela', 'Lote (Grupo)', 'Fecha Ingreso'];
        const filas = animalesFiltrados.map((a: any) => [ a.caravana, a.categoria, a.sexo === 'M' ? 'Macho' : a.sexo === 'H' ? 'Hembra' : '-', a.estado, a.condicion || 'SANA', a.detalles || '-', getNombrePotrero(a.potrero_id) || '-', getNombreParcela(a.parcela_id) || '-', getNombreLote(a.lote_id) || '-', a.fecha_ingreso ? formatDate(a.fecha_ingreso) : '-' ]);
        const contenidoCsv = [ cabeceras.join(';'), ...filas.map((fila: any) => fila.join(';')) ].join('\n');
        const blob = new Blob(["\ufeff", contenidoCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `Hacienda_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <Group gap="xs" align="center">
                    <Title order={3}>{activeSection === 'hacienda' ? 'Hacienda Activa' : 'Archivo de Bajas'}</Title>
                    <Text fw={700} size="xl" c="blue">{animalesFiltrados.length}</Text>
                </Group>
                
                <Group gap="xs" mr={{ base: 0, md: 'md' }}>
                    {activeSection === 'hacienda' && (
                        <Switch
                            checked={lectorActivo}
                            onChange={(e) => {
                                setLectorActivo(e.currentTarget.checked);
                                onLectorChange(e.currentTarget.checked);
                            }}
                            color="teal"
                            size="md"
                            label={lectorActivo ? 'Lector ON' : 'Lector OFF'}
                            thumbIcon={lectorActivo
                                ? <IconBluetooth size={12} color="white" />
                                : <IconBluetoothOff size={12} />}
                        />
                    )}
                    <Button variant="outline" color="blue" leftSection={<IconDownload size={18}/>} onClick={exportarAExcel} px={{ base: 'xs', sm: 'md' }}>
                        <Text visibleFrom="sm" fw={600}>Excel</Text>
                    </Button>
                    {activeSection === 'hacienda' && (
                        <>
                            <Button variant="outline" color="teal" leftSection={<IconFileSpreadsheet size={18}/>} onClick={() => setImportarExcelAbierto(true)} px={{ base: 'xs', sm: 'md' }}>
                                <Text visibleFrom="sm" fw={600}>Importar Excel</Text>
                            </Button>
                            <Button leftSection={<IconPlus size={22}/>} color="teal" size="md" variant="filled" onClick={openModalAlta} w={{ base: 'auto', sm: 180 }} px={{ base: 'xs', sm: 'md' }}>
                                <Text visibleFrom="sm" fw={600}>Nuevo Animal</Text>
                            </Button>
                        </>
                    )}
                </Group>
            </Group>
            
            {activeSection === 'hacienda' && lectorActivo && (
                <Paper withBorder p="sm" radius="md" bg="teal.0"
                    style={{ borderColor: 'var(--mantine-color-teal-4)' }}>
                    <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
                        <Group gap="md" align="center" wrap="wrap">
                            <Badge color="teal" variant="light" size="sm"
                                leftSection={<IconBluetooth size={11} />}>
                                HID activo
                            </Badge>
                            {isConectadoCOM && (
                                <Badge
                                    color={metodoBaston === 'rodeocontrol' ? 'teal' : 'blue'}
                                    variant="filled" size="sm"
                                    leftSection={<IconScan size={11} />}
                                >
                                    {metodoBaston === 'rodeocontrol' ? 'RC: activo' : 'COM activo'}
                                </Badge>
                            )}
                        </Group>
                        <Text size="xs" c="dimmed" visibleFrom="sm">
                            Escaneá una caravana para abrir su ficha
                        </Text>
                    </Group>
                </Paper>
            )}

            <Paper p="sm" radius="md" withBorder bg="gray.0">
                <Group align="flex-start" wrap="nowrap">
                    <div style={{ flex: 1 }}>

                        {/* MOBILE — solo buscador + botón filtros */}
                        <Group gap="xs" wrap="nowrap" hiddenFrom="sm">
                            <TextInput
                                placeholder="Buscar caravana..."
                                leftSection={<IconSearch size={16}/>}
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <Indicator
                                label={cantFiltrosActivos}
                                size={16}
                                disabled={cantFiltrosActivos === 0}
                                color="teal"
                            >
                                <Button
                                    variant={cantFiltrosActivos > 0 ? 'filled' : 'outline'}
                                    color="teal"
                                    size="sm"
                                    leftSection={<IconFilter size={14} />}
                                    onClick={abrirFiltros}
                                >
                                    Filtros
                                </Button>
                            </Indicator>
                        </Group>

                        <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing="xs" verticalSpacing="xs" visibleFrom="sm">
                            <TextInput
                                label={isMobile ? undefined : "Buscar"} 
                                placeholder={isMobile ? "Buscar..." : "Caravana o Detalle..."} 
                                leftSection={<IconSearch size={16}/>} 
                                value={busqueda} 
                                onChange={(e) => setBusqueda(e.target.value)} 
                            />
                            <Select 
                                label={isMobile ? undefined : "Categoría"} 
                                placeholder={isMobile ? "Cat." : "Todas"} 
                                data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} 
                                value={filterCategoria} 
                                onChange={setFilterCategoria} 
                                clearable 
                            />
                            <MultiSelect 
                                label={isMobile ? undefined : "Estado"} 
                                placeholder={isMobile ? "Estado..." : "Filtrar por estado..."} 
                                data={['MACHO', 'HEMBRA', 'NO DEFINIDO', 'CAPADO', 'PREÑADA', 'VACÍA', 'EN LACTANCIA', 'LACTANTE', 'ACTIVO', 'EN SERVICIO', 'APARTADO', 'ENFERMA', 'LASTIMADA', 'DESTACADO', 'EN TRÁNSITO']}
                                value={filterAtributos} 
                                onChange={setFilterAtributos} 
                                leftSection={<IconFilter size={16}/>} 
                                clearable 
                            />
                            <Select 
                                label={isMobile ? undefined : "Lote"} 
                                placeholder={isMobile ? "Lote" : "Todos los lotes"} 
                                data={lotes.map((l: any) => ({value: l.id, label: l.nombre}))} 
                                value={filterLote} 
                                onChange={setFilterLote} 
                                clearable 
                                leftSection={<IconTag size={16}/>} 
                            />
                        </SimpleGrid>
                    </div>
                    
                    <Menu shadow="md" width={220} position="bottom-end">
                        <Menu.Target>
                            <Tooltip label="Opciones de Orden">
                                <ActionIcon 
                                    size={36} 
                                    variant={(ordenEdad || ordenParto) ? "filled" : "default"} 
                                    color={(ordenEdad || ordenParto) ? "blue" : "gray"} 
                                    mt={isMobile ? 0 : 25}
                                >
                                    <IconSortAscending style={{ width: '60%', height: '60%' }} stroke={1.5} />
                                </ActionIcon>
                            </Tooltip>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>Ordenar por fecha</Menu.Label>
                            <Menu.Item leftSection={<IconSortDescending size={14} />} onClick={() => { setOrdenEdad('desc'); setOrdenParto(false); setSortBy(null); }} bg={ordenEdad === 'desc' ? 'blue.0' : undefined}>Más viejos primero</Menu.Item>
                            <Menu.Item leftSection={<IconSortAscending size={14} />} onClick={() => { setOrdenEdad('asc'); setOrdenParto(false); setSortBy(null); }} bg={ordenEdad === 'asc' ? 'blue.0' : undefined}>Más jóvenes primero</Menu.Item>
                            <Menu.Divider />
                            <Menu.Label>Maternidad</Menu.Label>
                            <Menu.Item leftSection={<IconBabyCarriage size={14} />} onClick={() => { setOrdenParto(true); setOrdenEdad(null); setSortBy(null); }} bg={ordenParto ? 'blue.0' : undefined}>Próximas a parir</Menu.Item>
                            {(ordenEdad || ordenParto) && (<><Menu.Divider /><Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => { setOrdenEdad(null); setOrdenParto(false); }}>Quitar orden</Menu.Item></>)}
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Paper>

            <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <Table striped highlightOnHover style={{ minWidth: 800 }}>
                        <Table.Thead bg="gray.1">
                            <Table.Tr>
                                <Th sorted={sortBy === 'caravana'} reversed={reverseSortDirection} onSort={() => setSorting('caravana')}>Caravana</Th>
                                <Table.Th>Categoría</Table.Th>
                                <Table.Th>Estado / Condición</Table.Th>
                                <Table.Th>Anotación</Table.Th>
                                {activeSection === 'hacienda' && <Table.Th>Ubicación</Table.Th>}
                                {activeSection === 'hacienda' && <Table.Th>Lote</Table.Th>}
                                {activeSection === 'bajas' && <Table.Th>Detalle</Table.Th>}
                                <Table.Th w={50}></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {animalesFiltrados.map((vaca: any) => (
                                <Table.Tr key={vaca.id} onClick={() => abrirFichaVaca(vaca)} style={{ cursor: 'pointer' }} bg={vaca.condicion && vaca.condicion.includes('ENFERMA') ? 'red.0' : undefined}>
                                    <Table.Td>
                                        <Group gap={6} wrap="nowrap">
                                            {/* Si el EID reemplazó la caravana visual, mostrar solo los últimos 4 dígitos en negro */}
                                            {vaca.caravana_electronica && vaca.caravana === vaca.caravana_electronica
                                                ? <Text fw={700} ff="monospace">…{vaca.caravana.slice(-4)}</Text>
                                                : <Text fw={700}>{vaca.caravana}</Text>
                                            }
                                            {activeSection === 'hacienda' && (
                                                <Tooltip
                                                    label={vaca.caravana_electronica ? `EID: ${vaca.caravana_electronica}` : 'Vincular EID del bastón'}
                                                    withArrow
                                                    zIndex={3000}
                                                >
                                                    <Group gap={2} wrap="nowrap" style={{ cursor: 'pointer' }} onClick={(e) => abrirVincularEid(e, vaca)}>
                                                        <ActionIcon
                                                            size="xs"
                                                            variant={vaca.caravana_electronica ? 'filled' : 'subtle'}
                                                            color={vaca.caravana_electronica ? 'teal' : 'gray'}
                                                            onClick={(e) => abrirVincularEid(e, vaca)}
                                                        >
                                                            <IconScan size={11} />
                                                        </ActionIcon>
                                                        {/* Solo mostrar teal si EID es distinto a la caravana visual */}
                                                        {vaca.caravana_electronica && vaca.caravana !== vaca.caravana_electronica && (
                                                            <Text size="xs" c="teal" ff="monospace" style={{ userSelect: 'none' }}>
                                                                …{vaca.caravana_electronica.slice(-4)}
                                                            </Text>
                                                        )}
                                                    </Group>
                                                </Tooltip>
                                            )}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td><Text fw={500}>{vaca.categoria}</Text></Table.Td>
                                    <Table.Td>
                                        {activeSection === 'bajas' ? (
                                            <Badge color={vaca.estado === 'VENDIDO' ? 'green' : 'red'}>{vaca.estado}</Badge>
                                        ) : (
                                            <Group gap="xs" wrap="nowrap">
                                                {vaca.en_transito ? (
                                                    <Badge color="#795548">EN TRÁNSITO</Badge>
                                                ) : (
                                                    <>
                                                        {vaca.categoria === 'Ternero' && (<Badge color={vaca.sexo === 'M' ? 'blue' : vaca.sexo === 'H' ? 'pink' : 'gray'} variant="light">{vaca.sexo === 'M' ? 'MACHO' : vaca.sexo === 'H' ? 'HEMBRA' : 'NO DEFINIDO'}</Badge>)}
                                                        {vaca.categoria === 'Ternero' && vaca.castrado ? (<Badge color="cyan">CAPADO</Badge>) : null}
                                                        {(vaca.categoria !== 'Ternero' || vaca.estado === 'LACTANTE') && <RenderEstadoBadge estado={vaca.estado} />}
                                                        
                                                        {(vaca.estado === 'PREÑADA' || vaca.estado === 'PREÑADA Y LACTANDO') && vaca.fecha_servicio && (
                                                            (() => {
                                                                const diasFaltantes = calcularDiasFaltantesParto(vaca.fecha_servicio);
                                                                if (diasFaltantes === null) return null;
                                                                let textoBadge = "";
                                                                let colorBadge = "orange";
                                                                if (diasFaltantes < 0) {
                                                                    textoBadge = `+${Math.abs(diasFaltantes)}d`;
                                                                    colorBadge = "red";
                                                                } else if (diasFaltantes <= 7) {
                                                                    textoBadge = `${diasFaltantes}d`;
                                                                    colorBadge = "red";
                                                                } else {
                                                                    textoBadge = `${Math.floor(diasFaltantes / 7)}s`;
                                                                    colorBadge = diasFaltantes <= 30 ? "red" : "orange";
                                                                }
                                                                return (
                                                                    <Tooltip label={`Parto est.: ${formatDate(vaca.fecha_servicio)} (${diasFaltantes} d.)`} withArrow zIndex={3000}>
                                                                        <Badge variant="outline" color={colorBadge} size="sm" px={4}>{textoBadge}</Badge>
                                                                    </Tooltip>
                                                                );
                                                            })()
                                                        )}
                                                        {renderCondicionBadges(vaca.condicion)}
                                                    </>
                                                )}
                                            </Group>
                                        )}
                                    </Table.Td>
                                    <Table.Td style={{ maxWidth: 150 }}>
                                        <Tooltip label={vaca.detalles} disabled={!vaca.detalles} multiline w={200} withArrow zIndex={3000}>
                                            <Text size="sm" c="dimmed" truncate="end">{vaca.detalles || '-'}</Text>
                                        </Tooltip>
                                    </Table.Td>
                                    {activeSection === 'hacienda' && (
                                        <>
                                            <Table.Td>{getUbicacionCompleta(vaca.potrero_id, vaca.parcela_id)}</Table.Td>
                                            <Table.Td>{vaca.lote_id ? <Badge variant="outline" color="grape" leftSection={<IconTag size={10}/>}>{getNombreLote(vaca.lote_id)}</Badge> : <Text size="xs" c="dimmed">-</Text>}</Table.Td>
                                        </>
                                    )}
                                    {activeSection === 'bajas' && (
                                        <Table.Td>{vaca.estado === 'VENDIDO' ? <Text size="xs" c="dimmed">-</Text> : vaca.detalle_baja ? <Text size="sm" fw={500}>{vaca.detalle_baja}</Text> : <Text size="xs" c="dimmed">-</Text>}</Table.Td>
                                    )}
                                    <Table.Td onClick={(e) => { e.stopPropagation(); toggleDestacado(vaca.id, !!vaca.destacado); }} align="right">
                                        <ActionIcon variant="subtle" color="yellow">
                                            {vaca.destacado ? <IconStarFilled size={18} /> : <IconStar size={18} />}
                                        </ActionIcon>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </div>
            </Paper>

            <ModalAltaDesdeBaston
                opened={modalAltaBastonOpen}
                onClose={() => setModalAltaBastonOpen(false)}
                caravanaElectronica={eidPendiente}
                campoId={campoId}
                animales={animales}
                animalesParaVincular={animalesParaModalBaston}
                lotes={lotes}
                potreros={potreros}
                datosSuscripcion={datosSuscripcion}
                onSuccess={(animalId) => {
                    fetchAnimales();
                    const existente = animales.find((a: any) => a.id === animalId);
                    if (existente) {
                        abrirFichaVaca(existente);
                    } else {
                        notifications.show({
                            title: 'Animal registrado',
                            message: 'El animal fue dado de alta. Podés buscarlo en la tabla.',
                            color: 'teal',
                            autoClose: 3000,
                        });
                    }
                }}
            />

            <Modal
                opened={!!animalParaEid}
                onClose={() => { setAnimalParaEid(null); setEidInputVal(''); }}
                title={
                    <Group gap="xs">
                        <IconScan size={18} />
                        <Text fw={700}>Vincular EID — {animalParaEid?.caravana}</Text>
                    </Group>
                }
                centered
                size="sm"
            >
                <Text size="sm" c="dimmed" mb="md">
                    Hacé clic en el campo y escaneá con el bastón, o ingresá el número manualmente.
                </Text>
                <TextInput
                    ref={eidInputRef}
                    label="Caravana Electrónica (EID)"
                    placeholder="Escaneá o escribí el EID..."
                    value={eidInputVal}
                    onChange={(e) => setEidInputVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardarEid(); } }}
                    leftSection={<IconScan size={16} />}
                    rightSection={animalParaEid?.caravana_electronica && !eidInputVal
                        ? <Badge color="teal" size="xs">Vinculado</Badge>
                        : null}
                    description={animalParaEid?.caravana_electronica
                        ? `EID actual: ${animalParaEid.caravana_electronica}`
                        : 'Sin EID vinculado'}
                />
                <Group mt="lg" justify="space-between">
                    {animalParaEid?.caravana_electronica && (
                        <Button
                            variant="subtle"
                            color="red"
                            size="xs"
                            onClick={() => { setEidInputVal(''); guardarEid(); }}
                        >
                            Desvincular EID
                        </Button>
                    )}
                    <Group ml="auto" gap="xs">
                        <Button variant="default" onClick={() => { setAnimalParaEid(null); setEidInputVal(''); }}>
                            Cancelar
                        </Button>
                        <Button color="teal" loading={savingEid} onClick={guardarEid} leftSection={<IconScan size={16} />}>
                            Guardar EID
                        </Button>
                    </Group>
                </Group>
            </Modal>

            {campoId && (
                <ModalImportarExcel
                    opened={importarExcelAbierto}
                    onClose={() => setImportarExcelAbierto(false)}
                    establecimientoId={campoId}
                    animalesActivos={animales.filter((a: any) => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO').length}
                    datosSuscripcion={datosSuscripcion}
                    animalesExistentes={animales.filter((a: any) => !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(a.estado))}
                    onImportComplete={fetchAnimales}
                />
            )}

            <Modal
                opened={filtrosDrawerOpen}
                onClose={cerrarFiltros}
                title="Filtros"
                size="sm"
                centered
                hiddenFrom="sm"
            >
                <Stack gap="md" pb="md">
                    <Select
                        label="Categoría"
                        placeholder="Todas las categorías"
                        data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']}
                        value={filterCategoria}
                        onChange={setFilterCategoria}
                        clearable
                    />
                    <MultiSelect
                        label="Estado / Atributos"
                        placeholder="Seleccioná uno o más..."
                        data={['MACHO', 'HEMBRA', 'NO DEFINIDO', 'CAPADO', 'PREÑADA', 'VACÍA', 'EN LACTANCIA', 'LACTANTE', 'ACTIVO', 'EN SERVICIO', 'APARTADO', 'ENFERMA', 'LASTIMADA', 'DESTACADO', 'EN TRÁNSITO']}
                        value={filterAtributos}
                        onChange={setFilterAtributos}
                        leftSection={<IconFilter size={16}/>}
                        clearable
                    />
                    <Select
                        label="Lote"
                        placeholder="Todos los lotes"
                        data={lotes.map((l: any) => ({value: l.id, label: l.nombre}))}
                        value={filterLote}
                        onChange={setFilterLote}
                        clearable
                        leftSection={<IconTag size={16}/>}
                    />
                    {cantFiltrosActivos > 0 && (
                        <Button
                            variant="subtle"
                            color="red"
                            onClick={() => {
                                setFilterCategoria(null);
                                setFilterAtributos([]);
                                setFilterLote(null);
                                cerrarFiltros();
                            }}
                        >
                            Limpiar filtros
                        </Button>
                    )}
                    <Button color="teal" onClick={cerrarFiltros}>
                        Ver resultados ({animalesFiltrados.length})
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
}