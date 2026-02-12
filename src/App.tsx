import { useEffect, useState, useMemo } from 'react';
import { 
  MantineProvider, AppShell, Burger, Group, Title, NavLink, Text, 
  Paper, TextInput, Select, Button, Table, Badge, Tabs, 
  Textarea, ActionIcon, ScrollArea, SimpleGrid, Card, Modal, Alert, UnstyledButton, Center, rem, MultiSelect, Switch, RingProgress, Stack, ThemeIcon, Checkbox, PasswordInput, Container
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconList, IconArchive, IconActivity, IconTrash, IconCheck, IconLeaf, IconTractor, 
  IconCalendar, IconScale, IconArrowBackUp, IconCurrencyDollar, IconSkull, IconSearch, 
  IconHeartbeat, IconChevronUp, IconChevronDown, IconSelector, IconBabyCarriage, IconScissors, IconBuilding, IconHome, IconSettings, IconEdit, IconPlus, IconFilter, IconPlaylistAdd, IconLogout, IconMapPin, IconTrendingUp, IconInfoCircle
} from '@tabler/icons-react';
import '@mantine/core/styles.css';
import { supabase } from './supabase';
import { type Session } from '@supabase/supabase-js';

// --- TIPOS ---
interface Establecimiento { id: string; nombre: string; }
interface Animal { 
  id: string; caravana: string; categoria: string; sexo: string; 
  estado: string; condicion: string; origen: string; detalle_baja?: string;
  fecha_nacimiento?: string; fecha_ingreso?: string; madre_id?: string; castrado?: boolean;
  establecimiento_id: string; lote_id?: string; toros_servicio_ids?: string[]; 
}
interface Evento { id: string; fecha_evento: string; tipo: string; resultado: string; detalle: string; animal_id: string; costo?: number; datos_extra?: any; animales?: { caravana: string } }
interface Lote { id: string; nombre: string; hectareas: number; cultivo_actual: string; estado: string; establecimiento_id: string; }
interface Labor { id: string; fecha: string; actividad: string; cultivo: string; detalle: string; costo?: number; lote_id: string; } 

// --- HELPERS ---
const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; };
const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };

