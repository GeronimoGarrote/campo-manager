import { useState, useEffect, useRef } from 'react';
import { Modal, Tabs, Paper, Group, Text, TextInput, Select, Button, ActionIcon, ScrollArea, Table, Badge, Alert, Textarea, Switch, MultiSelect, ThemeIcon, UnstyledButton, Stack, SimpleGrid } from '@mantine/core'; 
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconArchive, IconCalendar, IconBabyCarriage, IconCurrencyDollar, IconTrendingUp, IconEdit, IconTrash, IconChartDots, IconInfoCircle, IconHeartbeat, IconScissors, IconCheck, IconTractor, IconSkull, IconArrowBackUp, IconScan } from '@tabler/icons-react';
import { supabase } from '../supabase';

// Cache de sesión: persiste entre fichas mientras la app esté abierta
let ultimoEventoCache: {
    tipo: string;
    resultado: string;
    detalle: string;
    costo: string | number;
    tactoResultado: string | null;
    tipoServicio: string | null;
    torosIdsInput: string[];
} | null = null;

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
    setAnimalSelId: (id: string | null) => void;
    datosSuscripcion: any;
    rolActual?: 'DUENO' | 'PEON' | 'VETERINARIO';
}

export default function ModalFichaVaca({ opened, onClose, animalSelId, campoId, animales, potreros, parcelas, lotes, establecimientos, onUpdate, abrirGraficoPeso, setAnimalSelId, datosSuscripcion, rolActual = 'DUENO' }: ModalFichaVacaProps) {
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
    const [editPelaje, setEditPelaje] = useState<string | null>(null);

    const [modoBaja, setModoBaja] = useState<string | null>(null);
    const [bajaMotivo, setBajaMotivo] = useState('');
    const [bajaModalidadVenta, setBajaModalidadVenta] = useState<string>('TOTAL');
    const [bajaPrecio, setBajaPrecio] = useState<string | number>('');
    const [bajaKilosTotales, setBajaKilosTotales] = useState('');
    const [bajaGastosVenta, setBajaGastosVenta] = useState('');
    const [esVentaRed, setEsVentaRed] = useState(false);
    const [renspaDestino, setRenspaDestino] = useState('');

    const cacheToApply = useRef<typeof ultimoEventoCache>(null);

    const [confirmBajaOpen, { open: openConfirmBaja, close: closeConfirmBaja }] = useDisclosure(false);
    const [confirmBorrarOpen, { open: openConfirmBorrar, close: closeConfirmBorrar }] = useDisclosure(false);
    const [confirmModal, setConfirmModal] = useState<{ mensaje: string; onConfirm: () => void; color?: string } | null>(null);

    // --- ESTADOS PARA EDICIÓN DE EVENTOS ---
    const [modalEditOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
    const [editEvId, setEditEvId] = useState<string | null>(null);
    const [editEvFecha, setEditEvFecha] = useState<Date | null>(new Date());
    const [editEvRes, setEditEvRes] = useState('');
    const [editEvDet, setEditEvDet] = useState('');

    const animalSel = animales.find(a => a.id === animalSelId) || null;
    const esActivo = animalSel?.estado !== 'VENDIDO' && animalSel?.estado !== 'MUERTO' && animalSel?.estado !== 'ELIMINADO' && animalSel?.en_transito === false;

    const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`; };
    const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };
    const opcionesGestacion = [ { value: '0.5', label: '15 días' }, { value: '1', label: '1 mes' }, { value: '2', label: '2 meses' }, { value: '3', label: '3 meses' }, { value: '4', label: '4 meses' }, { value: '5', label: '5 meses' }, { value: '6', label: '6 meses' }, { value: '7', label: '7 meses' }, { value: '8', label: '8 meses' }, { value: '9', label: '9 meses (A parir)' } ];
    
    useEffect(() => {
        if (opened && animalSel) {
            cargarDatosFicha();
        }
    }, [opened, animalSelId, animalSel?.caravana]);

    useEffect(() => {
        const cache = cacheToApply.current;
        if (cache) {
            cacheToApply.current = null;
            setResultadoInput(cache.resultado);
            setDetalleInput(cache.detalle);
            setCostoEvento(cache.costo);
            setTactoResultado(cache.tactoResultado || 'PREÑADA');
            setTipoServicio(cache.tipoServicio || 'TORO');
            setTorosIdsInput(cache.torosIdsInput);
            setNuevoTerneroCaravana('');
            setPesoNacimiento('');
            setAdpvCalculado(null);
            setMesesGestacion(null);
        } else {
            setResultadoInput('');
            setTorosIdsInput([]);
            setNuevoTerneroCaravana('');
            setPesoNacimiento('');
            setCostoEvento('');
            setAdpvCalculado(null);
            setMesesGestacion(null);
        }
    }, [tipoEventoInput]);
    
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
        setEditPotreroId(animalSel.potrero_id || null); setEditParcelaId(animalSel.parcela_id || null); setEditLoteId(animalSel.lote_id || null); setEditPelaje(animalSel.pelaje || null); setEditFechaNac(animalSel.fecha_nacimiento || ''); setEditFechaIngreso(animalSel.fecha_ingreso || '');
        
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

        setFechaEvento(new Date()); setModoBaja(null);
        const tipoOpciones = (() => {
            const base = ['PESAJE', 'ENFERMEDAD', 'LESION', 'CURACION', 'TRATAMIENTO', 'VACUNACION', 'OTRO'];
            if (['Vaca', 'Vaquillona'].includes(animalSel.categoria)) return [...base, 'TACTO', 'SERVICIO', 'PARTO', 'DESTETE'];
            if (animalSel.categoria === 'Ternero') return animalSel.sexo === 'M' ? [...base, 'CAPADO', 'DESTETE'] : [...base, 'DESTETE'];
            if (animalSel.categoria === 'Toro') return [...base, 'RASPAJE', 'APARTADO'];
            return base;
        })();
        const cache = ultimoEventoCache;
        const tipoAplicar = (cache && tipoOpciones.includes(cache.tipo)) ? cache.tipo : 'PESAJE';
        if (cache && tipoOpciones.includes(cache.tipo)) {
            if (tipoAplicar !== tipoEventoInput) {
                cacheToApply.current = cache;
            } else {
                // tipo no cambia → el effect no dispara → aplicar manualmente
                setResultadoInput(cache.resultado);
                setDetalleInput(cache.detalle);
                setCostoEvento(cache.costo);
                setTactoResultado(cache.tactoResultado || 'PREÑADA');
                setTipoServicio(cache.tipoServicio || 'TORO');
                setTorosIdsInput(cache.torosIdsInput);
                setNuevoTerneroCaravana('');
                setPesoNacimiento('');
                setAdpvCalculado(null);
                setMesesGestacion(null);
            }
        } else {
            setDetalleInput('');
            if (tipoAplicar === tipoEventoInput) {
                setResultadoInput('');
                setCostoEvento('');
                setTorosIdsInput([]);
                setNuevoTerneroCaravana('');
                setPesoNacimiento('');
                setAdpvCalculado(null);
                setMesesGestacion(null);
            }
        }
        setTipoEventoInput(tipoAplicar);
    }

    async function recargarEventos(id: string) { const { data } = await supabase.from('eventos').select('*').eq('animal_id', id).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false }); if (data) setEventosFicha(data); }
    async function actualizarCartelToros(idAnimal: string) {
        setNombresTorosCartel(null); const { data } = await supabase.from('animales').select('toros_servicio_ids').eq('id', idAnimal).single();
        if (data && data.toros_servicio_ids && data.toros_servicio_ids.length > 0) { const nombres = animales.filter(a => data.toros_servicio_ids!.includes(a.id)).map(a => a.caravana).join(' - '); setNombresTorosCartel(nombres || null); }
    }
    
    function borrarEvento(ev: { id: string; tipo: string; costo?: number }) {
        setConfirmModal({
            mensaje: '¿Borrar este evento del historial?',
            color: 'red',
            onConfirm: async () => {
                await supabase.from('eventos').delete().eq('id', ev.id);
                if (animalSelId) recargarEventos(animalSelId);
                onUpdate();
            },
        });
    }

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

    // --- NUEVA LÓGICA DE EDICIÓN LOCAL ---
    function handleIniciarEdicionEvento(ev: any) {
        setEditEvId(ev.id); 
        const partes = ev.fecha_evento.split('T')[0].split('-'); 
        setEditEvFecha(new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0)); 
        setEditEvRes(ev.resultado); 
        setEditEvDet(ev.detalle || ''); 
        openEdit(); 
    }

    async function handleGuardarEdicionEvento() { 
        if(!editEvId || !editEvFecha) return; 
        await supabase.from('eventos').update({ fecha_evento: editEvFecha.toISOString(), resultado: editEvRes, detalle: editEvDet }).eq('id', editEvId); 
        closeEdit(); 
        if(animalSelId) recargarEventos(animalSelId); 
        onUpdate(); 
    }
    // ------------------------------------

    async function guardarEventoVaca() {
        if (!animalSel || !tipoEventoInput || !fechaEvento || !campoId) { notifications.show({ title: 'Datos incompletos', message: 'Completá todos los campos del evento.', color: 'red' }); return; }

        if (tipoEventoInput === 'PARTO') {
            const animalesActivos = animales.filter(a => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO').length;
            if (datosSuscripcion && animalesActivos >= datosSuscripcion.limite_animales) {
                notifications.show({ title: 'Límite alcanzado', message: `Tu plan permite hasta ${datosSuscripcion.limite_animales} animales. No podés registrar nuevos nacimientos.`, color: 'red' }); return;
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
          const scRegex = /^SC-(\d+)$/i;
          const scNums = animales.map(a => { const m = String(a.caravana).match(scRegex); return m ? parseInt(m[1]) : 0; }).filter(v => v > 0);
          const scMax = scNums.length > 0 ? Math.max(...scNums) : 0;
          const caravanaFinalTernero = nuevoTerneroCaravana.trim() || `SC-${String(scMax + 1).padStart(3, '0')}`;
          if (nuevoTerneroCaravana.trim()) {
            const yaExiste = animales.some(a => a.caravana.toLowerCase() === caravanaFinalTernero.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(a.estado));
            if (yaExiste) { setLoading(false); notifications.show({ title: 'Caravana duplicada', message: 'Ya existe un animal activo con esa caravana.', color: 'red' }); return; }
          }
          if (pesoNacimiento) { const pesoNacNum = parseFloat(pesoNacimiento.replace(/[^\d.]/g, '')); if (isNaN(pesoNacNum) || pesoNacNum <= 0 || pesoNacimiento.includes('-')) { setLoading(false); notifications.show({ title: 'Peso inválido', message: 'El peso al nacer debe ser un número positivo.', color: 'red' }); return; } }

          const fechaParto = fechaEvento.toISOString().split('T')[0];
          const { data: nuevoTernero, error: err } = await supabase.from('animales').insert([{ caravana: caravanaFinalTernero, categoria: nuevoTerneroSexo === 'H' ? 'Ternera' : 'Ternero', sexo: nuevoTerneroSexo, estado: 'LACTANTE', condicion: 'SANA', origen: 'NACIDO', madre_id: animalSel.id, fecha_nacimiento: fechaParto, fecha_ingreso: fechaParto, establecimiento_id: campoId, potrero_id: animalSel.potrero_id, parcela_id: animalSel.parcela_id, lote_id: animalSel.lote_id, en_transito: false }]).select().single();
          if (err) { setLoading(false); notifications.show({ title: 'Error', message: err.message, color: 'red' }); return; }
          if (pesoNacimiento) await supabase.from('eventos').insert({ animal_id: nuevoTernero.id, tipo: 'PESAJE', resultado: `${pesoNacimiento}kg`, detalle: 'Peso al nacer', fecha_evento: fechaEvento.toISOString(), establecimiento_id: campoId });

          nuevoEstado = 'EN LACTANCIA';
          fechaServicioAActualizar = null;
          if (animalSel.categoria === 'Vaquillona') await supabase.from('animales').update({ categoria: 'Vaca' }).eq('id', animalSel.id);
          const sexoLabel = nuevoTerneroSexo === 'M' ? 'Macho' : nuevoTerneroSexo === 'H' ? 'Hembra' : 'Sexo no definido';
          resultadoFinal = `Nació ${caravanaFinalTernero} (${sexoLabel})`; datosExtra = { ternero_caravana: caravanaFinalTernero, ternero_sexo: nuevoTerneroSexo };
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
                if (torosIdsInput.length === 0) { setLoading(false); notifications.show({ title: 'Toro requerido', message: 'Seleccioná al menos un toro para el servicio.', color: 'orange' }); return; }
                const nombres = animales.filter(a => torosIdsInput.includes(a.id)).map(a => a.caravana).join(', ');
                datosExtra = { toros_caravanas: nombres }; resultadoFinal = `Con: ${nombres}`; torosToUpdate = torosIdsInput;
            } else { resultadoFinal = 'IA'; }
        }
        else if (tipoEventoInput === 'APARTADO') { if(animalSel.categoria === 'Toro') { nuevoEstado = 'APARTADO'; await desvincularToroDeVacas(animalSel.id); } }
    
        if (tipoEventoInput === 'PESAJE') {
            const pesoNum = parseFloat(resultadoInput.replace(/[^\d.]/g, ''));
            if (isNaN(pesoNum) || pesoNum <= 0 || resultadoInput.includes('-')) { setLoading(false); notifications.show({ title: 'Peso inválido', message: 'Ingresá un valor de peso positivo.', color: 'red' }); return; }
        }
    
        const { data: eventoData, error } = await supabase.from('eventos').insert([{ animal_id: animalSel.id, fecha_evento: fechaEvento.toISOString(), tipo: tipoEventoInput, resultado: resultadoFinal, detalle: detalleInput, datos_extra: { ...(datosExtra || {}), lote_id_en_momento: animalSel.lote_id ?? null, lote_nombre_en_momento: animalSel.lote_id ? (lotes.find((l: any) => l.id === animalSel.lote_id)?.nombre ?? null) : null }, costo: Number(costoEvento), establecimiento_id: campoId }]).select('id').single();

        if (Number(costoEvento) > 0 && eventoData) {
            await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: fechaEvento.toISOString().split('T')[0], tipo: 'EGRESO', categoria: 'Hacienda (Sanidad/Manejo)', detalle: `Costo ${tipoEventoInput} - Caravana ${animalSel.caravana}`, monto: Number(costoEvento), evento_id: eventoData.id });
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
        if (!error) {
            ultimoEventoCache = {
                tipo: tipoEventoInput!,
                resultado: tipoEventoInput === 'PESAJE' ? '' : resultadoInput,
                detalle: detalleInput,
                costo: costoEvento,
                tactoResultado,
                tipoServicio,
                torosIdsInput: [...torosIdsInput],
            };
            recargarEventos(animalSel.id);
            if (tipoEventoInput === 'PESAJE') setUltimoPeso(resultadoFinal);
            setResultadoInput(''); setDetalleInput(''); setTorosIdsInput([]); setNuevoTerneroCaravana(''); setPesoNacimiento(''); setCostoEvento(''); setAdpvCalculado(null); setMesesGestacion(null);
            onUpdate(); actualizarCartelToros(animalSel.id);
        }
    }

    async function actualizarAnimal() {
        if (!animalSel || !campoId) return;
        let finalEstado = editEstado;
        if (['Vaca', 'Vaquillona'].includes(editCategoria || '')) { if (editLactancia) { finalEstado = editEstado === 'PREÑADA' ? 'PREÑADA Y LACTANDO' : 'EN LACTANCIA'; } }
        else { finalEstado = animalSel.estado; }
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
            
            eventosAInsertar.push({ animal_id: animalSel.id, fecha_evento: fechaStr, tipo: 'CAMBIO_LOTE', resultado: 'CAMBIO DE LOTE', detalle: desc, datos_extra: { lote_origen: lAnterior, lote_destino: lNom, lote_id: editLoteId, lote_id_en_momento: animalSel.lote_id ?? null }, establecimiento_id: campoId });
        }
    
        const { error } = await supabase.from('animales').update({ caravana: editCaravana, categoria: editCategoria, sexo: editSexo, estado: finalEstado, condicion: condStr, castrado: editCastrado, detalles: editDetalles, potrero_id: editPotreroId, parcela_id: editParcelaId, lote_id: editLoteId, pelaje: editPelaje || null, fecha_nacimiento: editFechaNac || null, fecha_ingreso: editFechaIngreso || null }).eq('id', animalSel.id);
        if (eventosAInsertar.length > 0) { await supabase.from('eventos').insert(eventosAInsertar); }
        if (!error) { notifications.show({ title: 'Datos actualizados', message: 'Los cambios fueron guardados.', color: 'teal' }); onUpdate(); }
    }

    function validarYAbrirConfirmBaja() {
        if (!animalSel || !modoBaja || !campoId) return;
        if (modoBaja === 'VENDIDO') {
            if (!bajaPrecio) { notifications.show({ title: 'Datos incompletos', message: 'Ingresá el precio de venta', color: 'red' }); return; }
            if (bajaModalidadVenta === 'KILO' && !bajaKilosTotales) { notifications.show({ title: 'Datos incompletos', message: 'Ingresá los kilos totales', color: 'red' }); return; }
            if (!esVentaRed && !bajaMotivo) { notifications.show({ title: 'Datos incompletos', message: 'Ingresá el destino / comprador', color: 'red' }); return; }
            if (esVentaRed && !renspaDestino) { notifications.show({ title: 'Datos incompletos', message: 'Ingresá el RENSPA del comprador', color: 'red' }); return; }
        }
        if (modoBaja === 'MUERTO' && !bajaMotivo) { notifications.show({ title: 'Datos incompletos', message: 'Ingresá la causa de muerte', color: 'red' }); return; }
        if (modoBaja === 'TRASLADO' && !bajaMotivo) { notifications.show({ title: 'Datos incompletos', message: 'Seleccioná el campo de destino', color: 'red' }); return; }
        openConfirmBaja();
    }

    async function confirmarBaja() {
        if (!animalSel || !modoBaja || !campoId) return;
        
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
            if (!bajaMotivo) { setLoading(false); notifications.show({ title: 'Error', message: 'Seleccioná el campo de destino', color: 'red' }); return; }
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
                if (!renspaDestino) { setLoading(false); notifications.show({ title: 'Datos incompletos', message: 'Ingresá el RENSPA del comprador', color: 'red' }); return; }
                const { data, error: rpcErr } = await supabase.rpc('buscar_campo_por_renspa', { buscar_renspa: renspaDestino.trim() }).single();
                const dest = data as any;

                if (rpcErr || !dest) { setLoading(false); notifications.show({ title: 'RENSPA no encontrado', message: 'No se encontró ningún campo con ese RENSPA', color: 'red' }); return; }
                if (dest.id === campoId) { setLoading(false); notifications.show({ title: 'Error', message: 'No podés transferirte a vos mismo', color: 'red' }); return; }
                const nombreOrigen = establecimientos.find(e => e.id === campoId)?.nombre || 'Campo Desconocido';

                const { error: errTransf } = await supabase.from('transferencias').insert({ campo_origen_id: campoId, campo_destino_id: dest.id, animales_ids: [animalSel.id], precio_total: totalIngreso, detalles: `Venta animal ${animalSel.caravana}`, origen_nombre: nombreOrigen, estado: 'PENDIENTE' });
                if (errTransf) { setLoading(false); notifications.show({ title: 'Error al transferir', message: errTransf.message, color: 'red' }); return; }

                const animalSnapshot = [{ caravana: animalSel.caravana, categoria: animalSel.categoria, sexo: animalSel.sexo }];
                const { data: ventaRedData } = await supabase.from('ventas').insert([{ establecimiento_id: campoId, fecha: fechaStr.split('T')[0], tipo: 'RED', destino: dest.nombre, modalidad: bajaModalidadVenta, monto_total: totalIngreso, gastos_total: gastosTotales, animales_ids: [animalSel.id], animales_detalle: animalSnapshot }]).select('id').single();
                if (totalIngreso > 0) await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: fechaStr.split('T')[0], tipo: 'INGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Venta Red: ${animalSel.caravana} → ${dest.nombre}`, monto: totalIngreso, venta_id: ventaRedData?.id ?? null });

                await supabase.from('animales').update({ en_transito: true, detalle_baja: `En tránsito a: ${dest.nombre}`, toros_servicio_ids: null }).eq('id', animalSel.id);
                await supabase.from('eventos').insert({ animal_id: animalSel.id, tipo: 'VENTA', resultado: 'VENDIDO', detalle: `En tránsito a: ${dest.nombre} - Total: $${totalIngreso}`, datos_extra: { destino: dest.nombre, modalidad: bajaModalidadVenta, ingreso_total: totalIngreso, gastos: gastosTotales, caravana_origen: animalSel.caravana }, establecimiento_id: campoId, costo: totalIngreso });
                if(animalSel.categoria === 'Toro') await desvincularToroDeVacas(animalSel.id);
            } else {
                if (!bajaMotivo) { setLoading(false); notifications.show({ title: 'Datos incompletos', message: 'Ingresá el destino / comprador', color: 'red' }); return; }
                const { data: ventaData } = await supabase
                    .from('ventas')
                    .insert([{
                        establecimiento_id: campoId,
                        fecha: fechaStr.split('T')[0],
                        tipo: 'INDIVIDUAL',
                        destino: bajaMotivo || null,
                        modalidad: bajaModalidadVenta,
                        monto_total: totalIngreso,
                        gastos_total: Number(bajaGastosVenta) || 0,
                        kilos_totales: bajaKilosTotales ? Number(bajaKilosTotales) : null,
                        animales_ids: [animalSel.id],
                        animales_detalle: [{ caravana: animalSel.caravana, categoria: animalSel.categoria, sexo: animalSel.sexo }]
                    }])
                    .select('id')
                    .single();
                await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: fechaStr.split('T')[0], tipo: 'INGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Venta animal ${animalSel.caravana} - ${bajaMotivo || 'Individual'}`, monto: totalIngreso, venta_id: ventaData?.id ?? null });
                
                if (gastosTotales > 0) {
                    await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: fechaStr.split('T')[0], tipo: 'EGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Gastos de venta animal ${animalSel.caravana}`, monto: gastosTotales });
                }

                await supabase.from('animales').update({ estado: 'VENDIDO', detalle_baja: `Venta: ${bajaMotivo || '-'} ($${totalIngreso})`, toros_servicio_ids: null, en_transito: false }).eq('id', animalSel.id);
                await supabase.from('eventos').insert({ animal_id: animalSel.id, tipo: 'VENTA', resultado: 'VENDIDO', detalle: `Destino: ${bajaMotivo} - Total: $${totalIngreso}`, datos_extra: { destino: bajaMotivo, modalidad: bajaModalidadVenta, ingreso_total: totalIngreso, gastos: gastosTotales, caravana_origen: animalSel.caravana }, establecimiento_id: campoId, costo: totalIngreso });
                await supabase.from('agenda').delete().eq('animal_id', animalSel.id).eq('completado', false);
                if(animalSel.categoria === 'Toro') await desvincularToroDeVacas(animalSel.id);
            }
        } else {
            if (!bajaMotivo) { setLoading(false); notifications.show({ title: 'Datos incompletos', message: 'Ingresá la causa de muerte', color: 'red' }); return; }
            await supabase.from('animales').update({ estado: 'MUERTO', detalle_baja: `Causa: ${bajaMotivo}`, toros_servicio_ids: null, en_transito: false }).eq('id', animalSel.id); 
            await supabase.from('eventos').insert([{ animal_id: animalSel.id, tipo: 'BAJA', resultado: 'MUERTO', detalle: `Causa: ${bajaMotivo}`, datos_extra: { causa: bajaMotivo }, establecimiento_id: campoId }]); 
            await supabase.from('agenda').delete().eq('animal_id', animalSel.id).eq('completado', false);
        }
        
        setLoading(false); setBajaKilosTotales(''); setBajaGastosVenta(''); setBajaModalidadVenta('TOTAL'); setEsVentaRed(false); setRenspaDestino(''); 
        onClose(); onUpdate();
    }

    function restaurarAnimal() {
        if (!animalSel) return;
        setConfirmModal({
            mensaje: `¿Restaurar a ${animalSel.caravana} a Hacienda Activa?`,
            color: 'teal',
            onConfirm: async () => {
                if (animalSel.estado === 'VENDIDO') { await supabase.from('caja').delete().eq('establecimiento_id', campoId).eq('categoria', 'Hacienda (Venta/Compra)').like('detalle', `Venta animal ${animalSel.caravana} -%`); }
                await supabase.from('animales').update({ estado: 'ACTIVO', detalle_baja: null, en_transito: false }).eq('id', animalSel.id);
                await supabase.from('eventos').insert([{ animal_id: animalSel.id, tipo: 'RESTAURACION', resultado: 'Reingreso', detalle: 'Restaurado', establecimiento_id: campoId! }]);
                onClose(); onUpdate();
            },
        });
    }

    function borrarAnimalDefinitivo() {
        if (!animalSel) return;
        openConfirmBorrar();
    }

    async function ejecutarBorradoDefinitivo() {
        if (!animalSel || !campoId) return;
        closeConfirmBorrar();
        await supabase.from('animales').update({ estado: 'ELIMINADO' }).eq('id', animalSel.id);
        await supabase.from('eventos').insert({
            animal_id: animalSel.id,
            fecha_evento: new Date().toISOString(),
            tipo: 'BORRADO',
            resultado: 'ELIMINADO DEL SISTEMA',
            detalle: 'Ocultado por el usuario (Soft Delete)',
            establecimiento_id: campoId
        });
        await supabase.from('agenda').delete().eq('animal_id', animalSel.id).eq('completado', false);
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
    
    // AQUÍ ESTÁ EL CAMBIO A VIOLET PARA LASTIMADA
    const renderCondicionBadges = (condStr: string) => { 
        if (!condStr || condStr === 'SANA') return null; 
        return condStr.split(', ').map((c: any, i: number) => ( 
            <Badge key={i} color={c === 'ENFERMA' ? 'red' : 'violet'} variant="filled" size="sm">{c}</Badge> 
        )); 
    };

    if (!animalSel) return null;

    return (
        <Modal opened={opened} onClose={handleCloseModalVaca} title={<Group><Text fw={700} size="lg" ff={animalSel?.caravana_electronica && animalSel.caravana === animalSel.caravana_electronica ? 'monospace' : undefined}>Ficha: {animalSel?.caravana_electronica && animalSel.caravana === animalSel.caravana_electronica ? `…${animalSel.caravana.slice(-4)}` : animalSel?.caravana} {esActivo ? '' : animalSel?.en_transito ? '(EN TRÁNSITO)' : '(ARCHIVO)'}</Text>
        <Group gap="xs" wrap="nowrap">
            {animalSel?.en_transito ? (
                <Badge color="#795548" size="sm">EN TRÁNSITO</Badge>
            ) : (
                <>
                    {animalSel?.categoria === 'Ternero' && (<Badge color={animalSel.sexo === 'M' ? 'blue' : animalSel.sexo === 'H' ? 'pink' : 'gray'} variant="light" size="sm">{animalSel.sexo === 'M' ? 'MACHO' : animalSel.sexo === 'H' ? 'HEMBRA' : 'NO DEFINIDO'}</Badge>)}
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
               
                       {tipoEventoInput === 'TACTO' && ( 
                           <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="sm">
                               <Select label="Resultado del Tacto" data={['PREÑADA', 'VACÍA']} value={tactoResultado} onChange={setTactoResultado} comboboxProps={{ zIndex: 200005 }}/> 
                               {tactoResultado === 'PREÑADA' && ( 
                                   <Select label="Gestación (Meses)" placeholder="Opcional" data={opcionesGestacion} value={mesesGestacion} onChange={setMesesGestacion} clearable leftSection={<IconBabyCarriage size={16}/>} comboboxProps={{ zIndex: 200005 }}/> 
                               )} 
                           </SimpleGrid> 
                       )}
               
                       {tipoEventoInput === 'SERVICIO' && ( <Group grow mb="sm" align="flex-end"><Select label="Tipo de Servicio" data={['TORO', 'IA']} value={tipoServicio} onChange={setTipoServicio} comboboxProps={{ zIndex: 200005 }}/ >{tipoServicio === 'TORO' && ( <MultiSelect label="Seleccionar Toro/s" data={torosDisponibles.map(t => ({value: t.id, label: t.caravana}))} value={torosIdsInput} onChange={setTorosIdsInput} searchable comboboxProps={{ zIndex: 200005 }} /> )}</Group> )}
                       {tipoEventoInput === 'PARTO' && ( <Paper withBorder p="xs" bg="teal.0" mb="sm"><Text size="sm" fw={700} c="teal">Datos del Nuevo Ternero</Text><Group grow><TextInput label="Caravana Ternero" placeholder="Ej: 1045 — opcional" description="Vacío = SC-xxx automático" value={nuevoTerneroCaravana} onChange={(e) => setNuevoTerneroCaravana(e.target.value)} /><Select label="Sexo" data={[{value: 'M', label: 'Macho'}, {value: 'H', label: 'Hembra'}, {value: 'I', label: 'No definido por ahora'}]} value={nuevoTerneroSexo} onChange={setNuevoTerneroSexo} comboboxProps={{ zIndex: 200005 }}/></Group><TextInput mt="sm" label="Peso al Nacer (kg)" placeholder="Opcional" type="number" value={pesoNacimiento} onChange={(e) => setPesoNacimiento(e.target.value)}/></Paper> )}
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
               <ScrollArea h={300}><Table striped><Table.Tbody>{eventosFicha.map(ev => (<Table.Tr key={ev.id}><Table.Td><Text size="xs">{formatDate(ev.fecha_evento)}</Text></Table.Td><Table.Td><Text fw={700} size="sm">{ev.tipo}</Text></Table.Td><Table.Td><Text size="sm" fw={500}>{ev.resultado}</Text>{ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}{ev.datos_extra && ev.datos_extra.toros_caravanas && <Badge size="xs" color="pink" variant="outline" ml="xs">Toro/s: {ev.datos_extra.toros_caravanas}</Badge>}{ev.datos_extra && ev.datos_extra.precio_kg && <Badge size="xs" color="green" variant="outline" ml="xs">${ev.datos_extra.precio_kg}</Badge>}</Table.Td><Table.Td><Text size="xs" c="dimmed">${ev.costo || 0}</Text></Table.Td><Table.Td align="right"><ActionIcon size="sm" variant="subtle" color="blue" onClick={() => handleIniciarEdicionEvento(ev)}><IconEdit size={14}/></ActionIcon><ActionIcon size="sm" variant="subtle" color="red" onClick={() => borrarEvento(ev)}><IconTrash size={14}/></ActionIcon></Table.Td></Table.Tr>))}</Table.Tbody></Table></ScrollArea>
            </Tabs.Panel>
            <Tabs.Panel value="datos">
               <Paper withBorder p="sm" bg="gray.1" mb="md" radius="md"><Group justify="space-between"><Text size="sm" fw={700} c="dimmed">ÚLTIMO PESO:</Text><UnstyledButton onClick={() => abrirGraficoPeso(animalSel.id)}><Badge size="lg" variant="filled" color="blue" leftSection={<IconChartDots size={14}/>} style={{cursor: 'pointer'}}>{ultimoPeso}</Badge></UnstyledButton></Group></Paper>
               <TextInput label="Caravana" value={editCaravana} onChange={(e) => setEditCaravana(e.target.value)} mb="sm" disabled={!esActivo} />
               {animalSel.caravana_electronica && (
                   <TextInput label="Caravana Electrónica (EID)" value={animalSel.caravana_electronica} readOnly mb="sm" leftSection={<IconScan size={16}/>} ff="monospace" styles={{ input: { fontFamily: 'monospace', letterSpacing: '0.05em' } }} />
               )}
               
               <Group grow mb="sm">
                   <Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={editCategoria} onChange={setEditCategoria} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} />
                   {['Vaca', 'Vaquillona'].includes(editCategoria || '') && ( <Select label="Estado Reproductivo" data={['ACTIVO', 'PREÑADA', 'VACÍA']} value={editEstado} onChange={setEditEstado} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} /> )}
                   {editCategoria === 'Ternero' && ( <Select label="Sexo" data={[{value: 'M', label: 'Macho'}, {value: 'H', label: 'Hembra'}]} value={editSexo} onChange={(v) => { setEditSexo(v); if (v === 'H') setEditCastrado(false); }} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} /> )}
               </Group>

               {['Vaca', 'Vaquillona'].includes(editCategoria || '') && ( <Switch mb="sm" size="md" onLabel="EN LACTANCIA" offLabel="SIN CRÍA" label="¿Está criando a un ternero?" checked={editLactancia} onChange={(e) => setEditLactancia(e.currentTarget.checked)} disabled={!esActivo} color="grape" /> )}
               
               <Group grow mb="sm">
                   <Select label="Potrero (Ubicación)" placeholder="Sin asignar" data={potreros.map(p => ({value: p.id, label: p.nombre}))} value={editPotreroId} onChange={(val) => { setEditPotreroId(val); setEditParcelaId(null); }} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} />
                   {editPotreroId && <Select label="Parcela" placeholder="General" data={parcelas.filter(p => p.potrero_id === editPotreroId).map(p => ({value: p.id, label: p.nombre}))} value={editParcelaId} onChange={setEditParcelaId} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} />}
               </Group>
               <Select label="Lote (Grupo)" placeholder="Sin asignar" data={lotes.map(l => ({value: l.id, label: l.nombre}))} value={editLoteId} onChange={setEditLoteId} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} mb="sm" />
               <Select label="Pelaje" placeholder="Sin especificar" data={['Negro', 'Colorado', 'Careta Negro', 'Careta Colorado', 'Blanco y Negro']} value={editPelaje} onChange={setEditPelaje} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} mb="sm" />

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
                                       <Badge key={h.id} variant={(isGone || h.ajeno) ? 'light' : 'white'} style={{ cursor: h.ajeno ? 'default' : 'pointer', opacity: (isGone || h.ajeno) ? 0.6 : 1 }} color={h.ajeno ? 'gray' : (h.sexo === 'M' ? 'blue' : h.sexo === 'H' ? 'pink' : 'gray')} onClick={() => !h.ajeno && navegarAHijo(h.id)}>
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
                                   {rolActual === 'DUENO' && (
                                       <Button color="orange" onClick={() => setModoBaja('VENDIDO')} leftSection={<IconCurrencyDollar size={16}/>}>Vender</Button>
                                   )}
                                   {rolActual === 'DUENO' && (
                                       <Button color="blue" onClick={() => { setModoBaja('TRASLADO'); setBajaMotivo(''); }} leftSection={<IconTractor size={16}/>}>Trasladar</Button>
                                   )}
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
                               <Button fullWidth color={modoBaja === 'VENDIDO' ? 'orange' : modoBaja === 'TRASLADO' ? 'blue' : 'red'} onClick={validarYAbrirConfirmBaja} loading={loading}>Confirmar Acción</Button>
                           </Paper>
                       )}
                   </> 
               ) : ( <Paper p="md" bg="gray.1" ta="center"><Text c="dimmed" size="sm" mb="md">Este animal se encuentra {animalSel?.en_transito ? 'en tránsito hacia el comprador' : 'archivado'}.</Text>{!animalSel?.en_transito && <Button fullWidth variant="outline" color="blue" leftSection={<IconArrowBackUp/>} onClick={restaurarAnimal}>Restaurar a Hacienda Activa</Button>}</Paper> )}
            </Tabs.Panel>
        </Tabs>

        {/* MODAL CONFIRMACIÓN DE BAJA (VENTA / TRASLADO / MUERTE) */}
        <Modal
            opened={confirmBajaOpen}
            onClose={closeConfirmBaja}
            title={
                <Text fw={700} c={modoBaja === 'VENDIDO' ? 'orange.7' : modoBaja === 'TRASLADO' ? 'blue.7' : 'red.7'}>
                    {modoBaja === 'VENDIDO' ? 'Confirmar Venta' : modoBaja === 'TRASLADO' ? 'Confirmar Traslado' : 'Confirmar Muerte'}
                </Text>
            }
            centered
            zIndex={3000}
            size="sm"
        >
            <Stack>
                <Alert
                    color={modoBaja === 'VENDIDO' ? 'orange' : modoBaja === 'TRASLADO' ? 'blue' : 'red'}
                    icon={modoBaja === 'VENDIDO' ? <IconCurrencyDollar size={16}/> : modoBaja === 'TRASLADO' ? <IconTractor size={16}/> : <IconSkull size={16}/>}
                >
                    {modoBaja === 'VENDIDO' && <>¿Confirmar la venta de <b>{animalSel?.caravana}</b>? El animal pasará a Archivo de Bajas.</>}
                    {modoBaja === 'TRASLADO' && <>¿Confirmar el traslado de <b>{animalSel?.caravana}</b> al otro establecimiento?</>}
                    {modoBaja === 'MUERTO' && <>¿Confirmar la muerte de <b>{animalSel?.caravana}</b>? El animal pasará a Archivo de Bajas.</>}
                </Alert>
                <Group justify="flex-end" mt="xs">
                    <Button variant="default" onClick={closeConfirmBaja} disabled={loading}>Cancelar</Button>
                    <Button
                        color={modoBaja === 'VENDIDO' ? 'orange' : modoBaja === 'TRASLADO' ? 'blue' : 'red'}
                        loading={loading}
                        onClick={() => { closeConfirmBaja(); confirmarBaja(); }}
                    >
                        Confirmar
                    </Button>
                </Group>
            </Stack>
        </Modal>

        {/* MODAL CONFIRMACIÓN BORRADO DEFINITIVO */}
        <Modal
            opened={confirmBorrarOpen}
            onClose={closeConfirmBorrar}
            title={<Text fw={700} c="red.7">Borrar Definitivamente</Text>}
            centered
            zIndex={3000}
            size="sm"
        >
            <Stack>
                <Alert color="red" icon={<IconTrash size={16}/>} title="Acción irreversible">
                    <b>{animalSel?.caravana}</b> se ocultará de la lista de bajas para siempre.
                </Alert>
                <Text size="sm" c="dimmed">
                    Sus eventos pasados (pesajes, vacunas, partos) <b>no se borrarán</b> para mantener la integridad de las estadísticas y balances del campo.
                </Text>
                <Group justify="flex-end" mt="xs">
                    <Button variant="default" onClick={closeConfirmBorrar}>Cancelar</Button>
                    <Button color="red" onClick={ejecutarBorradoDefinitivo}>Borrar definitivamente</Button>
                </Group>
            </Stack>
        </Modal>

        {/* MODAL INTERNO PARA EDITAR EL EVENTO (Ahora es autónomo) */}
        <Modal opened={modalEditOpen} onClose={closeEdit} title={<Text fw={700}>Editar Evento</Text>} centered zIndex={3000}>
            <Stack>
                <TextInput label="Fecha" type="date" value={getLocalDateForInput(editEvFecha)} onChange={(e) => setEditEvFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}/>
                <TextInput label="Resultado" value={editEvRes} onChange={(e) => setEditEvRes(e.target.value)}/>
                <Textarea label="Detalle" value={editEvDet} onChange={(e) => setEditEvDet(e.target.value)}/>
                <Button onClick={handleGuardarEdicionEvento} fullWidth mt="md">Guardar Cambios</Button>
            </Stack>
        </Modal>

        {/* MODAL CONFIRMACIÓN GENÉRICA */}
        <Modal opened={!!confirmModal} onClose={() => setConfirmModal(null)} title={<Text fw={700}>Confirmar acción</Text>} centered size="sm" zIndex={3000}>
            <Stack>
                <Text>{confirmModal?.mensaje}</Text>
                <Group justify="flex-end" mt="xs">
                    <Button variant="default" onClick={() => setConfirmModal(null)}>Cancelar</Button>
                    <Button color={confirmModal?.color || 'red'} onClick={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>Confirmar</Button>
                </Group>
            </Stack>
        </Modal>

    </Modal>
    );
}