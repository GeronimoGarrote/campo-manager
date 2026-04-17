import { useState } from 'react';
import { Group, Title, Badge, Button, SimpleGrid, Card, Paper, Text, ActionIcon, Tabs, MultiSelect, Table, TextInput, Select, Modal, Stack, Tooltip, ThemeIcon, Alert } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTag, IconEdit, IconArrowLeft, IconTrash, IconList, IconLeaf, IconChartDots, IconUnlink, IconCurrencyDollar, IconCheck, IconInfoCircle, IconCalendar } from '@tabler/icons-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabase';

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };
const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };

const CustomTooltipMulti = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // payload[0].payload contiene toda la información del punto actual en el eje X
        const data = payload[0].payload;
        const meta = data._meta || {};

        // Filtramos las claves para quedarnos estrictamente con las caravanas (ignoramos los promedios y metadatos)
        const animalKeys = Object.keys(data).filter(
            k => k !== 'fecha' && k !== '_meta' && k !== 'Promedio Lote' && k !== 'Promedio Estimado'
        );

        // Calculamos la sumatoria real de kilos y la cantidad de animales en esta fecha específica
        const pesoTotal = animalKeys.reduce((acc, curr) => acc + (Number(data[curr]) || 0), 0);
        const cantAnimales = animalKeys.length;

        const promedioLote = data['Promedio Lote'];
        const promedioEst = data['Promedio Estimado'];

        return (
            <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '220px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '6px', marginBottom: '8px', fontSize: '14px', color: '#343a40' }}>
                    Fecha: {label}
                </p>
                
                {cantAnimales > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#495057', marginBottom: '4px' }}>Animales pesados: <b>{cantAnimales}</b></p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#495057' }}>Sumatoria (Peso Total): <b>{pesoTotal} kg</b></p>
                    </div>
                )}

                {promedioLote && (
                    <div style={{ borderTop: '1px dashed #ced4da', paddingTop: '8px' }}>
                        <p style={{ margin: 0, color: '#be4bdb', fontWeight: 'bold', fontSize: '14px' }}>
                            Promedio Lote: {promedioLote} kg
                        </p>
                        {meta['Promedio Lote'] && (
                            <p style={{ margin: 0, color: '#868e96', fontSize: '12px', paddingLeft: '8px', marginTop: '4px' }}>
                                Rendimiento: <span style={{color: meta['Promedio Lote'].diff > 0 ? '#12b886' : '#fa5252', fontWeight: 600}}>{meta['Promedio Lote'].diff > 0 ? '+' : ''}{meta['Promedio Lote'].diff} kg</span> ({meta['Promedio Lote'].adpv} kg/día)
                            </p>
                        )}
                    </div>
                )}

                {promedioEst && (
                    <div style={{ borderTop: '1px dashed #ced4da', paddingTop: '8px', marginTop: '8px' }}>
                        <p style={{ margin: 0, color: '#be4bdb', fontWeight: 'bold', fontSize: '14px' }}>
                            Promedio Estimado: {promedioEst} kg
                        </p>
                        {meta['Promedio Estimado'] && (
                            <p style={{ margin: 0, color: '#868e96', fontSize: '12px', paddingLeft: '8px', marginTop: '4px' }}>
                                Rendimiento: <span style={{color: meta['Promedio Estimado'].diff > 0 ? '#12b886' : '#fa5252', fontWeight: 600}}>{meta['Promedio Estimado'].diff > 0 ? '+' : ''}{meta['Promedio Estimado'].diff} kg</span> ({meta['Promedio Estimado'].adpv} kg/día)
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export default function Lotes({ 
    campoId, lotes, animales, potreros, parcelas, eventosLotesGlobal,
    fetchLotes, fetchAnimales, fetchEventosLotesGlobal, fetchActividadGlobal, abrirFichaVaca
}: any) {
    const [loading, setLoading] = useState(false);
    
    // Navegación interna
    const [loteSel, setLoteSel] = useState<any | null>(null);

    // Modal Nuevo Lote
    const [modalLoteOpen, { open: openModalLote, close: closeModalLote }] = useDisclosure(false);
    const [nuevoLoteNombre, setNuevoLoteNombre] = useState('');

    // Estados del Detalle del Lote
    const [eventosLoteFicha, setEventosLoteFicha] = useState<any[]>([]);
    const [datosGraficoLote, setDatosGraficoLote] = useState<any[]>([]);
    const [lineasAnimalesLote, setLineasAnimalesLote] = useState<string[]>([]);
    const [loadingGraficoLote, setLoadingGraficoLote] = useState(false);
    const [statsGraficoLote, setStatsGraficoLote] = useState({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' }); 
    const [isLoteEstimated, setIsLoteEstimated] = useState(false);
    
    // --- ESTADOS PARA EL FILTRO DE TIEMPO DEL GRÁFICO ---
    const [filtroTiempo, setFiltroTiempo] = useState<string>('TODOS');
    const [fechaDesde, setFechaDesde] = useState<Date | null>(null);
    const [fechaHasta, setFechaHasta] = useState<Date | null>(null);
    // ----------------------------------------------------

    const [loteEvFecha, setLoteEvFecha] = useState<Date | null>(new Date());
    const [loteEvTipo, setLoteEvTipo] = useState<string | null>('RACIÓN');
    const [loteEvDetalle, setLoteEvDetalle] = useState('');
    const [loteEvCantidad, setLoteEvCantidad] = useState('');
    const [loteEvCosto, setLoteEvCosto] = useState<string | number>('');
    const [agregarAlLoteIds, setAgregarAlLoteIds] = useState<string[]>([]);

    const haciendaActiva = animales.filter((a: any) => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO' && a.estado !== 'EN TRÁNSITO');

    const getUbicacionCompleta = (potrero_id?: string, parcela_id?: string) => {
        if(!potrero_id) return <Text size="xs" c="dimmed">-</Text>;
        const pNom = potreros.find((p: any) => p.id === potrero_id)?.nombre;
        const parcNom = parcelas.find((p: any) => p.id === parcela_id)?.nombre;
        return <Text size="sm">{parcNom ? `${pNom} (${parcNom})` : pNom}</Text>;
    }

    async function crearLoteGrupo() {
        if (!nuevoLoteNombre || !campoId) return;
        setLoading(true);
        const { error } = await supabase.from('lotes').insert([{ nombre: nuevoLoteNombre, establecimiento_id: campoId }]);
        setLoading(false);
        if (error) alert("Error al crear lote: " + error.message); else { setNuevoLoteNombre(''); fetchLotes(); closeModalLote(); }
    }
    
    async function borrarLoteGrupo(id: string) {
        if (!confirm("¿Borrar grupo? Los animales quedarán sin lote asignado.")) return;
        animales.forEach((a: any) => { if (a.lote_id === id) a.lote_id = null; });
        await supabase.from('lotes').delete().eq('id', id); fetchLotes(); fetchAnimales(); setLoteSel(null);
    }

    async function renombrarLoteGrupo(id: string, nombreActual: string) {
        const nuevoNombre = prompt("Nuevo nombre del Lote:", nombreActual);
        if (nuevoNombre === null || nuevoNombre === nombreActual) return;
        await supabase.from('lotes').update({ nombre: nuevoNombre }).eq('id', id); 
        fetchLotes(); setLoteSel((prev: any) => prev ? {...prev, nombre: nuevoNombre} : prev);
    }

    const cambiarFiltroTiempo = (val: string) => {
        setFiltroTiempo(val);
        const hoy = new Date();
        let desde = null;
        let hasta = null;
        
        if (val === '30D') { desde = new Date(hoy.getTime() - 30*24*60*60*1000); hasta = hoy; }
        if (val === '6M') { desde = new Date(hoy.getTime() - 180*24*60*60*1000); hasta = hoy; }
        
        if (val !== 'PERSONALIZADO') {
            setFechaDesde(desde);
            setFechaHasta(hasta);
            if (loteSel) generarGraficoLote(loteSel.id, desde, hasta);
        }
    };

    async function generarGraficoLote(idLote: string, fDesde: Date | null = fechaDesde, fHasta: Date | null = fechaHasta) {
        setLoadingGraficoLote(true);
        const animalesLote = haciendaActiva.filter((a: any) => a.lote_id === idLote);
        
        if (animalesLote.length === 0) {
            setDatosGraficoLote([]); setLineasAnimalesLote([]); setStatsGraficoLote({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' }); setIsLoteEstimated(false); setLoadingGraficoLote(false);
            return;
        }

        const ids = animalesLote.map((a: any) => a.id);
        const { data: pesajes } = await supabase.from('eventos').select('*, animales!inner(caravana)').in('animal_id', ids).eq('tipo', 'PESAJE').order('fecha_evento', { ascending: true });
        
        if (!pesajes || pesajes.length === 0) {
            setDatosGraficoLote([]); setLineasAnimalesLote([]); setStatsGraficoLote({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' }); setIsLoteEstimated(false); setLoadingGraficoLote(false);
            return;
        }

        let pesajesFiltrados = pesajes;
        if (fDesde) {
            const desdeIso = fDesde.toISOString().split('T')[0];
            pesajesFiltrados = pesajesFiltrados.filter(p => p.fecha_evento >= desdeIso);
        }
        if (fHasta) {
            const hastaIso = fHasta.toISOString().split('T')[0];
            pesajesFiltrados = pesajesFiltrados.filter(p => p.fecha_evento <= hastaIso + 'T23:59:59');
        }

        if (pesajesFiltrados.length === 0) {
            setDatosGraficoLote([]); setLineasAnimalesLote([]); setStatsGraficoLote({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' }); setIsLoteEstimated(false); setLoadingGraficoLote(false);
            return;
        }

        const fechasUnicas = [...new Set(pesajesFiltrados.map(p => p.fecha_evento.split('T')[0]))].sort();
        const caravanasPresentes = new Set<string>();
        const ultimoPesoConocido: Record<string, number> = {};
        const lastKnownForMeta: Record<string, { weight: number, date: Date }> = {}; 

        const dataGrafico = fechasUnicas.map((fechaStr: any) => {
            const pesajesDelDia = pesajesFiltrados.filter(p => p.fecha_evento.startsWith(fechaStr));
            const objParaElGrafico: any = { fecha: formatDate(fechaStr), _meta: {} };

            pesajesDelDia.forEach(p => {
                const pesoNum = parseFloat(p.resultado.replace(/[^0-9.]/g, ''));
                const caravana = (p.animales as any)?.caravana || 'Desc';
                if(!isNaN(pesoNum)) {
                    ultimoPesoConocido[caravana] = pesoNum; 
                    caravanasPresentes.add(caravana);
                    objParaElGrafico[caravana] = pesoNum; 
                }
            });

            const pesosActivos = Object.values(ultimoPesoConocido);
            if (pesosActivos.length > 0) {
                const sumaTotal = pesosActivos.reduce((a, b) => a + b, 0);
                objParaElGrafico['Promedio Lote'] = Math.round(sumaTotal / pesosActivos.length);
            }

            // Calculamos la diferencia y el ADPV con el punto anterior para el promedio
            const currentDate = new Date(fechaStr + 'T12:00:00');
            Object.keys(objParaElGrafico).forEach(key => {
                if (key === 'fecha' || key === '_meta') return;
                const currentWeight = objParaElGrafico[key];

                if (lastKnownForMeta[key]) {
                    const diffDays = (currentDate.getTime() - lastKnownForMeta[key].date.getTime()) / (1000 * 60 * 60 * 24);
                    if (diffDays > 0) {
                        const diffWeight = currentWeight - lastKnownForMeta[key].weight;
                        objParaElGrafico._meta[key] = {
                            diff: diffWeight,
                            adpv: (diffWeight / diffDays).toFixed(3)
                        };
                    }
                }
                lastKnownForMeta[key] = { weight: currentWeight, date: currentDate };
            });

            return objParaElGrafico;
        });

        if (dataGrafico.length > 1) {
            const ultimoDiaReal = dataGrafico[dataGrafico.length - 1];
            const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
            const fechaUltimoPesaje = new Date(fechasUnicas[fechasUnicas.length - 1] + 'T12:00:00');
            
            let targetDate = fHasta || new Date(hoy);
            if (fHasta && fHasta < hoy) targetDate = fHasta;

            let diasDesdeUltimo = Math.floor((targetDate.getTime() - fechaUltimoPesaje.getTime()) / (1000 * 60 * 60 * 24));
            if (isNaN(diasDesdeUltimo)) diasDesdeUltimo = 0;

            let labelProyeccion = fHasta && fHasta < hoy ? formatDate(targetDate.toISOString().split('T')[0]) + ' (Est.)' : 'Hoy (Est.)';

            if (!fHasta && diasDesdeUltimo < 2) {
                targetDate = new Date(fechaUltimoPesaje.getTime() + 15 * 24 * 60 * 60 * 1000);
                labelProyeccion = formatDate(targetDate.toISOString().split('T')[0]) + ' (Proy.)';
            }

            const animalStats: Record<string, {firstW: number, firstD: Date, lastW: number, lastD: Date}> = {};
            pesajesFiltrados.forEach(p => {
                const d = new Date(p.fecha_evento.split('T')[0] + 'T12:00:00');
                const w = parseFloat(p.resultado.replace(/[^0-9.]/g, ''));
                const c = (p.animales as any)?.caravana || 'Desc';
                if (!isNaN(w)) {
                    if (!animalStats[c]) { animalStats[c] = { firstW: w, firstD: d, lastW: w, lastD: d }; } 
                    else {
                        if (d < animalStats[c].firstD) { animalStats[c].firstW = w; animalStats[c].firstD = d; }
                        if (d > animalStats[c].lastD) { animalStats[c].lastW = w; animalStats[c].lastD = d; }
                    }
                }
            });

            let sumEst = 0; let countEst = 0;
            Object.keys(ultimoPesoConocido).forEach(caravana => {
                const stats = animalStats[caravana];
                let pesoProyectado = ultimoPesoConocido[caravana];
                if (stats && stats.lastD > stats.firstD) { 
                    const daysDiff = (stats.lastD.getTime() - stats.firstD.getTime()) / (1000 * 60 * 60 * 24);
                    if (daysDiff > 0) { 
                        const adpv = (stats.lastW - stats.firstW) / daysDiff;
                        const daysSinceAnimalLastWeighing = (targetDate.getTime() - stats.lastD.getTime()) / (1000 * 60 * 60 * 24);
                        if (daysSinceAnimalLastWeighing > 0) pesoProyectado += (adpv * daysSinceAnimalLastWeighing);
                    }
                }
                sumEst += pesoProyectado; countEst++;
            });

            if (countEst > 0 && diasDesdeUltimo >= 2) {
                const promedioEstTarget = Math.round(sumEst / countEst);
                ultimoDiaReal['Promedio Estimado'] = ultimoDiaReal['Promedio Lote'];

                const diffWeight = promedioEstTarget - ultimoDiaReal['Promedio Lote'];
                const adpv = diasDesdeUltimo > 0 ? (diffWeight / diasDesdeUltimo).toFixed(3) : '0';

                dataGrafico.push({
                    fecha: labelProyeccion,
                    'Promedio Estimado': promedioEstTarget,
                    _meta: {
                        'Promedio Estimado': { diff: diffWeight, adpv }
                    }
                });
            }

            const pesoInicio = dataGrafico[0]['Promedio Lote'] || 0;
            const pesoActualReal = ultimoDiaReal['Promedio Lote'] || 0;
            const gananciaReal = pesoActualReal - pesoInicio;
            const diffDaysReal = Math.ceil(Math.abs(fechaUltimoPesaje.getTime() - new Date(fechasUnicas[0] + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));

            setStatsGraficoLote({ 
                inicio: pesoInicio, actual: pesoActualReal, ganancia: gananciaReal, 
                dias: diffDaysReal, adpv: diffDaysReal > 0 ? (gananciaReal / diffDaysReal).toFixed(3) : '0' 
            });
            setIsLoteEstimated(diasDesdeUltimo >= 2); 
        } else {
            const pesoUnico = dataGrafico.length > 0 ? (dataGrafico[0]['Promedio Lote'] || 0) : 0;
            setStatsGraficoLote({ inicio: pesoUnico, actual: pesoUnico, ganancia: 0, dias: 0, adpv: '0' });
            setIsLoteEstimated(false);
        }

        setLineasAnimalesLote(Array.from(caravanasPresentes));
        setDatosGraficoLote(dataGrafico);
        setLoadingGraficoLote(false);
    }

    async function sacarAnimalDeLote(animalId: string) {
        if (!confirm("¿Quitar este animal del lote?")) return;
        
        const animal = animales.find((a: any) => a.id === animalId);
        if (animal) animal.lote_id = null;
        setAgregarAlLoteIds([...agregarAlLoteIds]); 
        
        if (loteSel) generarGraficoLote(loteSel.id);
        
        await supabase.from('animales').update({ lote_id: null }).eq('id', animalId);
        await supabase.from('eventos').insert({ animal_id: animalId, fecha_evento: new Date().toISOString(), tipo: 'CAMBIO_LOTE', resultado: 'REMOVIDO DE LOTE', detalle: `Removido del lote: ${loteSel?.nombre}`, establecimiento_id: campoId });
        fetchAnimales(); fetchActividadGlobal();
    }

    async function meterAnimalesAlLote() {
        if (agregarAlLoteIds.length === 0 || !loteSel || !campoId) return;
        setLoading(true);
        const fechaStr = new Date().toISOString();
        
        const inserts = agregarAlLoteIds.map(id => {
            const animalObj = animales.find((a: any) => a.id === id);
            const loteAnteriorId = animalObj?.lote_id;
            const loteAnteriorNombre = loteAnteriorId ? lotes.find((l: any) => l.id === loteAnteriorId)?.nombre || 'Sin Lote' : 'Sin Lote';

            return {
                animal_id: id,
                fecha_evento: fechaStr,
                tipo: 'CAMBIO_LOTE',
                resultado: 'CAMBIO DE LOTE',
                detalle: `Movido de: ${loteAnteriorNombre} ➔ A: ${loteSel.nombre}`,
                datos_extra: { 
                    lote_origen: loteAnteriorNombre, 
                    lote_destino: loteSel.nombre, 
                    lote_id: loteSel.id 
                },
                establecimiento_id: campoId
            };
        });
        
        animales.forEach((a: any) => {
            if (agregarAlLoteIds.includes(a.id)) a.lote_id = loteSel.id;
        });

        generarGraficoLote(loteSel.id);

        await supabase.from('animales').update({ lote_id: loteSel.id }).in('id', agregarAlLoteIds);
        await supabase.from('eventos').insert(inserts);
        
        setAgregarAlLoteIds([]); 
        fetchAnimales(); fetchActividadGlobal(); setLoading(false);
    }

    async function guardarEventoLote() {
        if (!loteSel || !loteEvFecha || !campoId) return;
        const { error } = await supabase.from('lotes_eventos').insert([{ lote_id: loteSel.id, fecha: loteEvFecha.toISOString().split('T')[0], tipo: loteEvTipo, detalle: loteEvDetalle, cantidad: loteEvCantidad, costo: Number(loteEvCosto), establecimiento_id: campoId }]);
        if (!error) {
            setLoteEvDetalle(''); setLoteEvCantidad(''); setLoteEvCosto(''); fetchEventosLotesGlobal();
            const { data } = await supabase.from('lotes_eventos').select('*').eq('lote_id', loteSel.id).order('fecha', { ascending: false });
            if (data) setEventosLoteFicha(data);
        }
    }

    async function borrarEventoLote(id: string) {
        if(!confirm("¿Borrar registro?")) return;
        await supabase.from('lotes_eventos').delete().eq('id', id);
        setEventosLoteFicha(prev => prev.filter(e => e.id !== id)); fetchEventosLotesGlobal();
    }

    async function abrirFichaLote(lote: any) {
        setLoteSel(lote); setEventosLoteFicha([]); setDatosGraficoLote([]); setLineasAnimalesLote([]); setAgregarAlLoteIds([]); setIsLoteEstimated(false);
        setStatsGraficoLote({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' }); 
        
        setFiltroTiempo('TODOS'); setFechaDesde(null); setFechaHasta(null);

        const { data: evData } = await supabase.from('lotes_eventos').select('*').eq('lote_id', lote.id).order('fecha', { ascending: false });
        if (evData) setEventosLoteFicha(evData);
        
        generarGraficoLote(lote.id, null, null);
    }

    if (loteSel) {
        return (
            <>
                <Group justify="space-between" mb="lg">
                    <Group align="center">
                        <ActionIcon variant="light" color="gray" size="lg" onClick={() => setLoteSel(null)} radius="xl">
                            <IconArrowLeft size={22} />
                        </ActionIcon>
                        <IconTag color="purple" size={28}/>
                        <Title order={2}>Lote: {loteSel.nombre}</Title>
                        <ActionIcon variant="subtle" color="grape" onClick={() => renombrarLoteGrupo(loteSel.id, loteSel.nombre)}>
                            <IconEdit size={20}/>
                        </ActionIcon>
                        <Badge variant="light" color="gray" leftSection={<IconCalendar size={12}/>} ml="sm">Creado: {formatDate(loteSel.created_at)}</Badge>
                    </Group>
                    <Button color="red" variant="subtle" onClick={() => borrarLoteGrupo(loteSel.id)} leftSection={<IconTrash size={16}/>}>Eliminar Lote</Button>
                </Group>

                <Paper withBorder radius="md" p="md" bg="white">
                    <Tabs defaultValue="hacienda" color="grape">
                        <Tabs.List grow mb="md">
                            <Tabs.Tab value="hacienda" leftSection={<IconList size={16}/>}>Hacienda ({haciendaActiva.filter((a: any) => a.lote_id === loteSel.id).length})</Tabs.Tab>
                            <Tabs.Tab value="nutricion" leftSection={<IconLeaf size={16}/>}>Nutrición / Eventos</Tabs.Tab>
                            <Tabs.Tab value="rendimiento" leftSection={<IconChartDots size={16}/>}>Rendimiento Promedio</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="hacienda">
                            <Group mb="md" align="flex-end">
                                <MultiSelect data={haciendaActiva.filter((a: any) => a.lote_id !== loteSel.id).map((a: any) => ({value: a.id, label: `${a.caravana} (${a.categoria})`}))} placeholder="Buscar vacas libres u en otros lotes..." value={agregarAlLoteIds} onChange={setAgregarAlLoteIds} searchable style={{ flex: 1 }}/>
                                <Button onClick={meterAnimalesAlLote} color="grape" loading={loading} leftSection={<IconPlus size={16}/>}>Agregar al Lote</Button>
                            </Group>
                            <Table striped highlightOnHover>
                                <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Caravana</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Sexo</Table.Th><Table.Th>Ubicación Actual</Table.Th><Table.Th w={80}>Acción</Table.Th></Table.Tr></Table.Thead>
                                <Table.Tbody>
                                    {haciendaActiva.filter((a: any) => a.lote_id === loteSel.id).length > 0 ? (
                                        haciendaActiva.filter((a: any) => a.lote_id === loteSel.id).map((a: any) => (
                                            <Table.Tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => abrirFichaVaca(a)}>
                                                <Table.Td fw={700}>{a.caravana}</Table.Td>
                                                <Table.Td>{a.categoria}</Table.Td>
                                                <Table.Td><Badge color={a.sexo === 'M' ? 'blue' : 'pink'} variant="light">{a.sexo === 'M' ? 'MACHO' : 'HEMBRA'}</Badge></Table.Td>
                                                <Table.Td>{getUbicacionCompleta(a.potrero_id, a.parcela_id)}</Table.Td>
                                                <Table.Td align="right">
                                                    <Tooltip label="Sacar del lote" withArrow zIndex={3000}>
                                                        <ActionIcon color="red" variant="subtle" onClick={(e) => { e.stopPropagation(); sacarAnimalDeLote(a.id); }}><IconUnlink size={18}/></ActionIcon>
                                                    </Tooltip>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))
                                    ) : (
                                        <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" size="sm" p="md" ta="center">No hay animales asignados a este lote.</Text></Table.Td></Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </Tabs.Panel>

                        <Tabs.Panel value="nutricion">
                            <Paper withBorder p="md" bg="grape.0" mb="lg" radius="md">
                                <Text size="sm" fw={700} mb="xs" c="grape.9">Registrar Nuevo Evento</Text>
                                <Group grow mb="sm">
                                    <TextInput type="date" value={getLocalDateForInput(loteEvFecha)} onChange={(e) => setLoteEvFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} />
                                    <Select data={['RACIÓN', 'SUPLEMENTO', 'SANIDAD', 'OTRO']} value={loteEvTipo} onChange={setLoteEvTipo} />
                                </Group>
                                <Group grow mb="sm">
                                    <TextInput placeholder="Detalle (Ej: Rollo Alfalfa)" value={loteEvDetalle} onChange={(e) => setLoteEvDetalle(e.target.value)} />
                                    <TextInput placeholder="Cantidad (Ej: 100kg)" value={loteEvCantidad} onChange={(e) => setLoteEvCantidad(e.target.value)} />
                                    <TextInput placeholder="Costo Total ($)" type="number" leftSection={<IconCurrencyDollar size={14}/>} value={loteEvCosto} onChange={(e) => setLoteEvCosto(e.target.value)}/>
                                </Group>
                                <Button onClick={guardarEventoLote} color="grape" variant="filled" leftSection={<IconCheck size={16}/>}>Guardar Registro</Button>
                            </Paper>
                            
                            <Text fw={700} mb="sm">Historial del Lote</Text>
                            {eventosLoteFicha.length === 0 ? <Text c="dimmed" size="sm" p="md" bg="gray.0" style={{borderRadius: 8}}>Sin eventos registrados para este lote.</Text> : (
                                <Table striped>
                                    <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Tipo</Table.Th><Table.Th>Detalle</Table.Th><Table.Th>Cantidad</Table.Th><Table.Th>Costo</Table.Th><Table.Th w={50}></Table.Th></Table.Tr></Table.Thead>
                                    <Table.Tbody>
                                        {eventosLoteFicha.map(ev => (
                                            <Table.Tr key={ev.id}>
                                                <Table.Td><Text size="sm" c="dimmed">{formatDate(ev.fecha)}</Text></Table.Td>
                                                <Table.Td><Badge size="sm" color="grape">{ev.tipo}</Badge></Table.Td>
                                                <Table.Td><Text size="sm">{ev.detalle || '-'}</Text></Table.Td>
                                                <Table.Td><Text size="sm" fw={700}>{ev.cantidad || '-'}</Text></Table.Td>
                                                <Table.Td><Text size="sm" c="dimmed">${ev.costo || 0}</Text></Table.Td>
                                                <Table.Td align="right"><ActionIcon color="red" variant="subtle" size="sm" onClick={() => borrarEventoLote(ev.id)}><IconTrash size={16}/></ActionIcon></Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            )}
                        </Tabs.Panel>

                        <Tabs.Panel value="rendimiento">
                            <Paper withBorder p="sm" bg="gray.0" mb="md" radius="md">
                                <Group align="flex-end">
                                    <Select 
                                        label="Periodo a analizar" 
                                        data={[
                                            {value: 'TODOS', label: 'Histórico Completo'}, 
                                            {value: '30D', label: 'Últimos 30 Días'}, 
                                            {value: '6M', label: 'Últimos 6 Meses'}, 
                                            {value: 'PERSONALIZADO', label: 'Rango Personalizado'}
                                        ]} 
                                        value={filtroTiempo} 
                                        onChange={(v) => cambiarFiltroTiempo(v || 'TODOS')} 
                                    />
                                    {filtroTiempo === 'PERSONALIZADO' && (
                                        <>
                                            <TextInput label="Desde" type="date" value={getLocalDateForInput(fechaDesde)} onChange={(e) => { const d = e.target.value ? new Date(e.target.value + 'T12:00:00') : null; setFechaDesde(d); generarGraficoLote(loteSel.id, d, fechaHasta); }} />
                                            <TextInput label="Hasta" type="date" value={getLocalDateForInput(fechaHasta)} onChange={(e) => { const d = e.target.value ? new Date(e.target.value + 'T12:00:00') : null; setFechaHasta(d); generarGraficoLote(loteSel.id, fechaDesde, d); }} />
                                        </>
                                    )}
                                </Group>
                            </Paper>

                            <Group justify="flex-end" mb="md">
                                <Tooltip label="Línea morada continua: Peso promedio real. Línea morada punteada: Proyección según el ritmo de engorde (ADPV). Líneas grises: Evolución individual de cada animal." multiline w={250} withArrow position="left" zIndex={3000}>
                                    <Badge variant="light" color="gray" leftSection={<IconInfoCircle size={14}/>} style={{cursor: 'help'}}>¿Cómo leer este gráfico?</Badge>
                                </Tooltip>
                            </Group>

                            {loadingGraficoLote ? (<Text ta="center" c="dimmed" my="xl">Calculando promedios y proyecciones...</Text>) : datosGraficoLote.length > 0 ? (
                                <>
                                    <div style={{ width: '100%', height: 400 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={datosGraficoLote} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="fecha" />
                                                <YAxis domain={['auto', 'auto']} />
                                                <RechartsTooltip content={<CustomTooltipMulti />} />
                                                
                                                {lineasAnimalesLote.map((caravana, idx) => (
                                                    <Line key={idx} type="monotone" dataKey={caravana} stroke="#ced4da" strokeWidth={1.5} dot={{ r: 2, fill: '#ced4da' }} connectNulls={true} />
                                                ))}

                                                <Line type="monotone" dataKey="Promedio Lote" stroke="#be4bdb" strokeWidth={4} activeDot={{ r: 8 }} connectNulls={true} />
                                                <Line type="monotone" dataKey="Promedio Estimado" stroke="#be4bdb" strokeWidth={4} strokeDasharray="5 5" activeDot={{ r: 8 }} connectNulls={true} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <SimpleGrid cols={{ base: 2, sm: 4 }} mt="xl">
                                        <Paper withBorder p="md" ta="center" radius="md">
                                            <Text size="sm" c="dimmed" fw={700} tt="uppercase">Promedio Inicial</Text>
                                            <Text fw={700} size="xl">{statsGraficoLote.inicio} kg</Text>
                                        </Paper>
                                        <Paper withBorder p="md" ta="center" radius="md">
                                            <Text size="sm" c="dimmed" fw={700} tt="uppercase">Ganancia Promedio</Text>
                                            <Text fw={700} size="xl" c={statsGraficoLote.ganancia > 0 ? 'teal' : 'red'}>{statsGraficoLote.ganancia > 0 ? '+' : ''}{statsGraficoLote.ganancia} kg</Text>
                                        </Paper>
                                        <Paper withBorder p="md" ta="center" radius="md">
                                            <Text size="sm" c="dimmed" fw={700} tt="uppercase">ADPV Promedio</Text>
                                            <Text fw={700} size="xl" c="blue">{statsGraficoLote.adpv} kg/día</Text>
                                        </Paper>
                                        <Paper withBorder p="md" ta="center" radius="md">
                                            <Group justify="center" gap={6}>
                                                <Text size="sm" c="dimmed" fw={700} tt="uppercase">Promedio Actual</Text>
                                                {isLoteEstimated && (
                                                    <Tooltip label="Al menos un animal no tiene pesajes recientes. El gráfico proyecta matemáticamente su peso (línea punteada) hasta el final del periodo." multiline w={250} withArrow zIndex={3000}>
                                                        <ThemeIcon size="sm" variant="light" color="grape" style={{ cursor: 'help' }} radius="xl"><IconInfoCircle size={14} /></ThemeIcon>
                                                    </Tooltip>
                                                )}
                                            </Group>
                                            <Text fw={700} size="xl" c="dark">{statsGraficoLote.actual} kg {isLoteEstimated && <Text span size="sm" c="grape" fw={500}>(Est.)</Text>}</Text>
                                        </Paper>
                                    </SimpleGrid>
                                </>
                            ) : (<Alert color="grape" title="Faltan Datos" mt="md" icon={<IconInfoCircle/>}>No hay registros de pesaje para este lote en el rango de fechas seleccionado.</Alert>)}
                        </Tabs.Panel>
                    </Tabs>
                </Paper>
            </>
        );
    }

    return (
        <>
            <Group justify="space-between" mb="lg" align="center">
                <Group>
                    <Title order={3}>Lotes / Grupos</Title>
                    <Badge size="xl" color="grape" circle>{lotes.length}</Badge>
                </Group>
                <Button leftSection={<IconPlus size={22}/>} color="grape" size="md" variant="filled" onClick={openModalLote} w={180}>Nuevo Lote</Button>
            </Group>
            
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {lotes.map((lote: any) => { 
                    const animalesLote = haciendaActiva.filter((a: any) => a.lote_id === lote.id);
                    const ultEv = eventosLotesGlobal.find((e: any) => e.lote_id === lote.id);
                    return (
                        <Card key={lote.id} shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => abrirFichaLote(lote)}>
                            <Group justify="space-between" mb="xs">
                                <Group gap="xs"><IconTag size={20} color="purple"/><Text fw={700} size="lg">{lote.nombre}</Text></Group>
                                <Badge color="blue" variant="light">{animalesLote.length} Cab</Badge>
                            </Group>
                            <Paper bg="gray.0" p="xs" radius="md" mt="sm">
                                <Group justify="space-between">
                                    <Text size="xs" fw={700} c="dimmed">ÚLTIMO REGISTRO</Text>
                                    {ultEv ? <Badge color="grape" variant="dot">{ultEv.tipo} ({formatDate(ultEv.fecha)})</Badge> : <Text size="xs" c="dimmed">Sin datos</Text>}
                                </Group>
                            </Paper>
                            <Button variant="light" color="grape" fullWidth mt="md" radius="md">Ver Ficha Completa</Button>
                        </Card>
                    )
                })}
            </SimpleGrid>
            {lotes.length === 0 && <Text c="dimmed" ta="center" mt="xl">No hay lotes (grupos) creados.</Text>}

            <Modal opened={modalLoteOpen} onClose={closeModalLote} title={<Text fw={700} size="lg">Nuevo Lote</Text>} centered>
                <Stack>
                    <TextInput label="Nombre del Lote (Grupo)" placeholder="Ej: Recría 2026" value={nuevoLoteNombre} onChange={(e) => setNuevoLoteNombre(e.target.value)} />
                    <Button onClick={crearLoteGrupo} loading={loading} color="grape" fullWidth mt="md">Crear Lote</Button>
                </Stack>
            </Modal>
        </>
    );
}