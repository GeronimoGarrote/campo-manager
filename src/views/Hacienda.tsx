import { useState, useMemo } from 'react';
import { Group, Title, Badge, Button, Paper, TextInput, Select, MultiSelect, Menu, Tooltip, ActionIcon, Table, Text, UnstyledButton, Center, rem } from '@mantine/core';
import { IconDownload, IconPlus, IconSearch, IconFilter, IconTag, IconSortAscending, IconSortDescending, IconTrash, IconStarFilled, IconStar, IconChevronUp, IconChevronDown, IconSelector, IconMapPin } from '@tabler/icons-react';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };

const calcularEdad = (nacimiento?: string, ingreso?: string) => {
    const fechaStr = nacimiento || ingreso;
    if (!fechaStr) return { texto: '-', dias: -1 }; 
    const hoy = new Date(); const fecha = new Date(fechaStr + 'T12:00:00');
    if (fecha > hoy) return { texto: 'Recién nacido', dias: 0 };
    const diffTime = Math.abs(hoy.getTime() - fecha.getTime());
    return { dias: Math.floor(diffTime / (1000 * 60 * 60 * 24)) };
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
        return (
            <>
                <Badge color="teal">PREÑADA</Badge>
                <Badge color="grape">LACTANCIA</Badge>
            </>
        );
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
    abrirFichaVaca, openModalAlta, setAnimales
}: any) {
    const [busqueda, setBusqueda] = useState('');
    const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
    const [filterAtributos, setFilterAtributos] = useState<string[]>([]);
    const [filterLote, setFilterLote] = useState<string | null>(null); 
    const [ordenEdad, setOrdenEdad] = useState<string | null>(null); 
    const [sortBy, setSortBy] = useState<string | null>(null); 
    const [reverseSortDirection, setReverseSortDirection] = useState(false);

    const setSorting = (field: string) => {
        const reversed = field === sortBy ? !reverseSortDirection : false;
        setReverseSortDirection(reversed); setSortBy(field); setOrdenEdad(null); 
    };

    const animalesFiltrados = useMemo(() => {
        return animales.filter((animal: any) => {
            const matchSeccion = activeSection === 'hacienda' 
                ? (animal.estado !== 'VENDIDO' && animal.estado !== 'MUERTO')
                : (animal.estado === 'VENDIDO' || animal.estado === 'MUERTO');

            const matchBusqueda = animal.caravana.toLowerCase().includes(busqueda.toLowerCase());
            const matchCategoria = filterCategoria ? animal.categoria === filterCategoria : true;
            const matchLote = filterLote ? animal.lote_id === filterLote : true; 
            
            let matchAtributos = true;
            if (filterAtributos.length > 0) {
                const tagsDelAnimal: string[] = [];
                
                if (animal.estado === 'PREÑADA Y LACTANDO') {
                    tagsDelAnimal.push('PREÑADA', 'EN LACTANCIA');
                } else {
                    tagsDelAnimal.push(animal.estado);
                }

                if (animal.condicion) tagsDelAnimal.push(...animal.condicion.split(', '));
                if (animal.sexo === 'M') tagsDelAnimal.push('MACHO');
                if (animal.sexo === 'H') tagsDelAnimal.push('HEMBRA');
                if (animal.castrado) tagsDelAnimal.push('CAPADO');
                if (animal.destacado) tagsDelAnimal.push('DESTACADO');
                
                // Mágia para que lo encuentre el filtro
                if (animal.en_transito) tagsDelAnimal.push('EN TRÁNSITO'); 

                matchAtributos = filterAtributos.every((filtro: string) => tagsDelAnimal.includes(filtro));
            }
            return matchSeccion && matchBusqueda && matchCategoria && matchLote && matchAtributos;
        }).sort((a: any, b: any) => {
            if (busqueda) { const exactA = a.caravana.toLowerCase() === busqueda.toLowerCase(); const exactB = b.caravana.toLowerCase() === busqueda.toLowerCase(); if (exactA && !exactB) return -1; if (!exactA && exactB) return 1; }
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
    }, [animales, busqueda, filterCategoria, filterAtributos, filterLote, ordenEdad, sortBy, reverseSortDirection, activeSection]);

    const renderCondicionBadges = (condStr: string) => { if (!condStr || condStr === 'SANA') return null; return condStr.split(', ').map((c: any, i: number) => ( <Badge key={i} color={c === 'ENFERMA' ? 'red' : 'grape'} variant="filled" size="sm">{c}</Badge> )); };
    const getNombrePotrero = (id?: string) => { if(!id) return null; const p = potreros.find((pot: any) => pot.id === id); return p ? p.nombre : null; };
    const getNombreParcela = (id?: string) => { if(!id) return null; const p = parcelas.find((parc: any) => parc.id === id); return p ? p.nombre : null; };
    const getNombreLote = (id?: string) => { if(!id) return null; const l = lotes.find((lot: any) => lot.id === id); return l ? l.nombre : null; };
    
    const getUbicacionCompleta = (potrero_id?: string, parcela_id?: string) => {
        if(!potrero_id) return <Text size="xs" c="dimmed">-</Text>;
        const pNom = getNombrePotrero(potrero_id);
        const parcNom = getNombreParcela(parcela_id);
        return <Badge size="sm" variant="outline" color="lime" leftSection={<IconMapPin size={10}/>}>{parcNom ? `${pNom} (${parcNom})` : pNom}</Badge>;
    }

    async function toggleDestacado(id: string, estadoActual: boolean) { setAnimales((prev: any) => prev.map((a: any) => a.id === id ? { ...a, destacado: !estadoActual } : a)); }

    const exportarAExcel = () => {
        if (animalesFiltrados.length === 0) return alert("No hay datos para exportar");
        const cabeceras = ['Caravana', 'Categoria', 'Sexo', 'Estado', 'Condicion Sanitaria', 'Anotaciones', 'Ubicacion (Potrero)', 'Parcela', 'Lote (Grupo)', 'Fecha Ingreso'];
        const filas = animalesFiltrados.map((a: any) => [ a.caravana, a.categoria, a.sexo === 'M' ? 'Macho' : 'Hembra', a.estado, a.condicion || 'SANA', a.detalles || '-', getNombrePotrero(a.potrero_id) || '-', getNombreParcela(a.parcela_id) || '-', getNombreLote(a.lote_id) || '-', a.fecha_ingreso ? formatDate(a.fecha_ingreso) : '-' ]);
        const contenidoCsv = [ cabeceras.join(';'), ...filas.map((fila: any) => fila.join(';')) ].join('\n');
        const blob = new Blob(["\ufeff", contenidoCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `Hacienda_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return (
        <>
            <Group justify="space-between" mb="lg" align="center">
                <Group><Title order={3}>{activeSection === 'hacienda' ? 'Hacienda Activa' : 'Archivo de Bajas'}</Title><Badge size="xl" circle>{animalesFiltrados.length}</Badge></Group>
                <Group gap="sm" mr="md">
                    <Button variant="outline" color="blue" leftSection={<IconDownload size={18}/>} onClick={exportarAExcel}>Excel</Button>
                    {activeSection === 'hacienda' && ( <Button leftSection={<IconPlus size={22}/>} color="teal" size="md" variant="filled" onClick={openModalAlta} w={180}>Nuevo Animal</Button> )}
                </Group>
            </Group>
            
            <Paper p="sm" radius="md" withBorder mb="lg" bg="gray.0">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <Group grow style={{ flex: 1 }}>
                        <TextInput label="Buscar" placeholder="Caravana o Detalle..." leftSection={<IconSearch size={16}/>} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                        <Select label="Categoría" placeholder="Todas" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={filterCategoria} onChange={setFilterCategoria} clearable />
                        {/* Agregado EN TRÁNSITO al select múltiple */}
                        <MultiSelect label="Estado" placeholder="Ej: Macho, Enferma..." data={['MACHO', 'HEMBRA', 'CAPADO', 'PREÑADA', 'VACÍA', 'EN LACTANCIA', 'LACTANTE', 'ACTIVO', 'EN SERVICIO', 'APARTADO', 'ENFERMA', 'LASTIMADA', 'DESTACADO', 'EN TRÁNSITO']} value={filterAtributos} onChange={setFilterAtributos} leftSection={<IconFilter size={16}/>} clearable />
                        <Select label="Lote" placeholder="Todos" data={lotes.map((l: any) => ({value: l.id, label: l.nombre}))} value={filterLote} onChange={setFilterLote} clearable leftSection={<IconTag size={16}/>} />
                    </Group>
                    <Menu shadow="md" width={220} position="bottom-end">
                        <Menu.Target><Tooltip label="Ordenar por Edad"><ActionIcon size={36} variant={ordenEdad ? "filled" : "default"} color={ordenEdad ? "blue" : "gray"} aria-label="Ordenar" mb={2}><IconSortAscending style={{ width: '60%', height: '60%' }} stroke={1.5} /></ActionIcon></Tooltip></Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>Ordenar cronológicamente</Menu.Label>
                            <Menu.Item leftSection={<IconSortDescending size={14} />} onClick={() => { setOrdenEdad('desc'); setSortBy(null); }} bg={ordenEdad === 'desc' ? 'blue.0' : undefined}>Más viejos primero</Menu.Item>
                            <Menu.Item leftSection={<IconSortAscending size={14} />} onClick={() => { setOrdenEdad('asc'); setSortBy(null); }} bg={ordenEdad === 'asc' ? 'blue.0' : undefined}>Más jóvenes primero</Menu.Item>
                            {ordenEdad && (<><Menu.Divider /><Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => setOrdenEdad(null)}>Quitar orden</Menu.Item></>)}
                        </Menu.Dropdown>
                    </Menu>
                </div>
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
                                <Table.Th>Ubicación</Table.Th>
                                <Table.Th>Lote</Table.Th>
                                {activeSection === 'bajas' && <Table.Th>Detalle</Table.Th>}
                                <Table.Th w={50}></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {animalesFiltrados.map((vaca: any) => (
                                <Table.Tr key={vaca.id} onClick={() => abrirFichaVaca(vaca)} style={{ cursor: 'pointer' }} bg={vaca.condicion && vaca.condicion.includes('ENFERMA') ? 'red.0' : undefined}>
                                    <Table.Td><Text fw={700}>{vaca.caravana}</Text></Table.Td>
                                    <Table.Td><Text fw={500}>{vaca.categoria}</Text></Table.Td>
                                    <Table.Td>
                                        {activeSection === 'bajas' ? (
                                            <Badge color={vaca.estado === 'VENDIDO' ? 'green' : 'red'}>{vaca.estado}</Badge>
                                        ) : (
                                            <Group gap="xs">
                                                {/* ACÁ ESTÁ LA MAGIA VISUAL: Si está en tránsito, oculta lo demás y muestra el marrón */}
                                                {vaca.en_transito ? (
                                                    <Badge color="#795548">EN TRÁNSITO</Badge>
                                                ) : (
                                                    <>
                                                        {vaca.categoria === 'Ternero' && (<Badge color={vaca.sexo === 'M' ? 'blue' : 'pink'} variant="light">{vaca.sexo === 'M' ? 'MACHO' : 'HEMBRA'}</Badge>)}
                                                        {vaca.categoria === 'Ternero' && vaca.castrado ? (<Badge color="cyan">CAPADO</Badge>) : null}
                                                        {(vaca.categoria !== 'Ternero' || vaca.estado === 'LACTANTE') && <RenderEstadoBadge estado={vaca.estado} />}
                                                        {renderCondicionBadges(vaca.condicion)}
                                                    </>
                                                )}
                                            </Group>
                                        )}
                                    </Table.Td>
                                    <Table.Td style={{ maxWidth: 150 }}><Tooltip label={vaca.detalles} disabled={!vaca.detalles} multiline w={200} withArrow zIndex={3000}><Text size="sm" c="dimmed" truncate="end">{vaca.detalles || '-'}</Text></Tooltip></Table.Td>
                                    <Table.Td>{getUbicacionCompleta(vaca.potrero_id, vaca.parcela_id)}</Table.Td>
                                    <Table.Td>{vaca.lote_id ? <Badge variant="outline" color="grape" leftSection={<IconTag size={10}/>}>{getNombreLote(vaca.lote_id)}</Badge> : <Text size="xs" c="dimmed">-</Text>}</Table.Td>
                                    {activeSection === 'bajas' && <Table.Td>{vaca.detalle_baja ? <Text size="sm" fw={500}>{vaca.detalle_baja}</Text> : <Text size="xs" c="dimmed">-</Text>}</Table.Td>}
                                    <Table.Td onClick={(e) => { e.stopPropagation(); toggleDestacado(vaca.id, !!vaca.destacado); }} align="right"><ActionIcon variant="subtle" color="yellow">{vaca.destacado ? <IconStarFilled size={18} /> : <IconStar size={18} />}</ActionIcon></Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </div>
            </Paper>
        </>
    )
}