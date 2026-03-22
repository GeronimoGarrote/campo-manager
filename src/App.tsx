import { useEffect, useState, useMemo } from 'react';
import { 
  MantineProvider, AppShell, Burger, Group, Title, NavLink, Text, 
  Paper, TextInput, Select, Button, Table, Badge, Tabs, 
  Textarea, ActionIcon, ScrollArea, SimpleGrid, Card, Modal, Alert, UnstyledButton, Center, rem, MultiSelect, Switch, RingProgress, Stack, ThemeIcon, Checkbox, PasswordInput, Container, Tooltip, Indicator, Popover, Grid
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconList, IconArchive, IconActivity, IconTrash, IconCheck, IconLeaf, IconTractor, 
  IconCalendar, IconArrowBackUp, IconCurrencyDollar, IconSkull, IconSearch, 
  IconHeartbeat, IconChevronUp, IconChevronDown, IconSelector, IconBabyCarriage, IconScissors, IconBuilding, IconHome, IconSettings, IconEdit, IconPlus, IconFilter, IconPlaylistAdd, IconLogout, IconMapPin, IconTrendingUp, IconInfoCircle, IconChartDots, IconDownload, IconStar, IconStarFilled, IconTag, IconUnlink, IconArrowLeft, IconCalendarEvent, IconBell
} from '@tabler/icons-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import '@mantine/core/styles.css';
import { supabase } from './supabase';
import { type Session } from '@supabase/supabase-js';

// --- TIPOS ---
interface Establecimiento { id: string; nombre: string; renspa?: string; }
interface Lote { id: string; nombre: string; establecimiento_id: string; } 
interface LoteEvento { id: string; lote_id: string; fecha: string; tipo: string; detalle?: string; cantidad?: string; costo?: number; }
interface Potrero { id: string; nombre: string; hectareas: number; cultivo_actual: string; estado: string; establecimiento_id: string; } 
interface Parcela { id: string; nombre: string; hectareas: number; potrero_id: string; establecimiento_id: string; } 
interface Animal { 
  id: string; caravana: string; categoria: string; sexo: string; 
  estado: string; condicion: string; origen: string; detalle_baja?: string; detalles?: string; destacado?: boolean;
  fecha_nacimiento?: string; fecha_ingreso?: string; madre_id?: string; castrado?: boolean;
  establecimiento_id: string; potrero_id?: string; parcela_id?: string; lote_id?: string; toros_servicio_ids?: string[]; 
}
interface Evento { id: string; fecha_evento: string; tipo: string; resultado: string; detalle: string; animal_id: string; costo?: number; datos_extra?: any; animales?: { caravana: string } }
interface Labor { id: string; fecha: string; actividad: string; cultivo: string; detalle: string; costo?: number; potrero_id: string; parcela_id?: string; } 
interface AgendaItem { id: string; establecimiento_id: string; fecha_programada: string; titulo: string; descripcion: string; completado: boolean; tipo: string; animal_id?: string; }

// --- HELPERS ---
const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };
const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };
const getHoyIso = () => { const d = new Date(); const offset = d.getTimezoneOffset(); return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]; };
const diasDiferencia = (fechaFuturaStr: string) => { const hoy = new Date(); hoy.setHours(0,0,0,0); const fechaParto = new Date(fechaFuturaStr); fechaParto.setHours(0,0,0,0); const diffTime = fechaParto.getTime() - hoy.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); return diffDays; };

interface ThProps { children: React.ReactNode; reversed: boolean; sorted: boolean; onSort(): void; }
function Th({ children, reversed, sorted, onSort }: ThProps) {
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <Table.Th>
      <UnstyledButton onClick={onSort} style={{ width: '100%' }}>
        <Group justify="space-between"><Text fw={700} size="sm">{children}</Text><Center><Icon style={{ width: rem(16), height: rem(16) }} stroke={1.5} /></Center></Group>
      </UnstyledButton>
    </Table.Th>
  );
}