// Componente Header Tabla
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [opened, { toggle }] = useDisclosure(); 
  const [activeSection, setActiveSection] = useState('inicio'); 
  const [loading, setLoading] = useState(false);
  
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [campoId, setCampoId] = useState<string | null>(null);
  const [modalConfigOpen, { open: openModalConfig, close: closeModalConfig }] = useDisclosure(false); 
  const [nuevoCampoNombre, setNuevoCampoNombre] = useState('');

  // --- DATOS ---
  const [busqueda, setBusqueda] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string | null>(null);
  const [filterSexo, setFilterSexo] = useState<string | null>(null);
  const [filterAtributos, setFilterAtributos] = useState<string[]>([]);
  
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string | null>(''); 
  const [sortBy, setSortBy] = useState<keyof Animal | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);
  
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [eventosGlobales, setEventosGlobales] = useState<Evento[]>([]);
  const [chartHover, setChartHover] = useState<{ label: string, value: number | string } | null>(null);

  // Forms Individuales
  const [modalAltaOpen, { open: openModalAlta, close: closeModalAlta }] = useDisclosure(false);
  const [caravana, setCaravana] = useState('');
  const [categoria, setCategoria] = useState<string | null>('Vaca');
  const [sexo, setSexo] = useState<string | null>('H');
  const [sexoBloqueado, setSexoBloqueado] = useState(true);
  
  // Lotes UI
  const [nombreLote, setNombreLote] = useState('');
  const [hasLote, setHasLote] = useState<string | number>('');
  
  // Vaca UI & Navegacion
  const [modalVacaOpen, { open: openModalVaca, close: closeModalVaca }] = useDisclosure(false);
  const [animalSelId, setAnimalSelId] = useState<string | null>(null);
  const [fichaAnterior, setFichaAnterior] = useState<Animal | null>(null); 
  const [activeTabVaca, setActiveTabVaca] = useState<string | null>('historia'); 

  // Derived State
  const animalSel = useMemo(() => animales.find(a => a.id === animalSelId) || null, [animales, animalSelId]);

  const [eventosFicha, setEventosFicha] = useState<Evento[]>([]);
  const [ultimoPeso, setUltimoPeso] = useState<string>('Sin datos');
  const [madreCaravana, setMadreCaravana] = useState<string>(''); 
  const [hijos, setHijos] = useState<{ id: string, caravana: string, sexo: string, estado: string }[]>([]); 
  
  // Estado para el cartel de toros (consulta directa a BD)
  const [nombresTorosCartel, setNombresTorosCartel] = useState<string | null>(null);

  // Lote Detalle UI
  const [modalLoteOpen, { open: openModalLote, close: closeModalLote }] = useDisclosure(false);
  const [loteSel, setLoteSel] = useState<Lote | null>(null);
  const [laboresFicha, setLaboresFicha] = useState<Labor[]>([]);

  // Inputs Eventos
  const [fechaEvento, setFechaEvento] = useState<Date | null>(new Date());
  const [tipoEventoInput, setTipoEventoInput] = useState<string | null>('PESAJE');
  const [resultadoInput, setResultadoInput] = useState('');
  const [detalleInput, setDetalleInput] = useState('');
  const [costoEvento, setCostoEvento] = useState<string | number>(''); 
  const [tactoResultado, setTactoResultado] = useState<string | null>('PREÑADA');
  const [tipoServicio, setTipoServicio] = useState<string | null>('TORO');
  const [torosIdsInput, setTorosIdsInput] = useState<string[]>([]); 
  const [nuevoTerneroCaravana, setNuevoTerneroCaravana] = useState('');
  const [nuevoTerneroSexo, setNuevoTerneroSexo] = useState<string | null>('M');
  const [pesoNacimiento, setPesoNacimiento] = useState(''); 
  
  // ADPV
  const [adpvCalculado, setAdpvCalculado] = useState<string | null>(null);

  // Edicion Animal
  const [editCaravana, setEditCaravana] = useState('');
  const [editCategoria, setEditCategoria] = useState<string | null>('');
  const [editSexo, setEditSexo] = useState<string | null>('');
  const [editEstado, setEditEstado] = useState<string | null>('');
  const [editCondicion, setEditCondicion] = useState<string[]>([]); 
  const [editFechaNac, setEditFechaNac] = useState<string>('');
  const [editFechaIngreso, setEditFechaIngreso] = useState<string>('');
  const [editCastrado, setEditCastrado] = useState(false);
  const [modoBaja, setModoBaja] = useState<string | null>(null);
  const [bajaPrecio, setBajaPrecio] = useState<string | number>('');
  const [bajaMotivo, setBajaMotivo] = useState('');
  
  // Labores Lote
  const [actividadLote, setActividadLote] = useState<string | null>('FUMIGADA');
  const [cultivoInput, setCultivoInput] = useState(''); 
  const [detalleLabor, setDetalleLabor] = useState('');
  const [costoLabor, setCostoLabor] = useState<string | number>(''); 

  // --- LOGICA MASIVA ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [massActividad, setMassActividad] = useState<string | null>('VACUNACION');
  const [massFecha, setMassFecha] = useState<Date | null>(new Date());
  const [massDetalle, setMassDetalle] = useState('');
  const [massPrecio, setMassPrecio] = useState(''); 
  const [massCostoUnitario, setMassCostoUnitario] = useState(''); 
  const [massDestino, setMassDestino] = useState('');
  const [massLoteDestino, setMassLoteDestino] = useState<string | null>(null); 

  // --- EDICION EVENTO ---
  const [modalEditEventOpen, { open: openModalEditEvent, close: closeModalEditEvent }] = useDisclosure(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventDate, setEditingEventDate] = useState<Date | null>(new Date());
  const [editingEventRes, setEditingEventRes] = useState('');
  const [editingEventDet, setEditingEventDet] = useState('');

  // --- INIT AUTH & DATA ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadCampos();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadCampos();
      else { setEstablecimientos([]); setCampoId(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!campoId || !session) return;
    localStorage.setItem('campoId', campoId); 
    setBusqueda(''); setFiltroTipoEvento(''); setFilterCategoria(null); setFilterSexo(null); setFilterAtributos([]); setSelectedIds([]);
    if (activeSection === 'inicio') { fetchAnimales(); fetchActividadGlobal(); fetchLotes(); } 
    if (activeSection.includes('hacienda') || activeSection === 'bajas' || activeSection === 'masivos') { fetchAnimales(); fetchLotes(); }
    if (activeSection === 'actividad') fetchActividadGlobal();
    if (activeSection === 'agricultura') fetchLotes();
  }, [activeSection, campoId, session]); 

  // --- AUTH ACTIONS ---
  async function handleLogin() {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) alert("Error: " + error.message);
  }
  async function handleLogout() { await supabase.auth.signOut(); setSession(null); }

  // --- LOGICA UI ---
  useEffect(() => { setResultadoInput(''); setTorosIdsInput([]); setNuevoTerneroCaravana(''); setPesoNacimiento(''); setCostoEvento(''); setAdpvCalculado(null); }, [tipoEventoInput]);
  
  // CALCULO ADPV
  useEffect(() => {
      if (tipoEventoInput === 'PESAJE' && resultadoInput && eventosFicha.length > 0) {
          const ultimoPesaje = eventosFicha.find(e => e.tipo === 'PESAJE');
          if (ultimoPesaje && fechaEvento) {
              const pesoViejo = parseFloat(ultimoPesaje.resultado.replace(/[^0-9.]/g, ''));
              const pesoNuevo = parseFloat(resultadoInput.replace(/[^0-9.]/g, ''));
              if (!isNaN(pesoViejo) && !isNaN(pesoNuevo)) {
                  const fechaVieja = new Date(ultimoPesaje.fecha_evento);
                  const diffTime = Math.abs(fechaEvento.getTime() - fechaVieja.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                  if (diffDays > 0) {
                      const ganancia = pesoNuevo - pesoViejo;
                      const adpv = ganancia / diffDays;
                      setAdpvCalculado(`${adpv.toFixed(3)} kg/día (${diffDays} días)`);
                  }
              }
          }
      } else {
          setAdpvCalculado(null);
      }
  }, [resultadoInput, fechaEvento, eventosFicha]);

  useEffect(() => {
    if (['Vaca', 'Vaquillona'].includes(categoria || '')) { setSexo('H'); setSexoBloqueado(true); } 
    else if (['Toro', 'Novillo'].includes(categoria || '')) { setSexo('M'); setSexoBloqueado(true); } 
    else { setSexoBloqueado(false); }
  }, [categoria]);

  // --- SORT & FILTER ---
  const setSorting = (field: keyof Animal) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
  };

  const animalesFiltrados = animales.filter(animal => {
    const matchBusqueda = animal.caravana.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = filterCategoria ? animal.categoria === filterCategoria : true;
    const matchSexo = filterSexo ? animal.sexo === filterSexo : true; 
    let matchAtributos = true;
    if (filterAtributos.length > 0) {
        const tagsDelAnimal: string[] = [];
        tagsDelAnimal.push(animal.estado);
        if (animal.condicion) tagsDelAnimal.push(...animal.condicion.split(', '));
        if (animal.sexo === 'M') tagsDelAnimal.push('MACHO');
        if (animal.sexo === 'H') tagsDelAnimal.push('HEMBRA');
        if (animal.castrado) tagsDelAnimal.push('CAPADO');
        matchAtributos = filterAtributos.every(filtro => tagsDelAnimal.includes(filtro));
    }
    return matchBusqueda && matchCategoria && matchSexo && matchAtributos;
  }).sort((a, b) => {
    if (busqueda) {
        const exactA = a.caravana.toLowerCase() === busqueda.toLowerCase();
        const exactB = b.caravana.toLowerCase() === busqueda.toLowerCase();
        if (exactA && !exactB) return -1; if (!exactA && exactB) return 1; 
    }
    if (sortBy) {
        if (sortBy === 'caravana') {
            const numA = parseInt(a.caravana.replace(/\D/g,'')) || 0;
            const numB = parseInt(b.caravana.replace(/\D/g,'')) || 0;
            if (numA !== numB) return reverseSortDirection ? numB - numA : numA - numB;
        }
        const valA = a[sortBy]?.toString().toLowerCase() || '';
        const valB = b[sortBy]?.toString().toLowerCase() || '';
        return reverseSortDirection ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    return 0;
  });
  
  const eventosFiltrados = eventosGlobales.filter(ev => {
    const coincideTexto = ev.animales?.caravana.toLowerCase().includes(busqueda.toLowerCase()) || ev.tipo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipoEvento ? ev.tipo === filtroTipoEvento : true;
    return coincideTexto && coincideTipo;
  });

  const getEstadoColor = (estado: string) => { 
      if (estado === 'PREÑADA') return 'teal'; 
      if (estado === 'VACÍA') return 'yellow'; 
      if (estado === 'EN SERVICIO') return 'pink';
      if (estado === 'APARTADO') return 'orange';
      return 'blue'; 
  };
  const renderCondicionBadges = (condStr: string) => { if (!condStr || condStr === 'SANA') return null; return condStr.split(', ').map((c, i) => ( <Badge key={i} color={c === 'ENFERMA' ? 'red' : 'grape'} variant="filled" size="sm">{c}</Badge> )); };
  const getNombreLote = (id?: string) => { if(!id) return null; const l = lotes.find(lot => lot.id === id); return l ? l.nombre : null; };
  const torosDisponibles = animales.filter(a => a.categoria === 'Toro' && a.estado !== 'MUERTO' && a.estado !== 'VENDIDO');

  // --- FUNCIONES MASIVAS ---
  const toggleSeleccion = (id: string) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]); };
  const seleccionarGrupo = (categoriaTarget: string | null) => {
    const targets = animalesFiltrados.filter(a => categoriaTarget ? a.categoria === categoriaTarget : true).map(a => a.id);
    setSelectedIds(prev => [...new Set([...prev, ...targets])]);
  };
  const limpiarSeleccion = () => setSelectedIds([]);

  // LOGICA PARA DESVINCULAR TOROS CUANDO SE APARTAN
  const desvincularToroDeVacas = async (toroId: string) => {
      const vacasAfectadas = animales.filter(a => a.toros_servicio_ids && a.toros_servicio_ids.includes(toroId));
      for (const vaca of vacasAfectadas) {
          const nuevosIds = vaca.toros_servicio_ids!.filter(id => id !== toroId);
          await supabase.from('animales').update({ toros_servicio_ids: nuevosIds.length > 0 ? nuevosIds : null }).eq('id', vaca.id);
      }
  };

  async function guardarEventoMasivo() {
    if (selectedIds.length === 0) return alert("No seleccionaste ningún animal");
    if (!massFecha || !massActividad || !campoId) return alert("Faltan datos del evento");
    if (massActividad === 'VENTA' && !massPrecio) return alert("Falta el precio de venta");
    if (massActividad === 'MOVIMIENTO' && !massLoteDestino) return alert("Falta el Lote de destino");
    
    let idsParaProcesar = [...selectedIds];
    let mensajeConfirmacion = `¿Confirmar ${massActividad} para ${selectedIds.length} animales?`;

    if (massActividad === 'CAPADO') {
        const animalesSeleccionados = animales.filter(a => selectedIds.includes(a.id));
        const machos = animalesSeleccionados.filter(a => a.sexo === 'M');
        idsParaProcesar = machos.map(a => a.id);
        const hembrasDescartadas = selectedIds.length - idsParaProcesar.length;
        if (idsParaProcesar.length === 0) return alert("Error: Has seleccionado solo Hembras. No hay machos para capar.");
        if (hembrasDescartadas > 0) mensajeConfirmacion = `⚠️ ATENCIÓN: Se detectaron ${hembrasDescartadas} HEMBRAS.\n\nEl sistema las ignorará y solo capará a los ${idsParaProcesar.length} MACHOS.\n\n¿Continuar?`;
        else mensajeConfirmacion = `¿Confirmar CAPADO para ${idsParaProcesar.length} machos?`;
    }

    if(!confirm(mensajeConfirmacion)) return;

    setLoading(true);
    const fechaStr = massFecha.toISOString();
    let resultadoTxt = 'Realizado (Masivo)';
    let datosExtra: any = {};
    if (massActividad === 'VENTA') {
        resultadoTxt = 'VENDIDO'; datosExtra = { precio_kg: massPrecio, destino: massDestino || 'Venta Masiva' };
    } else if (massActividad === 'CAPADO') { 
        resultadoTxt = 'Realizado'; 
    } else if (massActividad === 'MOVIMIENTO') {
        const loteNom = getNombreLote(massLoteDestino!);
        resultadoTxt = 'MOVIDO';
        datosExtra = { lote_destino: loteNom, lote_id: massLoteDestino };
    }

    const inserts = idsParaProcesar.map(animalId => ({
        animal_id: animalId, fecha_evento: fechaStr, tipo: massActividad, resultado: resultadoTxt, detalle: massDetalle, datos_extra: datosExtra, costo: Number(massCostoUnitario), establecimiento_id: campoId
    }));
    
    const { error } = await supabase.from('eventos').insert(inserts);

    if (!error) {
        if (massActividad === 'VENTA') {
            await supabase.from('animales').update({ estado: 'VENDIDO', detalle_baja: `Venta Masiva: ${massDestino || '-'} ($${massPrecio})` }).in('id', idsParaProcesar);
            for (const id of idsParaProcesar) {
                const anim = animales.find(a => a.id === id);
                if(anim?.categoria === 'Toro') await desvincularToroDeVacas(id);
            }
        }
        if (massActividad === 'CAPADO') await supabase.from('animales').update({ castrado: true }).in('id', idsParaProcesar);
        if (massActividad === 'MOVIMIENTO' && massLoteDestino) await supabase.from('animales').update({ lote_id: massLoteDestino }).in('id', idsParaProcesar);
    }

    setLoading(false);
    if (error) { alert("Error: " + error.message); } else {
        alert("¡Carga masiva exitosa!"); setMassDetalle(''); setMassPrecio(''); setMassDestino(''); setMassLoteDestino(null); setMassCostoUnitario(''); setSelectedIds([]);
        fetchAnimales(); setActiveSection('actividad');
    }
  }

  // --- FUNCIONES EDICION EVENTOS ---
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
  async function recargarFicha(id: string) {
    const { data } = await supabase.from('eventos').select('*').eq('animal_id', id).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false });
    if (data) setEventosFicha(data);
  }

  // --- FETCHERS ---
  async function loadCampos() {
    const { data } = await supabase.from('establecimientos').select('*').order('created_at');
    if (data && data.length > 0) { setEstablecimientos(data); const guardado = localStorage.getItem('campoId'); if (guardado && data.find(c => c.id === guardado)) setCampoId(guardado); else if (!campoId) setCampoId(data[0].id); }
  }
  async function fetchAnimales() {
    if (!campoId) return;
    let query = supabase.from('animales').select('*').eq('establecimiento_id', campoId).neq('estado', 'ELIMINADO').order('created_at', { ascending: false }); 
    if (activeSection === 'hacienda' || activeSection === 'masivos') query = query.neq('estado', 'VENDIDO').neq('estado', 'MUERTO');
    else if (activeSection === 'bajas') query = query.in('estado', ['VENDIDO', 'MUERTO']);
    const { data } = await query; setAnimales(data || []);
  }
  async function fetchLotes() { if (!campoId) return; const { data } = await supabase.from('lotes').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setLotes(data || []); }
  async function fetchActividadGlobal() { if (!campoId) return; const { data } = await supabase.from('eventos').select('*, animales!inner(caravana)').eq('establecimiento_id', campoId).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false }).limit(50); setEventosGlobales(data as any || []); }

  // --- GESTIÓN DE ESTABLECIMIENTOS ---
  async function crearCampo() {
    if (!nuevoCampoNombre) return;
    const { error } = await supabase.from('establecimientos').insert([{ nombre: nuevoCampoNombre, user_id: session?.user.id }]);
    if (error) alert("Error: " + error.message); else { setNuevoCampoNombre(''); loadCampos(); }
  }
  async function borrarCampo(id: string) {
    if (!confirm("⚠️ ¿BORRAR ESTABLECIMIENTO COMPLETO?")) return;
    const { error } = await supabase.from('establecimientos').delete().eq('id', id);
    if (error) alert("Error al borrar."); else { if (id === campoId) { const restantes = establecimientos.filter(e => e.id !== id); if (restantes.length > 0) setCampoId(restantes[0].id); else window.location.reload(); } loadCampos(); }
  }
  async function renombrarCampo(id: string, nombreActual: string) {
    const nuevo = prompt("Nuevo nombre:", nombreActual); if (!nuevo || nuevo === nombreActual) return;
    await supabase.from('establecimientos').update({ nombre: nuevo }).eq('id', id); loadCampos();
  }

  // --- ACCIONES VACA ---
  async function guardarAnimal() {
    if (!caravana || !campoId) return;
    const yaExiste = animales.some(a => a.caravana.toLowerCase() === caravana.toLowerCase() && a.estado !== 'ELIMINADO');
    if (yaExiste) return alert("❌ ERROR: Ya existe un animal con esa caravana.");

    setLoading(true); const hoy = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('animales').insert([{ caravana, categoria, sexo, estado: 'ACTIVO', condicion: 'SANA', origen: 'PROPIO', fecha_nacimiento: hoy, fecha_ingreso: hoy, establecimiento_id: campoId }]);
    setLoading(false); if (!error) { setCaravana(''); fetchAnimales(); closeModalAlta(); }
  }

  // --- LOGICA DE ACTUALIZACIÓN DEL CARTEL ---
  async function actualizarCartelToros(idAnimal: string) {
      setNombresTorosCartel(null); 
      const { data } = await supabase.from('animales').select('toros_servicio_ids').eq('id', idAnimal).single();
      
      if (data && data.toros_servicio_ids && data.toros_servicio_ids.length > 0) {
          const nombres = animales
              .filter(a => data.toros_servicio_ids!.includes(a.id))
              .map(a => a.caravana)
              .join(' - ');
          setNombresTorosCartel(nombres || null);
      } else {
          setNombresTorosCartel(null);
      }
  }

  useEffect(() => {
      if (animalSelId) {
          actualizarCartelToros(animalSelId);
      } else {
          setNombresTorosCartel(null);
      }
  }, [animalSelId, eventosFicha]);


  async function abrirFichaVaca(animal: Animal) {
    setActiveTabVaca('historia'); 
    setAnimalSelId(animal.id); 
    
    setEditCaravana(animal.caravana); setEditCategoria(animal.categoria); setEditSexo(animal.sexo);
    setEditEstado(animal.estado); setEditCastrado(animal.castrado || false);
    const condArray = animal.condicion && animal.condicion !== 'SANA' ? animal.condicion.split(', ') : [];
    setEditCondicion(condArray);
    setEditFechaNac(animal.fecha_nacimiento || ''); setEditFechaIngreso(animal.fecha_ingreso || '');
    if (animal.madre_id) { const m = animales.find(a => a.id === animal.madre_id); setMadreCaravana(m ? m.caravana : 'Desconocida'); } else { setMadreCaravana(''); }
    
    setHijos([]); 
    const { data: dataHijos } = await supabase.from('animales').select('id, caravana, sexo, estado').eq('madre_id', animal.id);
    if(dataHijos) setHijos(dataHijos);

    setEventosFicha([]); setFechaEvento(new Date()); setTipoEventoInput('PESAJE'); setModoBaja(null); setBajaPrecio(''); setBajaMotivo(''); setUltimoPeso('Calculando...'); setPesoNacimiento(''); setCostoEvento('');
    if(!modalVacaOpen) openModalVaca(); 
    recargarFicha(animal.id);
    const { data: pesoData } = await supabase.from('eventos').select('resultado').eq('animal_id', animal.id).eq('tipo', 'PESAJE').order('fecha_evento', { ascending: false }).limit(1);
    if (pesoData && pesoData.length > 0) setUltimoPeso(pesoData[0].resultado); else setUltimoPeso('-');
  }

  const navegarAHijo = async (hijoId: string) => {
      const currentAnimal = animales.find(a => a.id === animalSelId);
      if(currentAnimal) setFichaAnterior(currentAnimal); 
      
      const hijo = animales.find(a => a.id === hijoId);
      if (hijo) { abrirFichaVaca(hijo); } else { const { data } = await supabase.from('animales').select('*').eq('id', hijoId).single(); if (data) abrirFichaVaca(data); }
  };

  const handleCloseModalVaca = () => {
      if (fichaAnterior) { abrirFichaVaca(fichaAnterior); setActiveTabVaca('datos'); setFichaAnterior(null); } else { closeModalVaca(); setAnimalSelId(null); }
  };

  async function guardarEventoVaca() {
    if (!animalSelId || !animalSel || !tipoEventoInput || !fechaEvento || !campoId) return alert("Faltan datos");
    setLoading(true);
    let resultadoFinal = resultadoInput; let datosExtra = null; let nuevoEstado = ''; let nuevasCondiciones = [...editCondicion]; let esCastrado = editCastrado; 
    let torosToUpdate: string[] = [];
    
    if (tipoEventoInput === 'TACTO') { resultadoFinal = tactoResultado || ''; if (tactoResultado === 'PREÑADA') nuevoEstado = 'PREÑADA'; if (tactoResultado === 'VACÍA') nuevoEstado = 'VACÍA'; } 
    else if (tipoEventoInput === 'PARTO') {
      if (!nuevoTerneroCaravana) { setLoading(false); return alert("Falta caravana ternero."); }
      const yaExiste = animales.some(a => a.caravana.toLowerCase() === nuevoTerneroCaravana.toLowerCase() && a.estado !== 'ELIMINADO');
      if (yaExiste) { setLoading(false); return alert("❌ ERROR: Ya existe un animal con esa caravana."); }

      const fechaParto = fechaEvento.toISOString().split('T')[0];
      const { data: nuevoTernero, error: err } = await supabase.from('animales').insert([{ caravana: nuevoTerneroCaravana, categoria: 'Ternero', sexo: nuevoTerneroSexo, estado: 'ACTIVO', condicion: 'SANA', origen: 'NACIDO', madre_id: animalSel.id, fecha_nacimiento: fechaParto, fecha_ingreso: fechaParto, establecimiento_id: campoId, lote_id: animalSel.lote_id }]).select().single();
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
    else if (tipoEventoInput === 'SERVICIO') { 
        if (tipoServicio === 'TORO') {
            if (torosIdsInput.length === 0) { setLoading(false); return alert("Seleccioná al menos un toro"); }
            const nombres = animales.filter(a => torosIdsInput.includes(a.id)).map(a => a.caravana).join(', ');
            datosExtra = { toros_caravanas: nombres };
            resultadoFinal = `Con: ${nombres}`;
            torosToUpdate = torosIdsInput;
        } else {
            resultadoFinal = 'IA';
        }
    }
    else if (tipoEventoInput === 'APARTADO') {
        if(animalSel.categoria === 'Toro') {
            nuevoEstado = 'APARTADO';
            await desvincularToroDeVacas(animalSel.id);
        }
    }

    const { error } = await supabase.from('eventos').insert([{ animal_id: animalSel.id, fecha_evento: fechaEvento.toISOString(), tipo: tipoEventoInput, resultado: resultadoFinal, detalle: detalleInput, datos_extra: datosExtra, costo: Number(costoEvento), establecimiento_id: campoId }]);
    
    // UPDATES DE ESTADO
    const stringCondicion = nuevasCondiciones.length > 0 ? nuevasCondiciones.join(', ') : 'SANA';
    const updates: any = { condicion: stringCondicion, castrado: esCastrado }; 
    if (nuevoEstado) updates.estado = nuevoEstado;
    if (tipoEventoInput === 'SERVICIO' && tipoServicio === 'TORO') updates.toros_servicio_ids = torosIdsInput; // Guardar ARRAY
    if (tipoEventoInput === 'PARTO') updates.toros_servicio_ids = null; 

    await supabase.from('animales').update(updates).eq('id', animalSel.id);

    // UPDATE DE TOROS (SI FUE SERVICIO)
    if (torosToUpdate.length > 0) {
        await supabase.from('animales').update({ estado: 'EN SERVICIO' }).in('id', torosToUpdate);
    }

    setEditCondicion(nuevasCondiciones); setEditCastrado(esCastrado); if(nuevoEstado) setEditEstado(nuevoEstado); 
    setLoading(false);
    if (!error) { 
        recargarFicha(animalSel.id); 
        if (tipoEventoInput === 'PESAJE') setUltimoPeso(resultadoFinal); 
        setResultadoInput(''); setDetalleInput(''); setTorosIdsInput([]); setNuevoTerneroCaravana(''); setPesoNacimiento(''); setCostoEvento(''); setAdpvCalculado(null);
        fetchAnimales(); 
        actualizarCartelToros(animalSelId);
    }
  }

  async function actualizarAnimal() {
    if (!animalSelId) return;
    const condStr = editCondicion.length > 0 ? editCondicion.join(', ') : 'SANA';
    await supabase.from('animales').update({ caravana: editCaravana, categoria: editCategoria, sexo: editSexo, estado: editEstado, condicion: condStr, castrado: editCastrado, fecha_nacimiento: editFechaNac || null, fecha_ingreso: editFechaIngreso || null }).eq('id', animalSelId);
    alert("Datos actualizados"); fetchAnimales();
  }

  async function borrarAnimalDefinitivo() {
    if (!animalSelId || !campoId) return;
    if (!confirm("⚠️ ¿BORRAR DEFINITIVAMENTE?")) return;
    await supabase.from('animales').update({ estado: 'ELIMINADO' }).eq('id', animalSelId);
    await supabase.from('eventos').insert({ animal_id: animalSelId, fecha_evento: new Date().toISOString(), tipo: 'BORRADO', resultado: 'ELIMINADO DEL SISTEMA', detalle: 'Borrado manual por seguridad', establecimiento_id: campoId });
    closeModalVaca(); fetchAnimales();
  }

  async function confirmarBaja() { if (!animalSelId || !modoBaja || !campoId) return; if (modoBaja === 'VENDIDO' && !bajaPrecio) return alert("Ingresá el precio"); if (modoBaja === 'MUERTO' && !bajaMotivo) return alert("Ingresá la causa"); if (!confirm("¿Confirmar salida?")) return; const resumen = modoBaja === 'VENDIDO' ? `$${bajaPrecio}` : bajaMotivo; await supabase.from('animales').update({ estado: modoBaja, detalle_baja: resumen }).eq('id', animalSelId); const det = modoBaja === 'VENDIDO' ? `Precio: $${bajaPrecio}/kg - ${bajaMotivo}` : `Causa: ${bajaMotivo}`; await supabase.from('eventos').insert([{ animal_id: animalSelId, tipo: 'BAJA', resultado: modoBaja, detalle: det, datos_extra: modoBaja === 'VENDIDO' ? { precio_kg: bajaPrecio, destino: bajaMotivo } : { causa: bajaMotivo }, establecimiento_id: campoId }]); closeModalVaca(); fetchAnimales(); }
  async function restaurarAnimal() { if (!animalSelId || !confirm("¿Restaurar?")) return; await supabase.from('animales').update({ estado: 'ACTIVO', detalle_baja: null }).eq('id', animalSelId); await supabase.from('eventos').insert([{ animal_id: animalSelId, tipo: 'RESTAURACION', resultado: 'Reingreso', detalle: 'Restaurado', establecimiento_id: campoId! }]); closeModalVaca(); fetchAnimales(); }
  
  // --- ACCIONES LOTE ---
  async function guardarLote() { if (!nombreLote || !campoId) return; setLoading(true); const { error } = await supabase.from('lotes').insert([{ nombre: nombreLote, hectareas: Number(hasLote), estado: 'DESCANSO', establecimiento_id: campoId }]); setLoading(false); if (!error) { setNombreLote(''); setHasLote(''); fetchLotes(); closeModalAlta(); } }
  
  async function abrirFichaLote(lote: Lote) { 
      setLoteSel(lote); setLaboresFicha([]); openModalLote(); 
      const { data } = await supabase.from('labores').select('*').eq('lote_id', lote.id).order('fecha', { ascending: false }); 
      if (data) setLaboresFicha(data); 
  }
  
  async function guardarLabor() { 
      if (!loteSel || !actividadLote || !campoId) return; 
      const { error } = await supabase.from('labores').insert([{ lote_id: loteSel.id, actividad: actividadLote, cultivo: cultivoInput, detalle: detalleLabor, costo: Number(costoLabor), establecimiento_id: campoId }]); 
      if (!error) { 
          if (actividadLote === 'SIEMBRA') { await supabase.from('lotes').update({ estado: 'SEMBRADO', cultivo_actual: cultivoInput }).eq('id', loteSel.id); setLoteSel({...loteSel, estado: 'SEMBRADO', cultivo_actual: cultivoInput}); fetchLotes(); } 
          else if (actividadLote === 'COSECHA') { await supabase.from('lotes').update({ estado: 'DESCANSO', cultivo_actual: null }).eq('id', loteSel.id); setLoteSel({...loteSel, estado: 'DESCANSO', cultivo_actual: ''}); fetchLotes(); } 
          const { data } = await supabase.from('labores').select('*').eq('lote_id', loteSel.id).order('fecha', { ascending: false }); 
          if (data) setLaboresFicha(data); setDetalleLabor(''); setCostoLabor('');
      } 
  }
  
  async function borrarLabor(id: string) { if(!confirm("¿Borrar?")) return; await supabase.from('labores').delete().eq('id', id); setLaboresFicha(laboresFicha.filter(l => l.id !== id)); }
  async function borrarLote(id: string) { if(!confirm("¿BORRAR LOTE? Se perderán las labores.")) return; await supabase.from('lotes').delete().eq('id', id); fetchLotes(); closeModalLote(); }

  // --- STATS ---
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
  const totalVientres = stats.vacas + stats.vaquillonas;
  const prenadaPct = totalVientres > 0 ? Math.round((stats.prenadas / totalVientres) * 100) : 0;
  
  // --- OPCIONES DISPONIBLES (VALIDACION) ---
  const opcionesDisponibles = (() => { 
      if (!animalSel) return []; 
      if (['Vaca', 'Vaquillona'].includes(animalSel.categoria)) return ['PESAJE', 'TACTO', 'SERVICIO', 'PARTO', 'ENFERMEDAD', 'LESION', 'CURACION', 'VACUNACION']; 
      if (animalSel.categoria === 'Ternero') return ['PESAJE', 'VACUNACION', 'CAPADO', 'ENFERMEDAD', 'LESION', 'CURACION']; 
      if (animalSel.categoria === 'Toro') return ['PESAJE', 'VACUNACION', 'RASPAJE', 'APARTADO', 'ENFERMEDAD', 'CURACION']; 
      return ['PESAJE', 'ENFERMEDAD', 'LESION', 'CURACION', 'VACUNACION']; 
  })();
  const esActivo = animalSel?.estado !== 'VENDIDO' && animalSel?.estado !== 'MUERTO' && animalSel?.estado !== 'ELIMINADO';

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
            <AppShell.Header><Group h="100%" px="md"><Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" /><IconLeaf color="teal" size={28} /><Title order={3}>AgroControl</Title></Group></AppShell.Header>
            <AppShell.Navbar p="md">
              <Paper p="xs" bg="gray.1" mb="lg" radius="md"><Text size="xs" fw={700} c="dimmed" mb={4}>ESTABLECIMIENTO</Text><Select data={establecimientos.map(e => ({ value: e.id, label: e.nombre }))} value={campoId} onChange={(val) => setCampoId(val)} allowDeselect={false} leftSection={<IconBuilding size={16}/>} /></Paper>
              <NavLink label="Inicio / Resumen" leftSection={<IconHome size={20}/>} active={activeSection === 'inicio'} onClick={() => { setActiveSection('inicio'); toggle(); }} color="indigo" variant="filled" mb="md"/>
              <Text size="xs" fw={500} c="dimmed" mb="sm">GANADERÍA</Text>
              <NavLink label="Hacienda Activa" leftSection={<IconPlus size={20}/>} active={activeSection === 'hacienda'} onClick={() => { setActiveSection('hacienda'); toggle(); }} color="teal" variant="filled" />
              <NavLink label="Eventos Masivos" leftSection={<IconPlaylistAdd size={20}/>} active={activeSection === 'masivos'} onClick={() => { setActiveSection('masivos'); toggle(); }} color="violet" variant="filled" />
              <NavLink label="Archivo / Bajas" leftSection={<IconArchive size={20}/>} active={activeSection === 'bajas'} onClick={() => { setActiveSection('bajas'); toggle(); }} color="red" variant="light" />
              <Text size="xs" fw={500} c="dimmed" mt="xl" mb="sm">AGRICULTURA</Text>
              <NavLink label="Lotes y Siembra" leftSection={<IconTractor size={20}/>} active={activeSection === 'agricultura'} onClick={() => { setActiveSection('agricultura'); toggle(); }} color="lime" variant="filled" />
              <Text size="xs" fw={500} c="dimmed" mt="xl" mb="sm">REPORTES</Text>
              <NavLink label="Registro Actividad" leftSection={<IconActivity size={20}/>} active={activeSection === 'actividad'} onClick={() => { setActiveSection('actividad'); toggle(); }} color="blue" variant="filled" />
              <AppShell.Section style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                <Button fullWidth variant="subtle" color="gray" leftSection={<IconSettings size={18}/>} onClick={openModalConfig}>Gestionar Campos</Button>
                <Button fullWidth variant="light" color="red" mt="xs" leftSection={<IconLogout size={18}/>} onClick={handleLogout}>Cerrar Sesión</Button>
              </AppShell.Section>
            </AppShell.Navbar>

            <AppShell.Main bg="gray.0">
              {activeSection === 'inicio' && (
                <>
                  <Title order={2} mb="lg">Resumen General</Title>
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
                    <Card shadow="sm" radius="md" p="md" withBorder><Group><ThemeIcon size="xl" radius="md" color="blue"><IconList/></ThemeIcon><div><Text size="xs" c="dimmed" fw={700}>TOTAL HACIENDA</Text><Text fw={700} size="xl">{stats.total}</Text></div></Group></Card>
                    <Card shadow="sm" radius="md" p="md" withBorder><Group><ThemeIcon size="xl" radius="md" color="teal"><IconBabyCarriage/></ThemeIcon><div><Text size="xs" c="dimmed" fw={700}>TERNEROS</Text><Text fw={700} size="xl">{stats.terneros}</Text><Text size="xs" c="dimmed">({stats.ternerosM} Machos / {stats.ternerosH} Hembras)</Text></div></Group></Card>
                    <Card shadow="sm" radius="md" p="md" withBorder><Group><ThemeIcon size="xl" radius="md" color={stats.enfermos > 0 ? 'red' : 'gray'}><IconHeartbeat/></ThemeIcon><div><Text size="xs" c="dimmed" fw={700}>ENFERMOS</Text><Text fw={700} size="xl" c={stats.enfermos > 0 ? 'red' : 'dimmed'}>{stats.enfermos}</Text></div></Group></Card>
                    <Card shadow="sm" radius="md" p="md" withBorder><Group><RingProgress size={60} thickness={6} sections={[{ value: prenadaPct, color: 'teal' }]} label={<Center><Text size="xs" fw={700}>{prenadaPct}%</Text></Center>} /><div><Text size="xs" c="dimmed" fw={700}>PREÑEZ (VIENTRES)</Text><Text fw={700} size="xl" c="teal">{stats.prenadas} / {totalVientres}</Text></div></Group></Card>
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Card shadow="sm" radius="md" withBorder>
                        <Text fw={700} mb="md">Últimos Movimientos</Text>
                        <Stack gap="xs">{eventosGlobales.slice(0, 5).map(ev => (<Paper key={ev.id} p="xs" withBorder bg="gray.0"><Group justify="space-between"><Group gap="xs"><Badge size="sm" variant="dot" color="blue">{ev.tipo}</Badge><Text size="sm" fw={500}>Animal: {ev.animales?.caravana}</Text></Group><Text size="xs" c="dimmed">{formatDate(ev.fecha_evento)}</Text></Group><Text size="xs" c="dimmed" mt={4}>{ev.resultado} {ev.detalle ? `- ${ev.detalle}` : ''}</Text></Paper>))}</Stack>
                        <Button variant="light" fullWidth mt="md" onClick={() => setActiveSection('actividad')}>Ver Todo</Button>
                    </Card>
                    <Card shadow="sm" radius="md" withBorder>
                        <Text fw={700} mb="md">Distribución del Rodeo</Text>
                        <Group justify="center">
                            <RingProgress 
                                size={220} thickness={20} 
                                label={<Center><Stack gap={0} align="center"><Text size="xs" c="dimmed" fw={700}>{chartHover ? chartHover.label : 'TOTAL'}</Text><Text fw={700} size="xl">{chartHover ? chartHover.value : stats.total}</Text></Stack></Center>}
                                sections={[
                                    { value: (stats.vacas / stats.total) * 100, color: 'blue', tooltip: 'Vacas', onMouseEnter: () => setChartHover({label: 'VACAS', value: stats.vacas}), onMouseLeave: () => setChartHover(null) },
                                    { value: (stats.vaquillonas / stats.total) * 100, color: 'pink', tooltip: 'Vaquillonas', onMouseEnter: () => setChartHover({label: 'VAQUILLONAS', value: stats.vaquillonas}), onMouseLeave: () => setChartHover(null) },
                                    { value: (stats.terneros / stats.total) * 100, color: 'teal', tooltip: 'Terneros', onMouseEnter: () => setChartHover({label: 'TERNEROS', value: stats.terneros}), onMouseLeave: () => setChartHover(null) },
                                    { value: (stats.novillos / stats.total) * 100, color: 'orange', tooltip: 'Novillos', onMouseEnter: () => setChartHover({label: 'NOVILLOS', value: stats.novillos}), onMouseLeave: () => setChartHover(null) },
                                    { value: (stats.toros / stats.total) * 100, color: 'grape', tooltip: 'Toros', onMouseEnter: () => setChartHover({label: 'TOROS', value: stats.toros}), onMouseLeave: () => setChartHover(null) }
                                ]}
                            />
                        </Group>
                        <Group justify="center" gap="md" mt="md"><Group gap={4}><Badge size="xs" circle color="blue"/><Text size="xs">Vacas</Text></Group><Group gap={4}><Badge size="xs" circle color="pink"/><Text size="xs">Vaq.</Text></Group><Group gap={4}><Badge size="xs" circle color="teal"/><Text size="xs">Terneros</Text></Group><Group gap={4}><Badge size="xs" circle color="orange"/><Text size="xs">Novillos</Text></Group><Group gap={4}><Badge size="xs" circle color="grape"/><Text size="xs">Toros</Text></Group></Group>
                    </Card>
                  </SimpleGrid>
                </>
              )}

              {activeSection === 'masivos' && (
                  <>
                    <Group justify="space-between" mb="lg">
                        <Title order={2}>Carga de Eventos Masivos</Title>
                        <Badge size="xl" color="violet">{selectedIds.length} Seleccionados</Badge>
                    </Group>
                    
                    {/* 1. CONFIGURACION DEL EVENTO */}
                    <Paper p="md" mb="xl" radius="md" withBorder bg="violet.0">
                        <Text fw={700} size="lg" mb="sm" c="violet">1. Datos del Evento</Text>
                        <Group grow align="flex-start">
                            <Select 
                                label="Tipo de Actividad" 
                                data={['VACUNACION', 'DESPARASITACION', 'SUPLEMENTACION', 'MOVIMIENTO', 'VENTA', 'CAPADO', 'RASPAJE', 'OTRO']} 
                                value={massActividad} onChange={setMassActividad}
                                allowDeselect={false}
                            />
                            <TextInput 
                                label="Fecha" type="date" 
                                value={getLocalDateForInput(massFecha)} 
                                onChange={(e) => setMassFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                            />
                        </Group>
                        {/* CAMPO ESPECIAL PRECIO VENTA MASIVA */}
                        {massActividad === 'VENTA' && (
                            <Group grow mt="sm">
                                <TextInput label="Precio Promedio (Kg/Total)" placeholder="Ej: 2200" value={massPrecio} onChange={(e) => setMassPrecio(e.target.value)} leftSection={<IconCurrencyDollar size={16}/>}/>
                                <TextInput label="Destino" placeholder="Ej: Frigorifico" value={massDestino} onChange={(e) => setMassDestino(e.target.value)} />
                            </Group>
                        )}
                        {/* CAMPO ESPECIAL MOVIMIENTO MASIVO */}
                        {massActividad === 'MOVIMIENTO' && (
                            <Select 
                                label="Lote de Destino" 
                                placeholder="Seleccionar Lote"
                                data={lotes.map(l => ({ value: l.id, label: l.nombre }))}
                                value={massLoteDestino} onChange={setMassLoteDestino}
                                leftSection={<IconMapPin size={16}/>}
                                mt="sm"
                            />
                        )}
                        <Group grow mt="sm">
                            <TextInput label="Detalle / Observaciones" placeholder="Ej: Aftosa + Carbunclo" value={massDetalle} onChange={(e) => setMassDetalle(e.target.value)}/>
                            <TextInput label="Costo Unitario ($)" placeholder="Opcional" type="number" value={massCostoUnitario} onChange={(e) => setMassCostoUnitario(e.target.value)} leftSection={<IconCurrencyDollar size={16}/>}/>
                        </Group>
                    </Paper>

                    {/* 2. SELECCION DE ANIMALES */}
                    <Text fw={700} size="lg" mb="sm">2. Seleccionar Animales</Text>
                    
                    {/* Botones de Seleccion Rapida */}
                    <Group mb="md">
                        <Button variant="light" color="blue" size="xs" onClick={() => seleccionarGrupo('Vaca')}>Todas las Vacas</Button>
                        <Button variant="light" color="teal" size="xs" onClick={() => seleccionarGrupo('Ternero')}>Todos los Terneros</Button>
                        <Button variant="light" color="gray" size="xs" onClick={() => seleccionarGrupo(null)}>Seleccionar TODO lo visible</Button>
                        {selectedIds.length > 0 && <Button variant="outline" color="red" size="xs" onClick={limpiarSeleccion}>Borrar Selección</Button>}
                    </Group>

                    {/* Filtros visuales (para ayudar a buscar) */}
                    <Group mb="md">
                        <TextInput placeholder="Buscar por caravana..." leftSection={<IconSearch size={14}/>} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{flex: 1}}/>
                        <Select placeholder="Filtrar Vista" data={['Vaca', 'Ternero', 'Toro', 'Novillo']} value={filterCategoria} onChange={setFilterCategoria} clearable style={{flex: 1}}/>
                        <Select placeholder="Sexo" data={[{value: 'M', label: 'Macho'}, {value: 'H', label: 'Hembra'}]} value={filterSexo} onChange={setFilterSexo} clearable style={{flex: 0.5}}/>
                    </Group>

                    <Paper withBorder radius="md" h={400} style={{ display: 'flex', flexDirection: 'column' }}>
                        <ScrollArea style={{ flex: 1 }}>
                        <Table stickyHeader>
                            <Table.Thead bg="gray.1">
                                <Table.Tr>
                                    <Table.Th w={50}>Check</Table.Th>
                                    <Table.Th>Caravana</Table.Th>
                                    <Table.Th>Categoría</Table.Th>
                                    <Table.Th>Estado</Table.Th>
                                    <Table.Th>Ubicación</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {animalesFiltrados.map(animal => (
                                    <Table.Tr key={animal.id} bg={selectedIds.includes(animal.id) ? 'violet.1' : undefined}>
                                        <Table.Td>
                                            <Checkbox checked={selectedIds.includes(animal.id)} onChange={() => toggleSeleccion(animal.id)} />
                                        </Table.Td>
                                        <Table.Td><Text fw={700}>{animal.caravana}</Text></Table.Td>
                                        <Table.Td>{animal.categoria}</Table.Td>
                                        <Table.Td>
                                            <Badge size="sm" color={getEstadoColor(animal.estado)}>{animal.estado}</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {animal.lote_id ? <Badge size="sm" variant="outline" color="lime" leftSection={<IconMapPin size={10}/>}>{getNombreLote(animal.lote_id)}</Badge> : <Text size="xs" c="dimmed">-</Text>}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                        </ScrollArea>
                    </Paper>

                    {/* BOTON FLOTANTE CONFIRMACION */}
                    {selectedIds.length > 0 && (
                        <Paper 
                            shadow="xl" p="md" radius="md" withBorder bg="gray.0" 
                            style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 100, border: '2px solid #7950f2' }}
                        >
                            <Group>
                                <Stack gap={0}>
                                    <Text fw={700} size="sm">CONFIRMAR ACCIÓN</Text>
                                    <Text size="xs" c="dimmed">{massActividad} en {selectedIds.length} animales</Text>
                                </Stack>
                                <Button size="lg" color="violet" loading={loading} onClick={guardarEventoMasivo}>
                                    CONFIRMAR
                                </Button>
                            </Group>
                        </Paper>
                    )}
                  </>
              )}

              {(activeSection === 'hacienda' || activeSection === 'bajas') && (
                <>
                  {/* HEADER DE LA SECCION CON BOTON NUEVO GRANDE Y TEAL */}
                  <Group justify="space-between" mb="lg" align="center">
                    <Group>
                        <Title order={3}>{activeSection === 'hacienda' ? 'Hacienda' : 'Archivo Bajas'}</Title>
                        <Badge size="xl" circle>{animalesFiltrados.length}</Badge>
                    </Group>
                    {activeSection === 'hacienda' && (
                        <Button leftSection={<IconPlus size={22}/>} color="teal" size="md" variant="filled" onClick={openModalAlta} w={180} mr="md">Nuevo Animal</Button>
                    )}
                  </Group>
                  
                  {/* BARRA DE FILTROS AVANZADOS (UX PRO) */}
                  <Paper p="sm" radius="md" withBorder mb="lg" bg="gray.0">
                      <Group grow align="flex-end">
                        <TextInput 
                            label="Buscar" placeholder="Caravana..." 
                            leftSection={<IconSearch size={16}/>} 
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} 
                        />
                        <Select 
                            label="Filtrar Categoría" placeholder="Todas" 
                            data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} 
                            value={filterCategoria} onChange={setFilterCategoria} clearable 
                        />
                        <MultiSelect 
                            label="Estado / Sexo / Condición" placeholder="Ej: Macho, Enferma..."
                            data={['MACHO', 'HEMBRA', 'CAPADO', 'PREÑADA', 'VACÍA', 'ACTIVO', 'EN SERVICIO', 'APARTADO', 'ENFERMA', 'LASTIMADA']}
                            value={filterAtributos} onChange={setFilterAtributos}
                            leftSection={<IconFilter size={16}/>}
                            clearable
                        />
                      </Group>
                  </Paper>

                  <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
                    <Table striped highlightOnHover>
                      <Table.Thead bg="gray.1">
                          <Table.Tr>
                              <Th sorted={sortBy === 'caravana'} reversed={reverseSortDirection} onSort={() => setSorting('caravana')}>Caravana</Th>
                              <Table.Th>Categoría</Table.Th> {/* SIN SORT */}
                              <Table.Th>Estado / Condición</Table.Th> {/* SIN SORT */}
                              <Table.Th>Ubicación</Table.Th>
                              {activeSection === 'bajas' && <Table.Th>Detalle</Table.Th>}
                          </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>{animalesFiltrados.map((vaca) => (
                        <Table.Tr key={vaca.id} onClick={() => abrirFichaVaca(vaca)} style={{ cursor: 'pointer' }}>
                            <Table.Td><Text fw={700}>{vaca.caravana}</Text></Table.Td>
                            <Table.Td>{vaca.categoria}</Table.Td>
                            <Table.Td>
                                {activeSection === 'bajas' ? (
                                    <Badge color={vaca.estado === 'VENDIDO' ? 'green' : 'red'}>{vaca.estado}</Badge>
                                ) : (
                                    <Group gap="xs">
                                        {vaca.categoria === 'Ternero' && (
                                            <Badge color={vaca.sexo === 'M' ? 'blue' : 'pink'} variant="light">
                                                {vaca.sexo === 'M' ? 'MACHO' : 'HEMBRA'}
                                            </Badge>
                                        )}
                                        {vaca.categoria === 'Ternero' && vaca.castrado ? (
                                            <Badge color="cyan">CAPADO</Badge>
                                        ) : (
                                            vaca.categoria !== 'Ternero' && <Badge color={getEstadoColor(vaca.estado)}>{vaca.estado}</Badge>
                                        )}
                                        {renderCondicionBadges(vaca.condicion)}
                                    </Group>
                                )}
                            </Table.Td>
                            <Table.Td>
                                {vaca.lote_id ? <Badge variant="outline" color="lime" leftSection={<IconMapPin size={10}/>}>{getNombreLote(vaca.lote_id)}</Badge> : <Text size="xs" c="dimmed">-</Text>}
                            </Table.Td>
                            {activeSection === 'bajas' ? ( <Table.Td>{vaca.detalle_baja ? <Text size="sm" fw={500}>{vaca.detalle_baja}</Text> : <Text size="xs" c="dimmed">-</Text>}</Table.Td> ) : null}
                        </Table.Tr>
                      ))}</Table.Tbody>
                    </Table>
                  </Paper>
                </>
              )}

              {activeSection === 'agricultura' && ( 
                <> 
                  <Group justify="space-between" mb="lg" align="center">
                    <Group>
                        <Title order={3}>Agricultura / Lotes</Title>
                        <Badge size="xl" color="lime" circle>{lotes.length}</Badge>
                    </Group>
                    <Button leftSection={<IconPlus size={22}/>} color="lime" size="md" variant="filled" onClick={() => { setNombreLote(''); setHasLote(''); openModalAlta(); }} w={180} mr="md">Nuevo Lote</Button>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                    {lotes.map(lote => {
                        // Calcular animales en este lote
                        const animalesEnLote = haciendaActiva.filter(a => a.lote_id === lote.id).length;
                        return (
                            <Card key={lote.id} shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => abrirFichaLote(lote)}>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={700} size="lg">{lote.nombre}</Text>
                                    <Badge color={lote.estado === 'SEMBRADO' ? 'green' : 'yellow'}>{lote.estado}</Badge>
                                </Group>
                                <Group mb="md" gap="xs">
                                    <Badge variant="outline" color="gray">{lote.hectareas} Has</Badge>
                                    {lote.cultivo_actual && <Badge variant="dot" color="lime">{lote.cultivo_actual}</Badge>}
                                </Group>
                                <Paper bg="gray.0" p="xs" radius="md" mt="sm">
                                    <Group justify="space-between">
                                        <Text size="xs" fw={700} c="dimmed">CARGA ANIMAL</Text>
                                        <Badge color="blue" variant="light">{animalesEnLote} Cab</Badge>
                                    </Group>
                                </Paper>
                                <Button variant="light" color="lime" fullWidth mt="md" radius="md">Gestionar Lote</Button>
                            </Card>
                        )
                    })}
                  </SimpleGrid>
                  {lotes.length === 0 && <Text c="dimmed" ta="center" mt="xl">No hay lotes cargados.</Text>} 
                </> 
              )}
              
              {activeSection === 'actividad' && ( <> <Group mb="md"><TextInput style={{flex: 2}} leftSection={<IconSearch size={16}/>} placeholder="Buscar por Caravana..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /><Select style={{flex: 1}} placeholder="Filtrar Actividad" data={['PESAJE', 'TACTO', 'SERVICIO', 'PARTO', 'BAJA', 'VACUNACION', 'ENFERMEDAD', 'CURACION', 'CAPADO']} value={filtroTipoEvento} onChange={setFiltroTipoEvento} clearable /></Group><Paper radius="md" withBorder><Table><Table.Thead><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Ref</Table.Th><Table.Th>Evento</Table.Th><Table.Th>Detalle</Table.Th><Table.Th>Costo</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{eventosFiltrados.map(ev => (<Table.Tr key={ev.id}><Table.Td><Text size="sm" c="dimmed">{formatDate(ev.fecha_evento)}</Text></Table.Td><Table.Td><Text fw={700}>{ev.animales?.caravana || '-'}</Text></Table.Td><Table.Td><Badge variant="outline" size="sm">{ev.tipo}</Badge></Table.Td><Table.Td><Text size="sm" fw={500}>{ev.resultado}</Text>{ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}{ev.datos_extra && ev.datos_extra.toro_caravana && (<Text size="xs" c="dimmed">Toro: {ev.datos_extra.toro_caravana}</Text>)}</Table.Td><Table.Td><Text size="sm" c="dimmed">${ev.costo || 0}</Text></Table.Td></Table.Tr>))}</Table.Tbody></Table></Paper> </> )}
            </AppShell.Main>
          </AppShell>
        )}

      {/* --- MODAL NUEVO ANIMAL / LOTE (REUTILIZADO SEGUN SECCION) --- */}
      <Modal opened={modalAltaOpen} onClose={closeModalAlta} title={<Text fw={700} size="lg">{activeSection === 'agricultura' ? 'Nuevo Lote' : 'Alta de Nuevo Animal'}</Text>} centered>
         <Stack>
             {activeSection === 'agricultura' ? (
                 <>
                    <TextInput label="Nombre del Lote" placeholder="Ej: Lote del Fondo" value={nombreLote} onChange={(e) => setNombreLote(e.target.value)} />
                    <TextInput label="Hectáreas" type="number" placeholder="Ej: 50" value={hasLote} onChange={(e) => setHasLote(e.target.value)} />
                    <Button onClick={guardarLote} loading={loading} color="lime" fullWidth mt="md">Crear Lote</Button>
                 </>
             ) : (
                 <>
                    <TextInput label="Caravana" placeholder="ID del animal" value={caravana} onChange={(e) => setCaravana(e.target.value)} />
                    <Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={categoria} onChange={setCategoria} />
                    <Select label="Sexo" data={['H', 'M']} value={sexo} onChange={setSexo} disabled={sexoBloqueado} />
                    <Button onClick={guardarAnimal} loading={loading} color="teal" fullWidth mt="md">Guardar Animal</Button>
                 </>
             )}
         </Stack>
      </Modal>

      {/* --- MODAL EDICION DE EVENTO --- */}
      <Modal opened={modalEditEventOpen} onClose={closeModalEditEvent} title={<Text fw={700}>Editar Evento</Text>} centered zIndex={3000}>
          <Stack>
              <TextInput label="Fecha" type="date" value={getLocalDateForInput(editingEventDate)} onChange={(e) => setEditingEventDate(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}/>
              <TextInput label="Resultado" value={editingEventRes} onChange={(e) => setEditingEventRes(e.target.value)}/>
              <Textarea label="Detalle" value={editingEventDet} onChange={(e) => setEditingEventDet(e.target.value)}/>
              <Button onClick={guardarEdicionEvento} fullWidth mt="md">Guardar Cambios</Button>
          </Stack>
      </Modal>

      {/* --- MODAL GESTION CAMPOS --- */}
      <Modal opened={modalConfigOpen} onClose={closeModalConfig} title={<Text fw={700} size="lg">Mis Establecimientos</Text>} centered>
         <Group align="flex-end" mb="lg">
            <TextInput label="Nuevo Campo" placeholder="Nombre" value={nuevoCampoNombre} onChange={(e) => setNuevoCampoNombre(e.target.value)} style={{flex: 1}}/>
            <Button onClick={crearCampo} leftSection={<IconPlus size={16}/>}>Crear</Button>
         </Group>
         <Stack>
            {establecimientos.map(e => (
                <Group key={e.id} justify="space-between" p="sm" bg="gray.0" style={{borderRadius: 8}}>
                    <Group>
                        <IconBuilding size={18} color="gray"/>
                        <Text fw={500}>{e.nombre}</Text>
                        {e.id === campoId && <Badge color="teal" size="sm">ACTIVO</Badge>}
                    </Group>
                    <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" onClick={() => renombrarCampo(e.id, e.nombre)}><IconEdit size={16}/></ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => borrarCampo(e.id)}><IconTrash size={16}/></ActionIcon>
                    </Group>
                </Group>
            ))}
         </Stack>
      </Modal>

      <Modal opened={modalVacaOpen} onClose={handleCloseModalVaca} title={<Text fw={700} size="lg">Ficha: {animalSel?.caravana} {esActivo ? '' : '(ARCHIVO)'}</Text>} size="lg" centered zIndex={2000}>
         <Tabs value={activeTabVaca} onChange={setActiveTabVaca} color="teal">
           <Tabs.List grow mb="md"><Tabs.Tab value="historia">Historia</Tabs.Tab><Tabs.Tab value="datos">Datos</Tabs.Tab></Tabs.List>
           <Tabs.Panel value="historia">
              {esActivo ? (
                <Paper withBorder p="sm" bg="gray.0" mb="md"><Text size="sm" fw={700} mb="xs">Registrar Evento</Text><Group grow mb="sm"><TextInput leftSection={<IconCalendar size={16}/>} placeholder="Fecha" type="date" value={getLocalDateForInput(fechaEvento)} onChange={(e) => setFechaEvento(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} max={new Date().toISOString().split('T')[0]} style={{ flex: 1 }} /><Select data={opcionesDisponibles} placeholder="Tipo" value={tipoEventoInput} onChange={setTipoEventoInput} comboboxProps={{ zIndex: 200005 }} /></Group>{tipoEventoInput === 'TACTO' && ( <Select label="Resultado del Tacto" data={['PREÑADA', 'VACÍA']} value={tactoResultado} onChange={setTactoResultado} mb="sm" comboboxProps={{ zIndex: 200005 }}/> )}{tipoEventoInput === 'SERVICIO' && ( <Group grow mb="sm" align="flex-end"><Select label="Tipo de Servicio" data={['TORO', 'IA']} value={tipoServicio} onChange={setTipoServicio} comboboxProps={{ zIndex: 200005 }}/ >{tipoServicio === 'TORO' && ( <MultiSelect label="Seleccionar Toro/s" data={torosDisponibles.map(t => ({value: t.id, label: t.caravana}))} value={torosIdsInput} onChange={setTorosIdsInput} searchable comboboxProps={{ zIndex: 200005 }} /> )}</Group> )}{tipoEventoInput === 'PARTO' && ( <Paper withBorder p="xs" bg="teal.0" mb="sm"><Text size="sm" fw={700} c="teal">Datos del Nuevo Ternero</Text><Group grow><TextInput label="Caravana Ternero" placeholder="Nueva ID" value={nuevoTerneroCaravana} onChange={(e) => setNuevoTerneroCaravana(e.target.value)} required/><Select label="Sexo" data={['M', 'H']} value={nuevoTerneroSexo} onChange={setNuevoTerneroSexo} comboboxProps={{ zIndex: 200005 }}/></Group><TextInput mt="sm" label="Peso al Nacer (kg)" placeholder="Opcional" type="number" value={pesoNacimiento} onChange={(e) => setPesoNacimiento(e.target.value)}/></Paper> )}{!['TACTO', 'SERVICIO', 'PARTO', 'ENFERMEDAD', 'LESION', 'CURACION', 'CAPADO', 'RASPAJE', 'APARTADO'].includes(tipoEventoInput || '') && ( <Group grow mb="sm"><TextInput placeholder="Resultado (Ej: 350kg)" value={resultadoInput} onChange={(e) => setResultadoInput(e.target.value)} /></Group> )}{/* COSTO INDIVIDUAL */}<TextInput label="Costo ($)" placeholder="Opcional" type="number" value={costoEvento} onChange={(e) => setCostoEvento(e.target.value)} leftSection={<IconCurrencyDollar size={14}/>} mb="sm"/>{adpvCalculado && <Alert color="green" icon={<IconTrendingUp size={16}/>} title="Rendimiento Detectado" mb="sm">{adpvCalculado}</Alert>}<Group grow align="flex-start"><Textarea placeholder="Detalles / Observaciones..." rows={2} value={detalleInput} onChange={(e) => setDetalleInput(e.target.value)} style={{flex: 1}}/><Button size="md" onClick={guardarEventoVaca} color="teal" loading={loading} style={{ maxWidth: 120 }}>Guardar</Button></Group></Paper>
              ) : ( <Alert color="gray" icon={<IconArchive size={16}/>} mb="md">Este animal está archivado. Solo lectura.</Alert> )}
              <ScrollArea h={300}><Table striped><Table.Tbody>{eventosFicha.map(ev => (<Table.Tr key={ev.id}><Table.Td><Text size="xs">{formatDate(ev.fecha_evento)}</Text></Table.Td><Table.Td><Text fw={700} size="sm">{ev.tipo}</Text></Table.Td><Table.Td><Text size="sm" fw={500}>{ev.resultado}</Text>{ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}{ev.datos_extra && ev.datos_extra.precio_kg && <Badge size="xs" color="green" variant="outline" ml="xs">${ev.datos_extra.precio_kg}</Badge>}</Table.Td><Table.Td><Text size="xs" c="dimmed">${ev.costo || 0}</Text></Table.Td><Table.Td align="right"><ActionIcon size="sm" variant="subtle" color="blue" onClick={() => iniciarEdicionEvento(ev)}><IconEdit size={14}/></ActionIcon><ActionIcon size="sm" variant="subtle" color="red" onClick={() => borrarEvento(ev.id)}><IconTrash size={14}/></ActionIcon></Table.Td></Table.Tr>))}</Table.Tbody></Table></ScrollArea>
           </Tabs.Panel>
           <Tabs.Panel value="datos">
              <Paper withBorder p="sm" bg="gray.1" mb="md" radius="md"><Group justify="space-between"><Text size="sm" fw={700} c="dimmed">ÚLTIMO PESO:</Text><Badge size="lg" variant="filled" color="gray" leftSection={<IconScale size={14}/>}>{ultimoPeso}</Badge></Group></Paper>
              <TextInput label="Caravana" value={editCaravana} onChange={(e) => setEditCaravana(e.target.value)} mb="sm" disabled={!esActivo} />
              <Group grow mb="sm"><Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={editCategoria} onChange={setEditCategoria} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} />{['Vaca', 'Vaquillona'].includes(editCategoria || '') && ( <Select label="Reproductivo" data={['ACTIVO', 'PREÑADA', 'VACÍA']} value={editEstado} onChange={setEditEstado} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} /> )}</Group>
              {['Ternero', 'Novillo'].includes(editCategoria || '') && ( <TextInput label="Caravana Madre" value={madreCaravana} readOnly mb="sm" rightSection={<IconBabyCarriage size={16}/>} /> )}
              
              {/* --- CARTEL TOROS (NUEVO DISEÑO MAS VISIBLE) --- */}
              {nombresTorosCartel && (
                  <Paper withBorder p="md" bg="pink.0" radius="md" mb="sm" style={{ borderLeft: '6px solid #fa5252' }}>
                      <Group gap="sm">
                          <ThemeIcon color="pink" variant="filled" size="lg" radius="xl"><IconInfoCircle size={20}/></ThemeIcon>
                          <Stack gap={0}>
                              <Text size="xs" fw={700} c="pink.9" tt="uppercase">Servicio Activo</Text>
                              <Text size="sm" c="dark.9">En servicio con Toro/s: <b>{nombresTorosCartel}</b></Text>
                          </Stack>
                      </Group>
                  </Paper>
              )}

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
                                        variant={isGone ? 'light' : 'white'} 
                                        style={{ cursor: 'pointer', opacity: isGone ? 0.5 : 1 }}
                                        color={h.sexo === 'H' ? 'pink' : 'blue'}
                                        onClick={() => navegarAHijo(h.id)}
                                    >
                                        {h.caravana}
                                    </Badge>
                                )
                            })}
                        </Group> 
                    ) : <Text size="xs" c="dimmed">Sin registros</Text>}
                </Paper> 
              )}
              <MultiSelect label="Condición Sanitaria" data={['ENFERMA', 'LASTIMADA']} value={editCondicion} onChange={setEditCondicion} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} leftSection={<IconHeartbeat size={16}/>} mb="sm" placeholder="SANA"/>
              {editCategoria === 'Ternero' && editSexo === 'M' && ( <Group justify="space-between" mb="sm" p="xs" bg="gray.0" style={{borderRadius: 8}}><Group gap="xs"><IconScissors size={18}/> <Text size="sm" fw={500}>Condición Sexual</Text></Group><Switch size="lg" onLabel="CAPADO" offLabel="ENTERO" checked={editCastrado} onChange={(e) => setEditCastrado(e.currentTarget.checked)} disabled={!esActivo} /></Group> )}
              <Group grow mb="xl"><TextInput label="Fecha Nacimiento" type="date" value={editFechaNac} onChange={(e) => setEditFechaNac(e.target.value)} disabled={!esActivo} /><TextInput label="Fecha Ingreso" type="date" value={editFechaIngreso} onChange={(e) => setEditFechaIngreso(e.target.value)} disabled={!esActivo} /></Group>
              {esActivo ? ( <>{!modoBaja ? ( <><Button fullWidth variant="outline" leftSection={<IconCheck size={16}/>} onClick={actualizarAnimal} mb="xl">Guardar Cambios</Button><Text size="sm" fw={700} c="red.6" mb="xs">Zona de Baja</Text><Group grow><Button color="orange" onClick={() => setModoBaja('VENDIDO')} leftSection={<IconCurrencyDollar size={16}/>}>Vendido</Button><Button color="red" onClick={() => setModoBaja('MUERTO')} leftSection={<IconSkull size={16}/>}>Muerto</Button></Group><Button fullWidth variant="subtle" color="gray" mt="xs" leftSection={<IconTrash size={16}/>} onClick={borrarAnimalDefinitivo}>Borrar definitivamente</Button></> ) : ( <Paper withBorder p="sm" bg={modoBaja === 'VENDIDO' ? 'orange.0' : 'red.0'}><Group justify="space-between" mb="sm"><Text fw={700} c={modoBaja === 'VENDIDO' ? 'orange.9' : 'red.9'}>CONFIRMAR: {modoBaja}</Text><ActionIcon variant="subtle" color="gray" onClick={() => setModoBaja(null)}><IconArrowBackUp size={16}/></ActionIcon></Group>{modoBaja === 'VENDIDO' && ( <Group grow mb="sm"><TextInput label="Precio" placeholder="Ej: 2200" value={bajaPrecio} onChange={(e) => setBajaPrecio(e.target.value)}/><TextInput label="Destino" placeholder="Ej: Frigorifico" value={bajaMotivo} onChange={(e) => setBajaMotivo(e.target.value)}/></Group> )}{modoBaja === 'MUERTO' && ( <TextInput label="Causa" placeholder="Ej: Accidente" value={bajaMotivo} onChange={(e) => setBajaMotivo(e.target.value)} mb="sm"/> )}<Button fullWidth color={modoBaja === 'VENDIDO' ? 'orange' : 'red'} onClick={confirmarBaja}>Confirmar Salida</Button></Paper> )}</> ) : ( <Paper p="md" bg="gray.1" ta="center"><Text c="dimmed" size="sm" mb="md">Este animal se encuentra dado de baja.</Text><Button fullWidth variant="outline" color="blue" leftSection={<IconArrowBackUp/>} onClick={restaurarAnimal}>Restaurar a Hacienda Activa</Button></Paper> )}
           </Tabs.Panel>
         </Tabs>
      </Modal>
      <Modal opened={modalLoteOpen} onClose={closeModalLote} title={<Text fw={700} size="lg">Lote: {loteSel?.nombre}</Text>} size="lg" centered zIndex={2000}>
         <Tabs defaultValue="labores" color="lime">
            <Tabs.List grow mb="md"><Tabs.Tab value="labores">Labores</Tabs.Tab><Tabs.Tab value="animales">Hacienda</Tabs.Tab></Tabs.List>
            
            <Tabs.Panel value="labores">
                <Paper withBorder p="sm" bg="lime.0" mb="md">
                    <Text size="sm" fw={700} mb="xs">Nueva Labor</Text>
                    <Group grow mb="sm"><Select data={['SIEMBRA', 'FUMIGADA', 'COSECHA', 'FERTILIZACION', 'DESMALEZADA', 'OTRO']} value={actividadLote} onChange={setActividadLote} comboboxProps={{ zIndex: 200005 }}/><TextInput placeholder="Cultivo / Producto" value={cultivoInput} onChange={(e) => setCultivoInput(e.target.value)} /></Group>
                    <Group grow mb="sm"><TextInput placeholder="Costo ($)" type="number" leftSection={<IconCurrencyDollar size={14}/>} value={costoLabor} onChange={(e) => setCostoLabor(e.target.value)}/><Textarea placeholder="Detalle..." value={detalleLabor} onChange={(e) => setDetalleLabor(e.target.value)} rows={1}/></Group>
                    <Button fullWidth size="xs" onClick={guardarLabor} color="lime" variant="filled">Registrar</Button>
                </Paper>
                <ScrollArea h={300}>{laboresFicha.length === 0 ? <Text c="dimmed" size="sm">Sin labores registradas.</Text> : (<Table striped><Table.Tbody>{laboresFicha.map(labor => (<Table.Tr key={labor.id}><Table.Td><Text size="xs" c="dimmed">{formatDate(labor.fecha)}</Text></Table.Td><Table.Td><Text fw={700} size="sm">{labor.actividad}</Text>{labor.cultivo && <Badge size="xs" color="lime">{labor.cultivo}</Badge>}</Table.Td><Table.Td><Text size="sm">{labor.detalle}</Text></Table.Td><Table.Td><Text size="sm" fw={700} c="dimmed">${labor.costo || 0}</Text></Table.Td><Table.Td align="right"><ActionIcon color="red" variant="subtle" size="sm" onClick={() => borrarLabor(labor.id)}><IconTrash size={14}/></ActionIcon></Table.Td></Table.Tr>))}</Table.Tbody></Table>)}</ScrollArea>
                <Button fullWidth color="red" variant="subtle" mt="xl" onClick={() => borrarLote(loteSel!.id)}>Borrar Lote</Button>
            </Tabs.Panel>

            <Tabs.Panel value="animales">
                {/* Lista de animales que estan actualmente en este lote */}
                <ScrollArea h={400}>
                    <Table>
                        <Table.Thead><Table.Tr><Table.Th>Caravana</Table.Th><Table.Th>Categoría</Table.Th></Table.Tr></Table.Thead>
                        <Table.Tbody>
                            {haciendaActiva.filter(a => a.lote_id === loteSel?.id).length > 0 ? (
                                haciendaActiva.filter(a => a.lote_id === loteSel?.id).map(a => (
                                    <Table.Tr key={a.id}>
                                        <Table.Td fw={700}>{a.caravana}</Table.Td>
                                        <Table.Td>{a.categoria}</Table.Td>
                                    </Table.Tr>
                                ))
                            ) : <Text c="dimmed" size="sm" p="md">No hay animales en este lote.</Text>}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Tabs.Panel>
         </Tabs>
      </Modal>
    </MantineProvider>
  );
}