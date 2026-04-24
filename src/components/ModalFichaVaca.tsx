import { useState, useEffect } from 'react'; 
import { Modal, Tabs, Paper, Group, Text, TextInput, Select, Button, ActionIcon, ScrollArea, Table, Badge, Alert, Textarea, Switch, MultiSelect, ThemeIcon, UnstyledButton, Stack, SimpleGrid } from '@mantine/core'; 
import { IconArchive, IconCalendar, IconBabyCarriage, IconCurrencyDollar, IconTrendingUp, IconEdit, IconTrash, IconChartDots, IconInfoCircle, IconHeartbeat, IconScissors, IconCheck, IconTractor, IconSkull, IconArrowBackUp } from '@tabler/icons-react'; 
import { supabase } from '../supabase';

interface ModalFichaVacaProps { 
    opened: boolean; 
    onClose: () => void;
    animalSelId: string | null; 
    campoId: string | null; 
    animales: any[]; 
    potreros: any[];
    parcelas: any[]; 
    lotes: any[]; 
    establecimientos: any[]; 
    onUpdate: () => void; 
    abrirGraficoPeso: (id: string) => void; 
    iniciarEdicionEvento: (ev: any) => void; 
    setAnimalSelId: (id: string | null) => void; 
    datosSuscripcion: any; 
}

