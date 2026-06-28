import { useState, useCallback, useEffect, useRef } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconBluetooth, IconBluetoothOff } from '@tabler/icons-react';
import { useLectorAllflex } from '../hooks/useLectorAllflex';
import ModalAltaDesdeBaston from '../components/ModalAltaDesdeBaston';
import AllflexScanner from '../components/AllflexScanner';
import { Group, Title, Badge, Paper, Select, TextInput, Button, Table, Checkbox, Text, ScrollArea, MultiSelect, Switch, Alert, Modal, Stack } from '@mantine/core';
import { IconCurrencyDollar, IconMapPin, IconTag, IconBabyCarriage, IconSearch, IconInfoCircle } from '@tabler/icons-react';
import { supabase } from '../supabase';

const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };

// Nos traemos la lógica de Badges PRO que usamos en Hacienda
export const RenderEstadoBadge = ({ estado }: { estado: string | undefined }) => {
    if (!estado) return null;
    if (estado === 'PREÑADA Y LACTANDO') {
        return ( <> <Badge color="teal" size="sm">PREÑADA</Badge> <Badge color="grape" ml={5} size="sm">LACTANCIA</Badge> </> );
    }
    let color = 'blue';
    if (estado === 'PREÑADA') color = 'teal';
    else if (estado === 'VACÍA') color = 'yellow';
    else if (estado === 'EN LACTANCIA') color = 'grape';
    else if (estado === 'LACTANTE') color = 'cyan';
    else if (estado === 'EN SERVICIO') color = 'pink'; 
    else if (estado === 'APARTADO') color = 'orange'; 
    return <Badge color={color} size="sm">{estado === 'EN LACTANCIA' ? 'LACTANCIA' : estado}</Badge>;
};

