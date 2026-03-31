import { useEffect, useState, useMemo } from 'react';
import { Table, SimpleGrid, MantineProvider, AppShell, Burger, Group, Title, NavLink, Text, Paper, TextInput, Select, Button, Badge, Tabs, Textarea, ActionIcon, ScrollArea, Modal, Alert, UnstyledButton, MultiSelect, Switch, Stack, ThemeIcon, Indicator, Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArchive, IconActivity, IconTrash, IconCheck, IconLeaf, IconTractor, IconCalendar, IconArrowBackUp, IconCurrencyDollar, IconSkull, IconHeartbeat, IconBabyCarriage, IconScissors, IconBuilding, IconHome, IconSettings, IconEdit, IconPlus, IconPlaylistAdd, IconLogout, IconTrendingUp, IconChartDots, IconTag, IconCalendarEvent, IconBell, IconInfoCircle, IconTruckDelivery } from '@tabler/icons-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import '@mantine/core/styles.css';
import { supabase } from './supabase';
import { type Session } from '@supabase/supabase-js';

import Login from './views/Login';
import Inicio from './views/Inicio';
import Economia from './views/Economia';
import Masivos from './views/Masivos';
import Agenda from './views/Agenda';
import Lotes from './views/Lotes';
import Agricultura from './views/Agricultura';
import Hacienda from './views/Hacienda';
import Actividad from './views/Actividad';

interface Establecimiento { id: string; nombre: string; renspa?: string; }
interface Animal { id: string; caravana: string; categoria: string; sexo: string; estado: string; condicion: string; origen: string; detalle_baja?: string; detalles?: string; destacado?: boolean; fecha_nacimiento?: string; fecha_ingreso?: string; madre_id?: string; castrado?: boolean; establecimiento_id: string; potrero_id?: string; parcela_id?: string; lote_id?: string; toros_servicio_ids?: string[]; }
interface Evento { id: string; fecha_evento: string; tipo: string; resultado: string; detalle: string; animal_id: string; costo?: number; datos_extra?: any; animales?: { caravana: string } }