export default function ModalFichaVaca({ opened, onClose, animalSelId, campoId, animales, potreros, parcelas, lotes, establecimientos, onUpdate, abrirGraficoPeso, iniciarEdicionEvento, setAnimalSelId, datosSuscripcion }: ModalFichaVacaProps) {
    const [loading, setLoading] = useState(false);
    const [activeTabVaca, setActiveTabVaca] = useState<string | null>('historia'); 
    const [fichaAnterior, setFichaAnterior] = useState<any>(null); 
    
    const [eventosFicha, setEventosFicha] = useState<any[]>([]);
    const [ultimoPeso, setUltimoPeso] = useState<string>('Sin datos');
    const [madreCaravana, setMadreCaravana] = useState<string>(''); 
    const [hijos, setHijos] = useState<{ id: string, caravana: string, sexo: string, estado: string, ajeno?: boolean }[]>([]); 
    const [nombresTorosCartel, setNombresTorosCartel] = useState<string | null>(null);

    const [fechaEvento, setFechaEvento] = useState<Date | null>(new Date());
    const [tipoEventoInput, setTipoEventoInput] = useState<string | null>('PESAJE');
    const [resultadoInput, setResultadoInput] = useState('');
    const [detalleInput, setDetalleInput] = useState('');
    const [costoEvento, setCostoEvento] = useState<string | number>(''); 
    const [tactoResultado, setTactoResultado] = useState<string | null>('PREÑADA');
    const [mesesGestacion, setMesesGestacion] = useState<string | null>(null); 
    const [tipoServicio, setTipoServicio] = useState<string | null>('TORO');
    const [torosIdsInput, setTorosIdsInput] = useState<string[]>([]); 
    const [nuevoTerneroCaravana, setNuevoTerneroCaravana] = useState('');
    const [nuevoTerneroSexo, setNuevoTerneroSexo] = useState<string | null>('M');
    const [pesoNacimiento, setPesoNacimiento] = useState(''); 
    const [adpvCalculado, setAdpvCalculado] = useState<string | null>(null);

    const [editCaravana, setEditCaravana] = useState('');
    const [editCategoria, setEditCategoria] = useState<string | null>('');
    const [editSexo, setEditSexo] = useState<string | null>('');
    const [editEstado, setEditEstado] = useState<string | null>('');
    const [editLactancia, setEditLactancia] = useState(false); 
    const [editCondicion, setEditCondicion] = useState<string[]>([]); 
    const [editDetalles, setEditDetalles] = useState<string>('');
    const [editFechaNac, setEditFechaNac] = useState<string>('');
    const [editFechaIngreso, setEditFechaIngreso] = useState<string>('');
    const [editCastrado, setEditCastrado] = useState(false);
    const [editPotreroId, setEditPotreroId] = useState<string | null>(null);
    const [editParcelaId, setEditParcelaId] = useState<string | null>(null); 
    const [editLoteId, setEditLoteId] = useState<string | null>(null);

    const [modoBaja, setModoBaja] = useState<string | null>(null);
    const [bajaMotivo, setBajaMotivo] = useState('');
    const [bajaModalidadVenta, setBajaModalidadVenta] = useState<string>('TOTAL');
    const [bajaPrecio, setBajaPrecio] = useState<string | number>('');
    const [bajaKilosTotales, setBajaKilosTotales] = useState('');
    const [bajaGastosVenta, setBajaGastosVenta] = useState('');
    const [esVentaRed, setEsVentaRed] = useState(false);
    const [renspaDestino, setRenspaDestino] = useState('');

    const animalSel = animales.find(a => a.id === animalSelId) || null;
    const esActivo = animalSel?.estado !== 'VENDIDO' && animalSel?.estado !== 'MUERTO' && animalSel?.estado !== 'ELIMINADO' && animalSel?.en_transito === false;

    const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };
    const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };
    const opcionesGestacion = [ { value: '0.5', label: '15 días' }, { value: '1', label: '1 mes' }, { value: '2', label: '2 meses' }, { value: '3', label: '3 meses' }, { value: '4', label: '4 meses' }, { value: '5', label: '5 meses' }, { value: '6', label: '6 meses' }, { value: '7', label: '7 meses' }, { value: '8', label: '8 meses' }, { value: '9', label: '9 meses (A parir)' } ];
    
    useEffect(() => {
        if (opened && animalSel) {
            cargarDatosFicha();
        }
    }, [opened, animalSelId]);

    useEffect(() => { setResultadoInput(''); setTorosIdsInput([]); setNuevoTerneroCaravana(''); setPesoNacimiento(''); setCostoEvento(''); setAdpvCalculado(null); setMesesGestacion(null); }, [tipoEventoInput]);
    
    useEffect(() => {
        if (tipoEventoInput === 'PESAJE' && resultadoInput && eventosFicha.length > 0) {
            const ultimoPesaje = eventosFicha.find(e => e.tipo === 'PESAJE');
            if (ultimoPesaje && fechaEvento) {
                const pesoViejo = parseFloat(ultimoPesaje.resultado.replace(/[^0-9.]/g, ''));
                const pesoNuevo = parseFloat(resultadoInput.replace(/[^\d.-]/g, ''));
                if (!isNaN(pesoViejo) && !isNaN(pesoNuevo) && pesoNuevo > 0) {
                    const fechaVieja = new Date(ultimoPesaje.fecha_evento); const diffTime = Math.abs(fechaEvento.getTime() - fechaVieja.getTime()); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    if (diffDays > 0) { const ganancia = pesoNuevo - pesoViejo; const adpv = ganancia / diffDays; setAdpvCalculado(`${adpv.toFixed(3)} kg/día (${diffDays} días)`); }
                }
            }
        } else { setAdpvCalculado(null); }
    }, [resultadoInput, fechaEvento, eventosFicha]);

    async function cargarDatosFicha() {
        if (!animalSel) return;
        setEditCaravana(animalSel.caravana); setEditCategoria(animalSel.categoria); setEditSexo(animalSel.sexo); setEditCastrado(animalSel.castrado || false);
        let repro = 'ACTIVO'; if (animalSel.estado.includes('PREÑADA')) repro = 'PREÑADA'; else if (animalSel.estado.includes('VACÍA') || animalSel.estado === 'EN LACTANCIA') repro = 'VACÍA';
        setEditEstado(repro); setEditLactancia(animalSel.estado.includes('LACTANCIA'));
        setEditCondicion(animalSel.condicion && animalSel.condicion !== 'SANA' ? animalSel.condicion.split(', ') : []); setEditDetalles(animalSel.detalles || '');
        setEditPotreroId(animalSel.potrero_id || null); setEditParcelaId(animalSel.parcela_id || null); setEditLoteId(animalSel.lote_id || null); setEditFechaNac(animalSel.fecha_nacimiento || ''); setEditFechaIngreso(animalSel.fecha_ingreso || '');
        
        if (animalSel.madre_id) { 
            const m = animales.find(a => a.id === animalSel.madre_id); 
            if (m) { setMadreCaravana(m.caravana); } else { const { data } = await supabase.from('animales').select('caravana').eq('id', animalSel.madre_id).single(); setMadreCaravana(data ? `${data.caravana} (En otro campo)` : 'Desconocida'); }
        } else { setMadreCaravana(''); }

        const { data: dataHijos } = await supabase.from('animales').select('id, caravana, sexo, estado, establecimiento_id').eq('madre_id', animalSel.id).neq('estado', 'ELIMINADO'); 
        setHijos(dataHijos ? dataHijos.map((h: any) => ({ id: h.id, caravana: h.caravana, sexo: h.sexo, estado: h.estado, ajeno: h.establecimiento_id !== campoId })) : []);

        recargarEventos(animalSel.id);
        actualizarCartelToros(animalSel.id);
        const { data: pesoData } = await supabase.from('eventos').select('resultado').eq('animal_id', animalSel.id).eq('tipo', 'PESAJE').order('fecha_evento', { ascending: false }).limit(1);
        setUltimoPeso(pesoData && pesoData.length > 0 ? pesoData[0].resultado : '-');

        setFechaEvento(new Date()); setTipoEventoInput('PESAJE'); setModoBaja(null);
    }

    async function recargarEventos(id: string) { const { data } = await supabase.from('eventos').select('*').eq('animal_id', id).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false }); if (data) setEventosFicha(data); }
    async function actualizarCartelToros(idAnimal: string) {
        setNombresTorosCartel(null); const { data } = await supabase.from('animales').select('toros_servicio_ids').eq('id', idAnimal).single();
        if (data && data.toros_servicio_ids && data.toros_servicio_ids.length > 0) { const nombres = animales.filter(a => data.toros_servicio_ids!.includes(a.id)).map(a => a.caravana).join(' - '); setNombresTorosCartel(nombres || null); }
    }
    
    async function borrarEvento(id: string) { if(!confirm("¿Borrar evento?")) return; await supabase.from('eventos').delete().eq('id', id); if(animalSelId) recargarEventos(animalSelId); onUpdate(); }

    const navegarAHijo = async (hijoId: string) => {
        if(animalSel) setFichaAnterior(animalSel); 
        setAnimalSelId(hijoId);
        setActiveTabVaca('historia');
    };
    
    const handleCloseModalVaca = () => { 
        if (fichaAnterior) { setAnimalSelId(fichaAnterior.id); setActiveTabVaca('datos'); setFichaAnterior(null); } 
        else { onClose(); setAnimalSelId(null); } 
    };

    const desvincularToroDeVacas = async (toroId: string) => {
        const vacasAfectadas = animales.filter(a => a.toros_servicio_ids && a.toros_servicio_ids.includes(toroId));
        for (const vaca of vacasAfectadas) { 
            const nuevosIds = vaca.toros_servicio_ids!.filter((id: string) => id !== toroId); 
            await supabase.from('animales').update({ toros_servicio_ids: nuevosIds.length > 0 ? nuevosIds : null }).eq('id', vaca.id); 
        }
    };

    async function guardarEventoVaca() {
        if (!animalSel || !tipoEventoInput || !fechaEvento || !campoId) return alert("Faltan datos");

        if (tipoEventoInput === 'PARTO') {
            const animalesActivos = animales.filter(a => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO').length;
            if (datosSuscripcion && animalesActivos >= datosSuscripcion.limite_animales) {
                return alert(`Límite alcanzado (${datosSuscripcion.limite_animales} animales). No podés registrar nuevos nacimientos. Por favor, mejorá tu plan.`);
            }
        }

        setLoading(true); 
        let resultadoFinal = resultadoInput; 
        let datosExtra = null; 
        let nuevoEstado = ''; 
        let nuevasCondiciones = [...editCondicion]; 
        let esCastrado = editCastrado; 
        let torosToUpdate: string[] = [];
        let fechaServicioAActualizar: string | null | undefined = undefined; 
        
        if (tipoEventoInput === 'TACTO') { 
            resultadoFinal = tactoResultado || ''; 
            if (tactoResultado === 'PREÑADA') { 
                nuevoEstado = animalSel.estado.includes('LACTANCIA') ? 'PREÑADA Y LACTANDO' : 'PREÑADA'; 
                if (mesesGestacion) {
                    const diasGestacionActual = parseFloat(mesesGestacion) * 30.4; 
                    const diasFaltantes = Math.round(283 - diasGestacionActual); 
                    const fechaParto = new Date(fechaEvento); 
                    fechaParto.setDate(fechaParto.getDate() + diasFaltantes);
                    
                    await supabase.from('agenda').insert({ establecimiento_id: campoId, fecha_programada: fechaParto.toISOString().split('T')[0], titulo: `Parto: ${animalSel.caravana}`, descripcion: `Parto estimado calculado por tacto (${mesesGestacion} meses).`, tipo: 'PARTO_ESTIMADO', animal_id: animalSel.id });
                    onUpdate();

                    const fServ = new Date(fechaEvento);
                    fServ.setDate(fServ.getDate() - Math.round(diasGestacionActual));
                    fechaServicioAActualizar = fServ.toISOString().split('T')[0];
                }
            } else if (tactoResultado === 'VACÍA') { 
                nuevoEstado = animalSel.estado.includes('LACTANCIA') ? 'EN LACTANCIA' : 'VACÍA'; 
                fechaServicioAActualizar = null;
            }
        } 
        else if (tipoEventoInput === 'PARTO') {
          if (!nuevoTerneroCaravana) { setLoading(false); return alert("Falta caravana ternero."); }
          const yaExiste = animales.some(a => a.caravana.toLowerCase() === nuevoTerneroCaravana.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(a.estado));
          if (yaExiste) { setLoading(false); return alert("❌ ERROR: Ya existe un animal ACTIVO con esa caravana."); }
          if (pesoNacimiento) { const pesoNacNum = parseFloat(pesoNacimiento.replace(/[^\d.]/g, '')); if (isNaN(pesoNacNum) || pesoNacNum <= 0 || pesoNacimiento.includes('-')) { setLoading(false); return alert("❌ ERROR: Peso inválido."); } }
          
          const fechaParto = fechaEvento.toISOString().split('T')[0];
          const { data: nuevoTernero, error: err } = await supabase.from('animales').insert([{ caravana: nuevoTerneroCaravana, categoria: 'Ternero', sexo: nuevoTerneroSexo, estado: 'LACTANTE', condicion: 'SANA', origen: 'NACIDO', madre_id: animalSel.id, fecha_nacimiento: fechaParto, fecha_ingreso: fechaParto, establecimiento_id: campoId, potrero_id: animalSel.potrero_id, parcela_id: animalSel.parcela_id, lote_id: animalSel.lote_id, en_transito: false }]).select().single();
          if (err) { setLoading(false); return alert("Error: " + err.message); }
          if (pesoNacimiento) await supabase.from('eventos').insert({ animal_id: nuevoTernero.id, tipo: 'PESAJE', resultado: `${pesoNacimiento}kg`, detalle: 'Peso al nacer', fecha_evento: fechaEvento.toISOString(), establecimiento_id: campoId });
          
          nuevoEstado = 'EN LACTANCIA'; 
          fechaServicioAActualizar = null; 
          if (animalSel.categoria === 'Vaquillona') await supabase.from('animales').update({ categoria: 'Vaca' }).eq('id', animalSel.id);
          resultadoFinal = `Nació ${nuevoTerneroCaravana} (${nuevoTerneroSexo})`; datosExtra = { ternero_caravana: nuevoTerneroCaravana, ternero_sexo: nuevoTerneroSexo }; 
          if (nuevoTernero) setHijos(prev => [...prev, { id: nuevoTernero.id, caravana: nuevoTernero.caravana, sexo: nuevoTernero.sexo, estado: 'LACTANTE' }]);
        }
        else if (tipoEventoInput === 'DESTETE') {
            resultadoFinal = 'Destete realizado';
            if (animalSel.categoria === 'Ternero') {
                nuevoEstado = 'ACTIVO';
                if (animalSel.madre_id) {
                    const { data: madreData } = await supabase.from('animales').select('estado').eq('id', animalSel.madre_id).single();
                    const nuevoEstadoMadre = madreData?.estado.includes('PREÑADA') ? 'PREÑADA' : 'VACÍA';
                    await supabase.from('animales').update({ estado: nuevoEstadoMadre }).eq('id', animalSel.madre_id);
                    await supabase.from('eventos').insert({ animal_id: animalSel.madre_id, tipo: 'DESTETE', resultado: 'Cría destetada', detalle: `Ternero: ${animalSel.caravana}`, fecha_evento: fechaEvento.toISOString(), establecimiento_id: campoId });
                }
            } else if (['Vaca', 'Vaquillona'].includes(animalSel.categoria)) {
                nuevoEstado = animalSel.estado.includes('PREÑADA') ? 'PREÑADA' : 'VACÍA';
                const { data: crias } = await supabase.from('animales').select('id, caravana').eq('madre_id', animalSel.id).eq('estado', 'LACTANTE');
                if (crias && crias.length > 0) {
                    const criasIds = crias.map((c: any) => c.id);
                    await supabase.from('animales').update({ estado: 'ACTIVO' }).in('id', criasIds);
                    const eventosCrias = crias.map((c: any) => ({ animal_id: c.id, tipo: 'DESTETE', resultado: 'Destetado de madre', detalle: `Madre: ${animalSel.caravana}`, fecha_evento: fechaEvento.toISOString(), establecimiento_id: campoId }));
                    await supabase.from('eventos').insert(eventosCrias);
                }
            }
        }
        else if (tipoEventoInput === 'ENFERMEDAD') { if (!nuevasCondiciones.includes('ENFERMA')) nuevasCondiciones.push('ENFERMA'); }
        else if (tipoEventoInput === 'LESION') { if (!nuevasCondiciones.includes('LASTIMADA')) nuevasCondiciones.push('LASTIMADA'); }
        else if (tipoEventoInput === 'CURACION') { nuevasCondiciones = []; }
        else if (tipoEventoInput === 'CAPADO') { esCastrado = true; resultadoFinal = 'Realizado'; }
        else if (tipoEventoInput === 'TRATAMIENTO') { resultadoFinal = resultadoInput || 'Tratamiento aplicado'; }
        else if (tipoEventoInput === 'OTRO') { resultadoFinal = resultadoInput || detalleInput || 'Realizado'; }
        else if (tipoEventoInput === 'SERVICIO') { 
            fechaServicioAActualizar = fechaEvento.toISOString().split('T')[0];
            if (tipoServicio === 'TORO') {
                if (torosIdsInput.length === 0) { setLoading(false); return alert("Seleccioná al menos un toro"); }
                const nombres = animales.filter(a => torosIdsInput.includes(a.id)).map(a => a.caravana).join(', ');
                datosExtra = { toros_caravanas: nombres }; resultadoFinal = `Con: ${nombres}`; torosToUpdate = torosIdsInput;
            } else { resultadoFinal = 'IA'; }
        }
        else if (tipoEventoInput === 'APARTADO') { if(animalSel.categoria === 'Toro') { nuevoEstado = 'APARTADO'; await desvincularToroDeVacas(animalSel.id); } }
    
        if (tipoEventoInput === 'PESAJE') {
            const pesoNum = parseFloat(resultadoInput.replace(/[^\d.]/g, ''));
            if (isNaN(pesoNum) || pesoNum <= 0 || resultadoInput.includes('-')) { setLoading(false); return alert("❌ ERROR: Peso inválido."); }
        }
    
        const { error } = await supabase.from('eventos').insert([{ animal_id: animalSel.id, fecha_evento: fechaEvento.toISOString(), tipo: tipoEventoInput, resultado: resultadoFinal, detalle: detalleInput, datos_extra: datosExtra, costo: Number(costoEvento), establecimiento_id: campoId }]);
        
        if (Number(costoEvento) > 0) {
            await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: fechaEvento.toISOString().split('T')[0], tipo: 'EGRESO', categoria: 'Hacienda (Sanidad/Manejo)', detalle: `Costo ${tipoEventoInput} - Caravana ${animalSel.caravana}`, monto: Number(costoEvento) });
        }

        const stringCondicion = nuevasCondiciones.length > 0 ? nuevasCondiciones.join(', ') : 'SANA'; 
        const updates: any = { condicion: stringCondicion, castrado: esCastrado }; 
        if (nuevoEstado) updates.estado = nuevoEstado; 
        if (tipoEventoInput === 'SERVICIO' && tipoServicio === 'TORO') updates.toros_servicio_ids = torosIdsInput; 
        if (tipoEventoInput === 'PARTO') updates.toros_servicio_ids = null; 
        if (fechaServicioAActualizar !== undefined) updates.fecha_servicio = fechaServicioAActualizar;

        await supabase.from('animales').update(updates).eq('id', animalSel.id);
    
        if (torosToUpdate.length > 0) {
            await supabase.from('animales').update({ estado: 'EN SERVICIO' }).in('id', torosToUpdate);
            const torosEvents = torosToUpdate.map(toroId => ({ animal_id: toroId, fecha_evento: fechaEvento.toISOString(), tipo: 'SERVICIO', resultado: 'En servicio', detalle: `Asignado a vaca ${animalSel.caravana}`, establecimiento_id: campoId }));
            await supabase.from('eventos').insert(torosEvents);
        }
        setEditCondicion(nuevasCondiciones); setEditCastrado(esCastrado); if(nuevoEstado) setEditEstado(nuevoEstado.includes('PREÑADA') ? 'PREÑADA' : nuevoEstado.includes('VACÍA') || nuevoEstado.includes('LACTANCIA') ? 'VACÍA' : 'ACTIVO'); setEditLactancia(nuevoEstado.includes('LACTANCIA')); setLoading(false);
        if (!error) { recargarEventos(animalSel.id); if (tipoEventoInput === 'PESAJE') setUltimoPeso(resultadoFinal); setResultadoInput(''); setDetalleInput(''); setTorosIdsInput([]); setNuevoTerneroCaravana(''); setPesoNacimiento(''); setCostoEvento(''); setAdpvCalculado(null); setMesesGestacion(null); onUpdate(); actualizarCartelToros(animalSel.id); }
    }

    async function actualizarAnimal() {
        if (!animalSel || !campoId) return;
        let finalEstado = editEstado;
        if (['Vaca', 'Vaquillona'].includes(editCategoria || '')) { if (editLactancia) { finalEstado = editEstado === 'PREÑADA' ? 'PREÑADA Y LACTANDO' : 'EN LACTANCIA'; } }
        const condStr = editCondicion.length > 0 ? editCondicion.join(', ') : 'SANA';
        const eventosAInsertar = []; const fechaStr = new Date().toISOString();
    
        if (animalSel.potrero_id !== editPotreroId || animalSel.parcela_id !== editParcelaId) {
            const pNom = potreros.find(p => p.id === editPotreroId)?.nombre; const parcNom = parcelas.find(p => p.id === editParcelaId)?.nombre;
            const desc = editPotreroId ? `Asignado a: ${pNom} ${parcNom ? `(${parcNom})` : ''}` : 'Retirado de potrero';
            eventosAInsertar.push({ animal_id: animalSel.id, fecha_evento: fechaStr, tipo: 'MOVIMIENTO_POTRERO', resultado: 'MOVIDO DE POTRERO', detalle: desc, datos_extra: { potrero_destino: pNom, parcela_destino: parcNom, potrero_id: editPotreroId, parcela_id: editParcelaId }, establecimiento_id: campoId });
        }
        
        if (animalSel.lote_id !== editLoteId) {
            const lNom = lotes.find(l => l.id === editLoteId)?.nombre || 'Sin asignar'; 
            const lAnterior = lotes.find(l => l.id === animalSel.lote_id)?.nombre || 'Sin asignar';
            const desc = `Movido de: ${lAnterior} ➔ A: ${lNom}`;
            
            eventosAInsertar.push({ animal_id: animalSel.id, fecha_evento: fechaStr, tipo: 'CAMBIO_LOTE', resultado: 'CAMBIO DE LOTE', detalle: desc, datos_extra: { lote_origen: lAnterior, lote_destino: lNom, lote_id: editLoteId }, establecimiento_id: campoId });
        }
    
        const { error } = await supabase.from('animales').update({ caravana: editCaravana, categoria: editCategoria, sexo: editSexo, estado: finalEstado, condicion: condStr, castrado: editCastrado, detalles: editDetalles, potrero_id: editPotreroId, parcela_id: editParcelaId, lote_id: editLoteId, fecha_nacimiento: editFechaNac || null, fecha_ingreso: editFechaIngreso || null }).eq('id', animalSel.id);
        if (eventosAInsertar.length > 0) { await supabase.from('eventos').insert(eventosAInsertar); }
        if (!error) { alert("Datos actualizados"); onUpdate(); }
    }

    async function confirmarBaja() { 
        if (!animalSel || !modoBaja || !campoId) return; 

        if (modoBaja === 'VENDIDO') { if (!bajaPrecio) return alert("Ingresá el precio"); if (bajaModalidadVenta === 'KILO' && !bajaKilosTotales) return alert("Faltan los kilos totales"); }
        if (modoBaja === 'MUERTO' && !bajaMotivo) return alert("Ingresá la causa"); 
        if (!confirm(`¿Confirmar ${modoBaja === 'TRASLADO' ? 'traslado' : 'salida'}?`)) return; 
        
        setLoading(true); const fechaStr = new Date().toISOString();
  
        if (['Vaca', 'Vaquillona'].includes(animalSel.categoria) && animalSel.estado.includes('LACTANCIA')) {
            const { data: crias } = await supabase.from('animales').select('id, caravana').eq('madre_id', animalSel.id).eq('estado', 'LACTANTE');
            if (crias && crias.length > 0) {
                const criasIds = crias.map((c: any) => c.id);
                await supabase.from('animales').update({ estado: 'ACTIVO', madre_id: null }).in('id', criasIds);
                const eventosCrias = crias.map((c: any) => ({ animal_id: c.id, tipo: 'DESTETE', resultado: 'Destete automático', detalle: `Madre dada de baja (${animalSel.caravana})`, fecha_evento: fechaStr, establecimiento_id: campoId }));
                await supabase.from('eventos').insert(eventosCrias);
                const nuevoEstadoMadre = animalSel.estado.includes('PREÑADA') ? 'PREÑADA' : 'VACÍA';
                await supabase.from('animales').update({ estado: nuevoEstadoMadre }).eq('id', animalSel.id);
                animalSel.estado = nuevoEstadoMadre; 
            }
        } else if (animalSel.categoria === 'Ternero' && animalSel.estado === 'LACTANTE' && animalSel.madre_id) {
            const { data: madreData } = await supabase.from('animales').select('id, caravana, estado').eq('id', animalSel.madre_id).single();
            if (madreData && madreData.estado.includes('LACTANCIA')) {
                const nuevoEstadoMadre = madreData.estado.includes('PREÑADA') ? 'PREÑADA' : 'VACÍA';
                await supabase.from('animales').update({ estado: nuevoEstadoMadre }).eq('id', madreData.id);
                await supabase.from('eventos').insert({ animal_id: madreData.id, tipo: 'DESTETE', resultado: 'Destete automático', detalle: `Cría dada de baja (${animalSel.caravana})`, fecha_evento: fechaStr, establecimiento_id: campoId });
                await supabase.from('animales').update({ estado: 'ACTIVO', madre_id: null }).eq('id', animalSel.id);
                animalSel.estado = 'ACTIVO';
            }
        }
  
        if (modoBaja === 'TRASLADO') {
            if (!bajaMotivo) { setLoading(false); return alert("Seleccioná el destino"); }
            const nombreDestino = establecimientos.find(e => e.id === bajaMotivo)?.nombre; const nombreOrigen = establecimientos.find(e => e.id === campoId)?.nombre;
            const { data: destAnimals } = await supabase.from('animales').select('caravana').eq('establecimiento_id', bajaMotivo).in('estado', ['ACTIVO', 'PREÑADA', 'VACÍA', 'EN SERVICIO', 'APARTADO', 'EN LACTANCIA', 'LACTANTE', 'PREÑADA Y LACTANDO']);
            const destCaravanas = destAnimals?.map(a => a.caravana.toLowerCase()) || [];
            let nuevaCaravana = animalSel.caravana; if (destCaravanas.includes(nuevaCaravana.toLowerCase())) { nuevaCaravana = `${nuevaCaravana} (T)`; }

            await supabase.from('animales').update({ establecimiento_id: bajaMotivo, potrero_id: null, parcela_id: null, lote_id: null, caravana: nuevaCaravana, toros_servicio_ids: null, en_transito: false }).eq('id', animalSel.id);
            await supabase.from('eventos').insert({ animal_id: animalSel.id, tipo: 'TRASLADO_SALIDA', resultado: 'TRASLADO A OTRO CAMPO', detalle: `Destino: ${nombreDestino}`, datos_extra: { caravana_origen: animalSel.caravana }, establecimiento_id: campoId });
            await supabase.from('eventos').insert({ animal_id: animalSel.id, fecha_evento: fechaStr, tipo: 'TRASLADO_INGRESO', resultado: 'INGRESO POR TRASLADO', detalle: `Origen: ${nombreOrigen}`, establecimiento_id: bajaMotivo });
            await supabase.from('agenda').update({ establecimiento_id: bajaMotivo }).eq('animal_id', animalSel.id).eq('completado', false);
            
        } else if (modoBaja === 'VENDIDO') {
            const precioNum = Number(bajaPrecio); let totalIngreso = 0; if (bajaModalidadVenta === 'TOTAL') totalIngreso = precioNum; else if (bajaModalidadVenta === 'KILO') totalIngreso = precioNum * Number(bajaKilosTotales);
            const gastosTotales = Number(bajaGastosVenta) || 0;
  
            if (esVentaRed) {
                if (!renspaDestino) { setLoading(false); return alert("Ingresá el RENSPA."); }
                const { data, error: rpcErr } = await supabase.rpc('buscar_campo_por_renspa', { buscar_renspa: renspaDestino.trim() }).single();
                const dest = data as any; 

                if (rpcErr || !dest) { setLoading(false); return alert("No se encontró RENSPA."); }
                if (dest.id === campoId) { setLoading(false); return alert("No podés transferirte a vos mismo."); }
                const nombreOrigen = establecimientos.find(e => e.id === campoId)?.nombre || 'Campo Desconocido';
  
                const { error: errTransf } = await supabase.from('transferencias').insert({ campo_origen_id: campoId, campo_destino_id: dest.id, animales_ids: [animalSel.id], precio_total: totalIngreso, detalles: `Venta animal ${animalSel.caravana}`, origen_nombre: nombreOrigen, estado: 'PENDIENTE' });
                if (errTransf) { setLoading(false); return alert("Error al transferir: " + errTransf.message); }
  
                await supabase.from('animales').update({ en_transito: true, detalle_baja: `En tránsito a: ${dest.nombre}`, toros_servicio_ids: null }).eq('id', animalSel.id);
                await supabase.from('eventos').insert({ animal_id: animalSel.id, tipo: 'VENTA', resultado: 'VENDIDO', detalle: `En tránsito a: ${dest.nombre} - Total: $${totalIngreso}`, datos_extra: { destino: dest.nombre, modalidad: bajaModalidadVenta, ingreso_total: totalIngreso, gastos: gastosTotales, caravana_origen: animalSel.caravana }, establecimiento_id: campoId, costo: totalIngreso });
                if(animalSel.categoria === 'Toro') await desvincularToroDeVacas(animalSel.id);
            } else {
                if (!bajaMotivo) { setLoading(false); return alert("Seleccioná el destino"); }
                await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: fechaStr.split('T')[0], tipo: 'INGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Venta animal ${animalSel.caravana} - ${bajaMotivo || 'Individual'}`, monto: totalIngreso });
                
                if (gastosTotales > 0) {
                    await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: fechaStr.split('T')[0], tipo: 'EGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Gastos de venta animal ${animalSel.caravana}`, monto: gastosTotales });
                }

                await supabase.from('animales').update({ estado: 'VENDIDO', detalle_baja: `Venta: ${bajaMotivo || '-'} ($${totalIngreso})`, toros_servicio_ids: null, en_transito: false }).eq('id', animalSel.id);
                await supabase.from('eventos').insert({ animal_id: animalSel.id, tipo: 'VENTA', resultado: 'VENDIDO', detalle: `Destino: ${bajaMotivo} - Total: $${totalIngreso}`, datos_extra: { destino: bajaMotivo, modalidad: bajaModalidadVenta, ingreso_total: totalIngreso, gastos: gastosTotales, caravana_origen: animalSel.caravana }, establecimiento_id: campoId, costo: totalIngreso });
                await supabase.from('agenda').delete().eq('animal_id', animalSel.id).eq('completado', false);
                if(animalSel.categoria === 'Toro') await desvincularToroDeVacas(animalSel.id);
            }
        } else {
            if (!bajaMotivo) { setLoading(false); return alert("Ingresá la causa de muerte"); }
            await supabase.from('animales').update({ estado: 'MUERTO', detalle_baja: `Causa: ${bajaMotivo}`, toros_servicio_ids: null, en_transito: false }).eq('id', animalSel.id); 
            await supabase.from('eventos').insert([{ animal_id: animalSel.id, tipo: 'BAJA', resultado: 'MUERTO', detalle: `Causa: ${bajaMotivo}`, datos_extra: { causa: bajaMotivo }, establecimiento_id: campoId }]); 
            await supabase.from('agenda').delete().eq('animal_id', animalSel.id).eq('completado', false);
        }
        
        setLoading(false); setBajaKilosTotales(''); setBajaGastosVenta(''); setBajaModalidadVenta('TOTAL'); setEsVentaRed(false); setRenspaDestino(''); 
        onClose(); onUpdate();
    }

    async function restaurarAnimal() { 
        if (!animalSel || !confirm("¿Restaurar a Hacienda Activa?")) return; 
        if (animalSel.estado === 'VENDIDO') { await supabase.from('caja').delete().eq('establecimiento_id', campoId).eq('categoria', 'Hacienda (Venta/Compra)').like('detalle', `Venta animal ${animalSel.caravana} -%`); }
        await supabase.from('animales').update({ estado: 'ACTIVO', detalle_baja: null, en_transito: false }).eq('id', animalSel.id); 
        await supabase.from('eventos').insert([{ animal_id: animalSel.id, tipo: 'RESTAURACION', resultado: 'Reingreso', detalle: 'Restaurado', establecimiento_id: campoId! }]); 
        onClose(); onUpdate(); 
    }

    async function borrarAnimalDefinitivo() {
        if (!animalSel) return;
        const msg = "⚠️ ¿BORRAR DEFINITIVAMENTE?\n\nEl animal se ocultará de la lista de bajas para siempre.\n\nIMPORTANTE: Sus eventos pasados (pesajes, vacunas, partos) NO se borrarán para mantener la integridad de las estadísticas y los balances económicos del campo.\n\n¿Desea continuar?";
        if (!confirm(msg)) return;

        await supabase.from('animales').update({ estado: 'ELIMINADO' }).eq('id', animalSel.id);
        await supabase.from('eventos').insert({ 
            animal_id: animalSel.id, 
            fecha_evento: new Date().toISOString(), 
            tipo: 'BORRADO', 
            resultado: 'ELIMINADO DEL SISTEMA', 
            detalle: 'Ocultado por el usuario (Soft Delete)', 
            establecimiento_id: campoId 
        });
        onClose(); onUpdate();
    }

    const opcionesDisponibles = (() => { 
        if (!animalSel) return []; 
        const base = ['PESAJE', 'ENFERMEDAD', 'LESION', 'CURACION', 'TRATAMIENTO', 'VACUNACION', 'OTRO'];
        if (['Vaca', 'Vaquillona'].includes(animalSel.categoria)) return [...base, 'TACTO', 'SERVICIO', 'PARTO', 'DESTETE']; 
        if (animalSel.categoria === 'Ternero') return animalSel.sexo === 'M' ? [...base, 'CAPADO', 'DESTETE'] : [...base, 'DESTETE']; 
        if (animalSel.categoria === 'Toro') return [...base, 'RASPAJE', 'APARTADO']; 
        return base; 
    })();

    const torosDisponibles = animales.filter(a => a.categoria === 'Toro' && a.estado !== 'MUERTO' && a.estado !== 'VENDIDO');

    const RenderEstadoBadge = ({ estado }: { estado: string | undefined }) => {
        if (!estado) return null;
        if (estado === 'PREÑADA Y LACTANDO') return ( <Group gap={4} wrap="nowrap" style={{ display: 'inline-flex' }}> <Badge size="sm" color="teal">PREÑADA</Badge> <Badge size="sm" color="grape">LACTANCIA</Badge> </Group> );
        let color = 'blue'; if (estado === 'PREÑADA') color = 'teal'; else if (estado === 'VACÍA') color = 'yellow'; else if (estado === 'EN LACTANCIA') color = 'grape'; else if (estado === 'LACTANTE') color = 'cyan';
        return <Badge size="sm" color={color}>{estado === 'EN LACTANCIA' ? 'LACTANCIA' : estado}</Badge>;
    };
    
    // Nueva función para parsear la condición sanitaria
    const renderCondicionBadges = (condStr: string) => { 
        if (!condStr || condStr === 'SANA') return null; 
        return condStr.split(', ').map((c: any, i: number) => ( 
            <Badge key={i} color={c === 'ENFERMA' ? 'red' : 'grape'} variant="filled" size="sm">{c}</Badge> 
        )); 
    };

    if (!animalSel) return null;

    return (
        <Modal opened={opened} onClose={handleCloseModalVaca} title={<Group><Text fw={700} size="lg">Ficha: {animalSel?.caravana} {esActivo ? '' : animalSel?.en_transito ? '(EN TRÁNSITO)' : '(ARCHIVO)'}</Text> 
        <Group gap="xs" wrap="nowrap">
            {animalSel?.en_transito ? (
                <Badge color="#795548" size="sm">EN TRÁNSITO</Badge>
            ) : (
                <>
                    {animalSel?.categoria === 'Ternero' && (<Badge color={animalSel.sexo === 'M' ? 'blue' : 'pink'} variant="light" size="sm">{animalSel.sexo === 'M' ? 'MACHO' : 'HEMBRA'}</Badge>)}
                    {animalSel?.categoria === 'Ternero' && animalSel.castrado ? (<Badge color="cyan" size="sm">CAPADO</Badge>) : null}
                    {(animalSel?.categoria !== 'Ternero' || animalSel.estado === 'LACTANTE') && <RenderEstadoBadge estado={animalSel.estado} />}
                    {renderCondicionBadges(animalSel.condicion)}
                </>
            )}
        </Group>
        </Group>} size="lg" centered zIndex={2000}>
            <Tabs value={activeTabVaca} onChange={setActiveTabVaca} color="teal"><Tabs.List grow mb="md"><Tabs.Tab value="historia">Historia</Tabs.Tab><Tabs.Tab value="datos">Datos</Tabs.Tab></Tabs.List>
            <Tabs.Panel value="historia">
               {esActivo ? ( 
                   <Paper withBorder p="sm" bg="gray.0" mb="md">
                       <Text size="sm" fw={700} mb="xs">Registrar Evento</Text>
                       <Group grow mb="sm">
                           <TextInput leftSection={<IconCalendar size={16}/>} placeholder="Fecha" type="date" value={getLocalDateForInput(fechaEvento)} onChange={(e) => setFechaEvento(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} max={new Date().toISOString().split('T')[0]} style={{ flex: 1 }} />
                           <Select data={opcionesDisponibles} placeholder="Tipo" value={tipoEventoInput} onChange={setTipoEventoInput} comboboxProps={{ zIndex: 200005 }} />
                       </Group>
               
                       {/* FIX DEL SELECT Y EL SWITCH DEL TACTO EN MOBILE USANDO SIMPLEGRID */}
                       {tipoEventoInput === 'TACTO' && ( 
                           <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="sm">
                               <Select label="Resultado del Tacto" data={['PREÑADA', 'VACÍA']} value={tactoResultado} onChange={setTactoResultado} comboboxProps={{ zIndex: 200005 }}/> 
                               {tactoResultado === 'PREÑADA' && ( 
                                   <Select label="Gestación (Meses)" placeholder="Opcional" data={opcionesGestacion} value={mesesGestacion} onChange={setMesesGestacion} clearable leftSection={<IconBabyCarriage size={16}/>} comboboxProps={{ zIndex: 200005 }}/> 
                               )} 
                           </SimpleGrid> 
                       )}
               
                       {tipoEventoInput === 'SERVICIO' && ( <Group grow mb="sm" align="flex-end"><Select label="Tipo de Servicio" data={['TORO', 'IA']} value={tipoServicio} onChange={setTipoServicio} comboboxProps={{ zIndex: 200005 }}/ >{tipoServicio === 'TORO' && ( <MultiSelect label="Seleccionar Toro/s" data={torosDisponibles.map(t => ({value: t.id, label: t.caravana}))} value={torosIdsInput} onChange={setTorosIdsInput} searchable comboboxProps={{ zIndex: 200005 }} /> )}</Group> )}
                       {tipoEventoInput === 'PARTO' && ( <Paper withBorder p="xs" bg="teal.0" mb="sm"><Text size="sm" fw={700} c="teal">Datos del Nuevo Ternero</Text><Group grow><TextInput label="Caravana Ternero" placeholder="Nueva ID" value={nuevoTerneroCaravana} onChange={(e) => setNuevoTerneroCaravana(e.target.value)} required/><Select label="Sexo" data={['M', 'H']} value={nuevoTerneroSexo} onChange={setNuevoTerneroSexo} comboboxProps={{ zIndex: 200005 }}/></Group><TextInput mt="sm" label="Peso al Nacer (kg)" placeholder="Opcional" type="number" value={pesoNacimiento} onChange={(e) => setPesoNacimiento(e.target.value)}/></Paper> )}
                       {!['TACTO', 'SERVICIO', 'PARTO', 'ENFERMEDAD', 'LESION', 'CURACION', 'CAPADO', 'RASPAJE', 'APARTADO', 'DESTETE'].includes(tipoEventoInput || '') && ( <Group grow mb="sm"><TextInput placeholder="Resultado (Ej: 350kg, Observación...)" value={resultadoInput} onChange={(e) => setResultadoInput(e.target.value)} /></Group> )}
                       <TextInput label="Costo ($)" placeholder="Opcional" type="number" value={costoEvento} onChange={(e) => setCostoEvento(e.target.value)} leftSection={<IconCurrencyDollar size={14}/>} mb="sm"/>
                       {adpvCalculado && <Alert color="green" icon={<IconTrendingUp size={16}/>} title="Rendimiento Detectado" mb="sm">{adpvCalculado}</Alert>}
                       <Group grow align="flex-start">
                           <Textarea placeholder="Detalles / Observaciones..." rows={2} value={detalleInput} onChange={(e) => setDetalleInput(e.target.value)} style={{flex: 1}}/>
                           <Button size="md" onClick={guardarEventoVaca} color="teal" loading={loading} style={{ maxWidth: 120 }}>Guardar</Button>
                       </Group>
                   </Paper> 
               ) : ( 
                   <Alert color="gray" icon={<IconArchive size={16}/>} mb="md">Este animal está {animalSel?.en_transito ? 'en tránsito (bloqueado)' : 'archivado'}. Solo lectura.</Alert> 
               )}
               <ScrollArea h={300}><Table striped><Table.Tbody>{eventosFicha.map(ev => (<Table.Tr key={ev.id}><Table.Td><Text size="xs">{formatDate(ev.fecha_evento)}</Text></Table.Td><Table.Td><Text fw={700} size="sm">{ev.tipo}</Text></Table.Td><Table.Td><Text size="sm" fw={500}>{ev.resultado}</Text>{ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}{ev.datos_extra && ev.datos_extra.toros_caravanas && <Badge size="xs" color="pink" variant="outline" ml="xs">Toro/s: {ev.datos_extra.toros_caravanas}</Badge>}{ev.datos_extra && ev.datos_extra.precio_kg && <Badge size="xs" color="green" variant="outline" ml="xs">${ev.datos_extra.precio_kg}</Badge>}</Table.Td><Table.Td><Text size="xs" c="dimmed">${ev.costo || 0}</Text></Table.Td><Table.Td align="right"><ActionIcon size="sm" variant="subtle" color="blue" onClick={() => iniciarEdicionEvento(ev)}><IconEdit size={14}/></ActionIcon><ActionIcon size="sm" variant="subtle" color="red" onClick={() => borrarEvento(ev.id)}><IconTrash size={14}/></ActionIcon></Table.Td></Table.Tr>))}</Table.Tbody></Table></ScrollArea>
            </Tabs.Panel>
            <Tabs.Panel value="datos">
               <Paper withBorder p="sm" bg="gray.1" mb="md" radius="md"><Group justify="space-between"><Text size="sm" fw={700} c="dimmed">ÚLTIMO PESO:</Text><UnstyledButton onClick={() => abrirGraficoPeso(animalSel.id)}><Badge size="lg" variant="filled" color="blue" leftSection={<IconChartDots size={14}/>} style={{cursor: 'pointer'}}>{ultimoPeso}</Badge></UnstyledButton></Group></Paper>
               <TextInput label="Caravana" value={editCaravana} onChange={(e) => setEditCaravana(e.target.value)} mb="sm" disabled={!esActivo} />
               
               <Group grow mb="sm">
                   <Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={editCategoria} onChange={setEditCategoria} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} />
                   {['Vaca', 'Vaquillona'].includes(editCategoria || '') && ( <Select label="Estado Reproductivo" data={['ACTIVO', 'PREÑADA', 'VACÍA']} value={editEstado} onChange={setEditEstado} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} /> )}
               </Group>

               {['Vaca', 'Vaquillona'].includes(editCategoria || '') && ( <Switch mb="sm" size="md" onLabel="EN LACTANCIA" offLabel="SIN CRÍA" label="¿Está criando a un ternero?" checked={editLactancia} onChange={(e) => setEditLactancia(e.currentTarget.checked)} disabled={!esActivo} color="grape" /> )}
               
               <Group grow mb="sm">
                   <Select label="Potrero (Ubicación)" placeholder="Sin asignar" data={potreros.map(p => ({value: p.id, label: p.nombre}))} value={editPotreroId} onChange={(val) => { setEditPotreroId(val); setEditParcelaId(null); }} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} />
                   {editPotreroId && <Select label="Parcela" placeholder="General" data={parcelas.filter(p => p.potrero_id === editPotreroId).map(p => ({value: p.id, label: p.nombre}))} value={editParcelaId} onChange={setEditParcelaId} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} />}
               </Group>
               <Select label="Lote (Grupo)" placeholder="Sin asignar" data={lotes.map(l => ({value: l.id, label: l.nombre}))} value={editLoteId} onChange={setEditLoteId} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} mb="sm" />
               
               {['Ternero', 'Novillo'].includes(editCategoria || '') && ( <TextInput label="Caravana Madre" value={madreCaravana} readOnly mb="sm" rightSection={<IconBabyCarriage size={16}/>} /> )}
               {nombresTorosCartel && ( <Paper withBorder p="xs" bg="pink.0" radius="md" mb="sm" style={{ borderLeft: '4px solid #fa5252' }}><Group gap="xs"><ThemeIcon color="pink" variant="light" size="sm"><IconInfoCircle size={14}/></ThemeIcon><Text size="sm" c="pink.9">En servicio con Toro/s: <Text span fw={700}>{nombresTorosCartel}</Text></Text></Group></Paper> )}
               {['Vaca'].includes(editCategoria || '') && ( 
                   <Paper withBorder p="xs" mb="sm" bg="teal.0">
                       <Text size="xs" fw={700} c="teal">HIJOS REGISTRADOS:</Text>
                       {hijos.length > 0 ? ( 
                           <Group gap="xs" mt={5}>
                               {hijos.map(h => { 
                                   const isGone = ['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(h.estado); 
                                   return (
                                       <Badge key={h.id} variant={(isGone || h.ajeno) ? 'light' : 'white'} style={{ cursor: h.ajeno ? 'default' : 'pointer', opacity: (isGone || h.ajeno) ? 0.6 : 1 }} color={h.ajeno ? 'gray' : (h.sexo === 'H' ? 'pink' : 'blue')} onClick={() => !h.ajeno && navegarAHijo(h.id)}>
                                           {h.caravana} {h.ajeno && '(En otro campo)'}
                                       </Badge>
                                   )
                               })}
                           </Group> 
                       ) : <Text size="xs" c="dimmed">Sin registros</Text>}
                   </Paper> 
               )}
               <MultiSelect label="Condición Sanitaria" data={['ENFERMA', 'LASTIMADA']} value={editCondicion} onChange={setEditCondicion} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} leftSection={<IconHeartbeat size={16}/>} mb="sm" placeholder="SANA"/>
               {editCategoria === 'Ternero' && editSexo === 'M' && ( <Group justify="space-between" mb="sm" p="xs" bg="gray.0" style={{borderRadius: 8}}><Group gap="xs"><IconScissors size={18}/> <Text size="sm" fw={500}>Condición Sexual</Text></Group><Switch size="lg" onLabel="CAPADO" offLabel="ENTERO" checked={editCastrado} onChange={(e) => setEditCastrado(e.currentTarget.checked)} disabled={!esActivo} /></Group> )}
               <Textarea label="Detalles / Anotaciones" placeholder="Información adicional..." value={editDetalles} onChange={(e) => setEditDetalles(e.target.value)} disabled={!esActivo} minRows={3} mb="sm" />
               <Group grow mb="xl"><TextInput label="Fecha Nacimiento" type="date" value={editFechaNac} onChange={(e) => setEditFechaNac(e.target.value)} disabled={!esActivo} /><TextInput label="Fecha Ingreso" type="date" value={editFechaIngreso} onChange={(e) => setEditFechaIngreso(e.target.value)} disabled={!esActivo} /></Group>
               
               {esActivo ? ( 
                   <>
                       {!modoBaja ? ( 
                           <>
                               <Button fullWidth variant="outline" leftSection={<IconCheck size={16}/>} onClick={actualizarAnimal} mb="xl">Guardar Cambios</Button>
                               <Text size="sm" fw={700} c="red.6" mb="xs">Operaciones Especiales</Text>
                               <Group grow>
                                   <Button color="orange" onClick={() => setModoBaja('VENDIDO')} leftSection={<IconCurrencyDollar size={16}/>}>Vender</Button>
                                   <Button color="blue" onClick={() => { setModoBaja('TRASLADO'); setBajaMotivo(''); }} leftSection={<IconTractor size={16}/>}>Trasladar</Button>
                                   <Button color="red" onClick={() => setModoBaja('MUERTO')} leftSection={<IconSkull size={16}/>}>Muerte</Button>
                               </Group>
                               <Button fullWidth variant="subtle" color="gray" mt="xs" leftSection={<IconTrash size={16}/>} onClick={borrarAnimalDefinitivo}>Borrar definitivamente</Button>
                           </> 
                       ) : ( 
                           <Paper withBorder p="sm" bg={modoBaja === 'VENDIDO' ? 'orange.0' : modoBaja === 'TRASLADO' ? 'blue.0' : 'red.0'}>
                               <Group justify="space-between" mb="sm">
                                   <Text fw={700} c={modoBaja === 'VENDIDO' ? 'orange.9' : modoBaja === 'TRASLADO' ? 'blue.9' : 'red.9'}>CONFIRMAR: {modoBaja}</Text>
                                   <ActionIcon variant="subtle" color="gray" onClick={() => setModoBaja(null)}><IconArrowBackUp size={16}/></ActionIcon>
                               </Group>
                               {modoBaja === 'VENDIDO' && ( 
                                   <Stack gap="xs" mb="sm">
                                       <Group justify="space-between" p="xs" bg="blue.0" style={{ borderRadius: 8, border: '1px solid #74c0fc' }}>
                                           <Text size="sm" fw={600} c="blue.9">Vender a usuario de RodeoControl</Text>
                                           <Switch checked={esVentaRed} onChange={(e) => setEsVentaRed(e.currentTarget.checked)} color="blue" />
                                       </Group>

                                       {esVentaRed && (
                                            <Alert icon={<IconInfoCircle size="1rem" />} color="blue" variant="light">
                                                <b>Importante:</b> El animal se pondrá "EN TRÁNSITO". Si el comprador rechaza la transferencia, volverá a tu campo con el estado genérico "ACTIVO".
                                            </Alert>
                                        )}

                                       {esVentaRed && ( <TextInput label="RENSPA del Comprador" placeholder="Ej: 01.002.0.00000/00" required value={renspaDestino} onChange={(e) => setRenspaDestino(e.target.value)} /> )}
                                       
                                       <Group grow align="flex-start">
                                           <Select label="Modalidad" data={[{value: 'TOTAL', label: 'Monto Total'}, {value: 'KILO', label: 'Al Peso (Por Kg)'}]} value={bajaModalidadVenta} onChange={(v) => setBajaModalidadVenta(v || 'TOTAL')} allowDeselect={false} comboboxProps={{ withinPortal: true, zIndex: 999999 }} />
                                           <TextInput label={bajaModalidadVenta === 'KILO' ? 'Precio por Kg ($)' : 'Monto Total ($)'} placeholder="Ej: 1500000" type="number" leftSection={<IconCurrencyDollar size={14}/>} value={bajaPrecio} onChange={(e) => setBajaPrecio(e.target.value)} />
                                       </Group>
                                       {bajaModalidadVenta === 'KILO' && <TextInput label="Kilos Totales" placeholder="Ej: 450" type="number" value={bajaKilosTotales} onChange={(e) => setBajaKilosTotales(e.target.value)} />}
                                       {!esVentaRed && (
                                           <Group grow>
                                               <TextInput label="Destino / Comprador" placeholder="Ej: Frigorífico" value={bajaMotivo} onChange={(e) => setBajaMotivo(e.target.value)} />
                                               <TextInput label="Gastos de Venta ($)" placeholder="Flete, etc." type="number" leftSection={<IconCurrencyDollar size={14}/>} value={bajaGastosVenta} onChange={(e) => setBajaGastosVenta(e.target.value)} />
                                           </Group>
                                       )}
                                   </Stack> 
                               )}
                               {modoBaja === 'MUERTO' && ( <TextInput label="Causa" placeholder="Ej: Accidente" value={bajaMotivo} onChange={(e) => setBajaMotivo(e.target.value)} mb="sm"/> )}
                               {modoBaja === 'TRASLADO' && ( 
                                   <Stack gap="xs" mb="sm">
                                       <Select label="Campo Destino" placeholder="Seleccionar establecimiento" data={establecimientos.filter(e => e.id !== campoId).map(e => ({ value: e.id, label: e.nombre }))} value={bajaMotivo} onChange={(v) => setBajaMotivo(v || '')} mb="sm" comboboxProps={{ withinPortal: true, zIndex: 999999 }} />
                                   </Stack> 
                               )}
                               <Button fullWidth color={modoBaja === 'VENDIDO' ? 'orange' : modoBaja === 'TRASLADO' ? 'blue' : 'red'} onClick={confirmarBaja} loading={loading}>Confirmar Acción</Button>
                           </Paper> 
                       )}
                   </> 
               ) : ( <Paper p="md" bg="gray.1" ta="center"><Text c="dimmed" size="sm" mb="md">Este animal se encuentra {animalSel?.en_transito ? 'en tránsito hacia el comprador' : 'archivado'}.</Text>{!animalSel?.en_transito && <Button fullWidth variant="outline" color="blue" leftSection={<IconArrowBackUp/>} onClick={restaurarAnimal}>Restaurar a Hacienda Activa</Button>}</Paper> )}
            </Tabs.Panel>
        </Tabs>
    </Modal>
    );
}