const CustomTooltipMulti = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: 0, fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '4px' }}>{label}</p>
                {payload.map((entry: any, index: number) => {
                    const isPromedio = entry.name === 'Promedio Lote' || entry.name === 'Promedio Estimado';
                    return (
                        <p key={index} style={{ margin: 0, color: entry.color, fontWeight: isPromedio ? 'bold' : 'normal', fontSize: isPromedio ? '14px' : '12px' }}>
                            {entry.name}: {entry.value} kg
                        </p>
                    )
                })}
            </div>
        );
    }
    return null;
};

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
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: data.gananciaIntervalo >= 0 ? '#228be6' : '#fa5252' }}>
                            {data.gananciaIntervalo > 0 ? '+' : ''}{data.gananciaIntervalo} kg
                        </p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#7950f2' }}>
                            {data.adpvIntervalo} kg/día
                        </p>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const getIconoEvento = (tipo: string) => {
    switch(tipo) {
        case 'PESAJE': return <ThemeIcon color="blue" size="md" variant="light" radius="xl"><IconChartDots size={14}/></ThemeIcon>;
        case 'VACUNACION': 
        case 'SANIDAD':
        case 'TRATAMIENTO':
        case 'ENFERMEDAD':
        case 'LESION':
        case 'CURACION': return <ThemeIcon color="red" size="md" variant="light" radius="xl"><IconHeartbeat size={14}/></ThemeIcon>;
        case 'TACTO':
        case 'SERVICIO':
        case 'PARTO': return <ThemeIcon color="pink" size="md" variant="light" radius="xl"><IconBabyCarriage size={14}/></ThemeIcon>;
        case 'MOVIMIENTO_POTRERO':
        case 'CAMBIO_LOTE': return <ThemeIcon color="orange" size="md" variant="light" radius="xl"><IconMapPin size={14}/></ThemeIcon>;
        case 'VENTA': return <ThemeIcon color="green" size="md" variant="light" radius="xl"><IconCurrencyDollar size={14}/></ThemeIcon>;
        case 'BAJA':
        case 'MUERTO':
        case 'BORRADO': return <ThemeIcon color="dark" size="md" variant="light" radius="xl"><IconSkull size={14}/></ThemeIcon>;
        default: return <ThemeIcon color="gray" size="md" variant="light" radius="xl"><IconActivity size={14}/></ThemeIcon>;
    }
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

  // --- DATOS GLOBALES ---
  const [busqueda, setBusqueda] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
  const [filterSexo, setFilterSexo] = useState<string | null>(null);
  const [filterAtributos, setFilterAtributos] = useState<string[]>([]);
  const [filterLote, setFilterLote] = useState<string | null>(null); 
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string | null>(''); 
  const [sortBy, setSortBy] = useState<keyof Animal | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);
  
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]); 
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [eventosGlobales, setEventosGlobales] = useState<Evento[]>([]);
  const [eventosLotesGlobal, setEventosLotesGlobal] = useState<LoteEvento[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [chartHover, setChartHover] = useState<{ label: string, value: number | string } | null>(null);

  // Forms Individuales 
  const [modalAltaOpen, { open: openModalAlta, close: closeModalAlta }] = useDisclosure(false);
  const [caravana, setCaravana] = useState('');
  const [categoria, setCategoria] = useState<string | null>('Vaca');
  const [sexo, setSexo] = useState<string | null>('H');
  const [sexoBloqueado, setSexoBloqueado] = useState(true);
  
  const [nombrePotrero, setNombrePotrero] = useState('');
  const [hasPotrero, setHasPotrero] = useState<string | number>('');
  const [nuevoLoteNombre, setNuevoLoteNombre] = useState('');

  // Agenda UI
  const [modalAgendaOpen, { open: openModalAgenda, close: closeModalAgenda }] = useDisclosure(false);
  const [nuevaTareaTitulo, setNuevaTareaTitulo] = useState('');
  const [nuevaTareaDesc, setNuevaTareaDesc] = useState('');
  const [nuevaTareaFecha, setNuevaTareaFecha] = useState<Date | null>(new Date());
  
  // Vaca UI 
  const [modalVacaOpen, { open: openModalVaca, close: closeModalVaca }] = useDisclosure(false);
  const [animalSelId, setAnimalSelId] = useState<string | null>(null);
  const [fichaAnterior, setFichaAnterior] = useState<Animal | null>(null); 
  const [activeTabVaca, setActiveTabVaca] = useState<string | null>('historia'); 

  const animalSel = useMemo(() => animales.find(a => a.id === animalSelId) || null, [animales, animalSelId]);

  const [eventosFicha, setEventosFicha] = useState<Evento[]>([]);
  const [ultimoPeso, setUltimoPeso] = useState<string>('Sin datos');
  const [madreCaravana, setMadreCaravana] = useState<string>(''); 
  const [hijos, setHijos] = useState<{ id: string, caravana: string, sexo: string, estado: string }[]>([]); 
  
  // --- GRAFICO PESO INDIVIDUAL ---
  const [modalGraficoOpen, { open: openModalGrafico, close: closeModalGrafico }] = useDisclosure(false);
  const [graficoAnimalId, setGraficoAnimalId] = useState<string | null>(null);
  const [datosGrafico, setDatosGrafico] = useState<any[]>([]);
  const [statsGrafico, setStatsGrafico] = useState({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' });
  const [loadingGrafico, setLoadingGrafico] = useState(false);

  const [nombresTorosCartel, setNombresTorosCartel] = useState<string | null>(null);

  // --- LOTES (GRUPOS) UI ---
  const [loteSel, setLoteSel] = useState<Lote | null>(null);
  const [eventosLoteFicha, setEventosLoteFicha] = useState<LoteEvento[]>([]);
  const [datosGraficoLote, setDatosGraficoLote] = useState<any[]>([]);
  const [lineasAnimalesLote, setLineasAnimalesLote] = useState<string[]>([]);
  const [loadingGraficoLote, setLoadingGraficoLote] = useState(false);
  const [statsGraficoLote, setStatsGraficoLote] = useState({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' }); 
  const [isLoteEstimated, setIsLoteEstimated] = useState(false);
  
  const [loteEvFecha, setLoteEvFecha] = useState<Date | null>(new Date());
  const [loteEvTipo, setLoteEvTipo] = useState<string | null>('RACIÓN');
  const [loteEvDetalle, setLoteEvDetalle] = useState('');
  const [loteEvCantidad, setLoteEvCantidad] = useState('');
  const [loteEvCosto, setLoteEvCosto] = useState<string | number>('');
  const [agregarAlLoteIds, setAgregarAlLoteIds] = useState<string[]>([]);

  // --- POTRERO & PARCELAS UI ---
  const [potreroSel, setPotreroSel] = useState<Potrero | null>(null);
  const [laboresFicha, setLaboresFicha] = useState<Labor[]>([]);
  
  const [actividadPotrero, setActividadPotrero] = useState<string | null>('FUMIGADA');
  const [cultivoInput, setCultivoInput] = useState('');
  const [detalleLabor, setDetalleLabor] = useState('');
  const [costoLabor, setCostoLabor] = useState<string | number>('');
  
  const [nuevaParcelaNombre, setNuevaParcelaNombre] = useState('');
  const [nuevaParcelaHas, setNuevaParcelaHas] = useState<string | number>('');

  // Opciones de Gestación para Tacto
  const opcionesGestacion = [
    { value: '0.5', label: '15 días (0.5 mes)' }, { value: '1', label: '1 mes' }, { value: '1.5', label: '1 mes y medio' },
    { value: '2', label: '2 meses' }, { value: '2.5', label: '2 meses y medio' }, { value: '3', label: '3 meses' },
    { value: '3.5', label: '3 meses y medio' }, { value: '4', label: '4 meses' }, { value: '4.5', label: '4 meses y medio' },
    { value: '5', label: '5 meses' }, { value: '5.5', label: '5 meses y medio' }, { value: '6', label: '6 meses' },
    { value: '6.5', label: '6 meses y medio' }, { value: '7', label: '7 meses' }, { value: '7.5', label: '7 meses y medio' },
    { value: '8', label: '8 meses' }, { value: '8.5', label: '8 meses y medio' }, { value: '9', label: '9 meses (A parir)' },
  ];

  // Inputs Eventos Individuales
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

  // Edicion Animal
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
  const [bajaPrecio, setBajaPrecio] = useState<string | number>('');
  const [bajaMotivo, setBajaMotivo] = useState('');
  
  // --- LOGICA MASIVA ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [massActividad, setMassActividad] = useState<string | null>('VACUNACION');
  const [massFecha, setMassFecha] = useState<Date | null>(new Date());
  const [massDetalle, setMassDetalle] = useState('');
  const [massPrecio, setMassPrecio] = useState(''); 
  const [massCostoUnitario, setMassCostoUnitario] = useState(''); 
  const [massDestino, setMassDestino] = useState('');
  const [massPotreroDestino, setMassPotreroDestino] = useState<string | null>(null); 
  const [massParcelaDestino, setMassParcelaDestino] = useState<string | null>(null); 
  const [massLoteDestino, setMassLoteDestino] = useState<string | null>(null); 
  const [massTactoResultado, setMassTactoResultado] = useState<string | null>('PREÑADA');
  const [massMesesGestacion, setMassMesesGestacion] = useState<string | null>(null); 
  const [massTipoServicio, setMassTipoServicio] = useState<string | null>('TORO');
  const [massTorosIds, setMassTorosIds] = useState<string[]>([]);

  const [modalEditEventOpen, { open: openModalEditEvent, close: closeModalEditEvent }] = useDisclosure(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventDate, setEditingEventDate] = useState<Date | null>(new Date());
  const [editingEventRes, setEditingEventRes] = useState('');
  const [editingEventDet, setEditingEventDet] = useState('');

  // --- INIT AUTH & DATA ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) loadCampos(); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) loadCampos(); else { setEstablecimientos([]); setCampoId(null); } });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!campoId || !session) return;
    localStorage.setItem('campoId', campoId); 
    setBusqueda(''); setFiltroTipoEvento(''); setFilterCategoria(null); setFilterSexo(null); setFilterAtributos([]); setFilterLote(null); setSelectedIds([]);
    
    fetchAnimales(); fetchPotreros(); fetchParcelas(); fetchLotes(); fetchEventosLotesGlobal(); fetchAgenda();
    if (activeSection === 'inicio' || activeSection === 'actividad') fetchActividadGlobal();
  }, [activeSection, campoId, session]); 

  async function handleLogin() { setAuthLoading(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); setAuthLoading(false); if (error) alert("Error: " + error.message); }
  async function handleLogout() { await supabase.auth.signOut(); setSession(null); }

  useEffect(() => { setResultadoInput(''); setTorosIdsInput([]); setNuevoTerneroCaravana(''); setPesoNacimiento(''); setCostoEvento(''); setAdpvCalculado(null); setMesesGestacion(null); setMassMesesGestacion(null); }, [tipoEventoInput, massActividad]);
  
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


  // --- FUNCIONES DE AGENDA ---
  async function fetchAgenda() {
      if(!campoId) return;
      const { data } = await supabase.from('agenda').select('*').eq('establecimiento_id', campoId).order('fecha_programada', { ascending: true });
      if (data) setAgenda(data);
  }

  async function guardarTareaAgenda() {
      if (!nuevaTareaTitulo || !nuevaTareaFecha || !campoId) return;
      setLoading(true);
      const { error } = await supabase.from('agenda').insert([{
          establecimiento_id: campoId, titulo: nuevaTareaTitulo, descripcion: nuevaTareaDesc, fecha_programada: nuevaTareaFecha.toISOString().split('T')[0], tipo: 'MANUAL'
      }]);
      setLoading(false);
      if (!error) { setNuevaTareaTitulo(''); setNuevaTareaDesc(''); closeModalAgenda(); fetchAgenda(); }
  }

  async function toggleCompletadoTarea(id: string, completadoActual: boolean) {
      await supabase.from('agenda').update({ completado: !completadoActual }).eq('id', id);
      fetchAgenda();
  }

  async function borrarTareaAgenda(id: string) {
      if(!confirm("¿Borrar tarea de la agenda?")) return;
      await supabase.from('agenda').delete().eq('id', id);
      fetchAgenda();
  }

  const hoyFormateado = getHoyIso();
  const tareasPendientesUrgentes = agenda.filter(t => !t.completado && t.fecha_programada < hoyFormateado);
  const tareasParaHoy = agenda.filter(t => !t.completado && t.fecha_programada === hoyFormateado);
  const tareasAtrasadas = agenda.filter(t => !t.completado && t.fecha_programada < hoyFormateado);

  const partosProximos = useMemo(() => {
    return agenda
        .filter(tarea => tarea.tipo === 'PARTO_ESTIMADO' && !tarea.completado && tarea.fecha_programada >= hoyFormateado)
        .sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada));
  }, [agenda, hoyFormateado]);

  // --- FUNCIONES SINGULARES ---
  async function recargarFicha(id: string) {
    const { data } = await supabase.from('eventos').select('*').eq('animal_id', id).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false });
    if (data) setEventosFicha(data);
  }

  async function actualizarCartelToros(idAnimal: string) {
      setNombresTorosCartel(null); 
      const { data } = await supabase.from('animales').select('toros_servicio_ids').eq('id', idAnimal).single();
      if (data && data.toros_servicio_ids && data.toros_servicio_ids.length > 0) {
          const nombres = animales.filter(a => data.toros_servicio_ids!.includes(a.id)).map(a => a.caravana).join(' - ');
          setNombresTorosCartel(nombres || null);
      } else { setNombresTorosCartel(null); }
  }

  async function borrarEvento(id: string) {
    if(!confirm("¿Borrar evento?")) return;
    await supabase.from('eventos').delete().eq('id', id);
    if(animalSelId) recargarFicha(animalSelId); fetchActividadGlobal();
  }

  function iniciarEdicionEvento(ev: Evento) {
      setEditingEventId(ev.id);
      const partes = ev.fecha_evento.split('T')[0].split('-'); 
      setEditingEventDate(new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0));
      setEditingEventRes(ev.resultado); setEditingEventDet(ev.detalle || ''); openModalEditEvent();
  }

  async function guardarEdicionEvento() {
      if(!editingEventId || !editingEventDate) return;
      await supabase.from('eventos').update({ fecha_evento: editingEventDate.toISOString(), resultado: editingEventRes, detalle: editingEventDet }).eq('id', editingEventId);
      closeModalEditEvent(); if(animalSelId) recargarFicha(animalSelId); fetchActividadGlobal();
  }

  const abrirGraficoPeso = () => { setGraficoAnimalId(animalSelId); openModalGrafico(); };

  useEffect(() => {
    async function cargarDatosGrafico() {
        if (!graficoAnimalId) return;
        setLoadingGrafico(true);
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


  const setSorting = (field: keyof Animal) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed); setSortBy(field);
  };

  const animalesFiltrados = animales.filter(animal => {
    const matchBusqueda = animal.caravana.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = filterCategoria ? animal.categoria === filterCategoria : true;
    const matchSexo = filterSexo ? animal.sexo === filterSexo : true; 
    const matchLote = filterLote ? animal.lote_id === filterLote : true; 
    let matchAtributos = true;
    if (filterAtributos.length > 0) {
        const tagsDelAnimal: string[] = [];
        tagsDelAnimal.push(animal.estado);
        if (animal.condicion) tagsDelAnimal.push(...animal.condicion.split(', '));
        if (animal.sexo === 'M') tagsDelAnimal.push('MACHO');
        if (animal.sexo === 'H') tagsDelAnimal.push('HEMBRA');
        if (animal.castrado) tagsDelAnimal.push('CAPADO');
        if (animal.destacado) tagsDelAnimal.push('DESTACADO');
        matchAtributos = filterAtributos.every(filtro => tagsDelAnimal.includes(filtro));
    }
    return matchBusqueda && matchCategoria && matchSexo && matchLote && matchAtributos;
  }).sort((a, b) => {
    if (busqueda) { const exactA = a.caravana.toLowerCase() === busqueda.toLowerCase(); const exactB = b.caravana.toLowerCase() === busqueda.toLowerCase(); if (exactA && !exactB) return -1; if (!exactA && exactB) return 1; }
    if (sortBy) {
        if (sortBy === 'caravana') { const numA = parseInt(a.caravana.replace(/\D/g,'')) || 0; const numB = parseInt(b.caravana.replace(/\D/g,'')) || 0; if (numA !== numB) return reverseSortDirection ? numB - numA : numA - numB; }
        const valA = a[sortBy]?.toString().toLowerCase() || ''; const valB = b[sortBy]?.toString().toLowerCase() || ''; return reverseSortDirection ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    return 0;
  });
  
  const eventosFiltrados = eventosGlobales.filter(ev => {
    const coincideTexto = ev.animales?.caravana.toLowerCase().includes(busqueda.toLowerCase()) || ev.tipo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipoEvento ? ev.tipo === filtroTipoEvento : true;
    return coincideTexto && coincideTipo;
  });

  const getEstadoColor = (estado: string) => { if (estado === 'PREÑADA') return 'teal'; if (estado === 'VACÍA') return 'yellow'; if (estado === 'EN SERVICIO') return 'pink'; if (estado === 'APARTADO') return 'orange'; return 'blue'; };
  const renderCondicionBadges = (condStr: string) => { if (!condStr || condStr === 'SANA') return null; return condStr.split(', ').map((c, i) => ( <Badge key={i} color={c === 'ENFERMA' ? 'red' : 'grape'} variant="filled" size="sm">{c}</Badge> )); };
  
  const getNombrePotrero = (id?: string) => { if(!id) return null; const p = potreros.find(pot => pot.id === id); return p ? p.nombre : null; };
  const getNombreParcela = (id?: string) => { if(!id) return null; const p = parcelas.find(parc => parc.id === id); return p ? p.nombre : null; };
  const getNombreLote = (id?: string) => { if(!id) return null; const l = lotes.find(lot => lot.id === id); return l ? l.nombre : null; };
  
  const getUbicacionCompleta = (potrero_id?: string, parcela_id?: string) => {
      if(!potrero_id) return <Text size="xs" c="dimmed">-</Text>;
      const pNom = getNombrePotrero(potrero_id);
      const parcNom = getNombreParcela(parcela_id);
      return <Badge size="sm" variant="outline" color="lime" leftSection={<IconMapPin size={10}/>}>{parcNom ? `${pNom} (${parcNom})` : pNom}</Badge>;
  }

  const torosDisponibles = animales.filter(a => a.categoria === 'Toro' && a.estado !== 'MUERTO' && a.estado !== 'VENDIDO');

  // --- TOGGLE DESTACADO ---
  async function toggleDestacado(id: string, estadoActual: boolean) {
      setAnimales(prev => prev.map(a => a.id === id ? { ...a, destacado: !estadoActual } : a));
      const { error } = await supabase.from('animales').update({ destacado: !estadoActual }).eq('id', id);
      if (error) { alert("Error al actualizar favorito: " + error.message); fetchAnimales(); }
  }

  // --- FUNCIONES MASIVAS ---
  const toggleSeleccion = (id: string) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]); };
  const seleccionarGrupo = (categoriaTarget: string | null) => { const targets = animalesFiltrados.filter(a => categoriaTarget ? a.categoria === categoriaTarget : true).map(a => a.id); setSelectedIds(prev => [...new Set([...prev, ...targets])]); };
  const limpiarSeleccion = () => setSelectedIds([]);

  const desvincularToroDeVacas = async (toroId: string) => {
      const vacasAfectadas = animales.filter(a => a.toros_servicio_ids && a.toros_servicio_ids.includes(toroId));
      for (const vaca of vacasAfectadas) { const nuevosIds = vaca.toros_servicio_ids!.filter(id => id !== toroId); await supabase.from('animales').update({ toros_servicio_ids: nuevosIds.length > 0 ? nuevosIds : null }).eq('id', vaca.id); }
  };

  async function guardarEventoMasivo() {
    if (selectedIds.length === 0) return alert("No seleccionaste ningún animal");
    if (!massFecha || !massActividad || !campoId) return alert("Faltan datos del evento");
    if (massActividad === 'VENTA' && !massPrecio) return alert("Falta el precio de venta");
    if (massActividad === 'MOVIMIENTO_POTRERO' && !massPotreroDestino) return alert("Falta el Potrero destino");
    if (massActividad === 'CAMBIO_LOTE' && !massLoteDestino) return alert("Falta el Lote (Grupo) destino");
    if (massActividad === 'SERVICIO' && massTipoServicio === 'TORO' && massTorosIds.length === 0) return alert("Seleccioná al menos un toro");
    
    let idsParaProcesar = [...selectedIds]; let mensajeConfirmacion = `¿Confirmar ${massActividad} para ${selectedIds.length} animales?`;

    if (massActividad === 'CAPADO') {
        const machos = animales.filter(a => selectedIds.includes(a.id) && a.sexo === 'M' && a.categoria === 'Ternero'); idsParaProcesar = machos.map(a => a.id);
        const descartados = selectedIds.length - idsParaProcesar.length;
        if (idsParaProcesar.length === 0) return alert("Error: No hay Terneros Machos en la selección.");
        if (descartados > 0) mensajeConfirmacion = `⚠️ ATENCIÓN: Se detectaron ${descartados} animales inválidos.\nSolo se capará a ${idsParaProcesar.length} TERNEROS MACHOS.\n\n¿Continuar?`;
        else mensajeConfirmacion = `¿Confirmar CAPADO para ${idsParaProcesar.length} terneros?`;
    }

    if(!confirm(mensajeConfirmacion)) return; setLoading(true); const fechaStr = massFecha.toISOString();
    let resultadoTxt = massActividad === 'OTRO' ? massDetalle || 'Realizado' : 'Realizado (Masivo)'; let datosExtra: any = {};
    
    if (massActividad === 'VENTA') { resultadoTxt = 'VENDIDO'; datosExtra = { precio_kg: massPrecio, destino: massDestino || 'Venta Masiva' }; } 
    else if (massActividad === 'CAPADO') { resultadoTxt = 'Realizado'; } 
    else if (massActividad === 'MOVIMIENTO_POTRERO') { 
        const pNom = getNombrePotrero(massPotreroDestino!); 
        const parcNom = getNombreParcela(massParcelaDestino!);
        resultadoTxt = 'MOVIDO DE POTRERO'; 
        datosExtra = { potrero_destino: pNom, potrero_id: massPotreroDestino, parcela_destino: parcNom, parcela_id: massParcelaDestino }; 
    } 
    else if (massActividad === 'CAMBIO_LOTE') { const lNom = getNombreLote(massLoteDestino!); resultadoTxt = 'CAMBIO DE LOTE'; datosExtra = { lote_destino: lNom, lote_id: massLoteDestino }; } 
    else if (massActividad === 'TACTO') { resultadoTxt = massTactoResultado || ''; } 
    else if (massActividad === 'SERVICIO') {
        if (massTipoServicio === 'TORO') { const nombres = animales.filter(a => massTorosIds.includes(a.id)).map(a => a.caravana).join(', '); resultadoTxt = `Con: ${nombres}`; datosExtra = { toros_caravanas: nombres }; } else { resultadoTxt = 'IA'; }
    } else if (massActividad === 'TRATAMIENTO') {
        resultadoTxt = 'Tratamiento aplicado';
    }

    const inserts = idsParaProcesar.map(animalId => ({ animal_id: animalId, fecha_evento: fechaStr, tipo: massActividad, resultado: resultadoTxt, detalle: massDetalle, datos_extra: datosExtra, costo: Number(massCostoUnitario), establecimiento_id: campoId }));
    const { error } = await supabase.from('eventos').insert(inserts);

    if (!error) {
        if (massActividad === 'VENTA') {
            await supabase.from('animales').update({ estado: 'VENDIDO', detalle_baja: `Venta Masiva: ${massDestino || '-'} ($${massPrecio})` }).in('id', idsParaProcesar);
            for (const id of idsParaProcesar) { const anim = animales.find(a => a.id === id); if(anim?.categoria === 'Toro') await desvincularToroDeVacas(id); }
        }
        if (massActividad === 'CAPADO') await supabase.from('animales').update({ castrado: true }).in('id', idsParaProcesar);
        if (massActividad === 'MOVIMIENTO_POTRERO') await supabase.from('animales').update({ potrero_id: massPotreroDestino, parcela_id: massParcelaDestino }).in('id', idsParaProcesar);
        if (massActividad === 'CAMBIO_LOTE') await supabase.from('animales').update({ lote_id: massLoteDestino }).in('id', idsParaProcesar);
        if (massActividad === 'TACTO') {
            await supabase.from('animales').update({ estado: massTactoResultado }).in('id', idsParaProcesar);
            
            if (massTactoResultado === 'PREÑADA' && massMesesGestacion) {
                const diasGestacionActual = parseFloat(massMesesGestacion) * 30.4;
                const diasFaltantes = Math.round(283 - diasGestacionActual);
                const fechaParto = new Date(massFecha);
                fechaParto.setDate(fechaParto.getDate() + diasFaltantes);
                const fechaPartoStr = fechaParto.toISOString().split('T')[0];

                const agendaInserts = idsParaProcesar.map(animalId => {
                    const caravanaTxt = animales.find(a => a.id === animalId)?.caravana || 'Desconocida';
                    return {
                        establecimiento_id: campoId,
                        fecha_programada: fechaPartoStr,
                        titulo: `Parto: ${caravanaTxt}`,
                        descripcion: `Parto estimado calculado por tacto masivo (${massMesesGestacion} meses de gestación al ${formatDate(fechaStr)}).`,
                        tipo: 'PARTO_ESTIMADO',
                        animal_id: animalId
                    };
                });
                await supabase.from('agenda').insert(agendaInserts);
                fetchAgenda();
            }
        }
        if (massActividad === 'SERVICIO') {
            const vacasToUpdate = animales.filter(a => idsParaProcesar.includes(a.id) && ['Vaca', 'Vaquillona'].includes(a.categoria)).map(a => a.id);
            const torosToUpdate = animales.filter(a => idsParaProcesar.includes(a.id) && a.categoria === 'Toro').map(a => a.id);
            if (vacasToUpdate.length > 0 && massTipoServicio === 'TORO') await supabase.from('animales').update({ toros_servicio_ids: massTorosIds }).in('id', vacasToUpdate);
            if (torosToUpdate.length > 0) await supabase.from('animales').update({ estado: 'EN SERVICIO' }).in('id', torosToUpdate);
            if (massTipoServicio === 'TORO' && massTorosIds.length > 0) {
                const torosEvents = massTorosIds.map(toroId => ({ animal_id: toroId, fecha_evento: fechaStr, tipo: 'SERVICIO', resultado: 'En servicio', detalle: 'Asignado a rodeo (Masivo)', establecimiento_id: campoId }));
                await supabase.from('eventos').insert(torosEvents); await supabase.from('animales').update({ estado: 'EN SERVICIO' }).in('id', massTorosIds);
            }
        }
    }

    setLoading(false);
    if (error) { alert("Error: " + error.message); } else {
        alert("¡Carga masiva exitosa!"); setMassDetalle(''); setMassPrecio(''); setMassDestino(''); setMassPotreroDestino(null); setMassParcelaDestino(null); setMassLoteDestino(null); setMassCostoUnitario(''); setMassTorosIds([]); setMassMesesGestacion(null); setSelectedIds([]);
        fetchAnimales(); setActiveSection('actividad');
    }
  }

  // --- FETCHERS GLOBALES ---
  async function loadCampos() {
    const { data } = await supabase.from('establecimientos').select('*').order('created_at');
    if (data && data.length > 0) { setEstablecimientos(data); const guardado = localStorage.getItem('campoId'); if (guardado && data.find(c => c.id === guardado)) setCampoId(guardado); else if (!campoId) setCampoId(data[0].id); }
  }
  async function fetchAnimales() {
    if (!campoId) return;
    let query = supabase.from('animales').select('*').eq('establecimiento_id', campoId).neq('estado', 'ELIMINADO').order('created_at', { ascending: false }); 
    if (activeSection === 'hacienda' || activeSection === 'masivos' || activeSection === 'lotes' || activeSection === 'lote_detalle' || activeSection === 'potrero_detalle') query = query.neq('estado', 'VENDIDO').neq('estado', 'MUERTO');
    else if (activeSection === 'bajas') query = query.in('estado', ['VENDIDO', 'MUERTO']);
    const { data } = await query; setAnimales(data || []);
  }
  async function fetchPotreros() { if (!campoId) return; const { data } = await supabase.from('potreros').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setPotreros(data || []); }
  async function fetchParcelas() { if (!campoId) return; const { data } = await supabase.from('parcelas').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setParcelas(data || []); }
  async function fetchLotes() { if (!campoId) return; const { data } = await supabase.from('lotes').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setLotes(data || []); }
  async function fetchActividadGlobal() { if (!campoId) return; const { data } = await supabase.from('eventos').select('*, animales!inner(caravana)').eq('establecimiento_id', campoId).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false }).limit(50); setEventosGlobales(data as any || []); }
  async function fetchEventosLotesGlobal() { if (!campoId) return; const { data } = await supabase.from('lotes_eventos').select('*').eq('establecimiento_id', campoId).order('fecha', { ascending: false }); setEventosLotesGlobal(data || []); }

  // --- GESTIÓN DE ESTABLECIMIENTOS Y LOTES ---
  async function crearCampo() { if (!nuevoCampoNombre) return; const { error } = await supabase.from('establecimientos').insert([{ nombre: nuevoCampoNombre, renspa: nuevoCampoRenspa, user_id: session?.user.id }]); if (error) alert("Error: " + error.message); else { setNuevoCampoNombre(''); setNuevoCampoRenspa(''); loadCampos(); } }
  async function borrarCampo(id: string) { if (!confirm("⚠️ ¿BORRAR ESTABLECIMIENTO COMPLETO?")) return; const { error } = await supabase.from('establecimientos').delete().eq('id', id); if (error) alert("Error al borrar."); else { if (id === campoId) { const restantes = establecimientos.filter(e => e.id !== id); if (restantes.length > 0) setCampoId(restantes[0].id); else window.location.reload(); } loadCampos(); } }
  async function editarCampo(id: string, nombreActual: string, renspaActual?: string) { const nuevoNombre = prompt("Nuevo nombre del establecimiento:", nombreActual); if (nuevoNombre === null) return; const nuevoRenspa = prompt("Número de RENSPA:", renspaActual || ''); if (nuevoRenspa === null) return; await supabase.from('establecimientos').update({ nombre: nuevoNombre, renspa: nuevoRenspa }).eq('id', id); loadCampos(); }

  // --- LOTES (GRUPOS) ACTIONS ---
  async function crearLoteGrupo() {
      if (!nuevoLoteNombre || !campoId) return;
      const { error } = await supabase.from('lotes').insert([{ nombre: nuevoLoteNombre, establecimiento_id: campoId }]);
      if (error) alert("Error al crear lote: " + error.message); else { setNuevoLoteNombre(''); fetchLotes(); closeModalAlta(); }
  }
  
  async function borrarLoteGrupo(id: string) {
      if (!confirm("¿Borrar grupo? Los animales quedarán sin lote asignado.")) return;
      await supabase.from('lotes').delete().eq('id', id); fetchLotes(); fetchAnimales(); setActiveSection('lotes');
  }

  async function renombrarLoteGrupo(id: string, nombreActual: string) {
      const nuevoNombre = prompt("Nuevo nombre del Lote:", nombreActual);
      if (nuevoNombre === null || nuevoNombre === nombreActual) return;
      await supabase.from('lotes').update({ nombre: nuevoNombre }).eq('id', id); 
      fetchLotes(); setLoteSel(prev => prev ? {...prev, nombre: nuevoNombre} : prev);
  }

  async function sacarAnimalDeLote(animalId: string) {
      if (!confirm("¿Quitar este animal del lote?")) return;
      await supabase.from('animales').update({ lote_id: null }).eq('id', animalId);
      
      await supabase.from('eventos').insert({
          animal_id: animalId,
          fecha_evento: new Date().toISOString(),
          tipo: 'CAMBIO_LOTE',
          resultado: 'REMOVIDO DE LOTE',
          detalle: 'Removido desde ficha de lote',
          establecimiento_id: campoId
      });
      
      fetchAnimales(); fetchActividadGlobal();
  }

  async function meterAnimalesAlLote() {
      if (agregarAlLoteIds.length === 0 || !loteSel || !campoId) return;
      setLoading(true);
      await supabase.from('animales').update({ lote_id: loteSel.id }).in('id', agregarAlLoteIds);

      const fechaStr = new Date().toISOString();
      const inserts = agregarAlLoteIds.map(id => ({
          animal_id: id,
          fecha_evento: fechaStr,
          tipo: 'CAMBIO_LOTE',
          resultado: 'CAMBIO DE LOTE',
          detalle: `Asignado a lote: ${loteSel.nombre} (Desde ficha de lote)`,
          datos_extra: { lote_destino: loteSel.nombre, lote_id: loteSel.id },
          establecimiento_id: campoId
      }));
      await supabase.from('eventos').insert(inserts);

      setAgregarAlLoteIds([]); fetchAnimales(); fetchActividadGlobal(); setLoading(false);
  }

  async function abrirFichaLote(lote: Lote) {
      setLoteSel(lote); setEventosLoteFicha([]); setDatosGraficoLote([]); setLineasAnimalesLote([]); setAgregarAlLoteIds([]); setIsLoteEstimated(false);
      setActiveSection('lote_detalle');
      
      const { data: evData } = await supabase.from('lotes_eventos').select('*').eq('lote_id', lote.id).order('fecha', { ascending: false });
      if (evData) setEventosLoteFicha(evData);
      
      setLoadingGraficoLote(true);
      const animalesLote = animales.filter(a => a.lote_id === lote.id);
      if (animalesLote.length > 0) {
          const ids = animalesLote.map(a => a.id);
          const { data: pesajes } = await supabase.from('eventos').select('*, animales!inner(caravana)').in('animal_id', ids).eq('tipo', 'PESAJE').order('fecha_evento', { ascending: true });
          
          if (pesajes && pesajes.length > 0) {
              const fechasUnicas = [...new Set(pesajes.map(p => p.fecha_evento.split('T')[0]))].sort();
              const caravanasPresentes = new Set<string>();
              const ultimoPesoConocido: Record<string, number> = {};

              const dataGrafico = fechasUnicas.map(fechaStr => {
                  const pesajesDelDia = pesajes.filter(p => p.fecha_evento.startsWith(fechaStr));
                  const objParaElGrafico: any = { fecha: formatDate(fechaStr) };

                  pesajesDelDia.forEach(p => {
                      const pesoNum = parseFloat(p.resultado.replace(/[^0-9.]/g, ''));
                      const caravana = p.animales?.caravana || 'Desc';
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
                  return objParaElGrafico;
              });

              if (dataGrafico.length > 1) {
                  const ultimoDiaReal = dataGrafico[dataGrafico.length - 1];
                  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
                  const fechaUltimoPesaje = new Date(fechasUnicas[fechasUnicas.length - 1] + 'T12:00:00');
                  
                  let targetDate = new Date(hoy);
                  let diasDesdeUltimo = Math.floor((hoy.getTime() - fechaUltimoPesaje.getTime()) / (1000 * 60 * 60 * 24));
                  let labelProyeccion = 'Hoy (Est.)';

                  if (diasDesdeUltimo < 2) {
                      targetDate = new Date(fechaUltimoPesaje.getTime() + 15 * 24 * 60 * 60 * 1000);
                      labelProyeccion = formatDate(targetDate.toISOString().split('T')[0]) + ' (Proy.)';
                  }

                  const animalStats: Record<string, {firstW: number, firstD: Date, lastW: number, lastD: Date}> = {};
                  pesajes.forEach(p => {
                      const d = new Date(p.fecha_evento.split('T')[0] + 'T12:00:00');
                      const w = parseFloat(p.resultado.replace(/[^0-9.]/g, ''));
                      const c = p.animales?.caravana || 'Desc';
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
                          const adpv = (stats.lastW - stats.firstW) / daysDiff;
                          const daysSinceAnimalLastWeighing = (targetDate.getTime() - stats.lastD.getTime()) / (1000 * 60 * 60 * 24);
                          if (daysSinceAnimalLastWeighing > 0) pesoProyectado += (adpv * daysSinceAnimalLastWeighing);
                      }
                      sumEst += pesoProyectado; countEst++;
                  });

                  const promedioEstTarget = Math.round(sumEst / countEst);
                  ultimoDiaReal['Promedio Estimado'] = ultimoDiaReal['Promedio Lote'];
                  
                  dataGrafico.push({
                      fecha: labelProyeccion,
                      'Promedio Estimado': promedioEstTarget
                  });

                  const pesoInicio = dataGrafico[0]['Promedio Lote'] || 0;
                  const pesoActualReal = ultimoDiaReal['Promedio Lote'];
                  const gananciaReal = pesoActualReal - pesoInicio;
                  const diffDaysReal = Math.ceil(Math.abs(fechaUltimoPesaje.getTime() - new Date(fechasUnicas[0] + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));

                  setStatsGraficoLote({ 
                      inicio: pesoInicio, 
                      actual: pesoActualReal, 
                      ganancia: gananciaReal, 
                      dias: diffDaysReal, 
                      adpv: diffDaysReal > 0 ? (gananciaReal / diffDaysReal).toFixed(3) : '0' 
                  });
                  setIsLoteEstimated(diasDesdeUltimo >= 2); 
              } else {
                  const pesoUnico = dataGrafico[0]['Promedio Lote'] || 0;
                  setStatsGraficoLote({ inicio: pesoUnico, actual: pesoUnico, ganancia: 0, dias: 0, adpv: '0' });
              }

              setLineasAnimalesLote(Array.from(caravanasPresentes));
              setDatosGraficoLote(dataGrafico);
          }
      }
      setLoadingGraficoLote(false);
  }

  async function guardarEventoLote() {
      if (!loteSel || !loteEvFecha || !campoId) return;
      const { error } = await supabase.from('lotes_eventos').insert([{
          lote_id: loteSel.id, fecha: loteEvFecha.toISOString().split('T')[0], tipo: loteEvTipo, 
          detalle: loteEvDetalle, cantidad: loteEvCantidad, costo: Number(loteEvCosto), establecimiento_id: campoId
      }]);
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

  // --- ACCIONES VACA INDIVIDUAL ---
  async function guardarAnimal(cerrarModal: boolean = true) {
    if (!caravana || !campoId) return;
    const yaExiste = animales.some(a => a.caravana.toLowerCase() === caravana.toLowerCase() && a.estado !== 'ELIMINADO');
    if (yaExiste) return alert("❌ ERROR: Ya existe un animal con esa caravana.");
    setLoading(true); const hoy = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('animales').insert([{ caravana, categoria, sexo, estado: 'ACTIVO', condicion: 'SANA', origen: 'PROPIO', fecha_nacimiento: hoy, fecha_ingreso: hoy, establecimiento_id: campoId }]);
    setLoading(false); 
    if (!error) { 
        setCaravana(''); 
        fetchAnimales(); 
        if (cerrarModal) closeModalAlta(); 
    }
  }

  async function abrirFichaVaca(animal: Animal) {
    setActiveTabVaca('historia'); setAnimalSelId(animal.id); 
    setEditCaravana(animal.caravana); setEditCategoria(animal.categoria); setEditSexo(animal.sexo);
    setEditEstado(animal.estado); setEditCastrado(animal.castrado || false);
    const condArray = animal.condicion && animal.condicion !== 'SANA' ? animal.condicion.split(', ') : [];
    setEditCondicion(condArray); setEditDetalles(animal.detalles || '');
    setEditPotreroId(animal.potrero_id || null); setEditParcelaId(animal.parcela_id || null); setEditLoteId(animal.lote_id || null);
    setEditFechaNac(animal.fecha_nacimiento || ''); setEditFechaIngreso(animal.fecha_ingreso || '');
    if (animal.madre_id) { const m = animales.find(a => a.id === animal.madre_id); setMadreCaravana(m ? m.caravana : 'Desconocida'); } else { setMadreCaravana(''); }
    setHijos([]); const { data: dataHijos } = await supabase.from('animales').select('id, caravana, sexo, estado').eq('madre_id', animal.id).neq('estado', 'ELIMINADO'); if(dataHijos) setHijos(dataHijos);
    setEventosFicha([]); setFechaEvento(new Date()); setTipoEventoInput('PESAJE'); setModoBaja(null); setBajaPrecio(''); setBajaMotivo(''); setUltimoPeso('Calculando...'); setPesoNacimiento(''); setCostoEvento('');
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

  async function guardarEventoVaca() {
    if (!animalSelId || !animalSel || !tipoEventoInput || !fechaEvento || !campoId) return alert("Faltan datos");
    setLoading(true);
    let resultadoFinal = resultadoInput; let datosExtra = null; let nuevoEstado = ''; let nuevasCondiciones = [...editCondicion]; let esCastrado = editCastrado; 
    let torosToUpdate: string[] = [];
    
    if (tipoEventoInput === 'TACTO') { 
        resultadoFinal = tactoResultado || ''; 
        if (tactoResultado === 'PREÑADA') nuevoEstado = 'PREÑADA'; 
        if (tactoResultado === 'VACÍA') nuevoEstado = 'VACÍA'; 

        if (tactoResultado === 'PREÑADA' && mesesGestacion) {
            const diasGestacionActual = parseFloat(mesesGestacion) * 30.4;
            const diasFaltantes = Math.round(283 - diasGestacionActual);
            const fechaParto = new Date(fechaEvento);
            fechaParto.setDate(fechaParto.getDate() + diasFaltantes);

            await supabase.from('agenda').insert({
                establecimiento_id: campoId,
                fecha_programada: fechaParto.toISOString().split('T')[0],
                titulo: `Parto: ${animalSel.caravana}`,
                descripcion: `Parto estimado calculado por tacto (${mesesGestacion} meses de gestación al ${formatDate(fechaEvento.toISOString())}).`,
                tipo: 'PARTO_ESTIMADO',
                animal_id: animalSel.id
            });
            fetchAgenda();
        }
    } 
    else if (tipoEventoInput === 'PARTO') {
      if (!nuevoTerneroCaravana) { setLoading(false); return alert("Falta caravana ternero."); }
      const yaExiste = animales.some(a => a.caravana.toLowerCase() === nuevoTerneroCaravana.toLowerCase() && a.estado !== 'ELIMINADO');
      if (yaExiste) { setLoading(false); return alert("❌ ERROR: Ya existe un animal con esa caravana."); }
      
      if (pesoNacimiento) {
          if (pesoNacimiento.includes('-')) {
              setLoading(false);
              return alert("❌ ERROR: No se permiten pesos negativos.");
          }
          const pesoClean = pesoNacimiento.replace(/[^\d.]/g, '');
          const pesoNacNum = parseFloat(pesoClean);
          if (isNaN(pesoNacNum) || pesoNacNum <= 0) {
              setLoading(false);
              return alert("❌ ERROR: El peso de nacimiento debe ser un número positivo mayor a 0.");
          }
      }

      const fechaParto = fechaEvento.toISOString().split('T')[0];
      const { data: nuevoTernero, error: err } = await supabase.from('animales').insert([{ caravana: nuevoTerneroCaravana, categoria: 'Ternero', sexo: nuevoTerneroSexo, estado: 'ACTIVO', condicion: 'SANA', origen: 'NACIDO', madre_id: animalSel.id, fecha_nacimiento: fechaParto, fecha_ingreso: fechaParto, establecimiento_id: campoId, potrero_id: animalSel.potrero_id, parcela_id: animalSel.parcela_id, lote_id: animalSel.lote_id }]).select().single();
      if (err) { setLoading(false); return alert("Error: " + err.message); }
      if (pesoNacimiento) await supabase.from('eventos').insert({ animal_id: nuevoTernero.id, tipo: 'PESAJE', resultado: `${pesoNacimiento}kg`, detalle: 'Peso al nacer', fecha_evento: fechaEvento.toISOString(), establecimiento_id: campoId });
      nuevoEstado = 'VACÍA'; if (animalSel.categoria === 'Vaquillona') await supabase.from('animales').update({ categoria: 'Vaca' }).eq('id', animalSel.id);
      resultadoFinal = `Nació ${nuevoTerneroCaravana} (${nuevoTerneroSexo})`; datosExtra = { ternero_caravana: nuevoTerneroCaravana, ternero_sexo: nuevoTerneroSexo }; 
      if (nuevoTernero) setHijos(prev => [...prev, { id: nuevoTernero.id, caravana: nuevoTernero.caravana, sexo: nuevoTernero.sexo, estado: 'ACTIVO' }]);
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
        if (resultadoInput.includes('-')) {
            setLoading(false);
            return alert("❌ ERROR: No se permiten pesos negativos.");
        }
        const pesoClean = resultadoInput.replace(/[^\d.]/g, ''); 
        const pesoNum = parseFloat(pesoClean);
        if (isNaN(pesoNum) || pesoNum <= 0) {
            setLoading(false);
            return alert("❌ ERROR: El peso ingresado debe ser un número positivo mayor a 0.");
        }
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
    if (!error) { 
        recargarFicha(animalSel.id); if (tipoEventoInput === 'PESAJE') setUltimoPeso(resultadoFinal); 
        setResultadoInput(''); setDetalleInput(''); setTorosIdsInput([]); setNuevoTerneroCaravana(''); setPesoNacimiento(''); setCostoEvento(''); setAdpvCalculado(null); setMesesGestacion(null);
        fetchAnimales(); actualizarCartelToros(animalSelId);
    }
  }

  async function actualizarAnimal() {
    if (!animalSelId || !animalSel || !campoId) return;
    const condStr = editCondicion.length > 0 ? editCondicion.join(', ') : 'SANA';
    
    const eventosAInsertar = [];
    const fechaStr = new Date().toISOString();

    if (animalSel.potrero_id !== editPotreroId || animalSel.parcela_id !== editParcelaId) {
        const pNom = getNombrePotrero(editPotreroId || undefined);
        const parcNom = getNombreParcela(editParcelaId || undefined);
        const desc = editPotreroId ? `Asignado a: ${pNom} ${parcNom ? `(${parcNom})` : ''}` : 'Retirado de potrero';
        eventosAInsertar.push({
            animal_id: animalSel.id,
            fecha_evento: fechaStr,
            tipo: 'MOVIMIENTO_POTRERO',
            resultado: 'MOVIDO DE POTRERO',
            detalle: desc,
            datos_extra: { potrero_destino: pNom, parcela_destino: parcNom, potrero_id: editPotreroId, parcela_id: editParcelaId },
            establecimiento_id: campoId
        });
    }

    if (animalSel.lote_id !== editLoteId) {
        const lNom = getNombreLote(editLoteId || undefined);
        const desc = editLoteId ? `Asignado a lote: ${lNom}` : 'Retirado de lote';
        eventosAInsertar.push({
            animal_id: animalSel.id,
            fecha_evento: fechaStr,
            tipo: 'CAMBIO_LOTE',
            resultado: 'CAMBIO DE LOTE',
            detalle: desc,
            datos_extra: { lote_destino: lNom, lote_id: editLoteId },
            establecimiento_id: campoId
        });
    }

    const { error } = await supabase.from('animales').update({ 
        caravana: editCaravana, categoria: editCategoria, sexo: editSexo, estado: editEstado, 
        condicion: condStr, castrado: editCastrado, detalles: editDetalles, 
        potrero_id: editPotreroId, parcela_id: editParcelaId, lote_id: editLoteId, 
        fecha_nacimiento: editFechaNac || null, fecha_ingreso: editFechaIngreso || null 
    }).eq('id', animalSelId);

    if (eventosAInsertar.length > 0) {
        await supabase.from('eventos').insert(eventosAInsertar);
    }

    if (!error) {
        alert("Datos actualizados"); 
        fetchAnimales(); fetchActividadGlobal();
    }
  }

  async function borrarAnimalDefinitivo() {
    if (!animalSelId || !campoId) return; if (!confirm("⚠️ ¿BORRAR DEFINITIVAMENTE?")) return;
    await supabase.from('animales').update({ estado: 'ELIMINADO' }).eq('id', animalSelId);
    await supabase.from('eventos').insert({ animal_id: animalSelId, fecha_evento: new Date().toISOString(), tipo: 'BORRADO', resultado: 'ELIMINADO DEL SISTEMA', detalle: 'Borrado manual por seguridad', establecimiento_id: campoId });
    closeModalVaca(); fetchAnimales();
  }

  async function confirmarBaja() { if (!animalSelId || !modoBaja || !campoId) return; if (modoBaja === 'VENDIDO' && !bajaPrecio) return alert("Ingresá el precio"); if (modoBaja === 'MUERTO' && !bajaMotivo) return alert("Ingresá la causa"); if (!confirm("¿Confirmar salida?")) return; const resumen = modoBaja === 'VENDIDO' ? `$${bajaPrecio}` : bajaMotivo; await supabase.from('animales').update({ estado: modoBaja, detalle_baja: resumen }).eq('id', animalSelId); const det = modoBaja === 'VENDIDO' ? `Precio: $${bajaPrecio}/kg - ${bajaMotivo}` : `Causa: ${bajaMotivo}`; await supabase.from('eventos').insert([{ animal_id: animalSelId, tipo: 'BAJA', resultado: modoBaja, detalle: det, datos_extra: modoBaja === 'VENDIDO' ? { precio_kg: bajaPrecio, destino: bajaMotivo } : { causa: bajaMotivo }, establecimiento_id: campoId }]); closeModalVaca(); fetchAnimales(); }
  async function restaurarAnimal() { if (!animalSelId || !confirm("¿Restaurar?")) return; await supabase.from('animales').update({ estado: 'ACTIVO', detalle_baja: null }).eq('id', animalSelId); await supabase.from('eventos').insert([{ animal_id: animalSelId, tipo: 'RESTAURACION', resultado: 'Reingreso', detalle: 'Restaurado', establecimiento_id: campoId! }]); closeModalVaca(); fetchAnimales(); }
  
  // --- ACCIONES POTRERO Y PARCELAS ---
  async function guardarPotrero() { if (!nombrePotrero || !campoId) return; setLoading(true); const { error } = await supabase.from('potreros').insert([{ nombre: nombrePotrero, hectareas: Number(hasPotrero), estado: 'DESCANSO', establecimiento_id: campoId }]); setLoading(false); if (!error) { setNombrePotrero(''); setHasPotrero(''); fetchPotreros(); closeModalAlta(); } }
  
  async function editarPotrero(id: string, nombreActual: string, hasActual: number) {
      const nuevoNombre = prompt("Nuevo nombre del Potrero:", nombreActual);
      if (!nuevoNombre) return;
      const nuevasHas = prompt("Hectáreas totales:", hasActual.toString());
      if (nuevasHas === null) return;
      await supabase.from('potreros').update({ nombre: nuevoNombre, hectareas: Number(nuevasHas) }).eq('id', id);
      fetchPotreros();
      if (potreroSel?.id === id) setPotreroSel({ ...potreroSel, nombre: nuevoNombre, hectareas: Number(nuevasHas) });
  }

  async function abrirFichaPotrero(potrero: Potrero) { 
      setPotreroSel(potrero); setLaboresFicha([]); setNuevaParcelaNombre(''); setNuevaParcelaHas('');
      setActiveSection('potrero_detalle');
      const { data } = await supabase.from('labores').select('*').eq('potrero_id', potrero.id).order('fecha', { ascending: false }); 
      if (data) setLaboresFicha(data); 
  }
  
  async function guardarLabor() { 
      if (!potreroSel || !actividadPotrero || !campoId) return; 
      const { error } = await supabase.from('labores').insert([{ potrero_id: potreroSel.id, actividad: actividadPotrero, cultivo: cultivoInput, detalle: detalleLabor, costo: Number(costoLabor), establecimiento_id: campoId }]); 
      if (!error) { 
          if (actividadPotrero === 'SIEMBRA') { await supabase.from('potreros').update({ estado: 'SEMBRADO', cultivo_actual: cultivoInput }).eq('id', potreroSel.id); setPotreroSel({...potreroSel, estado: 'SEMBRADO', cultivo_actual: cultivoInput}); fetchPotreros(); } 
          else if (actividadPotrero === 'COSECHA') { await supabase.from('potreros').update({ estado: 'DESCANSO', cultivo_actual: null }).eq('id', potreroSel.id); setPotreroSel({...potreroSel, estado: 'DESCANSO', cultivo_actual: ''}); fetchPotreros(); } 
          const { data } = await supabase.from('labores').select('*').eq('potrero_id', potreroSel.id).order('fecha', { ascending: false }); 
          if (data) setLaboresFicha(data); setDetalleLabor(''); setCostoLabor('');
      } 
  }
  async function borrarLabor(id: string) { if(!confirm("¿Borrar?")) return; await supabase.from('labores').delete().eq('id', id); setLaboresFicha(laboresFicha.filter(l => l.id !== id)); }
  async function borrarPotrero(id: string) { if(!confirm("¿BORRAR POTRERO? Se perderán las labores y parcelas.")) return; await supabase.from('potreros').delete().eq('id', id); fetchPotreros(); fetchParcelas(); setActiveSection('agricultura'); }

  async function crearParcela() {
      if(!potreroSel || !nuevaParcelaNombre || !campoId) return;
      await supabase.from('parcelas').insert([{ nombre: nuevaParcelaNombre, hectareas: Number(nuevaParcelaHas), potrero_id: potreroSel.id, establecimiento_id: campoId }]);
      setNuevaParcelaNombre(''); setNuevaParcelaHas(''); fetchParcelas();
  }
  async function borrarParcela(id: string) {
      if(!confirm("¿Borrar parcela? Los animales adentro quedarán asignados solo al potrero general.")) return;
      await supabase.from('parcelas').delete().eq('id', id); fetchParcelas(); fetchAnimales();
  }

  // --- OTRAS FUNCIONES ---
  const exportarAExcel = () => {
    if (animalesFiltrados.length === 0) return alert("No hay datos para exportar");
    const cabeceras = ['Caravana', 'Categoria', 'Sexo', 'Estado', 'Condicion Sanitaria', 'Anotaciones', 'Ubicacion (Potrero)', 'Parcela', 'Lote (Grupo)', 'Fecha Ingreso'];
    const filas = animalesFiltrados.map(a => [ a.caravana, a.categoria, a.sexo === 'M' ? 'Macho' : 'Hembra', a.estado, a.condicion || 'SANA', a.detalles || '-', getNombrePotrero(a.potrero_id) || '-', getNombreParcela(a.parcela_id) || '-', getNombreLote(a.lote_id) || '-', a.fecha_ingreso ? formatDate(a.fecha_ingreso) : '-' ]);
    const contenidoCsv = [ cabeceras.join(';'), ...filas.map(fila => fila.join(';')) ].join('\n');
    const blob = new Blob(["\ufeff", contenidoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `Hacienda_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const haciendaActiva = animales.filter(a => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO');
  const stats = {
    total: haciendaActiva.length,
    vacas: haciendaActiva.filter(a => a.categoria === 'Vaca').length,
    vaquillonas: haciendaActiva.filter(a => a.categoria === 'Vaquillona').length,
    prenadas: haciendaActiva.filter(a => a.estado === 'PREÑADA').length,
    enfermos: haciendaActiva.filter(a => a.condicion && a.condicion.includes('ENFERMA')).length,
    terneros: haciendaActiva.filter(a => a.categoria === 'Ternero').length,
    ternerosM: haciendaActiva.filter(a => a.categoria === 'Ternero' && a.sexo === 'M').length,
    ternerosH: haciendaActiva.filter(a => a.categoria === 'Ternero' && a.sexo === 'H').length,
    novillos: haciendaActiva.filter(a => a.categoria === 'Novillo').length,
    toros: haciendaActiva.filter(a => a.categoria === 'Toro').length,
  };

  const totalVientres = stats.vacas + stats.vaquillonas; const prenadaPct = totalVientres > 0 ? Math.round((stats.prenadas / totalVientres) * 100) : 0;
  const esActivo = animalSel?.estado !== 'VENDIDO' && animalSel?.estado !== 'MUERTO' && animalSel?.estado !== 'ELIMINADO';

  const opcionesDisponibles = (() => { 
      if (!animalSel) return []; 
      const base = ['PESAJE', 'ENFERMEDAD', 'LESION', 'CURACION', 'TRATAMIENTO', 'VACUNACION', 'OTRO'];
      if (['Vaca', 'Vaquillona'].includes(animalSel.categoria)) return [...base, 'TACTO', 'SERVICIO', 'PARTO']; 
      if (animalSel.categoria === 'Ternero') return animalSel.sexo === 'M' ? [...base, 'CAPADO'] : base; 
      if (animalSel.categoria === 'Toro') return [...base, 'RASPAJE', 'APARTADO']; 
      return base; 
  })();

  return (
    <MantineProvider>
        {!session ? (
          <Container size={420} my={40}>
            <Title ta="center" order={1} mb="xl" c="teal">AgroControl</Title>
            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
              <Text size="sm" fw={500} ta="center" mb="lg">Iniciá sesión para administrar tu campo</Text>
              <TextInput label="Email" placeholder="tucorreo@ejemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <PasswordInput label="Contraseña" placeholder="Tu contraseña" required mt="md" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button fullWidth mt="xl" onClick={handleLogin} loading={authLoading} color="teal">Ingresar</Button>
            </Paper>
          </Container>
        ) : (
          <AppShell header={{ height: 60 }} navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
            <AppShell.Header>
              <Group h="100%" px="md" justify="space-between">
                <Group gap="sm" align="center" style={{ flex: 1 }}>
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <IconLeaf color="teal" size={28} />
                    <Title order={3} visibleFrom="xs">AgroControl</Title>
                    {campoId && establecimientos.length > 0 && (
                        <Group gap="sm" align="center" visibleFrom="sm">
                            <Text size="xl" c="dimmed" style={{ fontWeight: 300, userSelect: 'none' }}>|</Text>
                            <Title order={4} c="dimmed" fw={500}>{establecimientos.find(e => e.id === campoId)?.nombre || ''}</Title>
                        </Group>
                    )}
                </Group>
                <Group>
                    {campoId && (
                        <Popover width={250} position="bottom-end" withArrow shadow="md" opened={bellOpened} onChange={setBellOpened}>
                            <Popover.Target>
                                <Indicator disabled={tareasPendientesUrgentes.length === 0 && tareasParaHoy.length === 0} color="red" size={15} label={tareasPendientesUrgentes.length + tareasParaHoy.length} offset={4} zIndex={100}>
                                    <ActionIcon variant="light" color="orange" size="lg" radius="xl" onClick={() => setBellOpened((o) => !o)}>
                                        <IconBell size={22} />
                                    </ActionIcon>
                                </Indicator>
                            </Popover.Target>
                            <Popover.Dropdown>
                                <Text size="sm" fw={700} mb="xs">Resumen de Hoy</Text>
                                {tareasParaHoy.length === 0 ? (
                                    <Text size="sm" c="dimmed">No hay tareas programadas para el día de hoy.</Text>
                                ) : (
                                    <Text size="sm" c="dark">Tenés <Text span fw={700} c="teal">{tareasParaHoy.length}</Text> tarea(s) para hoy.</Text>
                                )}
                                {tareasAtrasadas.length > 0 && (
                                    <Text size="sm" c="red" mt={4} fw={500}>¡Atención! Tenés {tareasAtrasadas.length} tarea(s) atrasada(s).</Text>
                                )}
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
              {activeSection === 'inicio' && (
                <>
                  <Title order={2} mb="lg">Resumen General</Title>
                  
                  <Grid gutter="lg">
                    
                    {/* COLUMNA IZQUIERDA (7) - KPIs y Partos */}
                    <Grid.Col span={{ base: 12, md: 7 }}>
                      
                      {/* Fila de 3 KPIs */}
                      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
                        <Card shadow="sm" radius="md" p="md" withBorder>
                          <Group wrap="nowrap" gap="xs">
                            <RingProgress size={54} thickness={5} sections={[{ value: prenadaPct, color: 'teal' }]} label={<Center><Text size="xs" fw={700}>{prenadaPct}%</Text></Center>} />
                            <div><Text size="xs" c="dimmed" fw={700} lh={1.2} mb={2}>PREÑEZ (VIENTRES)</Text><Text fw={700} size="lg" c="teal" lh={1}>{stats.prenadas} / {totalVientres}</Text></div>
                          </Group>
                        </Card>
                        <Card shadow="sm" radius="md" p="md" withBorder>
                          <Group wrap="nowrap" gap="sm">
                            <ThemeIcon size="xl" radius="md" color="teal"><IconBabyCarriage/></ThemeIcon>
                            <div><Text size="xs" c="dimmed" fw={700} lh={1.2} mb={2}>TERNEROS</Text><Text fw={700} size="lg" lh={1}>{stats.terneros}</Text><Text size="xs" c="dimmed" lh={1}>({stats.ternerosM} M / {stats.ternerosH} H)</Text></div>
                          </Group>
                        </Card>
                        <Card shadow="sm" radius="md" p="md" withBorder>
                          <Group wrap="nowrap" gap="sm">
                            <ThemeIcon size="xl" radius="md" color={stats.enfermos > 0 ? 'red' : 'gray'}><IconHeartbeat/></ThemeIcon>
                            <div><Text size="xs" c="dimmed" fw={700} lh={1.2} mb={2}>ENFERMOS</Text><Text fw={700} size="lg" c={stats.enfermos > 0 ? 'red' : 'dimmed'} lh={1}>{stats.enfermos}</Text></div>
                          </Group>
                        </Card>
                      </SimpleGrid>

                      {/* Tarjeta de Partos */}
                      <Card shadow="sm" radius="md" p="md" withBorder>
                          <Group gap="xs" mb="sm">
                              <ThemeIcon size="lg" radius="md" color={partosProximos.length > 0 ? "teal" : "orange"}>
                                  {partosProximos.length > 0 ? <IconBabyCarriage size={20} /> : <IconCalendarEvent size={20} />}
                              </ThemeIcon>
                              <Text fw={700} size="xl">{partosProximos.length > 0 ? "Próximos Partos" : "Tareas para Hoy"}</Text>
                              {partosProximos.length > 0 && <Badge color="teal" variant="light">{partosProximos.length} en espera</Badge>}
                              {partosProximos.length === 0 && tareasParaHoy.length > 0 && <Badge color="orange" variant="light">{tareasParaHoy.length} pendientes</Badge>}
                          </Group>
                          
                          <ScrollArea h={583} offsetScrollbars>
                              {partosProximos.length > 0 ? (
                                  <Table striped stickyHeader>
                                      <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Fecha Est.</Table.Th><Table.Th>Vaca</Table.Th><Table.Th>Ubicación</Table.Th></Table.Tr></Table.Thead>
                                      <Table.Tbody>
                                          {partosProximos.map(parto => {
                                              const vacaVal = animales.find(a => a.id === parto.animal_id);
                                              const diasFaltan = diasDiferencia(parto.fecha_programada);
                                              const colorBadge = diasFaltan < 7 ? 'red' : diasFaltan < 15 ? 'orange' : 'teal';
                                              return (
                                                  <Table.Tr key={parto.id}>
                                                      <Table.Td>
                                                          <Group gap="xs">
                                                              <Text size="sm" fw={700} c={colorBadge}>
                                                                  {formatDate(parto.fecha_programada)}
                                                              </Text>
                                                              <Badge size="xs" color={colorBadge} variant="light">{diasFaltan} días</Badge>
                                                          </Group>
                                                      </Table.Td>
                                                      <Table.Td>
                                                          <Text fw={700} size="sm">{vacaVal?.caravana || '?'}</Text>
                                                      </Table.Td>
                                                      <Table.Td>
                                                          {vacaVal ? getUbicacionCompleta(vacaVal.potrero_id, vacaVal.parcela_id) : '-'}
                                                      </Table.Td>
                                                  </Table.Tr>
                                              );
                                          })}
                                      </Table.Tbody>
                                  </Table>
                              ) : tareasParaHoy.length > 0 ? (
                                  <Stack gap="xs" p="xs" mt="sm">
                                      {tareasParaHoy.map(tarea => (
                                          <Paper key={tarea.id} p="md" withBorder shadow="sm" radius="md" style={{ borderLeft: `4px solid #fd7e14` }}>
                                              <Group justify="space-between" align="center" wrap="nowrap">
                                                  <Checkbox size="lg" color="green" checked={tarea.completado} onChange={() => toggleCompletadoTarea(tarea.id, tarea.completado)} />
                                                  <div style={{ flex: 1 }}>
                                                      <Text fw={700} size="md" c="dark">{tarea.titulo}</Text>
                                                      {tarea.descripcion && <Text size="sm" c="dimmed" mt={4}>{tarea.descripcion}</Text>}
                                                  </div>
                                                  <ActionIcon variant="subtle" color="red" onClick={() => borrarTareaAgenda(tarea.id)}><IconTrash size={18}/></ActionIcon>
                                              </Group>
                                          </Paper>
                                      ))}
                                  </Stack>
                              ) : (
                                  <Center h="100%" style={{ display: 'flex', flexDirection: 'column', paddingTop: '2rem' }}>
                                      <ThemeIcon size={80} radius="100%" variant="light" color="gray" mb="md">
                                          <IconCheck size={40} />
                                      </ThemeIcon>
                                      <Text c="dimmed" size="lg" fw={700}>¡Todo al día!</Text>
                                      <Text c="dimmed" size="sm">No hay partos próximos ni tareas para hoy.</Text>
                                  </Center>
                              )}
                          </ScrollArea>
                      </Card>
                    </Grid.Col>

                    {/* COLUMNA DERECHA (5) - Gráfico y Movimientos */}
                    <Grid.Col span={{ base: 12, md: 5 }}>
                      
                      {/* Gráfico de Torta */}
                      <Card shadow="sm" radius="md" p="md" withBorder mb="lg">
                          <Text fw={700} mb="sm">Distribución del Rodeo</Text>
                          <Center>
                              <RingProgress size={200} thickness={18} label={<Center><Stack gap={0} align="center"><Text size="xs" c="dimmed" fw={700}>{chartHover ? chartHover.label : 'TOTAL'}</Text><Text fw={700} size="xl">{chartHover ? chartHover.value : stats.total}</Text></Stack></Center>}
                                  sections={[
                                      { value: (stats.vacas / stats.total) * 100, color: 'blue', tooltip: 'Vacas', onMouseEnter: () => setChartHover({label: 'VACAS', value: stats.vacas}), onMouseLeave: () => setChartHover(null) },
                                      { value: (stats.vaquillonas / stats.total) * 100, color: 'pink', tooltip: 'Vaquillonas', onMouseEnter: () => setChartHover({label: 'VAQUILLONAS', value: stats.vaquillonas}), onMouseLeave: () => setChartHover(null) },
                                      { value: (stats.terneros / stats.total) * 100, color: 'teal', tooltip: 'Terneros', onMouseEnter: () => setChartHover({label: 'TERNEROS', value: stats.terneros}), onMouseLeave: () => setChartHover(null) },
                                      { value: (stats.novillos / stats.total) * 100, color: 'orange', tooltip: 'Novillos', onMouseEnter: () => setChartHover({label: 'NOVILLOS', value: stats.novillos}), onMouseLeave: () => setChartHover(null) },
                                      { value: (stats.toros / stats.total) * 100, color: 'grape', tooltip: 'Toros', onMouseEnter: () => setChartHover({label: 'TOROS', value: stats.toros}), onMouseLeave: () => setChartHover(null) }
                                  ]}
                              />
                          </Center>
                          <Group justify="center" gap="xs" mt="sm"><Group gap={4}><Badge size="xs" circle color="blue"/><Text size="xs">Vacas</Text></Group><Group gap={4}><Badge size="xs" circle color="pink"/><Text size="xs">Vaq.</Text></Group><Group gap={4}><Badge size="xs" circle color="teal"/><Text size="xs">Terneros</Text></Group><Group gap={4}><Badge size="xs" circle color="orange"/><Text size="xs">Novillos</Text></Group><Group gap={4}><Badge size="xs" circle color="grape"/><Text size="xs">Toros</Text></Group></Group>
                      </Card>

                      {/* Tarjeta de Movimientos */}
                      <Card shadow="sm" radius="md" p="md" withBorder>
                          <Group gap="xs" mb="sm">
                              <ThemeIcon size="lg" radius="md" color="blue">
                                  <IconActivity size={20} />
                              </ThemeIcon>
                              <Text fw={700} size="lg">Últimos Movimientos</Text>
                          </Group>
                          <ScrollArea h={320} offsetScrollbars>
                              <Stack gap="xs" mt="xs">
                                  {eventosGlobales.slice(0, 15).map(ev => (
                                      <Group key={ev.id} wrap="nowrap" align="flex-start" gap="sm" p="xs" bg="gray.0" style={{borderRadius: 8}}>
                                          {getIconoEvento(ev.tipo)}
                                          <div style={{ flex: 1 }}>
                                              <Group justify="space-between" mb={2}>
                                                  <Text size="sm" fw={700}>{ev.tipo} <Text span c="dimmed" fw={400}>• {ev.animales?.caravana || 'Lote'}</Text></Text>
                                                  <Text size="xs" c="dimmed">{formatDate(ev.fecha_evento)}</Text>
                                              </Group>
                                              <Text size="xs" c="dimmed" lineClamp={1}>{ev.resultado} {ev.detalle ? `- ${ev.detalle}` : ''}</Text>
                                          </div>
                                      </Group>
                                  ))}
                              </Stack>
                          </ScrollArea>
                          <Button variant="light" fullWidth mt="md" onClick={() => setActiveSection('actividad')}>Ver Todo</Button>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </>
              )}

              {activeSection === 'agenda' && (
                  <>
                    <Group justify="space-between" mb="lg" align="center">
                        <Group>
                            <Title order={3}>Agenda y Tareas</Title>
                            <Badge size="xl" color="orange" circle>{agenda.filter(t => !t.completado).length}</Badge>
                        </Group>
                        <Button leftSection={<IconPlus size={22}/>} color="orange" size="md" variant="filled" onClick={openModalAgenda}>Nueva Tarea</Button>
                    </Group>

                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                        <Stack>
                            <Text fw={700} c="dimmed">Pendientes</Text>
                            {agenda.filter(t => !t.completado).length === 0 ? <Text c="dimmed" size="sm">No hay tareas pendientes.</Text> : 
                             agenda.filter(t => !t.completado).map(tarea => {
                                 const isParto = tarea.tipo === 'PARTO_ESTIMADO';
                                 const colorTag = isParto ? 'red' : 'blue';
                                 
                                 const isHoy = tarea.fecha_programada === hoyFormateado;
                                 const isVencida = tarea.fecha_programada < hoyFormateado;
                                 
                                 return (
                                     <Card key={tarea.id} shadow="sm" radius="md" withBorder style={{ borderLeft: `4px solid ${isParto ? '#fa5252' : '#228be6'}` }}>
                                         <Group justify="space-between" align="flex-start" wrap="nowrap">
                                             <Checkbox size="lg" color="green" checked={tarea.completado} onChange={() => toggleCompletadoTarea(tarea.id, tarea.completado)} mt={4}/>
                                             <div style={{ flex: 1 }}>
                                                 <Group gap="xs" mb={4}>
                                                     <Badge color={colorTag} variant="light" size="sm">{isParto ? 'ALERTA AUTOMÁTICA' : 'MANUAL'}</Badge>
                                                     <Text size="xs" c={isVencida ? 'red.7' : isHoy ? 'teal.7' : 'dimmed'} fw={700}>
                                                         {formatDate(tarea.fecha_programada)} {isVencida && '(Vencida)'} {isHoy && '(Para hoy)'}
                                                     </Text>
                                                 </Group>
                                                 <Text fw={700} size="md" c={isParto ? 'red.8' : 'dark'}>{tarea.titulo}</Text>
                                                 {tarea.descripcion && <Text size="sm" c="dimmed" mt={4}>{tarea.descripcion}</Text>}
                                             </div>
                                             <ActionIcon variant="subtle" color="red" onClick={() => borrarTareaAgenda(tarea.id)}><IconTrash size={18}/></ActionIcon>
                                         </Group>
                                     </Card>
                                 )
                             })
                            }
                        </Stack>

                        <Stack>
                            <Text fw={700} c="dimmed">Completadas Recientes</Text>
                            {agenda.filter(t => t.completado).length === 0 ? <Text c="dimmed" size="sm">Sin tareas completadas.</Text> : 
                             agenda.filter(t => t.completado).map(tarea => (
                                 <Card key={tarea.id} shadow="none" radius="md" withBorder bg="gray.0" style={{ opacity: 0.6 }}>
                                     <Group justify="space-between" align="flex-start" wrap="nowrap">
                                         <Checkbox size="lg" color="green" checked={tarea.completado} onChange={() => toggleCompletadoTarea(tarea.id, tarea.completado)} mt={4}/>
                                         <div style={{ flex: 1 }}>
                                             <Text fw={700} size="md" style={{ textDecoration: 'line-through' }}>{tarea.titulo}</Text>
                                             <Text size="xs" c="dimmed">Programada para: {formatDate(tarea.fecha_programada)}</Text>
                                         </div>
                                         <ActionIcon variant="subtle" color="red" onClick={() => borrarTareaAgenda(tarea.id)}><IconTrash size={18}/></ActionIcon>
                                     </Group>
                                 </Card>
                             ))
                            }
                        </Stack>
                    </SimpleGrid>
                  </>
              )}

              {activeSection === 'lotes' && (
                  <>
                    <Group justify="space-between" mb="lg" align="center">
                        <Group>
                            <Title order={3}>Lotes / Grupos</Title>
                            <Badge size="xl" color="grape" circle>{lotes.length}</Badge>
                        </Group>
                        <Button leftSection={<IconPlus size={22}/>} color="grape" size="md" variant="filled" onClick={() => { setNuevoLoteNombre(''); openModalAlta(); }} w={180}>Nuevo Lote</Button>
                    </Group>
                    
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                        {lotes.map(lote => { 
                            const animalesLote = haciendaActiva.filter(a => a.lote_id === lote.id);
                            const ultEv = eventosLotesGlobal.find(e => e.lote_id === lote.id);
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
                  </>
              )}

              {/* NUEVA VISTA DETALLE DEL LOTE (En el Body) */}
              {activeSection === 'lote_detalle' && loteSel && (
                  <>
                      <Group justify="space-between" mb="lg">
                          <Group align="center">
                              <ActionIcon variant="light" color="gray" size="lg" onClick={() => setActiveSection('lotes')} radius="xl">
                                  <IconArrowLeft size={22} />
                              </ActionIcon>
                              <IconTag color="purple" size={28}/>
                              <Title order={2}>Lote: {loteSel.nombre}</Title>
                              <ActionIcon variant="subtle" color="grape" onClick={() => renombrarLoteGrupo(loteSel.id, loteSel.nombre)}>
                                  <IconEdit size={20}/>
                              </ActionIcon>
                          </Group>
                          <Button color="red" variant="subtle" onClick={() => borrarLoteGrupo(loteSel.id)} leftSection={<IconTrash size={16}/>}>Eliminar Lote</Button>
                      </Group>

                      <Paper withBorder radius="md" p="md" bg="white">
                          <Tabs defaultValue="hacienda" color="grape">
                              <Tabs.List grow mb="md">
                                  <Tabs.Tab value="hacienda" leftSection={<IconList size={16}/>}>Hacienda ({haciendaActiva.filter(a => a.lote_id === loteSel.id).length})</Tabs.Tab>
                                  <Tabs.Tab value="nutricion" leftSection={<IconLeaf size={16}/>}>Nutrición / Eventos</Tabs.Tab>
                                  <Tabs.Tab value="rendimiento" leftSection={<IconChartDots size={16}/>}>Rendimiento Promedio</Tabs.Tab>
                              </Tabs.List>

                              <Tabs.Panel value="hacienda">
                                  <Group mb="md" align="flex-end">
                                      <MultiSelect data={haciendaActiva.filter(a => a.lote_id !== loteSel.id).map(a => ({value: a.id, label: `${a.caravana} (${a.categoria})`}))} placeholder="Buscar vacas libres en el campo..." value={agregarAlLoteIds} onChange={setAgregarAlLoteIds} searchable style={{ flex: 1 }}/>
                                      <Button onClick={meterAnimalesAlLote} color="grape" loading={loading} leftSection={<IconPlus size={16}/>}>Agregar al Lote</Button>
                                  </Group>
                                  <Table striped highlightOnHover>
                                      <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Caravana</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Ubicación Actual</Table.Th><Table.Th w={80}>Acción</Table.Th></Table.Tr></Table.Thead>
                                      <Table.Tbody>
                                          {haciendaActiva.filter(a => a.lote_id === loteSel.id).length > 0 ? (
                                              haciendaActiva.filter(a => a.lote_id === loteSel.id).map(a => (
                                                  <Table.Tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => abrirFichaVaca(a)}>
                                                      <Table.Td fw={700}>{a.caravana}</Table.Td>
                                                      <Table.Td>{a.categoria}</Table.Td>
                                                      <Table.Td>{getUbicacionCompleta(a.potrero_id, a.parcela_id)}</Table.Td>
                                                      <Table.Td align="right">
                                                          <Tooltip label="Sacar del lote" withArrow zIndex={3000}>
                                                              <ActionIcon color="red" variant="subtle" onClick={(e) => { e.stopPropagation(); sacarAnimalDeLote(a.id); }}><IconUnlink size={18}/></ActionIcon>
                                                          </Tooltip>
                                                      </Table.Td>
                                                  </Table.Tr>
                                              ))
                                          ) : (
                                              <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" size="sm" p="md" ta="center">No hay animales asignados a este lote.</Text></Table.Td></Table.Tr>
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
                                  <Group justify="flex-end" mt="sm" mb="md">
                                      <Tooltip label="Línea morada continua: Peso promedio real. Línea morada punteada: Proyección al día de hoy según el ritmo de engorde (ADPV). Líneas grises: Evolución individual de cada animal." multiline w={250} withArrow position="left" zIndex={3000} events={{ hover: true, focus: true, touch: true }}>
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
                                          <SimpleGrid cols={{ base: 1, sm: 3 }} mt="xl">
                                              <Paper withBorder p="md" ta="center" radius="md">
                                                  <Text size="sm" c="dimmed" fw={700} tt="uppercase">Promedio Inicial</Text>
                                                  <Text fw={700} size="xl">{statsGraficoLote.inicio} kg</Text>
                                              </Paper>
                                              <Paper withBorder p="md" ta="center" radius="md">
                                                  <Text size="sm" c="dimmed" fw={700} tt="uppercase">Ganancia Promedio</Text>
                                                  <Text fw={700} size="xl" c={statsGraficoLote.ganancia > 0 ? 'teal' : 'red'}>{statsGraficoLote.ganancia > 0 ? '+' : ''}{statsGraficoLote.ganancia} kg</Text>
                                              </Paper>
                                              <Paper withBorder p="md" ta="center" radius="md">
                                                  <Group justify="center" gap={6}>
                                                      <Text size="sm" c="dimmed" fw={700} tt="uppercase">Promedio Actual</Text>
                                                      {isLoteEstimated && (
                                                          <Tooltip label="Al menos un animal no tiene pesajes recientes. El gráfico proyecta matemáticamente su peso (línea punteada) hasta el día de hoy." multiline w={250} withArrow zIndex={3000}>
                                                              <ThemeIcon size="sm" variant="light" color="grape" style={{ cursor: 'help' }} radius="xl"><IconInfoCircle size={14} /></ThemeIcon>
                                                          </Tooltip>
                                                      )}
                                                  </Group>
                                                  <Text fw={700} size="xl" c="dark">{statsGraficoLote.actual} kg {isLoteEstimated && <Text span size="sm" c="grape" fw={500}>(Est.)</Text>}</Text>
                                              </Paper>
                                          </SimpleGrid>
                                      </>
                                  ) : (<Alert color="grape" title="Faltan Datos" mt="md" icon={<IconInfoCircle/>}>Para ver la curva de rendimiento, los animales de este lote necesitan tener registros de pesaje (PESAJE) en sus fichas individuales.</Alert>)}
                              </Tabs.Panel>
                          </Tabs>
                      </Paper>
                  </>
              )}

              {activeSection === 'masivos' && (
                  <>
                    <Group justify="space-between" mb="lg">
                        <Title order={2}>Carga de Eventos Masivos</Title>
                        <Badge size="xl" color="violet">{selectedIds.length} Seleccionados</Badge>
                    </Group>
                    <Paper p="md" mb="xl" radius="md" withBorder bg="violet.0">
                        <Text fw={700} size="lg" mb="sm" c="violet">1. Datos del Evento</Text>
                        <Group grow align="flex-start">
                            <Select label="Tipo de Actividad" data={['VACUNACION', 'DESPARASITACION', 'SUPLEMENTACION', 'MOVIMIENTO_POTRERO', 'CAMBIO_LOTE', 'VENTA', 'CAPADO', 'RASPAJE', 'TACTO', 'SERVICIO', 'TRATAMIENTO', 'OTRO']} value={massActividad} onChange={setMassActividad} allowDeselect={false}/>
                            <TextInput label="Fecha" type="date" value={getLocalDateForInput(massFecha)} onChange={(e) => setMassFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}/>
                        </Group>
                        {massActividad === 'VENTA' && ( <Group grow mt="sm"><TextInput label="Precio Promedio (Kg/Total)" placeholder="Ej: 2200" value={massPrecio} onChange={(e) => setMassPrecio(e.target.value)} leftSection={<IconCurrencyDollar size={16}/>}/><TextInput label="Destino" placeholder="Ej: Frigorifico" value={massDestino} onChange={(e) => setMassDestino(e.target.value)} /></Group> )}
                        {massActividad === 'MOVIMIENTO_POTRERO' && ( 
                            <Group grow mt="sm" align="flex-start">
                                <Select label="Potrero de Destino" placeholder="Seleccionar Potrero" data={potreros.map(p => ({ value: p.id, label: p.nombre }))} value={massPotreroDestino} onChange={(val) => { setMassPotreroDestino(val); setMassParcelaDestino(null); }} leftSection={<IconMapPin size={16}/>} /> 
                                <Select label="Parcela de Destino (Opcional)" placeholder={massPotreroDestino ? "General (Todo el potrero)" : "Primero elegí un potrero"} data={massPotreroDestino ? parcelas.filter(p => p.potrero_id === massPotreroDestino).map(p => ({ value: p.id, label: p.nombre })) : []} value={massParcelaDestino} onChange={setMassParcelaDestino} clearable disabled={!massPotreroDestino} leftSection={<IconMapPin size={16} style={{opacity: 0.5}}/>} />
                            </Group>
                        )}
                        {massActividad === 'CAMBIO_LOTE' && ( <Select label="Lote (Grupo) de Destino" placeholder="Seleccionar Lote" data={lotes.map(l => ({ value: l.id, label: l.nombre }))} value={massLoteDestino} onChange={setMassLoteDestino} leftSection={<IconTag size={16}/>} mt="sm"/> )}
                        {massActividad === 'TACTO' && ( 
                            <Group grow mt="sm" align="flex-start">
                                <Select label="Resultado del Tacto" data={['PREÑADA', 'VACÍA']} value={massTactoResultado} onChange={setMassTactoResultado} /> 
                                {massTactoResultado === 'PREÑADA' && (
                                    <Select label="Tiempo de Gestación Estimado" placeholder="Opcional. Agenda la fecha de parto." data={opcionesGestacion} value={massMesesGestacion} onChange={setMassMesesGestacion} clearable leftSection={<IconBabyCarriage size={16}/>}/>
                                )}
                            </Group>
                        )}
                        {massActividad === 'SERVICIO' && ( <Group grow mt="sm"><Select label="Tipo de Servicio" data={['TORO', 'IA']} value={massTipoServicio} onChange={setMassTipoServicio} />{massTipoServicio === 'TORO' && ( <MultiSelect label="Seleccionar Toro/s" data={torosDisponibles.map(t => ({value: t.id, label: t.caravana}))} value={massTorosIds} onChange={setMassTorosIds} searchable /> )}</Group> )}
                        <Group grow mt="sm"><TextInput label="Detalle / Observaciones" placeholder="Ej: Aftosa + Carbunclo" value={massDetalle} onChange={(e) => setMassDetalle(e.target.value)}/><TextInput label="Costo Unitario ($)" placeholder="Opcional" type="number" value={massCostoUnitario} onChange={(e) => setMassCostoUnitario(e.target.value)} leftSection={<IconCurrencyDollar size={16}/>}/></Group>
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
                        <Select placeholder="Filtrar Lote" data={lotes.map(l => ({value: l.id, label: l.nombre}))} value={filterLote} onChange={setFilterLote} clearable leftSection={<IconTag size={14}/>}/>
                    </Group>
                    <Paper withBorder radius="md" h={400} style={{ display: 'flex', flexDirection: 'column' }}>
                        <ScrollArea style={{ flex: 1 }}>
                        <Table stickyHeader>
                            <Table.Thead bg="gray.1"><Table.Tr><Table.Th w={50}>Check</Table.Th><Table.Th>Caravana</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Ubicación</Table.Th><Table.Th>Lote</Table.Th></Table.Tr></Table.Thead>
                            <Table.Tbody>
                                {animalesFiltrados.map(animal => (
                                    <Table.Tr key={animal.id} bg={selectedIds.includes(animal.id) ? 'violet.1' : undefined}>
                                        <Table.Td><Checkbox checked={selectedIds.includes(animal.id)} onChange={() => toggleSeleccion(animal.id)} /></Table.Td>
                                        <Table.Td><Text fw={700}>{animal.caravana}</Text></Table.Td>
                                        <Table.Td>{animal.categoria}</Table.Td>
                                        <Table.Td>
                                            <Group gap="xs">{animal.categoria === 'Ternero' && (<Badge size="sm" color={animal.sexo === 'M' ? 'blue' : 'pink'} variant="light">{animal.sexo === 'M' ? 'MACHO' : 'HEMBRA'}</Badge>)}{animal.categoria === 'Ternero' && animal.castrado ? (<Badge size="sm" color="cyan">CAPADO</Badge>) : (animal.categoria !== 'Ternero' && <Badge size="sm" color={getEstadoColor(animal.estado)}>{animal.estado}</Badge>)}{renderCondicionBadges(animal.condicion)}</Group>
                                        </Table.Td>
                                        <Table.Td>{getUbicacionCompleta(animal.potrero_id, animal.parcela_id)}</Table.Td>
                                        <Table.Td>{animal.lote_id ? <Badge size="sm" variant="outline" color="grape" leftSection={<IconTag size={10}/>}>{getNombreLote(animal.lote_id)}</Badge> : <Text size="xs" c="dimmed">-</Text>}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                        </ScrollArea>
                    </Paper>
                    {selectedIds.length > 0 && ( <Paper shadow="xl" p="md" radius="md" withBorder bg="gray.0" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, border: '2px solid #7950f2' }}><Group><Stack gap={0}><Text fw={700} size="sm">CONFIRMAR ACCIÓN</Text><Text size="xs" c="dimmed">{massActividad} en {selectedIds.length} animales</Text></Stack><Button size="lg" color="violet" loading={loading} onClick={guardarEventoMasivo}>CONFIRMAR</Button></Group></Paper> )}
                  </>
              )}

              {(activeSection === 'hacienda' || activeSection === 'bajas') && (
                <>
                  <Group justify="space-between" mb="lg" align="center">
                    <Group>
                        <Title order={3}>{activeSection === 'hacienda' ? 'Hacienda Activa' : 'Archivo de Bajas'}</Title>
                        <Badge size="xl" circle>{animalesFiltrados.length}</Badge>
                    </Group>
                    <Group gap="sm" mr="md">
                        <Button variant="outline" color="blue" leftSection={<IconDownload size={18}/>} onClick={exportarAExcel}>Excel</Button>
                        {activeSection === 'hacienda' && ( <Button leftSection={<IconPlus size={22}/>} color="teal" size="md" variant="filled" onClick={openModalAlta} w={180}>Nuevo Animal</Button> )}
                    </Group>
                  </Group>
                  <Paper p="sm" radius="md" withBorder mb="lg" bg="gray.0">
                      <Group grow align="flex-end">
                          <TextInput label="Buscar" placeholder="Caravana o Detalle..." leftSection={<IconSearch size={16}/>} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                          <Select label="Filtrar Categoría" placeholder="Todas" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={filterCategoria} onChange={setFilterCategoria} clearable />
                          <MultiSelect label="Estado / Sexo / Condición / Marca" placeholder="Ej: Macho, Enferma, Destacado..." data={['MACHO', 'HEMBRA', 'CAPADO', 'PREÑADA', 'VACÍA', 'ACTIVO', 'EN SERVICIO', 'APARTADO', 'ENFERMA', 'LASTIMADA', 'DESTACADO']} value={filterAtributos} onChange={setFilterAtributos} leftSection={<IconFilter size={16}/>} clearable />
                          <Select label="Filtrar por Lote" placeholder="Todos" data={lotes.map(l => ({value: l.id, label: l.nombre}))} value={filterLote} onChange={setFilterLote} clearable leftSection={<IconTag size={16}/>} />
                      </Group>
                  </Paper>
                  <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
                    <Table striped highlightOnHover>
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
                      <Table.Tbody>{animalesFiltrados.map((vaca) => (
                        <Table.Tr key={vaca.id} onClick={() => abrirFichaVaca(vaca)} style={{ cursor: 'pointer' }} bg={vaca.condicion && vaca.condicion.includes('ENFERMA') ? 'red.0' : undefined}>
                          <Table.Td><Text fw={700}>{vaca.caravana}</Text></Table.Td>
                          <Table.Td>{vaca.categoria}</Table.Td>
                          <Table.Td>
                            {activeSection === 'bajas' ? (<Badge color={vaca.estado === 'VENDIDO' ? 'green' : 'red'}>{vaca.estado}</Badge>) : (<Group gap="xs">{vaca.categoria === 'Ternero' && (<Badge color={vaca.sexo === 'M' ? 'blue' : 'pink'} variant="light">{vaca.sexo === 'M' ? 'MACHO' : 'HEMBRA'}</Badge>)}{vaca.categoria === 'Ternero' && vaca.castrado ? (<Badge color="cyan">CAPADO</Badge>) : (vaca.categoria !== 'Ternero' && <Badge color={getEstadoColor(vaca.estado)}>{vaca.estado}</Badge>)}{renderCondicionBadges(vaca.condicion)}</Group>)}
                          </Table.Td>
                          <Table.Td style={{ maxWidth: 150 }}>
                            <Tooltip label={vaca.detalles} disabled={!vaca.detalles} multiline w={200} withArrow zIndex={3000}>
                                <Text size="sm" c="dimmed" truncate="end">{vaca.detalles || '-'}</Text>
                            </Tooltip>
                          </Table.Td>
                          <Table.Td>{getUbicacionCompleta(vaca.potrero_id, vaca.parcela_id)}</Table.Td>
                          <Table.Td>{vaca.lote_id ? <Badge variant="outline" color="grape" leftSection={<IconTag size={10}/>}>{getNombreLote(vaca.lote_id)}</Badge> : <Text size="xs" c="dimmed">-</Text>}</Table.Td>
                          {activeSection === 'bajas' ? ( <Table.Td>{vaca.detalle_baja ? <Text size="sm" fw={500}>{vaca.detalle_baja}</Text> : <Text size="xs" c="dimmed">-</Text>}</Table.Td> ) : null}
                          <Table.Td onClick={(e) => { e.stopPropagation(); toggleDestacado(vaca.id, !!vaca.destacado); }} align="right">
                            <ActionIcon variant="subtle" color="yellow">
                                {vaca.destacado ? <IconStarFilled size={18} /> : <IconStar size={18} />}
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      ))}</Table.Tbody>
                    </Table>
                  </Paper>
                </>
              )}

              {activeSection === 'agricultura' && ( 
                <> 
                  <Group justify="space-between" mb="lg" align="center"><Group><Title order={3}>Agricultura / Potreros</Title><Badge size="xl" color="lime" circle>{potreros.length}</Badge></Group><Button leftSection={<IconPlus size={22}/>} color="lime" size="md" variant="filled" onClick={() => { setNombrePotrero(''); setHasPotrero(''); openModalAlta(); }} w={180} mr="md">Nuevo Potrero</Button></Group>
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{potreros.map(potrero => { const animalesEnPotrero = haciendaActiva.filter(a => a.potrero_id === potrero.id).length; return (<Card key={potrero.id} shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => abrirFichaPotrero(potrero)}><Group justify="space-between" mb="xs"><Text fw={700} size="lg">{potrero.nombre}</Text><Badge color={potrero.estado === 'SEMBRADO' ? 'green' : 'yellow'}>{potrero.estado}</Badge></Group><Group mb="md" gap="xs"><Badge variant="outline" color="gray">{potrero.hectareas} Has</Badge>{potrero.cultivo_actual && <Badge variant="dot" color="lime">{potrero.cultivo_actual}</Badge>}</Group><Paper bg="gray.0" p="xs" radius="md" mt="sm"><Group justify="space-between"><Text size="xs" fw={700} c="dimmed">CARGA ANIMAL</Text><Badge color="blue" variant="light">{animalesEnPotrero} Cab</Badge></Group></Paper><Button variant="light" color="lime" fullWidth mt="md" radius="md">Gestionar Potrero</Button></Card>)})}</SimpleGrid>
                  {potreros.length === 0 && <Text c="dimmed" ta="center" mt="xl">No hay potreros cargados.</Text>} 
                </> 
              )}

              {/* VISTA DETALLE DEL POTRERO */}
              {activeSection === 'potrero_detalle' && potreroSel && (
                  <>
                      <Group justify="space-between" mb="lg">
                          <Group align="center">
                              <ActionIcon variant="light" color="gray" size="lg" onClick={() => setActiveSection('agricultura')} radius="xl">
                                  <IconArrowLeft size={22} />
                              </ActionIcon>
                              <IconTractor color="green" size={28}/>
                              <Title order={2}>Potrero: {potreroSel.nombre}</Title>
                              <Badge color="gray" variant="outline" size="lg">{potreroSel.hectareas} Has</Badge>
                              <ActionIcon variant="subtle" color="lime" onClick={() => editarPotrero(potreroSel.id, potreroSel.nombre, potreroSel.hectareas)}>
                                  <IconEdit size={20}/>
                              </ActionIcon>
                          </Group>
                      </Group>

                      <Paper withBorder radius="md" p="md" bg="white">
                          <Tabs defaultValue="labores" color="lime">
                              <Tabs.List grow mb="md">
                                  <Tabs.Tab value="labores" leftSection={<IconLeaf size={16}/>}>Labores y Cultivos</Tabs.Tab>
                                  <Tabs.Tab value="parcelas" leftSection={<IconMapPin size={16}/>}>Parcelas Internas ({parcelas.filter(p => p.potrero_id === potreroSel.id).length})</Tabs.Tab>
                                  <Tabs.Tab value="animales" leftSection={<IconList size={16}/>}>Hacienda ({haciendaActiva.filter(a => a.potrero_id === potreroSel.id).length})</Tabs.Tab>
                              </Tabs.List>

                              <Tabs.Panel value="labores">
                                  <Paper withBorder p="md" bg="lime.0" mb="lg" radius="md">
                                      <Text size="sm" fw={700} mb="xs" c="lime.9">Registrar Nueva Labor</Text>
                                      <Group grow mb="sm">
                                          <Select data={['SIEMBRA', 'FUMIGADA', 'COSECHA', 'FERTILIZACION', 'DESMALEZADA', 'OTRO']} value={actividadPotrero} onChange={setActividadPotrero}/>
                                          <TextInput placeholder="Cultivo / Producto" value={cultivoInput} onChange={(e) => setCultivoInput(e.target.value)} />
                                      </Group>
                                      <Group grow mb="sm">
                                          <TextInput placeholder="Costo Total ($)" type="number" leftSection={<IconCurrencyDollar size={14}/>} value={costoLabor} onChange={(e) => setCostoLabor(e.target.value)}/>
                                          <TextInput placeholder="Detalle / Observaciones..." value={detalleLabor} onChange={(e) => setDetalleLabor(e.target.value)} />
                                      </Group>
                                      <Button onClick={guardarLabor} color="lime" variant="filled" leftSection={<IconCheck size={16}/>}>Guardar Labor</Button>
                                  </Paper>

                                  <Text fw={700} mb="sm">Historial Agrícola</Text>
                                  {laboresFicha.length === 0 ? <Text c="dimmed" size="sm" p="md" bg="gray.0" style={{borderRadius: 8}}>Sin labores registradas en este potrero.</Text> : (
                                      <Table striped>
                                          <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Labor</Table.Th><Table.Th>Detalle</Table.Th><Table.Th>Costo</Table.Th><Table.Th w={50}></Table.Th></Table.Tr></Table.Thead>
                                          <Table.Tbody>
                                              {laboresFicha.map(labor => (
                                                  <Table.Tr key={labor.id}>
                                                      <Table.Td><Text size="sm" c="dimmed">{formatDate(labor.fecha)}</Text></Table.Td>
                                                      <Table.Td><Text fw={700} size="sm">{labor.actividad}</Text>{labor.cultivo && <Badge size="xs" color="lime" ml="xs">{labor.cultivo}</Badge>}</Table.Td>
                                                      <Table.Td><Text size="sm">{labor.detalle}</Text></Table.Td>
                                                      <Table.Td><Text size="sm" fw={700} c="dimmed">${labor.costo || 0}</Text></Table.Td>
                                                      <Table.Td align="right"><ActionIcon color="red" variant="subtle" size="sm" onClick={() => borrarLabor(labor.id)}><IconTrash size={16}/></ActionIcon></Table.Td>
                                                  </Table.Tr>
                                              ))}
                                          </Table.Tbody>
                                      </Table>
                                  )}
                                  <Button fullWidth color="red" variant="subtle" mt="xl" onClick={() => borrarPotrero(potreroSel.id)}>Eliminar Potrero del Sistema</Button>
                              </Tabs.Panel>

                              <Tabs.Panel value="parcelas">
                                  <Paper withBorder p="md" bg="gray.0" mb="lg" radius="md">
                                      <Text size="sm" fw={700} mb="xs">Crear Parcela Interna (Sub-división)</Text>
                                      <Group align="flex-end">
                                          <TextInput label="Nombre/Número" placeholder="Ej: Parcela 1" value={nuevaParcelaNombre} onChange={(e) => setNuevaParcelaNombre(e.target.value)} style={{flex: 2}}/>
                                          <TextInput label="Hectáreas" type="number" placeholder="Ej: 10" value={nuevaParcelaHas} onChange={(e) => setNuevaParcelaHas(e.target.value)} style={{flex: 1}}/>
                                          <Button onClick={crearParcela} color="blue" leftSection={<IconPlus size={16}/>}>Agregar</Button>
                                      </Group>
                                  </Paper>

                                  <Table striped highlightOnHover>
                                      <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Nombre Parcela</Table.Th><Table.Th>Hectáreas</Table.Th><Table.Th>Animales Adentro</Table.Th><Table.Th w={80}></Table.Th></Table.Tr></Table.Thead>
                                      <Table.Tbody>
                                          {parcelas.filter(p => p.potrero_id === potreroSel.id).length > 0 ? (
                                              parcelas.filter(p => p.potrero_id === potreroSel.id).map(parc => {
                                                  const animalesAca = haciendaActiva.filter(a => a.parcela_id === parc.id).length;
                                                  return (
                                                      <Table.Tr key={parc.id}>
                                                          <Table.Td fw={700}>{parc.nombre}</Table.Td>
                                                          <Table.Td>{parc.hectareas} Has</Table.Td>
                                                          <Table.Td><Badge color="blue" variant="light">{animalesAca} Cabezas</Badge></Table.Td>
                                                          <Table.Td align="right">
                                                              <ActionIcon color="red" variant="subtle" onClick={() => borrarParcela(parc.id)}><IconTrash size={16}/></ActionIcon>
                                                          </Table.Td>
                                                      </Table.Tr>
                                                  )
                                              })
                                          ) : (
                                              <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" size="sm" p="md" ta="center">No hay parcelas creadas. El potrero se está usando entero.</Text></Table.Td></Table.Tr>
                                          )}
                                      </Table.Tbody>
                                  </Table>
                              </Tabs.Panel>

                              <Tabs.Panel value="animales">
                                  <Table striped highlightOnHover>
                                      <Table.Thead bg="gray.1"><Table.Tr><Table.Th>Caravana</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Parcela</Table.Th></Table.Tr></Table.Thead>
                                      <Table.Tbody>
                                          {haciendaActiva.filter(a => a.potrero_id === potreroSel.id).length > 0 ? (
                                              haciendaActiva.filter(a => a.potrero_id === potreroSel.id).map(a => (
                                                  <Table.Tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => abrirFichaVaca(a)}>
                                                      <Table.Td fw={700}>{a.caravana}</Table.Td>
                                                      <Table.Td>{a.categoria}</Table.Td>
                                                      <Table.Td>{getNombreParcela(a.parcela_id) || <Text size="xs" c="dimmed">Suelto (General)</Text>}</Table.Td>
                                                  </Table.Tr>
                                              ))
                                          ) : (
                                              <Table.Tr><Table.Td colSpan={3}><Text c="dimmed" size="sm" p="md" ta="center">No hay animales pastando en este potrero.</Text></Table.Td></Table.Tr>
                                          )}
                                      </Table.Tbody>
                                  </Table>
                              </Tabs.Panel>
                          </Tabs>
                      </Paper>
                  </>
              )}
              
              {activeSection === 'actividad' && ( <> <Group mb="md"><TextInput style={{flex: 2}} leftSection={<IconSearch size={16}/>} placeholder="Buscar por Caravana..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /><Select style={{flex: 1}} placeholder="Filtrar Actividad" data={['PESAJE', 'TACTO', 'SERVICIO', 'PARTO', 'BAJA', 'VACUNACION', 'ENFERMEDAD', 'CURACION', 'CAPADO', 'TRATAMIENTO', 'MOVIMIENTO_POTRERO', 'CAMBIO_LOTE', 'OTRO']} value={filtroTipoEvento} onChange={setFiltroTipoEvento} clearable /></Group><Paper radius="md" withBorder><Table><Table.Thead><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Ref</Table.Th><Table.Th>Evento</Table.Th><Table.Th>Detalle</Table.Th><Table.Th>Costo</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{eventosFiltrados.map(ev => (<Table.Tr key={ev.id}><Table.Td><Text size="sm" c="dimmed">{formatDate(ev.fecha_evento)}</Text></Table.Td><Table.Td><Text fw={700}>{ev.animales?.caravana || '-'}</Text></Table.Td><Table.Td><Badge variant="outline" size="sm">{ev.tipo}</Badge></Table.Td><Table.Td><Text size="sm" fw={500}>{ev.resultado}</Text>{ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}{ev.datos_extra && ev.datos_extra.toros_caravanas && (<Text size="xs" c="dimmed">Toro/s: {ev.datos_extra.toros_caravanas}</Text>)}{ev.datos_extra && ev.datos_extra.potrero_destino && (<Text size="xs" c="dimmed">Destino: {ev.datos_extra.potrero_destino} {ev.datos_extra.parcela_destino ? `(${ev.datos_extra.parcela_destino})` : ''}</Text>)}{ev.datos_extra && ev.datos_extra.lote_destino && (<Text size="xs" c="dimmed">Grupo: {ev.datos_extra.lote_destino}</Text>)}</Table.Td><Table.Td><Text size="sm" c="dimmed">${ev.costo || 0}</Text></Table.Td></Table.Tr>))}</Table.Tbody></Table></Paper> </> )}
            </AppShell.Main>
          </AppShell>
        )}

      <Modal opened={modalAltaOpen} onClose={closeModalAlta} title={<Text fw={700} size="lg">{activeSection === 'agricultura' ? 'Nuevo Potrero' : activeSection === 'lotes' ? 'Nuevo Lote' : 'Alta de Nuevo Animal'}</Text>} centered>
         <Stack>
            {activeSection === 'agricultura' ? ( <><TextInput label="Nombre del Potrero" placeholder="Ej: Potrero del Fondo" value={nombrePotrero} onChange={(e) => setNombrePotrero(e.target.value)} /><TextInput label="Hectáreas" type="number" placeholder="Ej: 50" value={hasPotrero} onChange={(e) => setHasPotrero(e.target.value)} /><Button onClick={guardarPotrero} loading={loading} color="lime" fullWidth mt="md">Crear Potrero</Button></> ) : 
             activeSection === 'lotes' ? ( <><TextInput label="Nombre del Lote (Grupo)" placeholder="Ej: Recría 2026" value={nuevoLoteNombre} onChange={(e) => setNuevoLoteNombre(e.target.value)} /><Button onClick={crearLoteGrupo} loading={loading} color="grape" fullWidth mt="md">Crear Lote</Button></> ) :
             ( <>
                <TextInput label="Caravana" placeholder="ID del animal" value={caravana} onChange={(e) => setCaravana(e.target.value)} />
                <Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={categoria} onChange={setCategoria} />
                <Select label="Sexo" data={['H', 'M']} value={sexo} onChange={setSexo} disabled={sexoBloqueado} />
                <Group grow mt="md">
                    <Button onClick={() => guardarAnimal(false)} loading={loading} color="teal" variant="outline">Guardar y agregar otro</Button>
                    <Button onClick={() => guardarAnimal(true)} loading={loading} color="teal">Guardar y cerrar</Button>
                </Group>
             </> )}
         </Stack>
      </Modal>
      
      <Modal opened={modalAgendaOpen} onClose={closeModalAgenda} title={<Text fw={700} size="lg">Nueva Tarea Programada</Text>} centered>
          <Stack>
              <TextInput label="Título de la Tarea" placeholder="Ej: Vacunar Lote Recría" value={nuevaTareaTitulo} onChange={(e) => setNuevaTareaTitulo(e.target.value)} required/>
              <TextInput label="Fecha de Ejecución" type="date" value={getLocalDateForInput(nuevaTareaFecha)} onChange={(e) => setNuevaTareaFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} required/>
              <Textarea label="Detalle (Opcional)" placeholder="Escribir observaciones..." value={nuevaTareaDesc} onChange={(e) => setNuevaTareaDesc(e.target.value)} minRows={3}/>
              <Button onClick={guardarTareaAgenda} loading={loading} color="orange" fullWidth mt="md">Programar Tarea</Button>
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
          ) : (<Alert color="blue" title="Sin datos">Este animal no tiene suficientes registros de peso para generar una curva.</Alert>)}
      </Modal>

      <Modal opened={modalVacaOpen} onClose={handleCloseModalVaca} title={<Text fw={700} size="lg">Ficha: {animalSel?.caravana} {esActivo ? '' : '(ARCHIVO)'}</Text>} size="lg" centered zIndex={2000}>
         <Tabs value={activeTabVaca} onChange={setActiveTabVaca} color="teal"><Tabs.List grow mb="md"><Tabs.Tab value="historia">Historia</Tabs.Tab><Tabs.Tab value="datos">Datos</Tabs.Tab></Tabs.List>
           <Tabs.Panel value="historia">
              {esActivo ? ( <Paper withBorder p="sm" bg="gray.0" mb="md"><Text size="sm" fw={700} mb="xs">Registrar Evento</Text><Group grow mb="sm"><TextInput leftSection={<IconCalendar size={16}/>} placeholder="Fecha" type="date" value={getLocalDateForInput(fechaEvento)} onChange={(e) => setFechaEvento(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} max={new Date().toISOString().split('T')[0]} style={{ flex: 1 }} /><Select data={opcionesDisponibles} placeholder="Tipo" value={tipoEventoInput} onChange={setTipoEventoInput} comboboxProps={{ zIndex: 200005 }} /></Group>
              
              {tipoEventoInput === 'TACTO' && ( 
                  <Group grow mb="sm" align="flex-start">
                      <Select label="Resultado del Tacto" data={['PREÑADA', 'VACÍA']} value={tactoResultado} onChange={setTactoResultado} comboboxProps={{ zIndex: 200005 }}/> 
                      {tactoResultado === 'PREÑADA' && (
                          <Select label="Tiempo de Gestación Estimado" placeholder="Opcional. Agenda parto automático." data={opcionesGestacion} value={mesesGestacion} onChange={setMesesGestacion} clearable leftSection={<IconBabyCarriage size={16}/>} comboboxProps={{ zIndex: 200005 }}/>
                      )}
                  </Group>
              )}
              
              {tipoEventoInput === 'SERVICIO' && ( <Group grow mb="sm" align="flex-end"><Select label="Tipo de Servicio" data={['TORO', 'IA']} value={tipoServicio} onChange={setTipoServicio} comboboxProps={{ zIndex: 200005 }}/ >{tipoServicio === 'TORO' && ( <MultiSelect label="Seleccionar Toro/s" data={torosDisponibles.map(t => ({value: t.id, label: t.caravana}))} value={torosIdsInput} onChange={setTorosIdsInput} searchable comboboxProps={{ zIndex: 200005 }} /> )}</Group> )}{tipoEventoInput === 'PARTO' && ( <Paper withBorder p="xs" bg="teal.0" mb="sm"><Text size="sm" fw={700} c="teal">Datos del Nuevo Ternero</Text><Group grow><TextInput label="Caravana Ternero" placeholder="Nueva ID" value={nuevoTerneroCaravana} onChange={(e) => setNuevoTerneroCaravana(e.target.value)} required/><Select label="Sexo" data={['M', 'H']} value={nuevoTerneroSexo} onChange={setNuevoTerneroSexo} comboboxProps={{ zIndex: 200005 }}/></Group><TextInput mt="sm" label="Peso al Nacer (kg)" placeholder="Opcional" type="number" value={pesoNacimiento} onChange={(e) => setPesoNacimiento(e.target.value)}/></Paper> )}{!['TACTO', 'SERVICIO', 'PARTO', 'ENFERMEDAD', 'LESION', 'CURACION', 'CAPADO', 'RASPAJE', 'APARTADO'].includes(tipoEventoInput || '') && ( <Group grow mb="sm"><TextInput placeholder="Resultado (Ej: 350kg, Observación...)" value={resultadoInput} onChange={(e) => setResultadoInput(e.target.value)} /></Group> )}<TextInput label="Costo ($)" placeholder="Opcional" type="number" value={costoEvento} onChange={(e) => setCostoEvento(e.target.value)} leftSection={<IconCurrencyDollar size={14}/>} mb="sm"/>{adpvCalculado && <Alert color="green" icon={<IconTrendingUp size={16}/>} title="Rendimiento Detectado" mb="sm">{adpvCalculado}</Alert>}<Group grow align="flex-start"><Textarea placeholder="Detalles / Observaciones..." rows={2} value={detalleInput} onChange={(e) => setDetalleInput(e.target.value)} style={{flex: 1}}/><Button size="md" onClick={guardarEventoVaca} color="teal" loading={loading} style={{ maxWidth: 120 }}>Guardar</Button></Group></Paper> ) : ( <Alert color="gray" icon={<IconArchive size={16}/>} mb="md">Este animal está archivado. Solo lectura.</Alert> )}
              <ScrollArea h={300}><Table striped><Table.Tbody>{eventosFicha.map(ev => (<Table.Tr key={ev.id}><Table.Td><Text size="xs">{formatDate(ev.fecha_evento)}</Text></Table.Td><Table.Td><Text fw={700} size="sm">{ev.tipo}</Text></Table.Td><Table.Td><Text size="sm" fw={500}>{ev.resultado}</Text>{ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}{ev.datos_extra && ev.datos_extra.toros_caravanas && <Badge size="xs" color="pink" variant="outline" ml="xs">Toro/s: {ev.datos_extra.toros_caravanas}</Badge>}{ev.datos_extra && ev.datos_extra.precio_kg && <Badge size="xs" color="green" variant="outline" ml="xs">${ev.datos_extra.precio_kg}</Badge>}</Table.Td><Table.Td><Text size="xs" c="dimmed">${ev.costo || 0}</Text></Table.Td><Table.Td align="right"><ActionIcon size="sm" variant="subtle" color="blue" onClick={() => iniciarEdicionEvento(ev)}><IconEdit size={14}/></ActionIcon><ActionIcon size="sm" variant="subtle" color="red" onClick={() => borrarEvento(ev.id)}><IconTrash size={14}/></ActionIcon></Table.Td></Table.Tr>))}</Table.Tbody></Table></ScrollArea>
           </Tabs.Panel>
           <Tabs.Panel value="datos">
              <Paper withBorder p="sm" bg="gray.1" mb="md" radius="md"><Group justify="space-between"><Text size="sm" fw={700} c="dimmed">ÚLTIMO PESO:</Text><UnstyledButton onClick={abrirGraficoPeso}><Badge size="lg" variant="filled" color="blue" leftSection={<IconChartDots size={14}/>} style={{cursor: 'pointer'}}>{ultimoPeso}</Badge></UnstyledButton></Group></Paper>
              <TextInput label="Caravana" value={editCaravana} onChange={(e) => setEditCaravana(e.target.value)} mb="sm" disabled={!esActivo} />
              <Group grow mb="sm"><Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={editCategoria} onChange={setEditCategoria} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} />{['Vaca', 'Vaquillona'].includes(editCategoria || '') && ( <Select label="Reproductivo" data={['ACTIVO', 'PREÑADA', 'VACÍA']} value={editEstado} onChange={setEditEstado} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} /> )}</Group>
              
              <Group grow mb="sm">
                  <Select label="Potrero (Ubicación)" placeholder="Sin asignar" data={potreros.map(p => ({value: p.id, label: p.nombre}))} value={editPotreroId} onChange={(val) => { setEditPotreroId(val); setEditParcelaId(null); }} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} />
                  {editPotreroId && (
                      <Select label="Parcela" placeholder="General" data={parcelas.filter(p => p.potrero_id === editPotreroId).map(p => ({value: p.id, label: p.nombre}))} value={editParcelaId} onChange={setEditParcelaId} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} />
                  )}
              </Group>
              <Select label="Lote (Grupo)" placeholder="Sin asignar" data={lotes.map(l => ({value: l.id, label: l.nombre}))} value={editLoteId} onChange={setEditLoteId} comboboxProps={{ zIndex: 200005 }} clearable disabled={!esActivo} mb="sm" />
              
              {['Ternero', 'Novillo'].includes(editCategoria || '') && ( <TextInput label="Caravana Madre" value={madreCaravana} readOnly mb="sm" rightSection={<IconBabyCarriage size={16}/>} /> )}
              {nombresTorosCartel && ( <Paper withBorder p="xs" bg="pink.0" radius="md" mb="sm" style={{ borderLeft: '4px solid #fa5252' }}><Group gap="xs"><ThemeIcon color="pink" variant="light" size="sm"><IconInfoCircle size={14}/></ThemeIcon><Text size="sm" c="pink.9">En servicio con Toro/s: <Text span fw={700}>{nombresTorosCartel}</Text></Text></Group></Paper> )}
              {['Vaca'].includes(editCategoria || '') && ( <Paper withBorder p="xs" mb="sm" bg="teal.0"><Text size="xs" fw={700} c="teal">HIJOS REGISTRADOS:</Text>{hijos.length > 0 ? ( <Group gap="xs" mt={5}>{hijos.map(h => { const isGone = ['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(h.estado); return (<Badge key={h.id} variant={isGone ? 'light' : 'white'} style={{ cursor: 'pointer', opacity: isGone ? 0.5 : 1 }} color={h.sexo === 'H' ? 'pink' : 'blue'} onClick={() => navegarAHijo(h.id)}>{h.caravana}</Badge>)})}</Group> ) : <Text size="xs" c="dimmed">Sin registros</Text>}</Paper> )}
              <MultiSelect label="Condición Sanitaria" data={['ENFERMA', 'LASTIMADA']} value={editCondicion} onChange={setEditCondicion} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} leftSection={<IconHeartbeat size={16}/>} mb="sm" placeholder="SANA"/>
              {editCategoria === 'Ternero' && editSexo === 'M' && ( <Group justify="space-between" mb="sm" p="xs" bg="gray.0" style={{borderRadius: 8}}><Group gap="xs"><IconScissors size={18}/> <Text size="sm" fw={500}>Condición Sexual</Text></Group><Switch size="lg" onLabel="CAPADO" offLabel="ENTERO" checked={editCastrado} onChange={(e) => setEditCastrado(e.currentTarget.checked)} disabled={!esActivo} /></Group> )}
              <Textarea label="Detalles / Anotaciones" placeholder="Información adicional o particularidad del animal..." value={editDetalles} onChange={(e) => setEditDetalles(e.target.value)} disabled={!esActivo} minRows={3} mb="sm" />
              <Group grow mb="xl"><TextInput label="Fecha Nacimiento" type="date" value={editFechaNac} onChange={(e) => setEditFechaNac(e.target.value)} disabled={!esActivo} /><TextInput label="Fecha Ingreso" type="date" value={editFechaIngreso} onChange={(e) => setEditFechaIngreso(e.target.value)} disabled={!esActivo} /></Group>
              {esActivo ? ( <>{!modoBaja ? ( <><Button fullWidth variant="outline" leftSection={<IconCheck size={16}/>} onClick={actualizarAnimal} mb="xl">Guardar Cambios</Button><Text size="sm" fw={700} c="red.6" mb="xs">Zona de Baja</Text><Group grow><Button color="orange" onClick={() => setModoBaja('VENDIDO')} leftSection={<IconCurrencyDollar size={16}/>}>Vendido</Button><Button color="red" onClick={() => setModoBaja('MUERTO')} leftSection={<IconSkull size={16}/>}>Muerto</Button></Group><Button fullWidth variant="subtle" color="gray" mt="xs" leftSection={<IconTrash size={16}/>} onClick={borrarAnimalDefinitivo}>Borrar definitivamente</Button></> ) : ( <Paper withBorder p="sm" bg={modoBaja === 'VENDIDO' ? 'orange.0' : 'red.0'}><Group justify="space-between" mb="sm"><Text fw={700} c={modoBaja === 'VENDIDO' ? 'orange.9' : 'red.9'}>CONFIRMAR: {modoBaja}</Text><ActionIcon variant="subtle" color="gray" onClick={() => setModoBaja(null)}><IconArrowBackUp size={16}/></ActionIcon></Group>{modoBaja === 'VENDIDO' && ( <Group grow mb="sm"><TextInput label="Precio" placeholder="Ej: 2200" value={bajaPrecio} onChange={(e) => setBajaPrecio(e.target.value)}/><TextInput label="Destino" placeholder="Ej: Frigorifico" value={bajaMotivo} onChange={(e) => setBajaMotivo(e.target.value)}/></Group> )}{modoBaja === 'MUERTO' && ( <TextInput label="Causa" placeholder="Ej: Accidente" value={bajaMotivo} onChange={(e) => setBajaMotivo(e.target.value)} mb="sm"/> )}<Button fullWidth color={modoBaja === 'VENDIDO' ? 'orange' : 'red'} onClick={confirmarBaja}>Confirmar Salida</Button></Paper> )}</> ) : ( <Paper p="md" bg="gray.1" ta="center"><Text c="dimmed" size="sm" mb="md">Este animal se encuentra dado de baja.</Text><Button fullWidth variant="outline" color="blue" leftSection={<IconArrowBackUp/>} onClick={restaurarAnimal}>Restaurar a Hacienda Activa</Button></Paper> )}
           </Tabs.Panel>
         </Tabs>
      </Modal>

    </MantineProvider>
  );
}