const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };
const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };
const getHoyIso = () => { const d = new Date(); const offset = d.getTimezoneOffset(); return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]; };

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{data.fecha}</p>
                <p style={{ margin: 0, color: '#12b886', fontWeight: 'bold', marginTop: '4px' }}>Peso: {data.peso} kg</p>
                {data.gananciaIntervalo !== null && data.gananciaIntervalo !== undefined && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #eee' }}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#868e96', textTransform: 'uppercase' }}>Rendimiento parcial:</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: data.gananciaIntervalo >= 0 ? '#228be6' : '#fa5252' }}>{data.gananciaIntervalo > 0 ? '+' : ''}{data.gananciaIntervalo} kg</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#7950f2' }}>{data.adpvIntervalo} kg/día</p>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [opened, { toggle }] = useDisclosure(); 
  const [activeSection, setActiveSection] = useState('inicio'); 
  const [loading, setLoading] = useState(false);
  const [bellOpened, setBellOpened] = useState(false);
  
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [campoId, setCampoId] = useState<string | null>(null);
  const [modalConfigOpen, { open: openModalConfig, close: closeModalConfig }] = useDisclosure(false); 
  const [nuevoCampoNombre, setNuevoCampoNombre] = useState('');
  const [nuevoCampoRenspa, setNuevoCampoRenspa] = useState('');

  const [animales, setAnimales] = useState<Animal[]>([]);
  const [potreros, setPotreros] = useState<any[]>([]);
  const [parcelas, setParcelas] = useState<any[]>([]); 
  const [lotes, setLotes] = useState<any[]>([]);
  const [eventosGlobales, setEventosGlobales] = useState<Evento[]>([]);
  const [eventosLotesGlobal, setEventosLotesGlobal] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);

  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [modalTransfOpen, { open: openModalTransf, close: closeModalTransf }] = useDisclosure(false);
  const [transfActiva, setTransfActiva] = useState<any>(null);
  const [transfPotreroId, setTransfPotreroId] = useState<string | null>(null);

  const [modalAltaOpen, { open: openModalAlta, close: closeModalAlta }] = useDisclosure(false);
  const [caravana, setCaravana] = useState('');
  const [categoria, setCategoria] = useState<string | null>('Vaca');
  const [sexo, setSexo] = useState<string | null>('H');
  const [sexoBloqueado, setSexoBloqueado] = useState(true);
  const [origenModal, setOrigenModal] = useState<string | null>('PROPIO');
  const [precioCompra, setPrecioCompra] = useState<string | number>('');
  const [nuevoEstadoReproductivo, setNuevoEstadoReproductivo] = useState<string | null>('VACÍA');
  const [nuevoMesesGestacion, setNuevoMesesGestacion] = useState<string | null>(null);
  const [edadEstimada, setEdadEstimada] = useState<string | null>(null);
  
  const [modalVacaOpen, { open: openModalVaca, close: closeModalVaca }] = useDisclosure(false);
  const [animalSelId, setAnimalSelId] = useState<string | null>(null);
  const [fichaAnterior, setFichaAnterior] = useState<Animal | null>(null); 
  const [activeTabVaca, setActiveTabVaca] = useState<string | null>('historia'); 

  const animalSel = useMemo(() => animales.find(a => a.id === animalSelId) || null, [animales, animalSelId]);

  const [eventosFicha, setEventosFicha] = useState<Evento[]>([]);
  const [ultimoPeso, setUltimoPeso] = useState<string>('Sin datos');
  const [madreCaravana, setMadreCaravana] = useState<string>(''); 
  const [hijos, setHijos] = useState<{ id: string, caravana: string, sexo: string, estado: string, ajeno?: boolean }[]>([]); 
  const [nombresTorosCartel, setNombresTorosCartel] = useState<string | null>(null);
  
  const [modalGraficoOpen, { open: openModalGrafico, close: closeModalGrafico }] = useDisclosure(false);
  const [graficoAnimalId, setGraficoAnimalId] = useState<string | null>(null);
  const [datosGrafico, setDatosGrafico] = useState<any[]>([]);
  const [statsGrafico, setStatsGrafico] = useState({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' });
  const [loadingGrafico, setLoadingGrafico] = useState(false);

  const opcionesGestacion = [ { value: '0.5', label: '15 días (0.5 mes)' }, { value: '1', label: '1 mes' }, { value: '1.5', label: '1 mes y medio' }, { value: '2', label: '2 meses' }, { value: '2.5', label: '2 meses y medio' }, { value: '3', label: '3 meses' }, { value: '3.5', label: '3 meses y medio' }, { value: '4', label: '4 meses' }, { value: '4.5', label: '4 meses y medio' }, { value: '5', label: '5 meses' }, { value: '5.5', label: '5 meses y medio' }, { value: '6', label: '6 meses' }, { value: '6.5', label: '6 meses y medio' }, { value: '7', label: '7 meses' }, { value: '7.5', label: '7 meses y medio' }, { value: '8', label: '8 meses' }, { value: '8.5', label: '8 meses y medio' }, { value: '9', label: '9 meses (A parir)' } ];
  const opcionesEdadEstimada = [ { value: '0', label: 'Recién nacido (0 meses)' }, { value: '3', label: '3 meses' }, { value: '6', label: '6 meses (Destete)' }, { value: '9', label: '9 meses' }, { value: '12', label: '1 año' }, { value: '18', label: '1.5 años' }, { value: '24', label: '2 años' }, { value: '36', label: '3 años' }, { value: '48', label: '4 años' }, { value: '60', label: '5 años' }, { value: '72', label: '6 años' }, { value: '84', label: '7 años' }, { value: '96', label: '8 años' }, { value: '108', label: '9+ años' } ];

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

  const [modalEditEventOpen, { open: openModalEditEvent, close: closeModalEditEvent }] = useDisclosure(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventDate, setEditingEventDate] = useState<Date | null>(new Date());
  const [editingEventRes, setEditingEventRes] = useState('');
  const [editingEventDet, setEditingEventDet] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) loadCampos(); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) loadCampos(); else { setEstablecimientos([]); setCampoId(null); } });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!campoId || !session) return;
    localStorage.setItem('campoId', campoId); 
    fetchAnimales(); fetchPotreros(); fetchParcelas(); fetchLotes(); fetchEventosLotesGlobal(); fetchAgenda(); fetchTransferencias();
    if (activeSection === 'inicio' || activeSection === 'actividad') fetchActividadGlobal();
  }, [activeSection, campoId, session]); 

  async function handleLogin() { setAuthLoading(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); setAuthLoading(false); if (error) alert("Error: " + error.message); }
  async function handleLogout() { await supabase.auth.signOut(); setSession(null); }

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

  useEffect(() => {
    if (['Vaca', 'Vaquillona'].includes(categoria || '')) { setSexo('H'); setSexoBloqueado(true); } else if (['Toro', 'Novillo'].includes(categoria || '')) { setSexo('M'); setSexoBloqueado(true); } else { setSexoBloqueado(false); }
  }, [categoria]);

  async function loadCampos() { const { data } = await supabase.from('establecimientos').select('*').order('created_at'); if (data && data.length > 0) { setEstablecimientos(data); const guardado = localStorage.getItem('campoId'); if (guardado && data.find(c => c.id === guardado)) setCampoId(guardado); else if (!campoId) setCampoId(data[0].id); } }
  async function fetchAnimales() { if (!campoId) return; let query = supabase.from('animales').select('*').eq('establecimiento_id', campoId).neq('estado', 'ELIMINADO').order('created_at', { ascending: false }); const { data } = await query; setAnimales(data || []); }
  async function fetchPotreros() { if (!campoId) return; const { data } = await supabase.from('potreros').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setPotreros(data || []); }
  async function fetchParcelas() { if (!campoId) return; const { data } = await supabase.from('parcelas').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setParcelas(data || []); }
  async function fetchLotes() { if (!campoId) return; const { data } = await supabase.from('lotes').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setLotes(data || []); }
  async function fetchActividadGlobal() { if (!campoId) return; const { data } = await supabase.from('eventos').select('*, animales!inner(caravana)').eq('establecimiento_id', campoId).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false }); setEventosGlobales(data as any || []); }
  async function fetchEventosLotesGlobal() { if (!campoId) return; const { data } = await supabase.from('lotes_eventos').select('*').eq('establecimiento_id', campoId).order('fecha', { ascending: false }); setEventosLotesGlobal(data || []); }
  async function fetchAgenda() { if(!campoId) return; const { data } = await supabase.from('agenda').select('*').eq('establecimiento_id', campoId).order('fecha_programada', { ascending: true }); if (data) setAgenda(data); }
  
  async function fetchTransferencias() {
      if (!campoId) return;
      // Simplificado: ahora solo trae la data pura, porque la DB ya tiene el origen_nombre
      const { data: transData } = await supabase.from('transferencias').select('*').eq('campo_destino_id', campoId).eq('estado', 'PENDIENTE');
      setTransferencias(transData || []);
  }

  async function crearCampo() { if (!nuevoCampoNombre) return; const { error } = await supabase.from('establecimientos').insert([{ nombre: nuevoCampoNombre, renspa: nuevoCampoRenspa, user_id: session?.user.id }]); if (error) alert("Error: " + error.message); else { setNuevoCampoNombre(''); setNuevoCampoRenspa(''); loadCampos(); } }
  async function borrarCampo(id: string) { if (!confirm("⚠️ ¿BORRAR ESTABLECIMIENTO COMPLETO?")) return; const { error } = await supabase.from('establecimientos').delete().eq('id', id); if (error) alert("Error al borrar."); else { if (id === campoId) { const restantes = establecimientos.filter(e => e.id !== id); if (restantes.length > 0) setCampoId(restantes[0].id); else window.location.reload(); } loadCampos(); } }
  async function editarCampo(id: string, nombreActual: string, renspaActual?: string) { const nuevoNombre = prompt("Nuevo nombre del establecimiento:", nombreActual); if (nuevoNombre === null) return; const nuevoRenspa = prompt("Número de RENSPA:", renspaActual || ''); if (nuevoRenspa === null) return; await supabase.from('establecimientos').update({ nombre: nuevoNombre, renspa: nuevoRenspa }).eq('id', id); loadCampos(); }

  async function recargarFicha(id: string) { const { data } = await supabase.from('eventos').select('*').eq('animal_id', id).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false }); if (data) setEventosFicha(data); }
  async function actualizarCartelToros(idAnimal: string) { setNombresTorosCartel(null); const { data } = await supabase.from('animales').select('toros_servicio_ids').eq('id', idAnimal).single(); if (data && data.toros_servicio_ids && data.toros_servicio_ids.length > 0) { const nombres = animales.filter(a => data.toros_servicio_ids!.includes(a.id)).map(a => a.caravana).join(' - '); setNombresTorosCartel(nombres || null); } else { setNombresTorosCartel(null); } }
  async function borrarEvento(id: string) { if(!confirm("¿Borrar evento?")) return; await supabase.from('eventos').delete().eq('id', id); if(animalSelId) recargarFicha(animalSelId); fetchActividadGlobal(); }

  function iniciarEdicionEvento(ev: Evento) { setEditingEventId(ev.id); const partes = ev.fecha_evento.split('T')[0].split('-'); setEditingEventDate(new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0)); setEditingEventRes(ev.resultado); setEditingEventDet(ev.detalle || ''); openModalEditEvent(); }
  async function guardarEdicionEvento() { if(!editingEventId || !editingEventDate) return; await supabase.from('eventos').update({ fecha_evento: editingEventDate.toISOString(), resultado: editingEventRes, detalle: editingEventDet }).eq('id', editingEventId); closeModalEditEvent(); if(animalSelId) recargarFicha(animalSelId); fetchActividadGlobal(); }

  const abrirGraficoPeso = () => { setGraficoAnimalId(animalSelId); openModalGrafico(); };

  useEffect(() => {
    async function cargarDatosGrafico() {
        if (!graficoAnimalId) return; setLoadingGrafico(true);
        const { data } = await supabase.from('eventos').select('*').eq('animal_id', graficoAnimalId).eq('tipo', 'PESAJE').order('fecha_evento', { ascending: true });
        if (data) {
            const pesajesValidos = data.map(p => { const pesoNum = parseFloat(p.resultado.replace(/[^0-9.]/g, '')); return { fecha: formatDate(p.fecha_evento), rawDate: new Date(p.fecha_evento), peso: isNaN(pesoNum) ? 0 : pesoNum, nombre: 'Peso' }; }).filter(p => p.peso > 0);
            const finalData = pesajesValidos.map((p, index) => {
                if (index === 0) return { ...p, gananciaIntervalo: null, adpvIntervalo: null };
                const prev = pesajesValidos[index - 1]; const ganancia = p.peso - prev.peso; const diffTime = Math.abs(p.rawDate.getTime() - prev.rawDate.getTime()); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { ...p, gananciaIntervalo: ganancia, adpvIntervalo: diffDays > 0 ? (ganancia / diffDays).toFixed(3) : '0' };
            });
            setDatosGrafico(finalData);
            if (finalData.length > 1) {
                const inicio = finalData[0]; const fin = finalData[finalData.length - 1]; const gananciaTotal = fin.peso - inicio.peso; const diffTime = Math.abs(fin.rawDate.getTime() - inicio.rawDate.getTime()); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setStatsGrafico({ inicio: inicio.peso, actual: fin.peso, ganancia: gananciaTotal, dias: diffDays, adpv: diffDays > 0 ? (gananciaTotal / diffDays).toFixed(3) : '0' });
            } else if (finalData.length === 1) { setStatsGrafico({ inicio: finalData[0].peso, actual: finalData[0].peso, ganancia: 0, dias: 0, adpv: '0' }); } else { setStatsGrafico({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' }); }
        }
        setLoadingGrafico(false);
    }
    cargarDatosGrafico();
  }, [graficoAnimalId]);

  async function guardarAnimal(cerrarModal: boolean = true) {
    if (!caravana || !campoId) return;
    if (origenModal === 'COMPRADO' && !precioCompra) return alert("Ingresá el precio de compra.");
    
    const yaExiste = animales.some(a => a.caravana.toLowerCase() === caravana.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(a.estado));
    if (yaExiste) return alert("❌ ERROR: Ya existe un animal ACTIVO con esa caravana.");
    
    setLoading(true); const hoy = new Date().toISOString().split('T')[0];
    let fechaNac = hoy; if (edadEstimada) { const d = new Date(); d.setMonth(d.getMonth() - parseInt(edadEstimada)); fechaNac = d.toISOString().split('T')[0]; }
    let estadoInicial = 'ACTIVO'; if (['Vaca', 'Vaquillona'].includes(categoria || '')) { estadoInicial = nuevoEstadoReproductivo || 'VACÍA'; }
    
    const { data: newAnimalData, error } = await supabase.from('animales').insert([{ caravana, categoria, sexo, estado: estadoInicial, condicion: 'SANA', origen: origenModal, fecha_nacimiento: fechaNac, fecha_ingreso: hoy, establecimiento_id: campoId }]).select();
    
    if (!error && newAnimalData && newAnimalData.length > 0) {
        const animalId = newAnimalData[0].id;
        if (origenModal === 'COMPRADO' && precioCompra) {
            await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: hoy, tipo: 'EGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Compra animal caravana: ${caravana}`, monto: Number(precioCompra) });
            await supabase.from('eventos').insert({ animal_id: animalId, fecha_evento: new Date().toISOString(), tipo: 'COMPRA', resultado: 'Animal Comprado', detalle: `Costo: $${precioCompra}`, establecimiento_id: campoId });
        }
        if (estadoInicial === 'PREÑADA' && nuevoMesesGestacion) {
            const diasGestacionActual = parseFloat(nuevoMesesGestacion) * 30.4; const diasFaltantes = Math.round(283 - diasGestacionActual); const fechaParto = new Date(); fechaParto.setDate(fechaParto.getDate() + diasFaltantes);
            await supabase.from('agenda').insert({ establecimiento_id: campoId, fecha_programada: fechaParto.toISOString().split('T')[0], titulo: `Parto: ${caravana}`, descripcion: `Parto estimado al ingresar animal.`, tipo: 'PARTO_ESTIMADO', animal_id: animalId });
            fetchAgenda();
        }
        setCaravana(''); setPrecioCompra(''); setOrigenModal('PROPIO'); setNuevoEstadoReproductivo('VACÍA'); setNuevoMesesGestacion(null); setEdadEstimada(null); fetchAnimales(); if (cerrarModal) closeModalAlta(); 
    } else if (error) { alert("Error: " + error.message); }
    setLoading(false); 
  }

  async function abrirFichaVaca(animal: Animal) {
    setActiveTabVaca('historia'); setAnimalSelId(animal.id); 
    setEditCaravana(animal.caravana); setEditCategoria(animal.categoria); setEditSexo(animal.sexo); setEditEstado(animal.estado); setEditCastrado(animal.castrado || false);
    const condArray = animal.condicion && animal.condicion !== 'SANA' ? animal.condicion.split(', ') : []; setEditCondicion(condArray); setEditDetalles(animal.detalles || '');
    setEditPotreroId(animal.potrero_id || null); setEditParcelaId(animal.parcela_id || null); setEditLoteId(animal.lote_id || null); setEditFechaNac(animal.fecha_nacimiento || ''); setEditFechaIngreso(animal.fecha_ingreso || '');
    
    if (animal.madre_id) { 
        const m = animales.find(a => a.id === animal.madre_id); 
        if (m) { setMadreCaravana(m.caravana); }
        else {
            const { data: madreData } = await supabase.from('animales').select('caravana').eq('id', animal.madre_id).single();
            setMadreCaravana(madreData ? `${madreData.caravana} (En otro campo)` : 'Desconocida');
        }
    } else { setMadreCaravana(''); }

    setHijos([]); 
    const { data: dataHijos } = await supabase.from('animales').select('id, caravana, sexo, estado, establecimiento_id').eq('madre_id', animal.id).neq('estado', 'ELIMINADO'); 
    if(dataHijos) {
        setHijos(dataHijos.map((h: any) => ({
            id: h.id, caravana: h.caravana, sexo: h.sexo, estado: h.estado, ajeno: h.establecimiento_id !== campoId
        })));
    }

    setEventosFicha([]); setFechaEvento(new Date()); setTipoEventoInput('PESAJE'); setModoBaja(null); setBajaPrecio(''); setBajaMotivo(''); setBajaKilosTotales(''); setBajaGastosVenta(''); setUltimoPeso('Calculando...'); setPesoNacimiento(''); setCostoEvento('');
    setEsVentaRed(false); setRenspaDestino('');
    if(!modalVacaOpen) openModalVaca(); recargarFicha(animal.id);
    const { data: pesoData } = await supabase.from('eventos').select('resultado').eq('animal_id', animal.id).eq('tipo', 'PESAJE').order('fecha_evento', { ascending: false }).limit(1);
    if (pesoData && pesoData.length > 0) setUltimoPeso(pesoData[0].resultado); else setUltimoPeso('-');
  }

  const navegarAHijo = async (hijoId: string) => {
      const currentAnimal = animales.find(a => a.id === animalSelId); if(currentAnimal) setFichaAnterior(currentAnimal); 
      const hijo = animales.find(a => a.id === hijoId);
      if (hijo) { abrirFichaVaca(hijo); } else { const { data } = await supabase.from('animales').select('*').eq('id', hijoId).single(); if (data) abrirFichaVaca(data); }
  };
  const handleCloseModalVaca = () => { if (fichaAnterior) { abrirFichaVaca(fichaAnterior); setActiveTabVaca('datos'); setFichaAnterior(null); } else { closeModalVaca(); setAnimalSelId(null); } };

  const desvincularToroDeVacas = async (toroId: string) => {
      const vacasAfectadas = animales.filter(a => a.toros_servicio_ids && a.toros_servicio_ids.includes(toroId));
      for (const vaca of vacasAfectadas) { const nuevosIds = vaca.toros_servicio_ids!.filter(id => id !== toroId); await supabase.from('animales').update({ toros_servicio_ids: nuevosIds.length > 0 ? nuevosIds : null }).eq('id', vaca.id); }
  };

  async function guardarEventoVaca() {
    if (!animalSelId || !animalSel || !tipoEventoInput || !fechaEvento || !campoId) return alert("Faltan datos");
    setLoading(true); let resultadoFinal = resultadoInput; let datosExtra = null; let nuevoEstado = ''; let nuevasCondiciones = [...editCondicion]; let esCastrado = editCastrado; let torosToUpdate: string[] = [];
    
    if (tipoEventoInput === 'TACTO') { 
        resultadoFinal = tactoResultado || ''; if (tactoResultado === 'PREÑADA') nuevoEstado = 'PREÑADA'; if (tactoResultado === 'VACÍA') nuevoEstado = 'VACÍA'; 
        if (tactoResultado === 'PREÑADA' && mesesGestacion) {
            const diasGestacionActual = parseFloat(mesesGestacion) * 30.4; const diasFaltantes = Math.round(283 - diasGestacionActual); const fechaParto = new Date(fechaEvento); fechaParto.setDate(fechaParto.getDate() + diasFaltantes);
            await supabase.from('agenda').insert({ establecimiento_id: campoId, fecha_programada: fechaParto.toISOString().split('T')[0], titulo: `Parto: ${animalSel.caravana}`, descripcion: `Parto estimado calculado por tacto (${mesesGestacion} meses).`, tipo: 'PARTO_ESTIMADO', animal_id: animalSel.id });
            fetchAgenda();
        }
    } 
    else if (tipoEventoInput === 'PARTO') {
      if (!nuevoTerneroCaravana) { setLoading(false); return alert("Falta caravana ternero."); }
      const yaExiste = animales.some(a => a.caravana.toLowerCase() === nuevoTerneroCaravana.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(a.estado));
      if (yaExiste) { setLoading(false); return alert("❌ ERROR: Ya existe un animal ACTIVO con esa caravana."); }
      if (pesoNacimiento) {
          const pesoNacNum = parseFloat(pesoNacimiento.replace(/[^\d.]/g, ''));
          if (isNaN(pesoNacNum) || pesoNacNum <= 0 || pesoNacimiento.includes('-')) { setLoading(false); return alert("❌ ERROR: Peso inválido."); }
      }
      const fechaParto = fechaEvento.toISOString().split('T')[0];
      const { data: nuevoTernero, error: err } = await supabase.from('animales').insert([{ caravana: nuevoTerneroCaravana, categoria: 'Ternero', sexo: nuevoTerneroSexo, estado: 'LACTANTE', condicion: 'SANA', origen: 'NACIDO', madre_id: animalSel.id, fecha_nacimiento: fechaParto, fecha_ingreso: fechaParto, establecimiento_id: campoId, potrero_id: animalSel.potrero_id, parcela_id: animalSel.parcela_id, lote_id: animalSel.lote_id }]).select().single();
      if (err) { setLoading(false); return alert("Error: " + err.message); }
      if (pesoNacimiento) await supabase.from('eventos').insert({ animal_id: nuevoTernero.id, tipo: 'PESAJE', resultado: `${pesoNacimiento}kg`, detalle: 'Peso al nacer', fecha_evento: fechaEvento.toISOString(), establecimiento_id: campoId });
      
      nuevoEstado = 'EN LACTANCIA'; if (animalSel.categoria === 'Vaquillona') await supabase.from('animales').update({ categoria: 'Vaca' }).eq('id', animalSel.id);
      resultadoFinal = `Nació ${nuevoTerneroCaravana} (${nuevoTerneroSexo})`; datosExtra = { ternero_caravana: nuevoTerneroCaravana, ternero_sexo: nuevoTerneroSexo }; 
      if (nuevoTernero) setHijos(prev => [...prev, { id: nuevoTernero.id, caravana: nuevoTernero.caravana, sexo: nuevoTernero.sexo, estado: 'LACTANTE' }]);
    }
    else if (tipoEventoInput === 'DESTETE') {
        resultadoFinal = 'Destete realizado';
        if (animalSel.categoria === 'Ternero') {
            nuevoEstado = 'ACTIVO';
            if (animalSel.madre_id) {
                await supabase.from('animales').update({ estado: 'VACÍA' }).eq('id', animalSel.madre_id);
                await supabase.from('eventos').insert({ animal_id: animalSel.madre_id, tipo: 'DESTETE', resultado: 'Cría destetada', detalle: `Ternero: ${animalSel.caravana}`, fecha_evento: fechaEvento.toISOString(), establecimiento_id: campoId });
            }
        } else if (['Vaca', 'Vaquillona'].includes(animalSel.categoria)) {
            nuevoEstado = 'VACÍA';
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
    const stringCondicion = nuevasCondiciones.length > 0 ? nuevasCondiciones.join(', ') : 'SANA'; const updates: any = { condicion: stringCondicion, castrado: esCastrado }; 
    if (nuevoEstado) updates.estado = nuevoEstado; if (tipoEventoInput === 'SERVICIO' && tipoServicio === 'TORO') updates.toros_servicio_ids = torosIdsInput; if (tipoEventoInput === 'PARTO') updates.toros_servicio_ids = null; 
    await supabase.from('animales').update(updates).eq('id', animalSel.id);

    if (torosToUpdate.length > 0) {
        await supabase.from('animales').update({ estado: 'EN SERVICIO' }).in('id', torosToUpdate);
        const torosEvents = torosToUpdate.map(toroId => ({ animal_id: toroId, fecha_evento: fechaEvento.toISOString(), tipo: 'SERVICIO', resultado: 'En servicio', detalle: `Asignado a vaca ${animalSel.caravana}`, establecimiento_id: campoId }));
        await supabase.from('eventos').insert(torosEvents);
    }
    setEditCondicion(nuevasCondiciones); setEditCastrado(esCastrado); if(nuevoEstado) setEditEstado(nuevoEstado); setLoading(false);
    if (!error) { recargarFicha(animalSel.id); if (tipoEventoInput === 'PESAJE') setUltimoPeso(resultadoFinal); setResultadoInput(''); setDetalleInput(''); setTorosIdsInput([]); setNuevoTerneroCaravana(''); setPesoNacimiento(''); setCostoEvento(''); setAdpvCalculado(null); setMesesGestacion(null); fetchAnimales(); actualizarCartelToros(animalSelId); }
  }

  async function actualizarAnimal() {
    if (!animalSelId || !animalSel || !campoId) return;
    const condStr = editCondicion.length > 0 ? editCondicion.join(', ') : 'SANA';
    const eventosAInsertar = []; const fechaStr = new Date().toISOString();

    if (animalSel.potrero_id !== editPotreroId || animalSel.parcela_id !== editParcelaId) {
        const pNom = potreros.find(p => p.id === editPotreroId)?.nombre; const parcNom = parcelas.find(p => p.id === editParcelaId)?.nombre;
        const desc = editPotreroId ? `Asignado a: ${pNom} ${parcNom ? `(${parcNom})` : ''}` : 'Retirado de potrero';
        eventosAInsertar.push({ animal_id: animalSel.id, fecha_evento: fechaStr, tipo: 'MOVIMIENTO_POTRERO', resultado: 'MOVIDO DE POTRERO', detalle: desc, datos_extra: { potrero_destino: pNom, parcela_destino: parcNom, potrero_id: editPotreroId, parcela_id: editParcelaId }, establecimiento_id: campoId });
    }

    if (animalSel.lote_id !== editLoteId) {
        const lNom = lotes.find(l => l.id === editLoteId)?.nombre; const desc = editLoteId ? `Asignado a lote: ${lNom}` : 'Retirado de lote';
        eventosAInsertar.push({ animal_id: animalSel.id, fecha_evento: fechaStr, tipo: 'CAMBIO_LOTE', resultado: 'CAMBIO DE LOTE', detalle: desc, datos_extra: { lote_destino: lNom, lote_id: editLoteId }, establecimiento_id: campoId });
    }

    const { error } = await supabase.from('animales').update({ caravana: editCaravana, categoria: editCategoria, sexo: editSexo, estado: editEstado, condicion: condStr, castrado: editCastrado, detalles: editDetalles, potrero_id: editPotreroId, parcela_id: editParcelaId, lote_id: editLoteId, fecha_nacimiento: editFechaNac || null, fecha_ingreso: editFechaIngreso || null }).eq('id', animalSelId);
    if (eventosAInsertar.length > 0) { await supabase.from('eventos').insert(eventosAInsertar); }
    if (!error) { alert("Datos actualizados"); fetchAnimales(); fetchActividadGlobal(); }
  }

  async function borrarAnimalDefinitivo() {
    if (!animalSelId || !campoId) return; if (!confirm("⚠️ ¿BORRAR DEFINITIVAMENTE?")) return;
    await supabase.from('animales').update({ estado: 'ELIMINADO' }).eq('id', animalSelId);
    await supabase.from('eventos').insert({ animal_id: animalSelId, fecha_evento: new Date().toISOString(), tipo: 'BORRADO', resultado: 'ELIMINADO DEL SISTEMA', detalle: 'Borrado manual por seguridad', establecimiento_id: campoId });
    closeModalVaca(); fetchAnimales();
  }

  async function confirmarBaja() { 
      if (!animalSelId || !animalSel || !modoBaja || !campoId) return; 
      
      if (modoBaja === 'VENDIDO') {
          if (!bajaPrecio) return alert("Ingresá el precio");
          if (bajaModalidadVenta === 'KILO' && !bajaKilosTotales) return alert("Faltan los kilos totales");
      }
      if (modoBaja === 'MUERTO' && !bajaMotivo) return alert("Ingresá la causa"); 
      if (modoBaja === 'TRASLADO' && !bajaMotivo) return alert("Seleccioná el establecimiento de destino"); 
      if (!confirm(`¿Confirmar ${modoBaja === 'TRASLADO' ? 'traslado' : 'salida'}?`)) return; 
      
      setLoading(true);
      const fechaStr = new Date().toISOString();

      if (modoBaja === 'TRASLADO') {
          const nombreDestino = establecimientos.find(e => e.id === bajaMotivo)?.nombre;
          const nombreOrigen = establecimientos.find(e => e.id === campoId)?.nombre;
          
          const { data: destAnimals } = await supabase.from('animales').select('caravana').eq('establecimiento_id', bajaMotivo).in('estado', ['ACTIVO', 'PREÑADA', 'VACÍA', 'EN SERVICIO', 'APARTADO']);
          const destCaravanas = destAnimals?.map(a => a.caravana.toLowerCase()) || [];
          let nuevaCaravana = animalSel.caravana;
          if (destCaravanas.includes(nuevaCaravana.toLowerCase())) { nuevaCaravana = `${nuevaCaravana} (T)`; }

          await supabase.from('animales').update({ establecimiento_id: bajaMotivo, potrero_id: null, parcela_id: null, lote_id: null, caravana: nuevaCaravana, toros_servicio_ids: null }).eq('id', animalSelId);
          await supabase.from('eventos').insert({ animal_id: animalSelId, tipo: 'TRASLADO_SALIDA', resultado: 'TRASLADO A OTRO CAMPO', detalle: `Destino: ${nombreDestino}`, establecimiento_id: campoId });
          await supabase.from('eventos').insert({ animal_id: animalSelId, fecha_evento: fechaStr, tipo: 'TRASLADO_INGRESO', resultado: 'INGRESO POR TRASLADO', detalle: `Origen: ${nombreOrigen}`, establecimiento_id: bajaMotivo });
          
          await supabase.from('agenda').update({ establecimiento_id: bajaMotivo }).eq('animal_id', animalSelId).eq('completado', false);
          
      } else if (modoBaja === 'VENDIDO') {
          const precioNum = Number(bajaPrecio);
          let totalIngreso = 0;
          if (bajaModalidadVenta === 'TOTAL') totalIngreso = precioNum;
          else if (bajaModalidadVenta === 'KILO') totalIngreso = precioNum * Number(bajaKilosTotales);
          const gastosTotales = Number(bajaGastosVenta) || 0;

          if (esVentaRed) {
              if (!renspaDestino) { setLoading(false); return alert("Ingresá el RENSPA del comprador."); }
              
              const { data } = await supabase.rpc('buscar_campo_por_renspa', { buscar_renspa: renspaDestino.trim() }).single();
              const dest = data as any;
              
              if (!dest) { setLoading(false); return alert("No se encontró ningún campo con ese RENSPA en RodeoControl."); }
              if (dest.id === campoId) { setLoading(false); return alert("No podés transferirte a vos mismo."); }

              const nombreOrigen = establecimientos.find(e => e.id === campoId)?.nombre || 'Campo Desconocido';

              const { error: errTransf } = await supabase.from('transferencias').insert({
                  campo_origen_id: campoId,
                  campo_destino_id: dest.id,
                  animales_ids: [animalSelId],
                  precio_total: totalIngreso,
                  detalles: `Venta animal ${animalSel.caravana}`,
                  origen_nombre: nombreOrigen
              });
              
              if (errTransf) { setLoading(false); return alert("Error al transferir: " + errTransf.message); }

              await supabase.from('animales').update({ estado: 'EN TRÁNSITO', detalle_baja: `En tránsito a: ${dest.nombre}`, toros_servicio_ids: null }).eq('id', animalSelId);
              
              await supabase.from('eventos').insert({ animal_id: animalSelId, tipo: 'VENTA', resultado: 'VENDIDO', detalle: `En tránsito a: ${dest.nombre} - Total: $${totalIngreso}`, datos_extra: { destino: dest.nombre, modalidad: bajaModalidadVenta, ingreso_total: totalIngreso, gastos: gastosTotales }, establecimiento_id: campoId, costo: gastosTotales });
              await supabase.from('agenda').delete().eq('animal_id', animalSelId).eq('completado', false);
              if(animalSel.categoria === 'Toro') await desvincularToroDeVacas(animalSelId);
          } else {
              await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: fechaStr.split('T')[0], tipo: 'INGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Venta animal ${animalSel.caravana} - ${bajaMotivo || 'Individual'}`, monto: totalIngreso });
              await supabase.from('animales').update({ estado: 'VENDIDO', detalle_baja: `Venta: ${bajaMotivo || '-'} ($${totalIngreso})`, toros_servicio_ids: null }).eq('id', animalSelId);
              await supabase.from('eventos').insert({ animal_id: animalSelId, tipo: 'VENTA', resultado: 'VENDIDO', detalle: `Destino: ${bajaMotivo} - Total: $${totalIngreso}`, datos_extra: { destino: bajaMotivo, modalidad: bajaModalidadVenta, ingreso_total: totalIngreso, gastos: gastosTotales }, establecimiento_id: campoId, costo: gastosTotales });
              
              await supabase.from('agenda').delete().eq('animal_id', animalSelId).eq('completado', false);
              if(animalSel.categoria === 'Toro') await desvincularToroDeVacas(animalSelId);
          }
      } else {
          await supabase.from('animales').update({ estado: 'MUERTO', detalle_baja: `Causa: ${bajaMotivo}`, toros_servicio_ids: null }).eq('id', animalSelId); 
          await supabase.from('eventos').insert([{ animal_id: animalSelId, tipo: 'BAJA', resultado: 'MUERTO', detalle: `Causa: ${bajaMotivo}`, datos_extra: { causa: bajaMotivo }, establecimiento_id: campoId }]); 
          await supabase.from('agenda').delete().eq('animal_id', animalSelId).eq('completado', false);
      }
      
      setLoading(false); setBajaKilosTotales(''); setBajaGastosVenta(''); setBajaModalidadVenta('TOTAL'); setEsVentaRed(false); setRenspaDestino('');
      closeModalVaca(); fetchAnimales(); fetchActividadGlobal(); fetchAgenda();
  }

  async function aceptarTransferencia() {
      if (!transfActiva || !campoId) return;
      setLoading(true);
      const ids = transfActiva.animales_ids;
      const precio = transfActiva.precio_total;
      const fechaStr = new Date().toISOString();

      const { data: destAnimals } = await supabase.from('animales').select('caravana').eq('establecimiento_id', campoId).in('estado', ['ACTIVO', 'PREÑADA', 'VACÍA', 'EN SERVICIO', 'APARTADO']);
      const destCaravanas = destAnimals?.map(a => a.caravana.toLowerCase()) || [];

      const { data: incomingAnimals } = await supabase.from('animales').select('id, caravana').in('id', ids);

      for (const anim of incomingAnimals || []) {
          let c = anim.caravana;
          if (destCaravanas.includes(c.toLowerCase())) c = `${c} (T)`;
          await supabase.from('animales').update({ establecimiento_id: campoId, estado: 'ACTIVO', potrero_id: transfPotreroId, detalle_baja: null, caravana: c }).eq('id', anim.id);
      }

      await supabase.from('eventos').update({ establecimiento_id: campoId }).in('animal_id', ids).neq('tipo', 'VENTA');
      await supabase.from('agenda').update({ establecimiento_id: campoId }).in('animal_id', ids);

      const eventosIngreso = ids.map((id: string) => ({ animal_id: id, tipo: 'COMPRA', resultado: 'Ingreso por Red', detalle: `Proveniente de: ${transfActiva.origen_nombre}`, establecimiento_id: campoId, fecha_evento: fechaStr }));
      await supabase.from('eventos').insert(eventosIngreso);

      await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: fechaStr.split('T')[0], tipo: 'EGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Compra Red (${ids.length} animales) a ${transfActiva.origen_nombre}`, monto: precio });
      await supabase.from('caja').insert({ establecimiento_id: transfActiva.campo_origen_id, fecha: fechaStr.split('T')[0], tipo: 'INGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Cobro Red (${ids.length} animales) de ${establecimientos.find(e => e.id === campoId)?.nombre}`, monto: precio });

      await supabase.from('transferencias').update({ estado: 'ACEPTADA' }).eq('id', transfActiva.id);
      
      setLoading(false); closeModalTransf(); setTransfActiva(null); fetchTransferencias(); fetchAnimales(); fetchActividadGlobal();
  }

  async function rechazarTransferencia() {
      if (!transfActiva || !confirm("¿Rechazar transferencia? Los animales volverán al campo de origen.")) return;
      setLoading(true);
      await supabase.from('transferencias').update({ estado: 'RECHAZADA' }).eq('id', transfActiva.id);
      await supabase.from('animales').update({ estado: 'ACTIVO', detalle_baja: null }).in('id', transfActiva.animales_ids);
      
      await supabase.from('eventos').delete().in('animal_id', transfActiva.animales_ids).eq('tipo', 'VENTA');

      setLoading(false); closeModalTransf(); setTransfActiva(null); fetchTransferencias();
  }

  async function restaurarAnimal() { 
      if (!animalSelId || !animalSel || !confirm("¿Restaurar a Hacienda Activa?")) return; 
      if (animalSel.estado === 'VENDIDO') {
          await supabase.from('caja').delete().eq('establecimiento_id', campoId).eq('categoria', 'Hacienda (Venta/Compra)').like('detalle', `Venta animal ${animalSel.caravana} -%`);
      }
      await supabase.from('animales').update({ estado: 'ACTIVO', detalle_baja: null }).eq('id', animalSelId); 
      await supabase.from('eventos').insert([{ animal_id: animalSelId, tipo: 'RESTAURACION', resultado: 'Reingreso', detalle: 'Restaurado', establecimiento_id: campoId! }]); 
      closeModalVaca(); fetchAnimales(); 
  }

  const esActivo = animalSel?.estado !== 'VENDIDO' && animalSel?.estado !== 'MUERTO' && animalSel?.estado !== 'ELIMINADO' && animalSel?.estado !== 'EN TRÁNSITO';

  const opcionesDisponibles = (() => { 
      if (!animalSel) return []; 
      const base = ['PESAJE', 'ENFERMEDAD', 'LESION', 'CURACION', 'TRATAMIENTO', 'VACUNACION', 'OTRO'];
      if (['Vaca', 'Vaquillona'].includes(animalSel.categoria)) return [...base, 'TACTO', 'SERVICIO', 'PARTO', 'DESTETE']; 
      if (animalSel.categoria === 'Ternero') return animalSel.sexo === 'M' ? [...base, 'CAPADO', 'DESTETE'] : [...base, 'DESTETE']; 
      if (animalSel.categoria === 'Toro') return [...base, 'RASPAJE', 'APARTADO']; 
      return base; 
  })();

  const hoyFormateado = getHoyIso();
  const tareasPendientesUrgentes = agenda.filter(t => !t.completado && t.fecha_programada < hoyFormateado);
  const tareasParaHoy = agenda.filter(t => !t.completado && t.fecha_programada === hoyFormateado);
  const tareasAtrasadas = agenda.filter(t => !t.completado && t.fecha_programada < hoyFormateado);

  const torosDisponibles = animales.filter(a => a.categoria === 'Toro' && a.estado !== 'MUERTO' && a.estado !== 'VENDIDO');

  return (
    <MantineProvider>
        {!session ? (
            <Login email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleLogin={handleLogin} authLoading={authLoading} />
        ) : (
          <AppShell header={{ height: 60 }} navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
            <AppShell.Header>
              <Group h="100%" px="md" justify="space-between">
                <Group gap="sm" align="center" style={{ flex: 1 }}>
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <IconLeaf color="teal" size={28} />
                    <Title order={3} visibleFrom="xs">RodeoControl</Title>
                    {campoId && establecimientos.length > 0 && (
                        <Group gap="sm" align="center" visibleFrom="sm">
                            <Text size="xl" c="dimmed" style={{ fontWeight: 300, userSelect: 'none' }}>|</Text>
                            <Title order={4} c="dimmed" fw={500}>{establecimientos.find(e => e.id === campoId)?.nombre || ''}</Title>
                        </Group>
                    )}
                </Group>
                <Group>
                    {campoId && (
                        <Popover width={300} position="bottom-end" withArrow shadow="md" opened={bellOpened} onChange={setBellOpened}>
                            <Popover.Target>
                                <Indicator disabled={tareasPendientesUrgentes.length === 0 && tareasParaHoy.length === 0 && transferencias.length === 0} color="red" size={15} label={tareasPendientesUrgentes.length + tareasParaHoy.length + transferencias.length} offset={4} zIndex={100}>
                                    <ActionIcon variant="light" color="orange" size="lg" radius="xl" onClick={() => setBellOpened((o) => !o)}><IconBell size={22} /></ActionIcon>
                                </Indicator>
                            </Popover.Target>
                            <Popover.Dropdown>
                                <Text size="sm" fw={700} mb="xs">Centro de Notificaciones</Text>
                                {transferencias.length > 0 && (
                                    <Alert color="blue" mb="sm" title="¡Hacienda Entrante!" p="xs">
                                        Tenés {transferencias.length} transferencia(s) pendiente(s).
                                        <Button size="xs" mt="xs" fullWidth color="blue" onClick={() => { setTransfActiva(transferencias[0]); openModalTransf(); setBellOpened(false); }}>Revisar Ingresos</Button>
                                    </Alert>
                                )}
                                {tareasParaHoy.length === 0 && transferencias.length === 0 ? (<Text size="sm" c="dimmed">No hay notificaciones para hoy.</Text>) : (<Text size="sm" c="dark">Tenés <Text span fw={700} c="teal">{tareasParaHoy.length}</Text> tarea(s) para hoy.</Text>)}
                                {tareasAtrasadas.length > 0 && (<Text size="sm" c="red" mt={4} fw={500}>¡Atención! Tenés {tareasAtrasadas.length} tarea(s) atrasada(s).</Text>)}
                                <Button fullWidth size="xs" color="orange" mt="md" onClick={() => { setBellOpened(false); setActiveSection('agenda'); }}>Ir a la Agenda</Button>
                            </Popover.Dropdown>
                        </Popover>
                    )}
                </Group>
              </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md" style={{ display: 'flex', flexDirection: 'column' }}>
              <ScrollArea style={{ flex: 1 }} offsetScrollbars>
                  <NavLink label="Inicio / Resumen" leftSection={<IconHome size={20}/>} active={activeSection === 'inicio'} onClick={() => { setActiveSection('inicio'); toggle(); }} color="indigo" variant="filled" mb="md" style={{ borderRadius: 8 }}/>
                  <Text size="xs" fw={700} c="dimmed" mb="sm" mt="md">GANADERÍA</Text>
                  <NavLink label="Hacienda Activa" leftSection={<IconPlus size={20}/>} active={activeSection === 'hacienda'} onClick={() => { setActiveSection('hacienda'); toggle(); }} color="teal" variant="filled" style={{ borderRadius: 8 }}/>
                  <NavLink label="Lotes y Nutrición" leftSection={<IconTag size={20}/>} active={activeSection === 'lotes' || activeSection === 'lote_detalle'} onClick={() => { setActiveSection('lotes'); toggle(); }} color="grape" variant="filled" style={{ borderRadius: 8 }}/>
                  <NavLink label="Agenda / Tareas" leftSection={<IconCalendarEvent size={20}/>} active={activeSection === 'agenda'} onClick={() => { setActiveSection('agenda'); toggle(); }} color="orange" variant="filled" style={{ borderRadius: 8 }}/>
                  <NavLink label="Eventos Masivos" leftSection={<IconPlaylistAdd size={20}/>} active={activeSection === 'masivos'} onClick={() => { setActiveSection('masivos'); toggle(); }} color="violet" variant="filled" style={{ borderRadius: 8 }}/>
                  <NavLink label="Archivo / Bajas" leftSection={<IconArchive size={20}/>} active={activeSection === 'bajas'} onClick={() => { setActiveSection('bajas'); toggle(); }} color="red" variant="light" style={{ borderRadius: 8 }}/>
                  <Text size="xs" fw={700} c="dimmed" mt="xl" mb="sm">AGRICULTURA</Text>
                  <NavLink label="Potreros y Siembra" leftSection={<IconTractor size={20}/>} active={activeSection === 'agricultura' || activeSection === 'potrero_detalle'} onClick={() => { setActiveSection('agricultura'); toggle(); }} color="lime" variant="filled" style={{ borderRadius: 8 }}/>
                  <Text size="xs" fw={700} c="dimmed" mt="xl" mb="sm">ADMINISTRACIÓN</Text>
                  <NavLink label="Caja / Economía" leftSection={<IconCurrencyDollar size={20}/>} active={activeSection === 'economia'} onClick={() => { setActiveSection('economia'); toggle(); }} color="green" variant="filled" style={{ borderRadius: 8 }}/>
                  <Text size="xs" fw={700} c="dimmed" mt="xl" mb="sm">REPORTES</Text>
                  <NavLink label="Registro Actividad" leftSection={<IconActivity size={20}/>} active={activeSection === 'actividad'} onClick={() => { setActiveSection('actividad'); toggle(); }} color="blue" variant="filled" style={{ borderRadius: 8 }}/>
              </ScrollArea>
              
              <AppShell.Section style={{ borderTop: '1px solid #eee', paddingTop: '1rem', marginTop: '1rem' }}>
                  <Text size="xs" fw={700} c="dimmed" mb="xs" ml={4}>ESTABLECIMIENTO</Text>
                  <Group wrap="nowrap" gap="xs" mb="sm">
                      <Select data={establecimientos.map(e => ({ value: e.id, label: e.nombre }))} value={campoId} onChange={(val) => setCampoId(val)} allowDeselect={false} leftSection={<IconBuilding size={16}/>} variant="filled" style={{ flex: 1 }} comboboxProps={{ zIndex: 1001 }}/>
                      <ActionIcon variant="light" color="gray" size="lg" onClick={openModalConfig} title="Gestionar Campos" style={{ width: 36, height: 36 }}><IconSettings size={20}/></ActionIcon>
                  </Group>
                  <Button fullWidth variant="subtle" color="red" leftSection={<IconLogout size={18}/>} onClick={handleLogout}>Cerrar Sesión</Button>
              </AppShell.Section>
            </AppShell.Navbar>

            <AppShell.Main bg="gray.0">
              {activeSection === 'inicio' && <Inicio animales={animales} agenda={agenda} eventosGlobales={eventosGlobales} setActiveSection={setActiveSection} />}
              {activeSection === 'agenda' && <Agenda campoId={campoId} agenda={agenda} fetchAgenda={fetchAgenda} />}
              {(activeSection === 'lotes' || activeSection === 'lote_detalle') && <Lotes campoId={campoId} lotes={lotes} animales={animales} potreros={potreros} parcelas={parcelas} eventosLotesGlobal={eventosLotesGlobal} fetchLotes={fetchLotes} fetchAnimales={fetchAnimales} fetchEventosLotesGlobal={fetchEventosLotesGlobal} fetchActividadGlobal={fetchActividadGlobal} abrirFichaVaca={abrirFichaVaca}/>}
              {activeSection === 'masivos' && <Masivos campoId={campoId} animales={animales} potreros={potreros} parcelas={parcelas} lotes={lotes} establecimientos={establecimientos} fetchAnimales={fetchAnimales} fetchActividadGlobal={fetchActividadGlobal} setActiveSection={setActiveSection} />}
              {(activeSection === 'hacienda' || activeSection === 'bajas') && <Hacienda animales={animales} potreros={potreros} parcelas={parcelas} lotes={lotes} activeSection={activeSection} abrirFichaVaca={abrirFichaVaca} openModalAlta={openModalAlta} setAnimales={setAnimales}/>}
              {activeSection === 'economia' && campoId && <Economia campoId={campoId} establecimientos={establecimientos} />}
              {(activeSection === 'agricultura' || activeSection === 'potrero_detalle') && <Agricultura campoId={campoId} potreros={potreros} parcelas={parcelas} animales={animales} fetchPotreros={fetchPotreros} fetchParcelas={fetchParcelas} abrirFichaVaca={abrirFichaVaca} />}
              {activeSection === 'actividad' && <Actividad eventosGlobales={eventosGlobales} />}
            </AppShell.Main>
          </AppShell>
        )}

      <Modal opened={modalTransfOpen} onClose={closeModalTransf} title={<Text fw={700} size="lg">Hacienda Entrante por Red</Text>} centered>
          {transfActiva && (
              <Stack>
                  <Alert color="blue" icon={<IconTruckDelivery size={16}/>}>
                      Estás recibiendo <Text span fw={700}>{transfActiva.animales_ids.length} animal(es)</Text> de <Text span fw={700}>{transfActiva.origen_nombre}</Text>.<br/>
                      Monto a descontar de caja: <Text span fw={700} c="green">${transfActiva.precio_total}</Text>
                  </Alert>
                  <Select label="Asignar a Potrero" placeholder="Opcional" data={potreros.map(p => ({value: p.id, label: p.nombre}))} value={transfPotreroId} onChange={setTransfPotreroId} clearable />
                  <Group grow mt="md">
                      <Button color="red" variant="outline" onClick={rechazarTransferencia}>Rechazar</Button>
                      <Button color="teal" onClick={aceptarTransferencia} loading={loading}>Aceptar y Pagar</Button>
                  </Group>
              </Stack>
          )}
      </Modal>

      <Modal opened={modalAltaOpen} onClose={closeModalAlta} title={<Text fw={700} size="lg">Alta de Nuevo Animal</Text>} centered>
         <Stack>
            <TextInput label="Caravana" placeholder="ID del animal" value={caravana} onChange={(e) => setCaravana(e.target.value)} />
            <Group grow mt="sm"><Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={categoria} onChange={setCategoria} /><Select label="Sexo" data={['H', 'M']} value={sexo} onChange={setSexo} disabled={sexoBloqueado} /></Group>
            {['Vaca', 'Vaquillona'].includes(categoria || '') && (
                <Group grow mt="sm" align="flex-start">
                    <Select label="Estado Reproductivo" data={['VACÍA', 'PREÑADA', 'EN LACTANCIA']} value={nuevoEstadoReproductivo} onChange={setNuevoEstadoReproductivo} allowDeselect={false} />
                    {nuevoEstadoReproductivo === 'PREÑADA' && <Select label="Gestación Estimada" placeholder="Opcional" data={opcionesGestacion} value={nuevoMesesGestacion} onChange={setNuevoMesesGestacion} clearable leftSection={<IconBabyCarriage size={16}/>}/>}
                </Group>
            )}
            <Group grow mt="sm" align="flex-start">
                <Select label="Origen" data={['PROPIO', 'COMPRADO']} value={origenModal} onChange={setOrigenModal} allowDeselect={false} />
                <Select label="Edad Estimada" placeholder="Opcional" data={opcionesEdadEstimada} value={edadEstimada} onChange={setEdadEstimada} clearable leftSection={<IconCalendarEvent size={16}/>} />
            </Group>
            {origenModal === 'COMPRADO' && <TextInput mt="sm" label="Precio de Compra ($)" type="number" placeholder="Ej: 800000" leftSection={<IconCurrencyDollar size={16}/>} value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />}
            <Group grow mt="xl">
                <Button onClick={() => guardarAnimal(false)} loading={loading} color="teal" variant="outline">Guardar y agregar otro</Button>
                <Button onClick={() => guardarAnimal(true)} loading={loading} color="teal">Guardar y cerrar</Button>
            </Group>
         </Stack>
      </Modal>

      <Modal opened={modalEditEventOpen} onClose={closeModalEditEvent} title={<Text fw={700}>Editar Evento</Text>} centered zIndex={3000}>
          <Stack><TextInput label="Fecha" type="date" value={getLocalDateForInput(editingEventDate)} onChange={(e) => setEditingEventDate(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}/><TextInput label="Resultado" value={editingEventRes} onChange={(e) => setEditingEventRes(e.target.value)}/><Textarea label="Detalle" value={editingEventDet} onChange={(e) => setEditingEventDet(e.target.value)}/><Button onClick={guardarEdicionEvento} fullWidth mt="md">Guardar Cambios</Button></Stack>
      </Modal>
      
      <Modal opened={modalConfigOpen} onClose={closeModalConfig} title={<Text fw={700} size="lg">Mis Establecimientos</Text>} centered size="lg">
         <Group align="flex-end" mb="lg"><TextInput label="Nuevo Campo" placeholder="Nombre" value={nuevoCampoNombre} onChange={(e) => setNuevoCampoNombre(e.target.value)} style={{flex: 1}}/><TextInput label="Nro RENSPA" placeholder="Opcional" value={nuevoCampoRenspa} onChange={(e) => setNuevoCampoRenspa(e.target.value)} style={{flex: 1}}/><Button onClick={crearCampo} leftSection={<IconPlus size={16}/>}>Crear</Button></Group>
         <Stack>{establecimientos.map(e => (<Group key={e.id} justify="space-between" p="sm" bg="gray.0" style={{borderRadius: 8}}><Group><IconBuilding size={18} color="gray"/><div><Text fw={500}>{e.nombre} {e.id === campoId && <Badge color="teal" size="sm" ml="xs">ACTIVO</Badge>}</Text><Text size="sm" c="dimmed">RENSPA: {e.renspa || 'Sin cargar'}</Text></div></Group><Group gap="xs"><ActionIcon variant="subtle" color="blue" onClick={() => editarCampo(e.id, e.nombre, e.renspa)}><IconEdit size={16}/></ActionIcon><ActionIcon variant="subtle" color="red" onClick={() => borrarCampo(e.id)}><IconTrash size={16}/></ActionIcon></Group></Group>))}</Stack>
      </Modal>
      
      <Modal opened={modalGraficoOpen} onClose={closeModalGrafico} title={<Text fw={700} size="lg">Evolución de Peso</Text>} size="lg" centered zIndex={3000}>
          <Select label="Caravana a graficar" placeholder="Buscar Caravana" searchable data={animales.map(a => ({ value: a.id, label: `Caravana: ${a.caravana} (${a.categoria})` }))} value={graficoAnimalId} onChange={setGraficoAnimalId} comboboxProps={{ zIndex: 3005 }} mb="md" />
          {loadingGrafico ? (<Text ta="center" c="dimmed" my="xl">Cargando datos...</Text>) : datosGrafico.length > 0 ? (
              <><div style={{ width: '100%', height: 300 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={datosGrafico} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fecha" /><YAxis domain={['auto', 'auto']} /><RechartsTooltip content={<CustomTooltip />} /><Line type="monotone" dataKey="peso" name="Peso" stroke="#82ca9d" strokeWidth={3} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></div>
                  <SimpleGrid cols={3} mt="lg"><Paper withBorder p="xs" ta="center"><Text size="xs" c="dimmed" fw={700} tt="uppercase">Peso Inicial</Text><Text fw={700} size="lg">{statsGrafico.inicio} kg</Text></Paper><Paper withBorder p="xs" ta="center"><Text size="xs" c="dimmed" fw={700} tt="uppercase">Ganancia Total</Text><Text fw={700} size="lg" c={statsGrafico.ganancia > 0 ? 'teal' : 'red'}>{statsGrafico.ganancia > 0 ? '+' : ''}{statsGrafico.ganancia} kg</Text></Paper><Paper withBorder p="xs" ta="center"><Text size="xs" c="dimmed" fw={700} tt="uppercase">ADPV Promedio</Text><Text fw={700} size="lg" c="blue">{statsGrafico.adpv} kg/día</Text></Paper></SimpleGrid></>
          ) : (<Alert color="blue" title="Sin datos">Este animal no tiene registros de peso.</Alert>)}
      </Modal>

      <Modal opened={modalVacaOpen} onClose={handleCloseModalVaca} title={<Text fw={700} size="lg">Ficha: {animalSel?.caravana} {esActivo ? '' : animalSel?.estado === 'EN TRÁNSITO' ? '(EN TRÁNSITO)' : '(ARCHIVO)'}</Text>} size="lg" centered zIndex={2000}>
         <Tabs value={activeTabVaca} onChange={setActiveTabVaca} color="teal"><Tabs.List grow mb="md"><Tabs.Tab value="historia">Historia</Tabs.Tab><Tabs.Tab value="datos">Datos</Tabs.Tab></Tabs.List>
           <Tabs.Panel value="historia">
              {esActivo ? ( <Paper withBorder p="sm" bg="gray.0" mb="md"><Text size="sm" fw={700} mb="xs">Registrar Evento</Text><Group grow mb="sm"><TextInput leftSection={<IconCalendar size={16}/>} placeholder="Fecha" type="date" value={getLocalDateForInput(fechaEvento)} onChange={(e) => setFechaEvento(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} max={new Date().toISOString().split('T')[0]} style={{ flex: 1 }} /><Select data={opcionesDisponibles} placeholder="Tipo" value={tipoEventoInput} onChange={setTipoEventoInput} comboboxProps={{ zIndex: 200005 }} /></Group>
              
              {tipoEventoInput === 'TACTO' && ( <Group grow mb="sm" align="flex-start"><Select label="Resultado del Tacto" data={['PREÑADA', 'VACÍA']} value={tactoResultado} onChange={setTactoResultado} comboboxProps={{ zIndex: 200005 }}/> {tactoResultado === 'PREÑADA' && ( <Select label="Tiempo de Gestación Estimado" placeholder="Opcional. Agenda parto automático." data={opcionesGestacion} value={mesesGestacion} onChange={setMesesGestacion} clearable leftSection={<IconBabyCarriage size={16}/>} comboboxProps={{ zIndex: 200005 }}/> )}</Group> )}
              {tipoEventoInput === 'SERVICIO' && ( <Group grow mb="sm" align="flex-end"><Select label="Tipo de Servicio" data={['TORO', 'IA']} value={tipoServicio} onChange={setTipoServicio} comboboxProps={{ zIndex: 200005 }}/ >{tipoServicio === 'TORO' && ( <MultiSelect label="Seleccionar Toro/s" data={torosDisponibles.map(t => ({value: t.id, label: t.caravana}))} value={torosIdsInput} onChange={setTorosIdsInput} searchable comboboxProps={{ zIndex: 200005 }} /> )}</Group> )}
              {tipoEventoInput === 'PARTO' && ( <Paper withBorder p="xs" bg="teal.0" mb="sm"><Text size="sm" fw={700} c="teal">Datos del Nuevo Ternero</Text><Group grow><TextInput label="Caravana Ternero" placeholder="Nueva ID" value={nuevoTerneroCaravana} onChange={(e) => setNuevoTerneroCaravana(e.target.value)} required/><Select label="Sexo" data={['M', 'H']} value={nuevoTerneroSexo} onChange={setNuevoTerneroSexo} comboboxProps={{ zIndex: 200005 }}/></Group><TextInput mt="sm" label="Peso al Nacer (kg)" placeholder="Opcional" type="number" value={pesoNacimiento} onChange={(e) => setPesoNacimiento(e.target.value)}/></Paper> )}
              {!['TACTO', 'SERVICIO', 'PARTO', 'ENFERMEDAD', 'LESION', 'CURACION', 'CAPADO', 'RASPAJE', 'APARTADO', 'DESTETE'].includes(tipoEventoInput || '') && ( <Group grow mb="sm"><TextInput placeholder="Resultado (Ej: 350kg, Observación...)" value={resultadoInput} onChange={(e) => setResultadoInput(e.target.value)} /></Group> )}
              <TextInput label="Costo ($)" placeholder="Opcional" type="number" value={costoEvento} onChange={(e) => setCostoEvento(e.target.value)} leftSection={<IconCurrencyDollar size={14}/>} mb="sm"/>
              {adpvCalculado && <Alert color="green" icon={<IconTrendingUp size={16}/>} title="Rendimiento Detectado" mb="sm">{adpvCalculado}</Alert>}
              <Group grow align="flex-start"><Textarea placeholder="Detalles / Observaciones..." rows={2} value={detalleInput} onChange={(e) => setDetalleInput(e.target.value)} style={{flex: 1}}/><Button size="md" onClick={guardarEventoVaca} color="teal" loading={loading} style={{ maxWidth: 120 }}>Guardar</Button></Group></Paper> ) : ( <Alert color="gray" icon={<IconArchive size={16}/>} mb="md">Este animal está {animalSel?.estado === 'EN TRÁNSITO' ? 'en tránsito (bloqueado)' : 'archivado'}. Solo lectura.</Alert> )}
              <ScrollArea h={300}><Table striped><Table.Tbody>{eventosFicha.map(ev => (<Table.Tr key={ev.id}><Table.Td><Text size="xs">{formatDate(ev.fecha_evento)}</Text></Table.Td><Table.Td><Text fw={700} size="sm">{ev.tipo}</Text></Table.Td><Table.Td><Text size="sm" fw={500}>{ev.resultado}</Text>{ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}{ev.datos_extra && ev.datos_extra.toros_caravanas && <Badge size="xs" color="pink" variant="outline" ml="xs">Toro/s: {ev.datos_extra.toros_caravanas}</Badge>}{ev.datos_extra && ev.datos_extra.precio_kg && <Badge size="xs" color="green" variant="outline" ml="xs">${ev.datos_extra.precio_kg}</Badge>}</Table.Td><Table.Td><Text size="xs" c="dimmed">${ev.costo || 0}</Text></Table.Td><Table.Td align="right"><ActionIcon size="sm" variant="subtle" color="blue" onClick={() => iniciarEdicionEvento(ev)}><IconEdit size={14}/></ActionIcon><ActionIcon size="sm" variant="subtle" color="red" onClick={() => borrarEvento(ev.id)}><IconTrash size={14}/></ActionIcon></Table.Td></Table.Tr>))}</Table.Tbody></Table></ScrollArea>
           </Tabs.Panel>
           <Tabs.Panel value="datos">
              <Paper withBorder p="sm" bg="gray.1" mb="md" radius="md"><Group justify="space-between"><Text size="sm" fw={700} c="dimmed">ÚLTIMO PESO:</Text><UnstyledButton onClick={abrirGraficoPeso}><Badge size="lg" variant="filled" color="blue" leftSection={<IconChartDots size={14}/>} style={{cursor: 'pointer'}}>{ultimoPeso}</Badge></UnstyledButton></Group></Paper>
              <TextInput label="Caravana" value={editCaravana} onChange={(e) => setEditCaravana(e.target.value)} mb="sm" disabled={!esActivo} />
              <Group grow mb="sm"><Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={editCategoria} onChange={setCategoria} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} />{['Vaca', 'Vaquillona'].includes(editCategoria || '') && ( <Select label="Reproductivo" data={['ACTIVO', 'PREÑADA', 'VACÍA', 'EN LACTANCIA']} value={editEstado} onChange={setEditEstado} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} /> )}</Group>
              
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
                                      <Badge 
                                          key={h.id} 
                                          variant={(isGone || h.ajeno) ? 'light' : 'white'} 
                                          style={{ cursor: h.ajeno ? 'default' : 'pointer', opacity: (isGone || h.ajeno) ? 0.6 : 1 }} 
                                          color={h.ajeno ? 'gray' : (h.sexo === 'H' ? 'pink' : 'blue')} 
                                          onClick={() => !h.ajeno && navegarAHijo(h.id)}
                                      >
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
              <Textarea label="Detalles / Anotaciones" placeholder="Información adicional o particularidad del animal..." value={editDetalles} onChange={(e) => setEditDetalles(e.target.value)} disabled={!esActivo} minRows={3} mb="sm" />
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
                                      {esVentaRed && ( <TextInput label="RENSPA del Comprador" placeholder="Ej: 01.002.0.00000/00" value={renspaDestino} onChange={(e) => setRenspaDestino(e.target.value)} required /> )}
                                      
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
                              {modoBaja === 'TRASLADO' && ( <Select label="Campo Destino" placeholder="Seleccionar establecimiento" data={establecimientos.filter(e => e.id !== campoId).map(e => ({ value: e.id, label: e.nombre }))} value={bajaMotivo} onChange={(v) => setBajaMotivo(v || '')} mb="sm" comboboxProps={{ withinPortal: true, zIndex: 999999 }} /> )}
                              <Button fullWidth color={modoBaja === 'VENDIDO' ? 'orange' : modoBaja === 'TRASLADO' ? 'blue' : 'red'} onClick={confirmarBaja} loading={loading}>Confirmar Acción</Button>
                          </Paper> 
                      )}
                  </> 
              ) : ( <Paper p="md" bg="gray.1" ta="center"><Text c="dimmed" size="sm" mb="md">Este animal se encuentra {animalSel?.estado === 'EN TRÁNSITO' ? 'en tránsito hacia el comprador' : 'archivado'}.</Text>{animalSel?.estado !== 'EN TRÁNSITO' && <Button fullWidth variant="outline" color="blue" leftSection={<IconArrowBackUp/>} onClick={restaurarAnimal}>Restaurar a Hacienda Activa</Button>}</Paper> )}
           </Tabs.Panel>
         </Tabs>
      </Modal>
    </MantineProvider>
  );
}