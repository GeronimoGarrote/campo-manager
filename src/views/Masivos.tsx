import { useState } from 'react';
import { Group, Title, Badge, Paper, Select, TextInput, Button, Table, Checkbox, Text, ScrollArea, MultiSelect } from '@mantine/core';
import { IconCurrencyDollar, IconMapPin, IconTag, IconBabyCarriage, IconSearch } from '@tabler/icons-react';
import { supabase } from '../supabase';

// Helper local
const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };

export default function Masivos({ 
    campoId, animales, potreros, parcelas, lotes, establecimientos, 
    fetchAnimales, fetchActividadGlobal, setActiveSection 
}: any) {
    const [loading, setLoading] = useState(false);
    
    // Filtros locales
    const [busqueda, setBusqueda] = useState('');
    const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
    const [filterSexo, setFilterSexo] = useState<string | null>(null);
    const [filterLote, setFilterLote] = useState<string | null>(null);

    // Estados Masivos
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [massActividad, setMassActividad] = useState<string | null>('VACUNACION');
    const [massFecha, setMassFecha] = useState<Date | null>(new Date());
    const [massDetalle, setMassDetalle] = useState('');
    const [massCostoUnitario, setMassCostoUnitario] = useState(''); 
    const [massModalidadVenta, setMassModalidadVenta] = useState<string>('TOTAL');
    const [massPrecioVenta, setMassPrecioVenta] = useState('');
    const [massKilosTotales, setMassKilosTotales] = useState('');
    const [massGastosVenta, setMassGastosVenta] = useState('');
    const [massDestino, setMassDestino] = useState('');
    const [massPotreroDestino, setMassPotreroDestino] = useState<string | null>(null); 
    const [massParcelaDestino, setMassParcelaDestino] = useState<string | null>(null); 
    const [massLoteDestino, setMassLoteDestino] = useState<string | null>(null); 
    const [massTactoResultado, setMassTactoResultado] = useState<string | null>('PREÑADA');
    const [massMesesGestacion, setMassMesesGestacion] = useState<string | null>(null); 
    const [massTipoServicio, setMassTipoServicio] = useState<string | null>('TORO');
    const [massTorosIds, setMassTorosIds] = useState<string[]>([]);
    const [massEstablecimientoDestino, setMassEstablecimientoDestino] = useState<string | null>(null);

    const opcionesGestacion = [
        { value: '0.5', label: '15 días (0.5 mes)' }, { value: '1', label: '1 mes' }, { value: '1.5', label: '1 mes y medio' },
        { value: '2', label: '2 meses' }, { value: '2.5', label: '2 meses y medio' }, { value: '3', label: '3 meses' },
        { value: '3.5', label: '3 meses y medio' }, { value: '4', label: '4 meses' }, { value: '4.5', label: '4 meses y medio' },
        { value: '5', label: '5 meses' }, { value: '5.5', label: '5 meses y medio' }, { value: '6', label: '6 meses' },
        { value: '6.5', label: '6 meses y medio' }, { value: '7', label: '7 meses' }, { value: '7.5', label: '7 meses y medio' },
        { value: '8', label: '8 meses' }, { value: '8.5', label: '8 meses y medio' }, { value: '9', label: '9 meses (A parir)' }
    ];

    const torosDisponibles = animales.filter((a: any) => a.categoria === 'Toro' && a.estado !== 'MUERTO' && a.estado !== 'VENDIDO');

    const animalesFiltrados = animales.filter((animal: any) => {
        const matchBusqueda = animal.caravana.toLowerCase().includes(busqueda.toLowerCase());
        const matchCategoria = filterCategoria ? animal.categoria === filterCategoria : true;
        const matchSexo = filterSexo ? animal.sexo === filterSexo : true; 
        const matchLote = filterLote ? animal.lote_id === filterLote : true; 
        return matchBusqueda && matchCategoria && matchSexo && matchLote && animal.estado !== 'VENDIDO' && animal.estado !== 'MUERTO' && animal.estado !== 'ELIMINADO';
    });

    const toggleSeleccion = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    const seleccionarGrupo = (categoriaTarget: string | null) => { const targets = animalesFiltrados.filter((a: any) => categoriaTarget ? a.categoria === categoriaTarget : true).map((a: any) => a.id); setSelectedIds(prev => [...new Set([...prev, ...targets])]); };
    const limpiarSeleccion = () => setSelectedIds([]);

    const getUbicacionCompleta = (potrero_id?: string, parcela_id?: string) => {
        if(!potrero_id) return <Text size="xs" c="dimmed">-</Text>;
        const pNom = potreros.find((p: any) => p.id === potrero_id)?.nombre;
        const parcNom = parcelas.find((p: any) => p.id === parcela_id)?.nombre;
        return <Badge size="sm" variant="outline" color="lime" leftSection={<IconMapPin size={10}/>}>{parcNom ? `${pNom} (${parcNom})` : pNom}</Badge>;
    }

    const desvincularToroDeVacas = async (toroId: string) => {
        const vacasAfectadas = animales.filter((a: any) => a.toros_servicio_ids && a.toros_servicio_ids.includes(toroId));
        for (const vaca of vacasAfectadas) { 
            const nuevosIds = vaca.toros_servicio_ids!.filter((id: string) => id !== toroId); 
            await supabase.from('animales').update({ toros_servicio_ids: nuevosIds.length > 0 ? nuevosIds : null }).eq('id', vaca.id); 
        }
    };

    async function guardarEventoMasivo() {
        if (selectedIds.length === 0) return alert("No seleccionaste ningún animal");
        if (!massFecha || !massActividad || !campoId) return alert("Faltan datos del evento");
        
        if (massActividad === 'VENTA') {
            if (!massPrecioVenta) return alert("Falta especificar el monto de la venta.");
            if (massModalidadVenta === 'KILO' && !massKilosTotales) return alert("Faltan los kilos totales.");
        }
        
        if (massActividad === 'MOVIMIENTO_POTRERO' && !massPotreroDestino) return alert("Falta el Potrero destino");
        if (massActividad === 'CAMBIO_LOTE' && !massLoteDestino) return alert("Falta el Lote (Grupo) destino");
        if (massActividad === 'SERVICIO' && massTipoServicio === 'TORO' && massTorosIds.length === 0) return alert("Seleccioná al menos un toro");
        if (massActividad === 'TRASLADO' && !massEstablecimientoDestino) return alert("Falta el establecimiento de destino");
        if (massActividad === 'TRASLADO' && massEstablecimientoDestino === campoId) return alert("El establecimiento de destino no puede ser el mismo que el actual");
        
        let idsParaProcesar = [...selectedIds]; let mensajeConfirmacion = `¿Confirmar ${massActividad} para ${selectedIds.length} animales?`;

        if (massActividad === 'CAPADO') {
            const machos = animales.filter((a: any) => selectedIds.includes(a.id) && a.sexo === 'M' && a.categoria === 'Ternero'); idsParaProcesar = machos.map((a: any) => a.id);
            const descartados = selectedIds.length - idsParaProcesar.length;
            if (idsParaProcesar.length === 0) return alert("Error: No hay Terneros Machos en la selección.");
            if (descartados > 0) mensajeConfirmacion = `⚠️ ATENCIÓN: Se detectaron ${descartados} animales inválidos.\nSolo se capará a ${idsParaProcesar.length} TERNEROS MACHOS.\n\n¿Continuar?`;
            else mensajeConfirmacion = `¿Confirmar CAPADO para ${idsParaProcesar.length} terneros?`;
        }

        if(!confirm(mensajeConfirmacion)) return; setLoading(true); const fechaStr = massFecha.toISOString();
        
        let resultadoTxt = massActividad === 'OTRO' ? massDetalle || 'Realizado' : 'Realizado (Masivo)'; 
        let datosExtra: any = {};
        let totalIngreso = 0; let gastosTotales = 0; let precioPorAnimal = 0; let gastoPorAnimal = 0;

        if (massActividad === 'VENTA') { 
            const precioNum = Number(massPrecioVenta);
            if (massModalidadVenta === 'TOTAL') totalIngreso = precioNum;
            else if (massModalidadVenta === 'CABEZA') totalIngreso = precioNum * idsParaProcesar.length;
            else if (massModalidadVenta === 'KILO') totalIngreso = precioNum * Number(massKilosTotales);
            
            gastosTotales = Number(massGastosVenta) || 0;
            precioPorAnimal = totalIngreso / idsParaProcesar.length;
            gastoPorAnimal = gastosTotales / idsParaProcesar.length;

            resultadoTxt = 'VENDIDO'; 
            datosExtra = { destino: massDestino || 'Venta Masiva', modalidad: massModalidadVenta, ingreso_total: totalIngreso, precio_unitario_estimado: Math.round(precioPorAnimal) }; 
        } 
        else if (massActividad === 'CAPADO') { resultadoTxt = 'Realizado'; } 
        else if (massActividad === 'MOVIMIENTO_POTRERO') { 
            const pNom = potreros.find((p: any) => p.id === massPotreroDestino)?.nombre; 
            const parcNom = parcelas.find((p: any) => p.id === massParcelaDestino)?.nombre;
            resultadoTxt = 'MOVIDO DE POTRERO'; datosExtra = { potrero_destino: pNom, potrero_id: massPotreroDestino, parcela_destino: parcNom, parcela_id: massParcelaDestino }; 
        } 
        else if (massActividad === 'CAMBIO_LOTE') { const lNom = lotes.find((l: any) => l.id === massLoteDestino)?.nombre; resultadoTxt = 'CAMBIO DE LOTE'; datosExtra = { lote_destino: lNom, lote_id: massLoteDestino }; } 
        else if (massActividad === 'TACTO') { resultadoTxt = massTactoResultado || ''; } 
        else if (massActividad === 'SERVICIO') {
            if (massTipoServicio === 'TORO') { const nombres = animales.filter((a: any) => massTorosIds.includes(a.id)).map((a: any) => a.caravana).join(', '); resultadoTxt = `Con: ${nombres}`; datosExtra = { toros_caravanas: nombres }; } else { resultadoTxt = 'IA'; }
        } else if (massActividad === 'TRASLADO') {
            const nombreDestino = establecimientos.find((e: any) => e.id === massEstablecimientoDestino)?.nombre;
            resultadoTxt = 'TRASLADO SALIDA';
            datosExtra = { establecimiento_destino: nombreDestino, establecimiento_destino_id: massEstablecimientoDestino };
        }

        const inserts = idsParaProcesar.map(animalId => ({ animal_id: animalId, fecha_evento: fechaStr, tipo: massActividad, resultado: resultadoTxt, detalle: massDetalle, datos_extra: datosExtra, costo: massActividad === 'VENTA' ? gastoPorAnimal : Number(massCostoUnitario), establecimiento_id: campoId }));
        const { error } = await supabase.from('eventos').insert(inserts);

        if (!error) {
            if (massActividad === 'VENTA') {
                await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: massFecha.toISOString().split('T')[0], tipo: 'INGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Venta de ${idsParaProcesar.length} animales - ${massDestino || 'Masiva'}`, monto: totalIngreso });
                await supabase.from('animales').update({ estado: 'VENDIDO', detalle_baja: `Venta: ${massDestino || '-'} (Aprox $${Math.round(precioPorAnimal)})` }).in('id', idsParaProcesar);
                await supabase.from('agenda').delete().in('animal_id', idsParaProcesar).eq('completado', false); // Limpiar agenda
                for (const id of idsParaProcesar) { const anim = animales.find((a: any) => a.id === id); if(anim?.categoria === 'Toro') await desvincularToroDeVacas(id); }
            }
            if (massActividad === 'CAPADO') await supabase.from('animales').update({ castrado: true }).in('id', idsParaProcesar);
            if (massActividad === 'MOVIMIENTO_POTRERO') await supabase.from('animales').update({ potrero_id: massPotreroDestino, parcela_id: massParcelaDestino }).in('id', idsParaProcesar);
            if (massActividad === 'CAMBIO_LOTE') await supabase.from('animales').update({ lote_id: massLoteDestino }).in('id', idsParaProcesar);
            if (massActividad === 'TACTO') {
                await supabase.from('animales').update({ estado: massTactoResultado }).in('id', idsParaProcesar);
                if (massTactoResultado === 'PREÑADA' && massMesesGestacion) {
                    const diasFaltantes = Math.round(283 - (parseFloat(massMesesGestacion) * 30.4));
                    const fechaParto = new Date(massFecha); fechaParto.setDate(fechaParto.getDate() + diasFaltantes);
                    const agendaInserts = idsParaProcesar.map(animalId => ({ establecimiento_id: campoId, fecha_programada: fechaParto.toISOString().split('T')[0], titulo: `Parto: ${animales.find((a: any) => a.id === animalId)?.caravana || 'Desconocida'}`, descripcion: `Parto estimado calculado por tacto masivo.`, tipo: 'PARTO_ESTIMADO', animal_id: animalId }));
                    await supabase.from('agenda').insert(agendaInserts);
                }
            }
            if (massActividad === 'SERVICIO') {
                const vacasToUpdate = animales.filter((a: any) => idsParaProcesar.includes(a.id) && ['Vaca', 'Vaquillona'].includes(a.categoria)).map((a: any) => a.id);
                const torosToUpdate = animales.filter((a: any) => idsParaProcesar.includes(a.id) && a.categoria === 'Toro').map((a: any) => a.id);
                if (vacasToUpdate.length > 0 && massTipoServicio === 'TORO') await supabase.from('animales').update({ toros_servicio_ids: massTorosIds }).in('id', vacasToUpdate);
                if (torosToUpdate.length > 0) await supabase.from('animales').update({ estado: 'EN SERVICIO' }).in('id', torosToUpdate);
                if (massTipoServicio === 'TORO' && massTorosIds.length > 0) {
                    const torosEvents = massTorosIds.map(toroId => ({ animal_id: toroId, fecha_evento: fechaStr, tipo: 'SERVICIO', resultado: 'En servicio', detalle: 'Asignado a rodeo (Masivo)', establecimiento_id: campoId }));
                    await supabase.from('eventos').insert(torosEvents); await supabase.from('animales').update({ estado: 'EN SERVICIO' }).in('id', massTorosIds);
                }
            }
            if (massActividad === 'TRASLADO') {
                const { data: destAnimals } = await supabase.from('animales').select('caravana').eq('establecimiento_id', massEstablecimientoDestino).in('estado', ['ACTIVO', 'PREÑADA', 'VACÍA', 'EN SERVICIO', 'APARTADO']);
                const destCaravanas = destAnimals?.map(a => a.caravana.toLowerCase()) || [];
                
                for (const id of idsParaProcesar) { 
                    const anim = animales.find((a: any) => a.id === id); 
                    let c = anim?.caravana || '';
                    if (anim && destCaravanas.includes(anim.caravana.toLowerCase())) c = `${anim.caravana} (T)`;
                    await supabase.from('animales').update({ establecimiento_id: massEstablecimientoDestino, potrero_id: null, parcela_id: null, lote_id: null, caravana: c }).eq('id', id); 
                }
                const nombreOrigen = establecimientos.find((e: any) => e.id === campoId)?.nombre;
                const insertsIngreso = idsParaProcesar.map(animalId => ({ animal_id: animalId, fecha_evento: fechaStr, tipo: 'TRASLADO_INGRESO', resultado: 'INGRESO POR TRASLADO', detalle: `Proveniente de: ${nombreOrigen}`, datos_extra: { establecimiento_origen: nombreOrigen, establecimiento_origen_id: campoId }, establecimiento_id: massEstablecimientoDestino }));
                await supabase.from('eventos').insert(insertsIngreso);
                
                // Mover agenda masiva
                await supabase.from('agenda').update({ establecimiento_id: massEstablecimientoDestino }).in('animal_id', idsParaProcesar).eq('completado', false);
            }
        }

        setLoading(false);
        if (error) { alert("Error: " + error.message); } else {
            alert("¡Carga masiva exitosa!"); setMassDetalle(''); setMassPrecioVenta(''); setMassKilosTotales(''); setMassGastosVenta(''); setMassDestino(''); setMassPotreroDestino(null); setMassParcelaDestino(null); setMassLoteDestino(null); setMassCostoUnitario(''); setMassTorosIds([]); setMassMesesGestacion(null); setMassEstablecimientoDestino(null); setSelectedIds([]);
            fetchAnimales(); fetchActividadGlobal(); setActiveSection('actividad');
        }
    }

    return (
        <>
            <Group justify="space-between" mb="lg">
                <Title order={2}>Carga de Eventos Masivos</Title>
                <Badge size="xl" color="violet">{selectedIds.length} Seleccionados</Badge>
            </Group>
            <Paper p="md" mb="xl" radius="md" withBorder bg="violet.0">
                <Text fw={700} size="lg" mb="sm" c="violet">1. Datos del Evento</Text>
                <Group grow align="flex-start">
                    <Select label="Tipo de Actividad" data={['VACUNACION', 'DESPARASITACION', 'SUPLEMENTACION', 'MOVIMIENTO_POTRERO', 'CAMBIO_LOTE', 'VENTA', 'CAPADO', 'RASPAJE', 'TACTO', 'SERVICIO', 'TRATAMIENTO', 'TRASLADO', 'OTRO']} value={massActividad} onChange={setMassActividad} allowDeselect={false}/>
                    <TextInput label="Fecha" type="date" value={getLocalDateForInput(massFecha)} onChange={(e) => setMassFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}/>
                </Group>
                
                {massActividad === 'VENTA' && ( 
                    <Paper withBorder p="sm" mt="sm" bg="gray.0">
                        <Text size="sm" fw={700} mb="xs">Detalles de la Venta</Text>
                        <Group grow align="flex-start">
                            <Select label="Modalidad" data={[{value: 'TOTAL', label: 'Monto Total'}, {value: 'CABEZA', label: 'Por Cabeza'}, {value: 'KILO', label: 'Al Peso (Por Kg)'}]} value={massModalidadVenta} onChange={(v) => setMassModalidadVenta(v || 'TOTAL')} allowDeselect={false} />
                            <TextInput label={massModalidadVenta === 'KILO' ? 'Precio por Kg ($)' : massModalidadVenta === 'CABEZA' ? 'Precio por Animal ($)' : 'Monto Total ($)'} placeholder="Ej: 1500000" type="number" leftSection={<IconCurrencyDollar size={16}/>} value={massPrecioVenta} onChange={(e) => setMassPrecioVenta(e.target.value)} />
                            {massModalidadVenta === 'KILO' && <TextInput label="Kilos Totales" placeholder="Ej: 4500" type="number" value={massKilosTotales} onChange={(e) => setMassKilosTotales(e.target.value)} />}
                        </Group>
                        <Group grow mt="sm">
                            <TextInput label="Destino / Comprador" placeholder="Ej: Frigorífico Rioplatense" value={massDestino} onChange={(e) => setMassDestino(e.target.value)} />
                            <TextInput label="Gastos Totales de Venta ($)" placeholder="Flete, comisión, etc." type="number" leftSection={<IconCurrencyDollar size={16}/>} value={massGastosVenta} onChange={(e) => setMassGastosVenta(e.target.value)} />
                        </Group>
                    </Paper> 
                )}
                {massActividad === 'MOVIMIENTO_POTRERO' && ( 
                    <Group grow mt="sm" align="flex-start">
                        <Select label="Potrero de Destino" placeholder="Seleccionar Potrero" data={potreros.map((p: any) => ({ value: p.id, label: p.nombre }))} value={massPotreroDestino} onChange={(val) => { setMassPotreroDestino(val); setMassParcelaDestino(null); }} leftSection={<IconMapPin size={16}/>} /> 
                        <Select label="Parcela de Destino (Opcional)" placeholder={massPotreroDestino ? "General (Todo el potrero)" : "Primero elegí un potrero"} data={massPotreroDestino ? parcelas.filter((p: any) => p.potrero_id === massPotreroDestino).map((p: any) => ({ value: p.id, label: p.nombre })) : []} value={massParcelaDestino} onChange={setMassParcelaDestino} clearable disabled={!massPotreroDestino} leftSection={<IconMapPin size={16} style={{opacity: 0.5}}/>} />
                    </Group>
                )}
                {massActividad === 'CAMBIO_LOTE' && ( <Select label="Lote (Grupo) de Destino" placeholder="Seleccionar Lote" data={lotes.map((l: any) => ({ value: l.id, label: l.nombre }))} value={massLoteDestino} onChange={setMassLoteDestino} leftSection={<IconTag size={16}/>} mt="sm"/> )}
                {massActividad === 'TACTO' && ( 
                    <Group grow mt="sm" align="flex-start">
                        <Select label="Resultado del Tacto" data={['PREÑADA', 'VACÍA']} value={massTactoResultado} onChange={setMassTactoResultado} /> 
                        {massTactoResultado === 'PREÑADA' && <Select label="Tiempo de Gestación Estimado" placeholder="Opcional. Agenda la fecha de parto." data={opcionesGestacion} value={massMesesGestacion} onChange={setMassMesesGestacion} clearable leftSection={<IconBabyCarriage size={16}/>}/>}
                    </Group>
                )}
                {massActividad === 'SERVICIO' && ( <Group grow mt="sm"><Select label="Tipo de Servicio" data={['TORO', 'IA']} value={massTipoServicio} onChange={setMassTipoServicio} />{massTipoServicio === 'TORO' && ( <MultiSelect label="Seleccionar Toro/s" data={torosDisponibles.map((t: any) => ({value: t.id, label: t.caravana}))} value={massTorosIds} onChange={setMassTorosIds} searchable /> )}</Group> )}
                {massActividad === 'TRASLADO' && (
                    <Select label="Establecimiento de Destino" placeholder="Seleccionar nuevo campo" data={establecimientos.filter((e: any) => e.id !== campoId).map((e: any) => ({ value: e.id, label: e.nombre }))} value={massEstablecimientoDestino} onChange={setMassEstablecimientoDestino} leftSection={<IconMapPin size={16}/>} mt="sm" required/>
                )}
                
                <Group grow mt="sm">
                    <TextInput label="Detalle / Observaciones" value={massDetalle} onChange={(e) => setMassDetalle(e.target.value)} placeholder="Ej: Aftosa + Carbunclo"/>
                    {massActividad !== 'VENTA' && <TextInput label="Costo Unitario ($)" type="number" value={massCostoUnitario} onChange={(e) => setMassCostoUnitario(e.target.value)} leftSection={<IconCurrencyDollar size={16}/>} placeholder="Opcional"/>}
                </Group>
            </Paper>

            <Text fw={700} size="lg" mb="sm">2. Seleccionar Animales</Text>
            <Group mb="md">
                <Button variant="light" color="blue" size="xs" onClick={() => seleccionarGrupo('Vaca')}>Todas las Vacas</Button>
                <Button variant="light" color="teal" size="xs" onClick={() => seleccionarGrupo('Ternero')}>Todos los Terneros</Button>
                <Button variant="light" color="gray" size="xs" onClick={() => seleccionarGrupo(null)}>Seleccionar TODO lo visible</Button>
                {selectedIds.length > 0 && <Button variant="outline" color="red" size="xs" onClick={limpiarSeleccion}>Borrar Selección</Button>}
            </Group>
            <Group mb="md" grow>
                <TextInput placeholder="Buscar por caravana..." leftSection={<IconSearch size={14}/>} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{flex: 1}}/>
                <Select placeholder="Filtrar Vista" data={['Vaca', 'Ternero', 'Toro', 'Novillo']} value={filterCategoria} onChange={setFilterCategoria} clearable style={{flex: 1}}/>
                <Select placeholder="Sexo" data={[{value: 'M', label: 'Macho'}, {value: 'H', label: 'Hembra'}]} value={filterSexo} onChange={setFilterSexo} clearable style={{flex: 0.5}}/>
                <Select placeholder="Filtrar Lote" data={lotes.map((l: any) => ({value: l.id, label: l.nombre}))} value={filterLote} onChange={setFilterLote} clearable leftSection={<IconTag size={14}/>}/>
            </Group>
            <Paper withBorder radius="md" h={400} style={{ display: 'flex', flexDirection: 'column' }}>
                <ScrollArea style={{ flex: 1 }}>
                <Table stickyHeader>
                    <Table.Thead bg="gray.1"><Table.Tr><Table.Th w={50}>Check</Table.Th><Table.Th>Caravana</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Ubicación</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                        {animalesFiltrados.map((animal: any) => (
                            <Table.Tr key={animal.id} bg={selectedIds.includes(animal.id) ? 'violet.1' : undefined}>
                                <Table.Td><Checkbox checked={selectedIds.includes(animal.id)} onChange={() => toggleSeleccion(animal.id)} /></Table.Td>
                                <Table.Td><Text fw={700}>{animal.caravana}</Text></Table.Td>
                                <Table.Td><Text fw={500}>{animal.categoria}</Text></Table.Td>
                                <Table.Td><Badge size="sm" color={animal.estado === 'PREÑADA' ? 'teal' : animal.estado === 'VACÍA' ? 'yellow' : 'blue'}>{animal.estado}</Badge></Table.Td>
                                <Table.Td>{getUbicacionCompleta(animal.potrero_id, animal.parcela_id)}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
                </ScrollArea>
            </Paper>
            {selectedIds.length > 0 && ( <Paper shadow="xl" p="md" radius="md" withBorder bg="gray.0" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, border: '2px solid #7950f2' }}><Group><Button size="lg" color="violet" loading={loading} onClick={guardarEventoMasivo}>CONFIRMAR {massActividad}</Button></Group></Paper> )}
        </>
    );
}