export default function Masivos({
    campoId, animales = [], potreros = [], parcelas = [], lotes = [], establecimientos = [], datosSuscripcion, fetchAnimales, fetchActividadGlobal, setActiveSection,
    rolActual = 'DUENO' as 'DUENO' | 'PEON' | 'VETERINARIO',
    lotePreseleccionado = null as string | null,
    onLotePreseleccionadoAplicado,
}: any) {
    const [loading, setLoading] = useState(false);
    const [lectorActivo, setLectorActivo] = useState(false);
    const [eidPendiente, setEidPendiente] = useState('');
    const [modalAltaBastonOpen, setModalAltaBastonOpen] = useState(false);
    const [ultimoEidLeido, setUltimoEidLeido] = useState<string | null>(null);

    const manejarEscaneoBaston = useCallback((eid: string) => {
        const eidNorm = eid.trim().toLowerCase();
        setUltimoEidLeido(eid);

        // Busca primero por caravana electrónica (EID), luego por caravana visual
        const animal = animales.find((a: any) =>
            a.caravana_electronica?.trim().toLowerCase() === eidNorm ||
            a.caravana?.trim().toLowerCase() === eidNorm
        );

        if (animal) {
            setSelectedIds(prev => prev.includes(animal.id) ? prev : [...prev, animal.id]);
            notifications.show({
                title: 'Animal seleccionado',
                message: `${animal.caravana} agregado a la selección`,
                color: 'teal',
                autoClose: 2000,
            });
        } else {
            setEidPendiente(eid);
            setModalAltaBastonOpen(true);
        }
    }, [animales]);

    useLectorAllflex({ isActive: lectorActivo, onScan: manejarEscaneoBaston });

    const [busqueda, setBusqueda] = useState('');
    const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
    const [filterSexo, setFilterSexo] = useState<string | null>(null);
    const [filterLote, setFilterLote] = useState<string | null>(null);
    const [filterPotrero, setFilterPotrero] = useState<string | null>(null);

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
    
    const [esVentaRedMasiva, setEsVentaRedMasiva] = useState(false);
    const [renspaDestinoMasiva, setRenspaDestinoMasiva] = useState('');
    const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
    const [confirmMsg, setConfirmMsg] = useState('');
    const [confirmWarn, setConfirmWarn] = useState('');
    const [idsPendientes, setIdsPendientes] = useState<string[]>([]);

    const opcionesGestacion = [ { value: '0.5', label: '15 días (0.5 mes)' }, { value: '1', label: '1 mes' }, { value: '1.5', label: '1 mes y medio' }, { value: '2', label: '2 meses' }, { value: '2.5', label: '2 meses y medio' }, { value: '3', label: '3 meses' }, { value: '3.5', label: '3 meses y medio' }, { value: '4', label: '4 meses' }, { value: '4.5', label: '4 meses y medio' }, { value: '5', label: '5 meses' }, { value: '5.5', label: '5 meses y medio' }, { value: '6', label: '6 meses' }, { value: '6.5', label: '6 meses y medio' }, { value: '7', label: '7 meses' }, { value: '7.5', label: '7 meses y medio' }, { value: '8', label: '8 meses' }, { value: '8.5', label: '8 meses y medio' }, { value: '9', label: '9 meses (A parir)' } ];

    const torosDisponibles = animales.filter((a: any) => a.categoria === 'Toro' && a.estado !== 'MUERTO' && a.estado !== 'VENDIDO');

    // Guarda el lote_id que debe auto-seleccionarse tras aplicarse el filtro
    const pendingLoteSelect = useRef<string | null>(null);

    // Efecto 1: aplica el filtro y marca el lote pendiente de auto-selección
    useEffect(() => {
        if (lotePreseleccionado) {
            pendingLoteSelect.current = lotePreseleccionado;
            setFilterLote(lotePreseleccionado);
            onLotePreseleccionadoAplicado?.();
        }
    }, [lotePreseleccionado]);

    // Efecto 2: cuando filterLote ya coincide con el lote pendiente (re-render posterior),
    // llama a seleccionarGrupo para que use animalesFiltrados ya actualizado
    useEffect(() => {
        if (pendingLoteSelect.current && filterLote === pendingLoteSelect.current) {
            pendingLoteSelect.current = null;
            seleccionarGrupo(null);
        }
    }, [filterLote]);

    const animalesFiltrados = animales.filter((animal: any) => {
        const q = busqueda.trim().toLowerCase();
        const matchBusqueda = !q ||
            animal.caravana.trim().toLowerCase().includes(q) ||
            (animal.caravana_electronica?.trim().toLowerCase().includes(q) ?? false);
        const matchCategoria = filterCategoria ? animal.categoria === filterCategoria : true;
        const matchSexo = filterSexo ? animal.sexo === filterSexo : true;
        const matchLote = filterLote ? animal.lote_id === filterLote : true;
        const matchPotrero = filterPotrero ? animal.potrero_id === filterPotrero : true;
        return matchBusqueda && matchCategoria && matchSexo && matchLote && matchPotrero && animal.estado !== 'VENDIDO' && animal.estado !== 'MUERTO' && animal.estado !== 'ELIMINADO' && animal.estado !== 'EN TRÁNSITO';
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

    const renderCondicionBadges = (condStr: string) => { 
        if (!condStr || condStr === 'SANA') return null; 
        return condStr.split(', ').map((c: any, i: number) => ( 
            <Badge key={i} color={c === 'ENFERMA' ? 'red' : 'grape'} variant="filled" size="sm">{c}</Badge> 
        )); 
    };

    const desvincularToroDeVacas = async (toroId: string) => {
        const vacasAfectadas = animales.filter((a: any) => a.toros_servicio_ids && a.toros_servicio_ids.includes(toroId));
        for (const vaca of vacasAfectadas) { 
            const nuevosIds = vaca.toros_servicio_ids!.filter((id: string) => id !== toroId); 
            await supabase.from('animales').update({ toros_servicio_ids: nuevosIds.length > 0 ? nuevosIds : null }).eq('id', vaca.id); 
        }
    };

    function prepararYConfirmar() {
        if (selectedIds.length === 0) {
            notifications.show({ title: 'Sin selección', message: 'No seleccionaste ningún animal', color: 'red' });
            return;
        }
        if (!massFecha || !massActividad || !campoId) {
            notifications.show({ title: 'Datos incompletos', message: 'Faltan datos del evento', color: 'red' });
            return;
        }
        if (massActividad === 'VENTA') {
            if (!massPrecioVenta) {
                notifications.show({ title: 'Datos incompletos', message: 'Falta especificar el monto de la venta.', color: 'red' });
                return;
            }
            if (massModalidadVenta === 'KILO' && !massKilosTotales) {
                notifications.show({ title: 'Datos incompletos', message: 'Faltan los kilos totales.', color: 'red' });
                return;
            }
        }
        if (massActividad === 'MOVIMIENTO_POTRERO' && !massPotreroDestino) {
            notifications.show({ title: 'Datos incompletos', message: 'Falta el Potrero destino', color: 'red' });
            return;
        }
        if (massActividad === 'CAMBIO_LOTE' && !massLoteDestino) {
            notifications.show({ title: 'Datos incompletos', message: 'Falta el Lote (Grupo) destino', color: 'red' });
            return;
        }
        if (massActividad === 'SERVICIO' && massTipoServicio === 'TORO' && massTorosIds.length === 0) {
            notifications.show({ title: 'Datos incompletos', message: 'Seleccioná al menos un toro', color: 'red' });
            return;
        }
        if (massActividad === 'TRASLADO') {
            if (!massEstablecimientoDestino) {
                notifications.show({ title: 'Datos incompletos', message: 'Falta el establecimiento de destino', color: 'red' });
                return;
            }
            if (massEstablecimientoDestino === campoId) {
                notifications.show({ title: 'Error', message: 'El establecimiento de destino no puede ser el mismo que el actual', color: 'red' });
                return;
            }
        }

        let idsParaProcesar = [...selectedIds];
        let msg = `¿Confirmar ${massActividad} para ${selectedIds.length} animal${selectedIds.length !== 1 ? 'es' : ''}?`;
        let warn = '';

        if (massActividad === 'CAPADO') {
            const machos = animales.filter((a: any) => selectedIds.includes(a.id) && a.sexo === 'M' && a.categoria === 'Ternero');
            idsParaProcesar = machos.map((a: any) => a.id);
            const descartados = selectedIds.length - idsParaProcesar.length;
            if (idsParaProcesar.length === 0) {
                notifications.show({ title: 'Sin terneros machos', message: 'No hay Terneros Machos en la selección.', color: 'red' });
                return;
            }
            if (descartados > 0) warn = `Se detectaron ${descartados} animales inválidos. Solo se capará a ${idsParaProcesar.length} ternero${idsParaProcesar.length !== 1 ? 's' : ''} macho${idsParaProcesar.length !== 1 ? 's' : ''}.`;
            msg = `¿Confirmar CAPADO para ${idsParaProcesar.length} ternero${idsParaProcesar.length !== 1 ? 's' : ''}?`;
        }

        setIdsPendientes(idsParaProcesar);
        setConfirmMsg(msg);
        setConfirmWarn(warn);
        openConfirm();
    }

    async function guardarEventoMasivo() {
        if (!massFecha || !campoId) return;
        setLoading(true); const idsParaProcesar = idsPendientes; const fechaStr = massFecha.toISOString(); const batchId = crypto.randomUUID();

        if (massActividad === 'VENTA' || massActividad === 'TRASLADO') {
            const ternerosSeleccionados = animales.filter((a: any) => idsParaProcesar.includes(a.id) && a.categoria === 'Ternero' && a.estado === 'LACTANTE');
            const vacasSeleccionadasIds = animales.filter((a: any) => idsParaProcesar.includes(a.id) && ['Vaca', 'Vaquillona'].includes(a.categoria) && a.estado.includes('LACTANCIA')).map((a: any) => a.id);
            const ternerosADestetarIds: string[] = []; const madresADestetarMap = new Map();

            for (const ternero of ternerosSeleccionados) {
                if (ternero.madre_id && !vacasSeleccionadasIds.includes(ternero.madre_id)) {
                    const madre = animales.find((a: any) => a.id === ternero.madre_id);
                    if (madre && madre.estado.includes('LACTANCIA')) { madresADestetarMap.set(madre.id, { id: madre.id, estadoOriginal: madre.estado, caravanaTernero: ternero.caravana }); }
                    ternerosADestetarIds.push(ternero.id);
                }
            }
            for (const vacaId of vacasSeleccionadasIds) {
                const criasQuedan = animales.filter((a: any) => a.madre_id === vacaId && a.estado === 'LACTANTE' && !idsParaProcesar.includes(a.id));
                if (criasQuedan.length > 0) {
                    for (const cria of criasQuedan) { ternerosADestetarIds.push(cria.id); }
                    madresADestetarMap.set(vacaId, { id: vacaId, estadoOriginal: animales.find((a: any) => a.id === vacaId)?.estado, caravanaTernero: criasQuedan.map((c: any) => c.caravana).join(', ') });
                }
            }
            if (ternerosADestetarIds.length > 0) {
                await supabase.from('animales').update({ estado: 'ACTIVO', madre_id: null }).in('id', ternerosADestetarIds);
                const eventosTerneros = ternerosADestetarIds.map(id => { const _lid = animales.find((a: any) => a.id === id)?.lote_id ?? null; return { animal_id: id, tipo: 'DESTETE', resultado: 'Destete automático', detalle: 'Separación madre/cría (Venta/Traslado)', fecha_evento: fechaStr, establecimiento_id: campoId, datos_extra: { lote_id_en_momento: _lid, lote_nombre_en_momento: _lid ? lotes.find((l: any) => l.id === _lid)?.nombre ?? null : null, batch_id: batchId } }; });
                await supabase.from('eventos').insert(eventosTerneros);
                idsParaProcesar.forEach(idProc => { const a = animales.find((an: any) => an.id === idProc); if (a && ternerosADestetarIds.includes(a.id)) { a.estado = 'ACTIVO'; a.madre_id = undefined; } });
            }
            if (madresADestetarMap.size > 0) {
                const eventosMadres = [];
                for (const [madreId, data] of madresADestetarMap.entries()) {
                    const nuevoEstadoMadre = data.estadoOriginal.includes('PREÑADA') ? 'PREÑADA' : 'VACÍA';
                    await supabase.from('animales').update({ estado: nuevoEstadoMadre }).eq('id', madreId);
                    const _lidMadre = animales.find((a: any) => a.id === madreId)?.lote_id ?? null; eventosMadres.push({ animal_id: madreId, tipo: 'DESTETE', resultado: 'Destete automático', detalle: `Separación de cría (${data.caravanaTernero})`, fecha_evento: fechaStr, establecimiento_id: campoId, datos_extra: { lote_id_en_momento: _lidMadre, lote_nombre_en_momento: _lidMadre ? lotes.find((l: any) => l.id === _lidMadre)?.nombre ?? null : null, batch_id: batchId } });
                    const a = animales.find((an: any) => an.id === madreId); if (a && idsParaProcesar.includes(a.id)) { a.estado = nuevoEstadoMadre; }
                }
                await supabase.from('eventos').insert(eventosMadres);
            }
        }
        
        let resultadoTxt = massActividad === 'OTRO' ? massDetalle || 'Realizado' : 'Realizado (Masivo)'; 
        let datosExtra: any = {}; let totalIngreso = 0; let gastosTotales = 0; let precioPorAnimal = 0; let gastoPorAnimal = 0;

        if (massActividad === 'VENTA') { 
            const precioNum = Number(massPrecioVenta);
            if (massModalidadVenta === 'TOTAL') totalIngreso = precioNum; else if (massModalidadVenta === 'CABEZA') totalIngreso = precioNum * idsParaProcesar.length; else if (massModalidadVenta === 'KILO') totalIngreso = precioNum * Number(massKilosTotales);
            gastosTotales = Number(massGastosVenta) || 0; precioPorAnimal = totalIngreso / idsParaProcesar.length; gastoPorAnimal = gastosTotales / idsParaProcesar.length;
            resultadoTxt = 'VENDIDO'; datosExtra = { destino: esVentaRedMasiva ? 'Usuario RodeoControl' : (massDestino || 'Venta Masiva'), modalidad: massModalidadVenta, ingreso_total: totalIngreso, precio_unitario_estimado: Math.round(precioPorAnimal) }; 
        } 
        else if (massActividad === 'CAPADO') { resultadoTxt = 'Realizado'; } 
        else if (massActividad === 'DESTETE') { resultadoTxt = 'DESTETADO'; }
        else if (massActividad === 'MOVIMIENTO_POTRERO') { 
            const pNom = potreros.find((p: any) => p.id === massPotreroDestino)?.nombre; const parcNom = parcelas.find((p: any) => p.id === massParcelaDestino)?.nombre;
            resultadoTxt = 'MOVIDO DE POTRERO'; datosExtra = { potrero_destino: pNom, potrero_id: massPotreroDestino, parcela_destino: parcNom, parcela_id: massParcelaDestino }; 
        } 
        else if (massActividad === 'CAMBIO_LOTE') { const lNom = lotes.find((l: any) => l.id === massLoteDestino)?.nombre; resultadoTxt = 'CAMBIO DE LOTE'; datosExtra = { lote_destino: lNom, lote_id: massLoteDestino }; } 
        else if (massActividad === 'TACTO') { resultadoTxt = massTactoResultado || ''; } 
        else if (massActividad === 'SERVICIO') {
            if (massTipoServicio === 'TORO') { const nombres = animales.filter((a: any) => massTorosIds.includes(a.id)).map((a: any) => a.caravana).join(', '); resultadoTxt = `Con: ${nombres}`; datosExtra = { toros_caravanas: nombres }; } else { resultadoTxt = 'IA'; }
        } else if (massActividad === 'TRASLADO') {
            const nombreDestino = establecimientos.find((e: any) => e.id === massEstablecimientoDestino)?.nombre;
            resultadoTxt = 'TRASLADO SALIDA'; datosExtra = { establecimiento_destino: nombreDestino, establecimiento_destino_id: massEstablecimientoDestino };
        }

        let errorGlobal = null;

        if (massActividad === 'VENTA' && esVentaRedMasiva) {
            if (!renspaDestinoMasiva) { setLoading(false); notifications.show({ title: 'Datos incompletos', message: 'Ingresá el RENSPA destino', color: 'red' }); return; }
            
            const { data, error: rpcErr } = await supabase.rpc('verificar_espacio_renspa', { 
                p_renspa: renspaDestinoMasiva.trim(),
                p_cantidad: idsParaProcesar.length
            });
            
            if (rpcErr) { setLoading(false); notifications.show({ title: 'Error de conexión', message: 'Error al verificar el RENSPA.', color: 'red' }); return; }
            if (!data.ok) { setLoading(false); notifications.show({ title: 'Error', message: data.error, color: 'red' }); return; }
            if (data.dest_id === campoId) { setLoading(false); notifications.show({ title: 'Error', message: 'No podés transferirte a vos mismo.', color: 'red' }); return; }

            const dest = { id: data.dest_id, nombre: data.dest_nombre };
            const nombreOrigen = establecimientos.find((e: any) => e.id === campoId)?.nombre || 'Campo Desconocido';

            const { error: errTransf } = await supabase.from('transferencias').insert({ campo_origen_id: campoId, campo_destino_id: dest.id, animales_ids: idsParaProcesar, precio_total: totalIngreso, detalles: `Venta masiva de ${idsParaProcesar.length} animales`, origen_nombre: nombreOrigen, estado: 'PENDIENTE' });
            errorGlobal = errTransf;
            
            if (!errorGlobal) {
                // ACÁ ESTÁ EL FIX: Usamos en_transito: true y NO PISAMOS EL ESTADO!
                await supabase.from('animales').update({ en_transito: true, detalle_baja: `En tránsito a: ${dest.nombre}`, toros_servicio_ids: null }).in('id', idsParaProcesar);
                await supabase.from('agenda').delete().in('animal_id', idsParaProcesar).eq('completado', false);
                for (const id of idsParaProcesar) { const anim = animales.find((a: any) => a.id === id); if(anim?.categoria === 'Toro') await desvincularToroDeVacas(id); }

                const animalSnapshotRed = idsParaProcesar.map((id: string) => { const a = animales.find((x: any) => x.id === id); return { caravana: a?.caravana, categoria: a?.categoria, sexo: a?.sexo }; });
                const { data: ventaRedData } = await supabase.from('ventas').insert([{ establecimiento_id: campoId, fecha: massFecha.toISOString().split('T')[0], tipo: 'RED', destino: dest.nombre, modalidad: massModalidadVenta, monto_total: totalIngreso, gastos_total: gastosTotales, animales_ids: idsParaProcesar, animales_detalle: animalSnapshotRed }]).select('id').single();
                if (totalIngreso > 0) await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: massFecha.toISOString().split('T')[0], tipo: 'INGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Venta Red: ${idsParaProcesar.length} animales → ${dest.nombre}`, monto: totalIngreso, venta_id: ventaRedData?.id ?? null });

                const insertsVenta = idsParaProcesar.map(animalId => {
                    const anim = animales.find((a: any) => a.id === animalId);
                    return { animal_id: animalId, fecha_evento: fechaStr, tipo: 'VENTA', resultado: 'VENDIDO', detalle: `En tránsito a: ${dest.nombre} - Total: $${totalIngreso}`, datos_extra: { destino: dest.nombre, modalidad: massModalidadVenta, ingreso_total: totalIngreso, gastos: gastosTotales, caravana_origen: anim?.caravana, lote_id_en_momento: anim?.lote_id ?? null, lote_nombre_en_momento: anim?.lote_id ? lotes.find((l: any) => l.id === anim.lote_id)?.nombre ?? null : null, batch_id: batchId }, establecimiento_id: campoId, costo: precioPorAnimal }
                });
                await supabase.from('eventos').insert(insertsVenta);
            }
        } else {
            const inserts = idsParaProcesar.map(animalId => {
                const anim = animales.find((a: any) => a.id === animalId);
                let finalDetalle = massDetalle; let finalDatosExtra = { ...datosExtra, caravana_origen: anim?.caravana, lote_id_en_momento: anim?.lote_id ?? null, lote_nombre_en_momento: anim?.lote_id ? lotes.find((l: any) => l.id === anim.lote_id)?.nombre ?? null : null, batch_id: batchId };

                if (massActividad === 'CAMBIO_LOTE') {
                    const lNom = lotes.find((l: any) => l.id === massLoteDestino)?.nombre || 'Sin asignar'; const lAnterior = lotes.find((l: any) => l.id === anim?.lote_id)?.nombre || 'Sin asignar';
                    finalDetalle = `Movido de: ${lAnterior} ➔ A: ${lNom}`; finalDatosExtra.lote_origen = lAnterior;
                } else if (massActividad === 'MOVIMIENTO_POTRERO') {
                    const pNom = potreros.find((p: any) => p.id === massPotreroDestino)?.nombre || 'Sin asignar'; const parcNom = parcelas.find((p: any) => p.id === massParcelaDestino)?.nombre || '';
                    const pAnterior = potreros.find((p: any) => p.id === anim?.potrero_id)?.nombre || 'Sin asignar'; const parcAnterior = parcelas.find((p: any) => p.id === anim?.parcela_id)?.nombre || '';
                    const strDestino = parcNom ? `${pNom} (${parcNom})` : pNom; const strOrigen = parcAnterior ? `${pAnterior} (${parcAnterior})` : pAnterior;
                    finalDetalle = `Movido de: ${strOrigen} ➔ A: ${strDestino}`; finalDatosExtra.potrero_origen = pAnterior; finalDatosExtra.parcela_origen = parcAnterior;
                }

                return { animal_id: animalId, fecha_evento: fechaStr, tipo: massActividad, resultado: resultadoTxt, detalle: finalDetalle, datos_extra: finalDatosExtra, costo: massActividad === 'VENTA' ? gastoPorAnimal : Number(massCostoUnitario), establecimiento_id: campoId }
            });
            const { error } = await supabase.from('eventos').insert(inserts);
            errorGlobal = error;

            if (!errorGlobal) {
                if (massActividad === 'VENTA') {
                    const animalSnapshotMasiva = idsParaProcesar.map((id: string) => { const a = animales.find((x: any) => x.id === id); return { caravana: a?.caravana, categoria: a?.categoria, sexo: a?.sexo }; });
                    const { data: ventaData } = await supabase
                        .from('ventas')
                        .insert([{
                            establecimiento_id: campoId,
                            fecha: massFecha.toISOString().split('T')[0],
                            tipo: 'MASIVA',
                            destino: massDestino || 'Masiva',
                            modalidad: massModalidadVenta,
                            monto_total: totalIngreso,
                            gastos_total: Number(massGastosVenta) || 0,
                            kilos_totales: massKilosTotales ? Number(massKilosTotales) : null,
                            animales_ids: idsParaProcesar,
                            animales_detalle: animalSnapshotMasiva
                        }])
                        .select('id')
                        .single();
                    await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: massFecha.toISOString().split('T')[0], tipo: 'INGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Venta de ${idsParaProcesar.length} animales - ${massDestino || 'Masiva'}`, monto: totalIngreso, venta_id: ventaData?.id ?? null });
                    await supabase.from('animales').update({ estado: 'VENDIDO', detalle_baja: `Venta: ${massDestino || '-'} (Aprox $${Math.round(precioPorAnimal)})`, toros_servicio_ids: null }).in('id', idsParaProcesar);
                    await supabase.from('agenda').delete().in('animal_id', idsParaProcesar).eq('completado', false);
                    for (const id of idsParaProcesar) { const anim = animales.find((a: any) => a.id === id); if(anim?.categoria === 'Toro') await desvincularToroDeVacas(id); }
                }
                if (massActividad === 'CAPADO') await supabase.from('animales').update({ castrado: true }).in('id', idsParaProcesar);
                if (massActividad === 'MOVIMIENTO_POTRERO') await supabase.from('animales').update({ potrero_id: massPotreroDestino, parcela_id: massParcelaDestino }).in('id', idsParaProcesar);
                if (massActividad === 'CAMBIO_LOTE') await supabase.from('animales').update({ lote_id: massLoteDestino }).in('id', idsParaProcesar);
                if (massActividad === 'DESTETE') {
                    const vacasLactandoIds = animales.filter((a: any) => idsParaProcesar.includes(a.id) && ['Vaca', 'Vaquillona'].includes(a.categoria)).map((a: any) => a.id);
                    if (vacasLactandoIds.length > 0) {
                        const preñadasIds = animales.filter((a: any) => vacasLactandoIds.includes(a.id) && a.estado.includes('PREÑADA')).map((a: any) => a.id);
                        const vaciasIds = vacasLactandoIds.filter((id: any) => !preñadasIds.includes(id));
                        if (preñadasIds.length > 0) await supabase.from('animales').update({ estado: 'PREÑADA' }).in('id', preñadasIds);
                        if (vaciasIds.length > 0) await supabase.from('animales').update({ estado: 'VACÍA' }).in('id', vaciasIds);
                    }
                    const ternerosIds = animales.filter((a: any) => idsParaProcesar.includes(a.id) && a.categoria === 'Ternero').map((a: any) => a.id);
                    if (ternerosIds.length > 0) await supabase.from('animales').update({ estado: 'ACTIVO' }).in('id', ternerosIds);
                }
                if (massActividad === 'TACTO') {
                    if (massTactoResultado === 'PREÑADA') {
                        const lactandoIds = animales.filter((a: any) => idsParaProcesar.includes(a.id) && a.estado.includes('LACTANCIA')).map((a: any) => a.id);
                        const noLactandoIds = idsParaProcesar.filter(id => !lactandoIds.includes(id));
                        if (lactandoIds.length > 0) await supabase.from('animales').update({ estado: 'PREÑADA Y LACTANDO' }).in('id', lactandoIds);
                        if (noLactandoIds.length > 0) await supabase.from('animales').update({ estado: 'PREÑADA' }).in('id', noLactandoIds);
                    } else {
                        const lactandoIds = animales.filter((a: any) => idsParaProcesar.includes(a.id) && a.estado.includes('LACTANCIA')).map((a: any) => a.id);
                        const noLactandoIds = idsParaProcesar.filter(id => !lactandoIds.includes(id));
                        if (lactandoIds.length > 0) await supabase.from('animales').update({ estado: 'EN LACTANCIA' }).in('id', lactandoIds);
                        if (noLactandoIds.length > 0) await supabase.from('animales').update({ estado: 'VACÍA' }).in('id', noLactandoIds);
                    }
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
                        const torosEvents = massTorosIds.map(toroId => { const _lidToro = animales.find((a: any) => a.id === toroId)?.lote_id ?? null; return { animal_id: toroId, fecha_evento: fechaStr, tipo: 'SERVICIO', resultado: 'En servicio', detalle: 'Asignado a rodeo (Masivo)', datos_extra: { lote_id_en_momento: _lidToro, lote_nombre_en_momento: _lidToro ? lotes.find((l: any) => l.id === _lidToro)?.nombre ?? null : null, batch_id: batchId }, establecimiento_id: campoId }; });
                        await supabase.from('eventos').insert(torosEvents); await supabase.from('animales').update({ estado: 'EN SERVICIO' }).in('id', massTorosIds);
                    }
                }
                if (massActividad === 'TRASLADO') {
                    const { data: destAnimals } = await supabase.from('animales').select('caravana').eq('establecimiento_id', massEstablecimientoDestino).in('estado', ['ACTIVO', 'PREÑADA', 'VACÍA', 'EN SERVICIO', 'APARTADO', 'EN LACTANCIA', 'LACTANTE', 'PREÑADA Y LACTANDO']);
                    const destCaravanas = destAnimals?.map((a: any) => a.caravana.toLowerCase()) || [];
                    
                    for (const id of idsParaProcesar) { 
                        const anim = animales.find((a: any) => a.id === id); 
                        let c = anim?.caravana || ''; if (anim && destCaravanas.includes(anim.caravana.toLowerCase())) c = `${anim.caravana} (T)`;
                        await supabase.from('animales').update({ establecimiento_id: massEstablecimientoDestino, potrero_id: null, parcela_id: null, lote_id: null, caravana: c, toros_servicio_ids: null }).eq('id', id); 
                    }
                    const nombreOrigen = establecimientos.find((e: any) => e.id === campoId)?.nombre;
                    const insertsIngreso = idsParaProcesar.map(animalId => {
                        const anim = animales.find((a: any) => a.id === animalId);
                        return { animal_id: animalId, fecha_evento: fechaStr, tipo: 'TRASLADO_INGRESO', resultado: 'INGRESO POR TRASLADO', detalle: `Proveniente de: ${nombreOrigen}`, datos_extra: { establecimiento_origen: nombreOrigen, establecimiento_origen_id: campoId, caravana_origen: anim?.caravana, lote_id_en_momento: anim?.lote_id ?? null, lote_nombre_en_momento: anim?.lote_id ? lotes.find((l: any) => l.id === anim.lote_id)?.nombre ?? null : null, batch_id: batchId }, establecimiento_id: massEstablecimientoDestino }
                    });
                    await supabase.from('eventos').insert(insertsIngreso);
                    await supabase.from('agenda').update({ establecimiento_id: massEstablecimientoDestino }).in('animal_id', idsParaProcesar).eq('completado', false);
                }
            }
        }

        setLoading(false);
        closeConfirm();
        if (errorGlobal) {
            notifications.show({ title: 'Error', message: 'Error al guardar: ' + errorGlobal.message, color: 'red' });
        } else {
            notifications.show({ title: '¡Carga masiva exitosa!', message: `${massActividad} aplicado a ${idsParaProcesar.length} animal${idsParaProcesar.length !== 1 ? 'es' : ''}.`, color: 'teal', autoClose: 4000 });
            setMassDetalle(''); setMassPrecioVenta(''); setMassKilosTotales(''); setMassGastosVenta(''); setMassDestino('');
            setMassPotreroDestino(null); setMassParcelaDestino(null); setMassLoteDestino(null); setMassCostoUnitario('');
            setMassTorosIds([]); setMassMesesGestacion(null); setMassEstablecimientoDestino(null); setSelectedIds([]);
            setEsVentaRedMasiva(false); setRenspaDestinoMasiva('');
            fetchAnimales(); fetchActividadGlobal();
        }
    }

    return (
        <>
            <Group justify="space-between" mb={lectorActivo ? 'xs' : 'lg'} align="center">
                <Group gap="sm" align="center">
                    <Title order={2}>Carga de Eventos Masivos</Title>
                    <Badge size="lg" color="violet" variant="filled">
                        {selectedIds.length} Seleccionados
                    </Badge>
                </Group>
                <Switch
                    checked={lectorActivo}
                    onChange={(e) => { setLectorActivo(e.currentTarget.checked); setUltimoEidLeido(null); }}
                    color="teal"
                    size="md"
                    label={lectorActivo ? 'Lector ON' : 'Lector OFF'}
                    thumbIcon={lectorActivo
                        ? <IconBluetooth size={12} color="white" />
                        : <IconBluetoothOff size={12} />}
                />
            </Group>

            {lectorActivo && (
                <Paper withBorder p="sm" radius="md" mb="lg" bg="teal.0"
                    style={{ borderColor: 'var(--mantine-color-teal-4)' }}>
                    <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                        <Group gap="md" align="center" wrap="nowrap">
                            <Badge color="teal" variant="light" size="sm"
                                leftSection={<IconBluetooth size={11} />}>
                                HID activo
                            </Badge>
                            <Text size="xs" c="dimmed" style={{ borderLeft: '1px solid var(--mantine-color-teal-3)', paddingLeft: 12 }}>
                                SPP:
                            </Text>
                            <AllflexScanner onScan={manejarEscaneoBaston} />
                        </Group>
                        <Text size="xs" c={ultimoEidLeido ? 'teal.8' : 'dimmed'}>
                            {ultimoEidLeido
                                ? <>Último: <Text span ff="monospace" fw={700}>{ultimoEidLeido}</Text></>
                                : 'Apuntá el bastón y escaneá'}
                        </Text>
                    </Group>
                </Paper>
            )}
            <Paper p="md" mb="xl" radius="md" withBorder bg="violet.0">
                <Text fw={700} size="lg" mb="sm" c="violet">1. Datos del Evento</Text>
                <Group grow align="flex-start">
                    <Select label="Tipo de Actividad" data={['VACUNACION', 'DESPARASITACION', 'SUPLEMENTACION', 'MOVIMIENTO_POTRERO', 'CAMBIO_LOTE', 'VENTA', 'DESTETE', 'CAPADO', 'RASPAJE', 'TACTO', 'SERVICIO', 'TRATAMIENTO', 'TRASLADO', 'OTRO'].filter(a => rolActual === 'DUENO' || a !== 'VENTA')} value={massActividad} onChange={setMassActividad} allowDeselect={false}/>
                    <TextInput label="Fecha" type="date" value={getLocalDateForInput(massFecha)} onChange={(e) => setMassFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}/>
                </Group>
                
                {massActividad === 'VENTA' && ( 
                    <Paper withBorder p="sm" mt="sm" bg="gray.0">
                        <Group justify="space-between" mb="md" p="xs" bg="blue.0" style={{ borderRadius: 8, border: '1px solid #74c0fc' }}>
                            <Text size="sm" fw={600} c="blue.9">Vender y transferir a otro usuario de RodeoControl</Text>
                            <Switch checked={esVentaRedMasiva} onChange={(e) => setEsVentaRedMasiva(e.currentTarget.checked)} color="blue" />
                        </Group>

                        {esVentaRedMasiva && (
                            <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light" mb="md">
                                <b>Importante:</b> Los animales se pondrán "EN TRÁNSITO". Si el comprador rechaza la transferencia, volverán a tu campo con el estado genérico "ACTIVO".
                            </Alert>
                        )}

                        <Text size="sm" fw={700} mb="xs">Detalles de la Venta</Text>
                        <Group grow align="flex-start">
                            <Select label="Modalidad" data={[{value: 'TOTAL', label: 'Monto Total'}, {value: 'CABEZA', label: 'Por Cabeza'}, {value: 'KILO', label: 'Al Peso (Por Kg)'}]} value={massModalidadVenta} onChange={(v) => setMassModalidadVenta(v || 'TOTAL')} allowDeselect={false} />
                            <TextInput label={massModalidadVenta === 'KILO' ? 'Precio por Kg ($)' : massModalidadVenta === 'CABEZA' ? 'Precio por Animal ($)' : 'Monto Total ($)'} placeholder="Ej: 1500000" type="number" leftSection={<IconCurrencyDollar size={14}/>} value={massPrecioVenta} onChange={(e) => setMassPrecioVenta(e.target.value)} />
                            {massModalidadVenta === 'KILO' && <TextInput label="Kilos Totales" placeholder="Ej: 4500" type="number" value={massKilosTotales} onChange={(e) => setMassKilosTotales(e.target.value)} />}
                        </Group>
                        <Group grow mt="sm">
                            {esVentaRedMasiva ? (
                                <TextInput label="RENSPA del Comprador" placeholder="Ej: 01.002.0.00000/00" required value={renspaDestinoMasiva} onChange={(e) => setRenspaDestinoMasiva(e.target.value)} />
                            ) : (
                                <TextInput label="Destino / Comprador" placeholder="Ej: Frigorífico Rioplatense" value={massDestino} onChange={(e) => setMassDestino(e.target.value)} />
                            )}
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
                    <Paper withBorder p="sm" mt="sm" bg="gray.0">
                        <Select label="Establecimiento de Destino" placeholder="Seleccionar nuevo campo (Propio)" data={establecimientos.filter((e: any) => e.id !== campoId).map((e: any) => ({ value: e.id, label: e.nombre }))} value={massEstablecimientoDestino} onChange={setMassEstablecimientoDestino} leftSection={<IconMapPin size={16}/>} required/>
                    </Paper>
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
            <Group mb="md" wrap="nowrap" gap="xs">
                <TextInput placeholder="Buscar caravana..." leftSection={<IconSearch size={14}/>} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{flex: 2}}/>
                <Select placeholder="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Ternera', 'Toro', 'Novillo']} value={filterCategoria} onChange={setFilterCategoria} clearable style={{flex: 1.5}}/>
                <Select placeholder="Sexo" data={[{value: 'M', label: 'M'}, {value: 'H', label: 'H'}]} value={filterSexo} onChange={setFilterSexo} clearable style={{width: 80, flexShrink: 0}}/>
                <Select placeholder="Potrero" data={potreros.map((p: any) => ({value: p.id, label: p.nombre}))} value={filterPotrero} onChange={setFilterPotrero} clearable leftSection={<IconMapPin size={14}/>} style={{flex: 1.5}}/>
                <Select placeholder="Lote" data={lotes.map((l: any) => ({value: l.id, label: l.nombre}))} value={filterLote} onChange={setFilterLote} clearable leftSection={<IconTag size={14}/>} style={{flex: 1.5}}/>
            </Group>
            <Paper withBorder radius="md" h={400} style={{ display: 'flex', flexDirection: 'column' }}>
                <ScrollArea style={{ flex: 1 }}>
                <Table stickyHeader>
                    <Table.Thead bg="gray.1"><Table.Tr><Table.Th w={50}>Check</Table.Th><Table.Th>Caravana</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Ubicación</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                        {animalesFiltrados.map((animal: any) => (
                            <Table.Tr key={animal.id} bg={selectedIds.includes(animal.id) ? 'violet.1' : undefined}>
                                <Table.Td><Checkbox checked={selectedIds.includes(animal.id)} onChange={() => toggleSeleccion(animal.id)} /></Table.Td>
                                <Table.Td><Text fw={700} ff={animal.caravana_electronica && animal.caravana === animal.caravana_electronica ? 'monospace' : undefined}>{animal.caravana_electronica && animal.caravana === animal.caravana_electronica ? `…${animal.caravana.slice(-4)}` : animal.caravana}</Text></Table.Td>
                                <Table.Td><Text fw={500}>{animal.categoria}</Text></Table.Td>
                                <Table.Td>
                                    <Group gap="xs" wrap="nowrap">
                                        {animal.en_transito ? (
                                            <Badge color="#795548" size="sm">EN TRÁNSITO</Badge>
                                        ) : (
                                            <>
                                                {animal.categoria === 'Ternero' && (<Badge color={animal.sexo === 'M' ? 'blue' : 'pink'} variant="light" size="sm">{animal.sexo === 'M' ? 'MACHO' : 'HEMBRA'}</Badge>)}
                                                {animal.categoria === 'Ternero' && animal.castrado ? (<Badge color="cyan" size="sm">CAPADO</Badge>) : null}
                                                {(animal.categoria !== 'Ternero' || animal.estado === 'LACTANTE') && <RenderEstadoBadge estado={animal.estado} />}
                                                {renderCondicionBadges(animal.condicion)}
                                            </>
                                        )}
                                    </Group>
                                </Table.Td>
                                <Table.Td>{getUbicacionCompleta(animal.potrero_id, animal.parcela_id)}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
                </ScrollArea>
            </Paper>
            {selectedIds.length > 0 && ( <Paper shadow="xl" p="md" radius="md" withBorder bg="gray.0" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, border: '2px solid #7950f2' }}><Group><Button size="lg" color="violet" loading={loading} onClick={prepararYConfirmar}>CONFIRMAR {massActividad}</Button></Group></Paper> )}

            <Modal opened={confirmOpened} onClose={closeConfirm} title="Confirmar acción" centered>
                <Stack>
                    {confirmWarn && (
                        <Alert color="orange" title="Atención" variant="light">
                            {confirmWarn}
                        </Alert>
                    )}
                    <Text size="sm">{confirmMsg}</Text>
                    <Group justify="flex-end" mt="sm">
                        <Button variant="default" onClick={closeConfirm} disabled={loading}>Cancelar</Button>
                        <Button color="violet" loading={loading} onClick={guardarEventoMasivo}>Confirmar</Button>
                    </Group>
                </Stack>
            </Modal>

            <ModalAltaDesdeBaston
                opened={modalAltaBastonOpen}
                onClose={() => setModalAltaBastonOpen(false)}
                caravanaElectronica={eidPendiente}
                campoId={campoId}
                animales={animales}
                datosSuscripcion={datosSuscripcion}
                onSuccess={(newAnimalId) => {
                    setSelectedIds(prev => [...prev, newAnimalId]);
                    fetchAnimales();
                    notifications.show({
                        title: 'Animal registrado',
                        message: 'El animal fue dado de alta y seleccionado automáticamente',
                        color: 'teal',
                        autoClose: 3000,
                    });
                }}
            />
        </>
    );
}