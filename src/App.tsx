import { useEffect, useState } from 'react';
import { 
  MantineProvider, AppShell, Burger, Group, Title, NavLink, Text, 
  Paper, TextInput, Select, Button, Table, Badge, Tabs, 
  Textarea, ActionIcon, ScrollArea, SimpleGrid, Card, Modal, Alert, UnstyledButton, Center, rem, MultiSelect, Switch, RingProgress, Stack, ThemeIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconList, IconArchive, IconActivity, IconTrash, IconCheck, IconLeaf, IconTractor, 
  IconCalendar, IconScale, IconArrowBackUp, IconCurrencyDollar, IconSkull, IconSearch, 
  IconHeartbeat, IconChevronUp, IconChevronDown, IconSelector, IconBabyCarriage, IconScissors, IconBuilding, IconHome, IconSettings, IconEdit, IconPlus
} from '@tabler/icons-react';
import '@mantine/core/styles.css';
import { supabase } from './supabase';

// --- TIPOS ---
interface Establecimiento { id: string; nombre: string; }
interface Animal { 
  id: string; caravana: string; categoria: string; sexo: string; 
  estado: string; condicion: string; origen: string; detalle_baja?: string;
  fecha_nacimiento?: string; fecha_ingreso?: string; madre_id?: string; castrado?: boolean;
  establecimiento_id: string; 
}
interface Evento { id: string; fecha_evento: string; tipo: string; resultado: string; detalle: string; animal_id: string; datos_extra?: any; animales?: { caravana: string } }
interface Lote { id: string; nombre: string; hectareas: number; cultivo_actual: string; estado: string; }
interface Labor { id: string; fecha: string; actividad: string; cultivo: string; detalle: string; lote_id: string; }

// Componente para ordenar tabla
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
  const [opened, { toggle }] = useDisclosure(); 
  const [activeSection, setActiveSection] = useState('inicio'); 
  const [loading, setLoading] = useState(false);
  
  // --- ESTADO MULTI-CAMPO ---
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [campoId, setCampoId] = useState<string | null>(null);
  const [modalConfigOpen, { open: openModalConfig, close: closeModalConfig }] = useDisclosure(false); // Modal Gestion Campos
  const [nuevoCampoNombre, setNuevoCampoNombre] = useState('');

  // --- DATOS ---
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string | null>(''); 
  const [sortBy, setSortBy] = useState<keyof Animal | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [eventosGlobales, setEventosGlobales] = useState<Evento[]>([]);
  
  // Estado Dashboard
  const [chartHover, setChartHover] = useState<{ label: string, value: number | string } | null>(null);

  // Forms
  const [caravana, setCaravana] = useState('');
  const [categoria, setCategoria] = useState<string | null>('Vaca');
  const [sexo, setSexo] = useState<string | null>('H');
  const [sexoBloqueado, setSexoBloqueado] = useState(true);
  const [nombreLote, setNombreLote] = useState('');
  const [hasLote, setHasLote] = useState<string | number>(0);
  const [modalVacaOpen, { open: openModalVaca, close: closeModalVaca }] = useDisclosure(false);
  const [animalSel, setAnimalSel] = useState<Animal | null>(null);
  const [eventosFicha, setEventosFicha] = useState<Evento[]>([]);
  const [ultimoPeso, setUltimoPeso] = useState<string>('Sin datos');
  const [madreCaravana, setMadreCaravana] = useState<string>(''); 
  const [hijos, setHijos] = useState<string[]>([]); 
  const [modalLoteOpen, { open: openModalLote, close: closeModalLote }] = useDisclosure(false);
  const [loteSel, setLoteSel] = useState<Lote | null>(null);
  const [laboresFicha, setLaboresFicha] = useState<Labor[]>([]);

  // Inputs
  const [fechaEvento, setFechaEvento] = useState<Date | null>(new Date());
  const [tipoEventoInput, setTipoEventoInput] = useState<string | null>('PESAJE');
  const [resultadoInput, setResultadoInput] = useState('');
  const [detalleInput, setDetalleInput] = useState('');
  const [tactoResultado, setTactoResultado] = useState<string | null>('PREÑADA');
  const [tipoServicio, setTipoServicio] = useState<string | null>('TORO');
  const [toroCaravana, setToroCaravana] = useState('');
  const [nuevoTerneroCaravana, setNuevoTerneroCaravana] = useState('');
  const [nuevoTerneroSexo, setNuevoTerneroSexo] = useState<string | null>('M');
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
  const [actividadLote, setActividadLote] = useState<string | null>('FUMIGADA');
  const [cultivoInput, setCultivoInput] = useState(''); 
  const [detalleLabor, setDetalleLabor] = useState('');

  // --- INIT ---
  useEffect(() => {
    loadCampos();
  }, []);

  async function loadCampos() {
    const { data } = await supabase.from('establecimientos').select('*').order('created_at');
    if (data && data.length > 0) {
      setEstablecimientos(data);
      const guardado = localStorage.getItem('campoId');
      if (guardado && data.find(c => c.id === guardado)) setCampoId(guardado);
      else if (!campoId) setCampoId(data[0].id); // Solo poner el primero si no hay uno seleccionado
    }
  }

  useEffect(() => {
    if (!campoId) return;
    localStorage.setItem('campoId', campoId); 
    setBusqueda(''); setFiltroTipoEvento('');
    if (activeSection === 'inicio') { fetchAnimales(); fetchActividadGlobal(); } 
    if (activeSection.includes('hacienda') || activeSection === 'bajas') fetchAnimales();
    if (activeSection === 'actividad') fetchActividadGlobal();
    if (activeSection === 'agricultura') fetchLotes();
  }, [activeSection, campoId]); 

  // --- LOGICA UI ---
  useEffect(() => { setResultadoInput(''); setToroCaravana(''); setNuevoTerneroCaravana(''); }, [tipoEventoInput]);
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
    setAnimales(prev => [...prev].sort((a, b) => {
        if (field === 'caravana') {
            const numA = parseInt(a.caravana.replace(/\D/g,'')) || 0;
            const numB = parseInt(b.caravana.replace(/\D/g,'')) || 0;
            if (numA !== numB) return reversed ? numB - numA : numA - numB;
        }
        const valA = a[field]?.toString().toLowerCase() || '';
        const valB = b[field]?.toString().toLowerCase() || '';
        return reversed ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }));
  };

  const animalesFiltrados = animales.filter(animal => 
    animal.caravana.toLowerCase().includes(busqueda.toLowerCase()) ||
    animal.estado.toLowerCase().includes(busqueda.toLowerCase()) ||
    animal.condicion?.toLowerCase().includes(busqueda.toLowerCase())
  );
  
  const eventosFiltrados = eventosGlobales.filter(ev => {
    const coincideTexto = ev.animales?.caravana.toLowerCase().includes(busqueda.toLowerCase()) || ev.tipo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipoEvento ? ev.tipo === filtroTipoEvento : true;
    return coincideTexto && coincideTipo;
  });

  const getEstadoColor = (estado: string) => { if (estado === 'PREÑADA') return 'teal'; if (estado === 'VACÍA') return 'yellow'; return 'blue'; };
  const renderCondicionBadges = (condStr: string) => { if (!condStr || condStr === 'SANA') return null; return condStr.split(', ').map((c, i) => ( <Badge key={i} color={c === 'ENFERMA' ? 'red' : 'grape'} variant="filled" size="sm">{c}</Badge> )); };

  // --- FETCHERS ---
  async function fetchAnimales() {
    if (!campoId) return;
    let query = supabase.from('animales').select('*').eq('establecimiento_id', campoId).neq('estado', 'ELIMINADO').order('created_at', { ascending: false }); 
    if (activeSection === 'hacienda') query = query.neq('estado', 'VENDIDO').neq('estado', 'MUERTO');
    else if (activeSection === 'bajas') query = query.in('estado', ['VENDIDO', 'MUERTO']);
    const { data } = await query;
    setAnimales(data || []);
  }
  async function fetchLotes() { if (!campoId) return; const { data } = await supabase.from('lotes').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setLotes(data || []); }
  async function fetchActividadGlobal() { if (!campoId) return; const { data } = await supabase.from('eventos').select('*, animales!inner(caravana)').eq('establecimiento_id', campoId).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false }).limit(50); setEventosGlobales(data as any || []); }

  // --- GESTIÓN DE ESTABLECIMIENTOS ---
  async function crearCampo() {
    if (!nuevoCampoNombre) return;
    const { error } = await supabase.from('establecimientos').insert([{ nombre: nuevoCampoNombre }]);
    if (error) alert("Error: " + error.message);
    else { setNuevoCampoNombre(''); loadCampos(); }
  }
  async function borrarCampo(id: string) {
    if (!confirm("⚠️ ¿BORRAR ESTABLECIMIENTO COMPLETO?\n\nSe perderán TODOS los animales y datos de este campo. No se puede deshacer.")) return;
    const { error } = await supabase.from('establecimientos').delete().eq('id', id);
    if (error) alert("Error: No se pudo borrar (probablemente tenga datos asociados que requieren borrado manual por seguridad).");
    else {
        // Si borramos el actual, cambiar al primero disponible
        if (id === campoId) {
            const restantes = establecimientos.filter(e => e.id !== id);
            if (restantes.length > 0) setCampoId(restantes[0].id);
            else window.location.reload(); // Si no quedan campos, recargar
        }
        loadCampos();
    }
  }
  async function renombrarCampo(id: string, nombreActual: string) {
    const nuevo = prompt("Nuevo nombre para el campo:", nombreActual);
    if (!nuevo || nuevo === nombreActual) return;
    await supabase.from('establecimientos').update({ nombre: nuevo }).eq('id', id);
    loadCampos();
  }

  // --- ACCIONES VACA ---
  async function guardarAnimal() {
    if (!caravana || !campoId) return;
    setLoading(true);
    const hoy = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('animales').insert([{ caravana, categoria, sexo, estado: 'ACTIVO', condicion: 'SANA', origen: 'PROPIO', fecha_nacimiento: hoy, fecha_ingreso: hoy, establecimiento_id: campoId }]);
    setLoading(false); if (!error) { setCaravana(''); fetchAnimales(); }
  }

  async function abrirFichaVaca(animal: Animal) {
    setAnimalSel(animal);
    setEditCaravana(animal.caravana); setEditCategoria(animal.categoria); setEditSexo(animal.sexo);
    setEditEstado(animal.estado); setEditCastrado(animal.castrado || false);
    const condArray = animal.condicion && animal.condicion !== 'SANA' ? animal.condicion.split(', ') : [];
    setEditCondicion(condArray);
    setEditFechaNac(animal.fecha_nacimiento || ''); setEditFechaIngreso(animal.fecha_ingreso || '');
    if (animal.madre_id) { const m = animales.find(a => a.id === animal.madre_id); setMadreCaravana(m ? m.caravana : 'Desconocida'); } else { setMadreCaravana(''); }
    setHijos([]); const { data: dataHijos } = await supabase.from('animales').select('caravana').eq('madre_id', animal.id); if(dataHijos) setHijos(dataHijos.map(h => h.caravana));
    setEventosFicha([]); setFechaEvento(new Date()); setTipoEventoInput('PESAJE'); setModoBaja(null); setBajaPrecio(''); setBajaMotivo(''); setUltimoPeso('Calculando...');
    openModalVaca(); 
    const { data } = await supabase.from('eventos').select('*').eq('animal_id', animal.id).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false });
    if (data) setEventosFicha(data);
    const { data: pesoData } = await supabase.from('eventos').select('resultado').eq('animal_id', animal.id).eq('tipo', 'PESAJE').order('fecha_evento', { ascending: false }).limit(1);
    if (pesoData && pesoData.length > 0) setUltimoPeso(pesoData[0].resultado); else setUltimoPeso('-');
  }

  async function guardarEventoVaca() {
    if (!animalSel || !tipoEventoInput || !fechaEvento || !campoId) return alert("Faltan datos");
    setLoading(true);
    let resultadoFinal = resultadoInput; let datosExtra = null; let nuevoEstado = ''; let nuevasCondiciones = [...editCondicion]; let esCastrado = editCastrado; 

    if (tipoEventoInput === 'TACTO') { resultadoFinal = tactoResultado || ''; if (tactoResultado === 'PREÑADA') nuevoEstado = 'PREÑADA'; if (tactoResultado === 'VACÍA') nuevoEstado = 'VACÍA'; } 
    else if (tipoEventoInput === 'PARTO') {
      if (!nuevoTerneroCaravana) { setLoading(false); return alert("Falta caravana ternero."); }
      const fechaParto = fechaEvento.toISOString().split('T')[0];
      const { error: err } = await supabase.from('animales').insert([{ caravana: nuevoTerneroCaravana, categoria: 'Ternero', sexo: nuevoTerneroSexo, estado: 'ACTIVO', condicion: 'SANA', origen: 'NACIDO', madre_id: animalSel.id, fecha_nacimiento: fechaParto, fecha_ingreso: fechaParto, establecimiento_id: campoId }]);
      if (err) { setLoading(false); return alert("Error: " + err.message); }
      nuevoEstado = 'VACÍA'; if (animalSel.categoria === 'Vaquillona') await supabase.from('animales').update({ categoria: 'Vaca' }).eq('id', animalSel.id);
      resultadoFinal = `Nació ${nuevoTerneroCaravana} (${nuevoTerneroSexo})`; datosExtra = { ternero_caravana: nuevoTerneroCaravana, ternero_sexo: nuevoTerneroSexo }; setHijos(prev => [...prev, nuevoTerneroCaravana]);
    }
    else if (tipoEventoInput === 'ENFERMEDAD') { if (!nuevasCondiciones.includes('ENFERMA')) nuevasCondiciones.push('ENFERMA'); }
    else if (tipoEventoInput === 'LESION') { if (!nuevasCondiciones.includes('LASTIMADA')) nuevasCondiciones.push('LASTIMADA'); }
    else if (tipoEventoInput === 'CURACION') { nuevasCondiciones = []; }
    else if (tipoEventoInput === 'CAPADO') { esCastrado = true; resultadoFinal = 'Realizado'; }
    else if (tipoEventoInput === 'SERVICIO') { resultadoFinal = tipoServicio || ''; if (tipoServicio === 'TORO') datosExtra = { toro_caravana: toroCaravana }; }

    const { error } = await supabase.from('eventos').insert([{ animal_id: animalSel.id, fecha_evento: fechaEvento.toISOString(), tipo: tipoEventoInput, resultado: resultadoFinal, detalle: detalleInput, datos_extra: datosExtra, establecimiento_id: campoId }]);
    const stringCondicion = nuevasCondiciones.length > 0 ? nuevasCondiciones.join(', ') : 'SANA';
    const updates: any = { condicion: stringCondicion, castrado: esCastrado }; if (nuevoEstado) updates.estado = nuevoEstado;
    await supabase.from('animales').update(updates).eq('id', animalSel.id);
    setAnimalSel(prev => prev ? { ...prev, estado: nuevoEstado || prev.estado, condicion: stringCondicion, castrado: esCastrado, categoria: (prev.categoria === 'Vaquillona' && nuevoEstado === 'VACÍA') ? 'Vaca' : prev.categoria } : null);
    setEditCondicion(nuevasCondiciones); setEditCastrado(esCastrado); if(nuevoEstado) setEditEstado(nuevoEstado); setLoading(false);
    if (!error) {
      const { data } = await supabase.from('eventos').select('*').eq('animal_id', animalSel.id).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false });
      if (data) setEventosFicha(data); if (tipoEventoInput === 'PESAJE') setUltimoPeso(resultadoFinal); setResultadoInput(''); setDetalleInput(''); setToroCaravana(''); setNuevoTerneroCaravana(''); fetchAnimales(); 
    }
  }

  async function actualizarAnimal() {
    if (!animalSel) return;
    const condStr = editCondicion.length > 0 ? editCondicion.join(', ') : 'SANA';
    await supabase.from('animales').update({ caravana: editCaravana, categoria: editCategoria, sexo: editSexo, estado: editEstado, condicion: condStr, castrado: editCastrado, fecha_nacimiento: editFechaNac || null, fecha_ingreso: editFechaIngreso || null }).eq('id', animalSel.id);
    setAnimalSel({ ...animalSel, caravana: editCaravana, categoria: editCategoria!, sexo: editSexo!, estado: editEstado!, condicion: condStr, castrado: editCastrado });
    alert("Datos actualizados"); fetchAnimales();
  }

  async function borrarAnimalDefinitivo() {
    if (!animalSel || !campoId) return;
    if (!confirm("⚠️ ¿BORRAR DEFINITIVAMENTE?\n\nEsta acción quitará al animal de todas las listas. Quedará solo en registros de auditoría.")) return;
    await supabase.from('animales').update({ estado: 'ELIMINADO' }).eq('id', animalSel.id);
    await supabase.from('eventos').insert({ animal_id: animalSel.id, fecha_evento: new Date().toISOString(), tipo: 'BORRADO', resultado: 'ELIMINADO DEL SISTEMA', detalle: 'Borrado manual por seguridad', establecimiento_id: campoId });
    closeModalVaca(); fetchAnimales();
  }

  async function confirmarBaja() { if (!animalSel || !modoBaja || !campoId) return; if (modoBaja === 'VENDIDO' && !bajaPrecio) return alert("Ingresá el precio"); if (modoBaja === 'MUERTO' && !bajaMotivo) return alert("Ingresá la causa"); if (!confirm("¿Confirmar salida?")) return; const resumen = modoBaja === 'VENDIDO' ? `$${bajaPrecio}` : bajaMotivo; await supabase.from('animales').update({ estado: modoBaja, detalle_baja: resumen }).eq('id', animalSel.id); const det = modoBaja === 'VENDIDO' ? `Precio: $${bajaPrecio}/kg - ${bajaMotivo}` : `Causa: ${bajaMotivo}`; await supabase.from('eventos').insert([{ animal_id: animalSel.id, tipo: 'BAJA', resultado: modoBaja, detalle: det, datos_extra: modoBaja === 'VENDIDO' ? { precio_kg: bajaPrecio, destino: bajaMotivo } : { causa: bajaMotivo }, establecimiento_id: campoId }]); closeModalVaca(); fetchAnimales(); }
  async function restaurarAnimal() { if (!animalSel || !confirm("¿Restaurar?")) return; await supabase.from('animales').update({ estado: 'ACTIVO', detalle_baja: null }).eq('id', animalSel.id); await supabase.from('eventos').insert([{ animal_id: animalSel.id, tipo: 'RESTAURACION', resultado: 'Reingreso', detalle: 'Restaurado', establecimiento_id: campoId! }]); closeModalVaca(); fetchAnimales(); }
  
  async function guardarLote() { if (!nombreLote || !campoId) return; setLoading(true); const { error } = await supabase.from('lotes').insert([{ nombre: nombreLote, hectareas: hasLote, estado: 'DESCANSO', establecimiento_id: campoId }]); setLoading(false); if (!error) { setNombreLote(''); fetchLotes(); } }
  async function abrirFichaLote(lote: Lote) { setLoteSel(lote); setLaboresFicha([]); openModalLote(); const { data } = await supabase.from('labores').select('*').eq('lote_id', lote.id).order('fecha', { ascending: false }); if (data) setLaboresFicha(data); }
  async function guardarLabor() { if (!loteSel || !actividadLote || !campoId) return; const { error } = await supabase.from('labores').insert([{ lote_id: loteSel.id, actividad: actividadLote, cultivo: cultivoInput, detalle: detalleLabor, establecimiento_id: campoId }]); if (!error) { if (actividadLote === 'SIEMBRA') { await supabase.from('lotes').update({ estado: 'SEMBRADO', cultivo_actual: cultivoInput }).eq('id', loteSel.id); setLoteSel({...loteSel, estado: 'SEMBRADO', cultivo_actual: cultivoInput}); fetchLotes(); } else if (actividadLote === 'COSECHA') { await supabase.from('lotes').update({ estado: 'DESCANSO', cultivo_actual: null }).eq('id', loteSel.id); setLoteSel({...loteSel, estado: 'DESCANSO', cultivo_actual: ''}); fetchLotes(); } const { data } = await supabase.from('labores').select('*').eq('lote_id', loteSel.id).order('fecha', { ascending: false }); if (data) setLaboresFicha(data); setDetalleLabor(''); } }
  async function borrarLabor(id: string) { if(!confirm("¿Borrar?")) return; await supabase.from('labores').delete().eq('id', id); setLaboresFicha(laboresFicha.filter(l => l.id !== id)); }

  // --- STATS ---
  const stats = {
    total: animales.filter(a => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO').length,
    vacas: animales.filter(a => a.categoria === 'Vaca' && a.estado === 'ACTIVO' || a.estado === 'PREÑADA' || a.estado === 'VACÍA').length,
    prenadas: animales.filter(a => a.estado === 'PREÑADA').length,
    enfermos: animales.filter(a => a.condicion && a.condicion.includes('ENFERMA')).length,
    terneros: animales.filter(a => a.categoria === 'Ternero' && a.estado !== 'VENDIDO' && a.estado !== 'MUERTO').length,
  };
  const prenadaPct = stats.vacas > 0 ? Math.round((stats.prenadas / stats.vacas) * 100) : 0;
  
  const opcionesDisponibles = (() => { if (!animalSel) return []; if (['Vaca', 'Vaquillona'].includes(animalSel.categoria)) return ['PESAJE', 'TACTO', 'SERVICIO', 'PARTO', 'ENFERMEDAD', 'LESION', 'CURACION', 'VACUNACION']; if (animalSel.categoria === 'Ternero') return ['PESAJE', 'VACUNACION', 'CAPADO', 'ENFERMEDAD', 'LESION', 'CURACION']; return ['PESAJE', 'ENFERMEDAD', 'LESION', 'CURACION', 'VACUNACION']; })();
  const esActivo = animalSel?.estado !== 'VENDIDO' && animalSel?.estado !== 'MUERTO' && animalSel?.estado !== 'ELIMINADO';

  return (
    <MantineProvider>
      <AppShell header={{ height: 60 }} navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
        <AppShell.Header><Group h="100%" px="md"><Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" /><IconLeaf color="teal" size={28} /><Title order={3}>Campo Manager</Title></Group></AppShell.Header>
        <AppShell.Navbar p="md">
          {/* SELECTOR DE ESTABLECIMIENTO SIMPLE */}
          <Paper p="xs" bg="gray.1" mb="lg" radius="md"><Text size="xs" fw={700} c="dimmed" mb={4}>ESTABLECIMIENTO</Text><Select data={establecimientos.map(e => ({ value: e.id, label: e.nombre }))} value={campoId} onChange={(val) => setCampoId(val)} allowDeselect={false} leftSection={<IconBuilding size={16}/>} /></Paper>
          
          <NavLink label="Inicio / Resumen" leftSection={<IconHome size={20}/>} active={activeSection === 'inicio'} onClick={() => { setActiveSection('inicio'); toggle(); }} color="indigo" variant="filled" mb="md"/>
          <Text size="xs" fw={500} c="dimmed" mb="sm">GANADERÍA</Text>
          <NavLink label="Hacienda Activa" leftSection={<IconList size={20}/>} active={activeSection === 'hacienda'} onClick={() => { setActiveSection('hacienda'); toggle(); }} color="teal" variant="filled" />
          <NavLink label="Archivo / Bajas" leftSection={<IconArchive size={20}/>} active={activeSection === 'bajas'} onClick={() => { setActiveSection('bajas'); toggle(); }} color="red" variant="light" />
          <Text size="xs" fw={500} c="dimmed" mt="xl" mb="sm">AGRICULTURA</Text>
          <NavLink label="Lotes y Siembra" leftSection={<IconTractor size={20}/>} active={activeSection === 'agricultura'} onClick={() => { setActiveSection('agricultura'); toggle(); }} color="lime" variant="filled" />
          <Text size="xs" fw={500} c="dimmed" mt="xl" mb="sm">REPORTES</Text>
          <NavLink label="Registro Actividad" leftSection={<IconActivity size={20}/>} active={activeSection === 'actividad'} onClick={() => { setActiveSection('actividad'); toggle(); }} color="blue" variant="filled" />
          
          {/* SECCION GESTION CAMPOS (ABAJO DE TODO) */}
          <AppShell.Section style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
             <Button fullWidth variant="subtle" color="gray" leftSection={<IconSettings size={18}/>} onClick={openModalConfig}>Gestionar Campos</Button>
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main bg="gray.0">
          {activeSection === 'inicio' && (
            <>
              <Title order={2} mb="lg">Resumen General</Title>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
                <Card shadow="sm" radius="md" p="md" withBorder><Group><ThemeIcon size="xl" radius="md" color="blue"><IconList/></ThemeIcon><div><Text size="xs" c="dimmed" fw={700}>TOTAL HACIENDA</Text><Text fw={700} size="xl">{stats.total}</Text></div></Group></Card>
                <Card shadow="sm" radius="md" p="md" withBorder><Group><ThemeIcon size="xl" radius="md" color="teal"><IconBabyCarriage/></ThemeIcon><div><Text size="xs" c="dimmed" fw={700}>TERNEROS</Text><Text fw={700} size="xl">{stats.terneros}</Text></div></Group></Card>
                <Card shadow="sm" radius="md" p="md" withBorder><Group><ThemeIcon size="xl" radius="md" color={stats.enfermos > 0 ? 'red' : 'gray'}><IconHeartbeat/></ThemeIcon><div><Text size="xs" c="dimmed" fw={700}>ENFERMOS</Text><Text fw={700} size="xl" c={stats.enfermos > 0 ? 'red' : 'dimmed'}>{stats.enfermos}</Text></div></Group></Card>
                <Card shadow="sm" radius="md" p="md" withBorder><Group><RingProgress size={60} thickness={6} sections={[{ value: prenadaPct, color: 'teal' }]} label={<Center><Text size="xs" fw={700}>{prenadaPct}%</Text></Center>} /><div><Text size="xs" c="dimmed" fw={700}>PREÑEZ (VACAS)</Text><Text fw={700} size="xl" c="teal">{stats.prenadas} / {stats.vacas}</Text></div></Group></Card>
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, md: 2 }}>
                 <Card shadow="sm" radius="md" withBorder>
                    <Text fw={700} mb="md">Últimos Movimientos</Text>
                    <Stack gap="xs">{eventosGlobales.slice(0, 5).map(ev => (<Paper key={ev.id} p="xs" withBorder bg="gray.0"><Group justify="space-between"><Group gap="xs"><Badge size="sm" variant="dot" color="blue">{ev.tipo}</Badge><Text size="sm" fw={500}>Animal: {ev.animales?.caravana}</Text></Group><Text size="xs" c="dimmed">{new Date(ev.fecha_evento).toLocaleDateString()}</Text></Group><Text size="xs" c="dimmed" mt={4}>{ev.resultado} {ev.detalle ? `- ${ev.detalle}` : ''}</Text></Paper>))}</Stack>
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
                                { value: (stats.terneros / stats.total) * 100, color: 'teal', tooltip: 'Terneros', onMouseEnter: () => setChartHover({label: 'TERNEROS', value: stats.terneros}), onMouseLeave: () => setChartHover(null) },
                                { value: ((stats.total - stats.vacas - stats.terneros) / stats.total) * 100, color: 'gray', tooltip: 'Toros/Engorde', onMouseEnter: () => setChartHover({label: 'TOROS / ENGORDE', value: stats.total - stats.vacas - stats.terneros}), onMouseLeave: () => setChartHover(null) }
                            ]}
                        />
                    </Group>
                    <Group justify="center" gap="xl" mt="md"><Group gap={4}><Badge size="xs" circle color="blue"/><Text size="xs">Vacas</Text></Group><Group gap={4}><Badge size="xs" circle color="teal"/><Text size="xs">Terneros</Text></Group><Group gap={4}><Badge size="xs" circle color="gray"/><Text size="xs">Toros/Engorde</Text></Group></Group>
                 </Card>
              </SimpleGrid>
            </>
          )}

          {(activeSection === 'hacienda' || activeSection === 'bajas') && (
            <>
              <Group justify="space-between" mb="lg"><Title order={3}>{activeSection === 'hacienda' ? 'Hacienda' : 'Archivo Bajas'}</Title><Badge size="xl" circle>{animalesFiltrados.length}</Badge></Group>
              <TextInput leftSection={<IconSearch size={16}/>} placeholder="Buscar por Caravana..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} mb="md" />
              {activeSection === 'hacienda' && ( <Paper p="md" mb="lg" radius="md" withBorder><Text fw={700} mb="xs" size="sm" c="dimmed">ALTA RÁPIDA</Text><Group align="flex-end" grow><TextInput label="Caravana" value={caravana} onChange={(e) => setCaravana(e.target.value)} /><Select label="Cat" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={categoria} onChange={setCategoria} /><Select label="Sexo" data={['H', 'M']} value={sexo} onChange={setSexo} w={80} disabled={sexoBloqueado} /><Button onClick={guardarAnimal} loading={loading} color="teal">Guardar</Button></Group></Paper> )}
              <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
                <Table striped highlightOnHover>
                  <Table.Thead bg="gray.1"><Table.Tr><Th sorted={sortBy === 'caravana'} reversed={reverseSortDirection} onSort={() => setSorting('caravana')}>Caravana</Th><Th sorted={sortBy === 'categoria'} reversed={reverseSortDirection} onSort={() => setSorting('categoria')}>Categoría</Th><Th sorted={sortBy === 'estado'} reversed={reverseSortDirection} onSort={() => setSorting('estado')}>Estado / Condición</Th>{activeSection === 'bajas' && <Table.Th>Detalle</Table.Th>}</Table.Tr></Table.Thead>
                  <Table.Tbody>{animalesFiltrados.map((vaca) => (<Table.Tr key={vaca.id} onClick={() => abrirFichaVaca(vaca)} style={{ cursor: 'pointer' }}><Table.Td><Text fw={700}>{vaca.caravana}</Text></Table.Td><Table.Td>{vaca.categoria}</Table.Td><Table.Td>{activeSection === 'bajas' ? (<Badge color={vaca.estado === 'VENDIDO' ? 'green' : 'red'}>{vaca.estado}</Badge>) : (<Group gap="xs"><Badge color={getEstadoColor(vaca.estado)}>{vaca.estado}</Badge>{renderCondicionBadges(vaca.condicion)}{vaca.castrado && <Badge color="cyan" variant="outline">CAPADO</Badge>}</Group>)}</Table.Td>{activeSection === 'bajas' && ( <Table.Td>{vaca.detalle_baja ? <Text size="sm" fw={500}>{vaca.detalle_baja}</Text> : <Text size="xs" c="dimmed">-</Text>}</Table.Td> )}</Table.Tr>))}</Table.Tbody>
                </Table>
              </Paper>
            </>
          )}

          {activeSection === 'agricultura' && ( <> <Title order={3} mb="lg">Lotes y Parcelas</Title><Paper p="md" mb="lg" radius="md" withBorder><Text fw={700} mb="xs" size="sm" c="dimmed">NUEVO LOTE</Text><Group align="flex-end"><TextInput label="Nombre del Lote" placeholder="Ej: Lote del Fondo" value={nombreLote} onChange={(e) => setNombreLote(e.target.value)} style={{ flex: 1 }} /><TextInput label="Hectáreas" type="number" value={hasLote} onChange={(e) => setHasLote(Number(e.target.value))} w={120} /><Button onClick={guardarLote} loading={loading} color="lime">Crear</Button></Group></Paper><SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>{lotes.map(lote => (<Card key={lote.id} shadow="sm" padding="lg" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => abrirFichaLote(lote)}><Group justify="space-between" mb="xs"><Text fw={700}>{lote.nombre}</Text><Badge color={lote.estado === 'SEMBRADO' ? 'lime' : 'gray'}>{lote.estado}</Badge></Group><Group mb="md"><Badge variant="outline" color="gray">{lote.hectareas} Has</Badge>{lote.cultivo_actual && <Badge variant="dot" color="lime">{lote.cultivo_actual}</Badge>}</Group><Button variant="light" color="lime" fullWidth mt="md" radius="md">Ver Historial</Button></Card>))}</SimpleGrid>{lotes.length === 0 && <Text c="dimmed" ta="center" mt="xl">No hay lotes cargados.</Text>} </> )}
          {activeSection === 'actividad' && ( <> <Group mb="md"><TextInput style={{flex: 2}} leftSection={<IconSearch size={16}/>} placeholder="Buscar por Caravana..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /><Select style={{flex: 1}} placeholder="Filtrar Actividad" data={['PESAJE', 'TACTO', 'SERVICIO', 'PARTO', 'BAJA', 'VACUNACION', 'ENFERMEDAD', 'CURACION', 'CAPADO']} value={filtroTipoEvento} onChange={setFiltroTipoEvento} clearable /></Group><Paper radius="md" withBorder><Table><Table.Thead><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Ref</Table.Th><Table.Th>Evento</Table.Th><Table.Th>Detalle</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{eventosFiltrados.map(ev => (<Table.Tr key={ev.id}><Table.Td><Text size="sm" c="dimmed">{new Date(ev.fecha_evento).toLocaleDateString()}</Text></Table.Td><Table.Td><Text fw={700}>{ev.animales?.caravana || '-'}</Text></Table.Td><Table.Td><Badge variant="outline" size="sm">{ev.tipo}</Badge></Table.Td><Table.Td><Text size="sm" fw={500}>{ev.resultado}</Text>{ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}{ev.datos_extra && ev.datos_extra.toro_caravana && (<Text size="xs" c="dimmed">Toro: {ev.datos_extra.toro_caravana}</Text>)}</Table.Td></Table.Tr>))}</Table.Tbody></Table></Paper> </> )}
        </AppShell.Main>
      </AppShell> 

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

      {/* MODALES FICHA Y LOTE (Igual que antes) */}
      <Modal opened={modalVacaOpen} onClose={closeModalVaca} title={<Text fw={700} size="lg">Ficha: {animalSel?.caravana} {esActivo ? '' : '(ARCHIVO)'}</Text>} size="lg" centered zIndex={2000}>
         <Tabs defaultValue="historia" color="teal">
           <Tabs.List grow mb="md"><Tabs.Tab value="historia">Historia</Tabs.Tab><Tabs.Tab value="datos">Datos</Tabs.Tab></Tabs.List>
           <Tabs.Panel value="historia">
              {esActivo ? (
                <Paper withBorder p="sm" bg="gray.0" mb="md"><Text size="sm" fw={700} mb="xs">Registrar Evento</Text><Group grow mb="sm"><TextInput leftSection={<IconCalendar size={16}/>} placeholder="Fecha" type="date" value={fechaEvento ? fechaEvento.toISOString().split('T')[0] : ''} onChange={(e) => setFechaEvento(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} max={new Date().toISOString().split('T')[0]} style={{ flex: 1 }} /><Select data={opcionesDisponibles} placeholder="Tipo" value={tipoEventoInput} onChange={setTipoEventoInput} comboboxProps={{ zIndex: 200005 }} /></Group>{tipoEventoInput === 'TACTO' && ( <Select label="Resultado del Tacto" data={['PREÑADA', 'VACÍA']} value={tactoResultado} onChange={setTactoResultado} mb="sm" comboboxProps={{ zIndex: 200005 }}/> )}{tipoEventoInput === 'SERVICIO' && ( <Group grow mb="sm" align="flex-end"><Select label="Tipo de Servicio" data={['TORO', 'IA']} value={tipoServicio} onChange={setTipoServicio} comboboxProps={{ zIndex: 200005 }}/ >{tipoServicio === 'TORO' && ( <TextInput label="Caravana del Toro" placeholder="Ej: T-101" value={toroCaravana} onChange={(e) => setToroCaravana(e.target.value)} /> )}</Group> )}{tipoEventoInput === 'PARTO' && ( <Paper withBorder p="xs" bg="teal.0" mb="sm"><Text size="sm" fw={700} c="teal">Datos del Nuevo Ternero</Text><Group grow><TextInput label="Caravana Ternero" placeholder="Nueva ID" value={nuevoTerneroCaravana} onChange={(e) => setNuevoTerneroCaravana(e.target.value)} required/><Select label="Sexo" data={['M', 'H']} value={nuevoTerneroSexo} onChange={setNuevoTerneroSexo} comboboxProps={{ zIndex: 200005 }}/></Group></Paper> )}{!['TACTO', 'SERVICIO', 'PARTO', 'ENFERMEDAD', 'LESION', 'CURACION', 'CAPADO'].includes(tipoEventoInput || '') && ( <Group grow mb="sm"><TextInput placeholder="Resultado (Ej: 350kg)" value={resultadoInput} onChange={(e) => setResultadoInput(e.target.value)} /></Group> )}<Group grow align="flex-start"><Textarea placeholder="Detalles / Observaciones..." rows={2} value={detalleInput} onChange={(e) => setDetalleInput(e.target.value)} style={{flex: 1}}/><Button size="md" onClick={guardarEventoVaca} color="teal" loading={loading} style={{ maxWidth: 120 }}>Guardar</Button></Group></Paper>
              ) : ( <Alert color="gray" icon={<IconArchive size={16}/>} mb="md">Este animal está archivado. Solo lectura.</Alert> )}
              <ScrollArea h={300}><Table striped><Table.Tbody>{eventosFicha.map(ev => (<Table.Tr key={ev.id}><Table.Td><Text size="xs">{new Date(ev.fecha_evento).toLocaleDateString()}</Text></Table.Td><Table.Td><Text fw={700} size="sm">{ev.tipo}</Text></Table.Td><Table.Td><Text size="sm" fw={500}>{ev.resultado}</Text>{ev.detalle && <Text size="xs" c="dimmed">{ev.detalle}</Text>}{ev.datos_extra && ev.datos_extra.precio_kg && <Badge size="xs" color="green" variant="outline" ml="xs">${ev.datos_extra.precio_kg}</Badge>}</Table.Td></Table.Tr>))}</Table.Tbody></Table></ScrollArea>
           </Tabs.Panel>
           <Tabs.Panel value="datos">
              <Paper withBorder p="sm" bg="gray.1" mb="md" radius="md"><Group justify="space-between"><Text size="sm" fw={700} c="dimmed">ÚLTIMO PESO:</Text><Badge size="lg" variant="filled" color="gray" leftSection={<IconScale size={14}/>}>{ultimoPeso}</Badge></Group></Paper>
              <TextInput label="Caravana" value={editCaravana} onChange={(e) => setEditCaravana(e.target.value)} mb="sm" disabled={!esActivo} />
              <Group grow mb="sm"><Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={editCategoria} onChange={setEditCategoria} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} />{['Vaca', 'Vaquillona'].includes(editCategoria || '') && ( <Select label="Reproductivo" data={['ACTIVO', 'PREÑADA', 'VACÍA']} value={editEstado} onChange={setEditEstado} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} /> )}</Group>
              {['Ternero', 'Novillo'].includes(editCategoria || '') && ( <TextInput label="Caravana Madre" value={madreCaravana} readOnly mb="sm" rightSection={<IconBabyCarriage size={16}/>} /> )}
              {['Vaca'].includes(editCategoria || '') && ( <Paper withBorder p="xs" mb="sm" bg="teal.0"><Text size="xs" fw={700} c="teal">HIJOS REGISTRADOS:</Text>{hijos.length > 0 ? ( <Group gap="xs" mt={5}>{hijos.map(h => <Badge key={h} variant="white">{h}</Badge>)}</Group> ) : <Text size="xs" c="dimmed">Sin registros</Text>}</Paper> )}
              <MultiSelect label="Condición Sanitaria" data={['ENFERMA', 'LASTIMADA']} value={editCondicion} onChange={setEditCondicion} comboboxProps={{ zIndex: 200005 }} disabled={!esActivo} leftSection={<IconHeartbeat size={16}/>} mb="sm" placeholder="SANA"/>
              {editCategoria === 'Ternero' && ( <Group justify="space-between" mb="sm" p="xs" bg="gray.0" style={{borderRadius: 8}}><Group gap="xs"><IconScissors size={18}/> <Text size="sm" fw={500}>Condición Sexual</Text></Group><Switch size="lg" onLabel="CAPADO" offLabel="ENTERO" checked={editCastrado} onChange={(e) => setEditCastrado(e.currentTarget.checked)} disabled={!esActivo} /></Group> )}
              <Group grow mb="xl"><TextInput label="Fecha Nacimiento" type="date" value={editFechaNac} onChange={(e) => setEditFechaNac(e.target.value)} disabled={!esActivo} /><TextInput label="Fecha Ingreso" type="date" value={editFechaIngreso} onChange={(e) => setEditFechaIngreso(e.target.value)} disabled={!esActivo} /></Group>
              {esActivo ? ( <>{!modoBaja ? ( <><Button fullWidth variant="outline" leftSection={<IconCheck size={16}/>} onClick={actualizarAnimal} mb="xl">Guardar Cambios</Button><Text size="sm" fw={700} c="red.6" mb="xs">Zona de Baja</Text><Group grow><Button color="orange" onClick={() => setModoBaja('VENDIDO')} leftSection={<IconCurrencyDollar size={16}/>}>Vendido</Button><Button color="red" onClick={() => setModoBaja('MUERTO')} leftSection={<IconSkull size={16}/>}>Muerto</Button></Group><Button fullWidth variant="subtle" color="gray" mt="xs" leftSection={<IconTrash size={16}/>} onClick={borrarAnimalDefinitivo}>Borrar definitivamente</Button></> ) : ( <Paper withBorder p="sm" bg={modoBaja === 'VENDIDO' ? 'orange.0' : 'red.0'}><Group justify="space-between" mb="sm"><Text fw={700} c={modoBaja === 'VENDIDO' ? 'orange.9' : 'red.9'}>CONFIRMAR: {modoBaja}</Text><ActionIcon variant="subtle" color="gray" onClick={() => setModoBaja(null)}><IconArrowBackUp size={16}/></ActionIcon></Group>{modoBaja === 'VENDIDO' && ( <Group grow mb="sm"><TextInput label="Precio" placeholder="Ej: 2200" value={bajaPrecio} onChange={(e) => setBajaPrecio(e.target.value)}/><TextInput label="Destino" placeholder="Ej: Frigorifico" value={bajaMotivo} onChange={(e) => setBajaMotivo(e.target.value)}/></Group> )}{modoBaja === 'MUERTO' && ( <TextInput label="Causa" placeholder="Ej: Accidente" value={bajaMotivo} onChange={(e) => setBajaMotivo(e.target.value)} mb="sm"/> )}<Button fullWidth color={modoBaja === 'VENDIDO' ? 'orange' : 'red'} onClick={confirmarBaja}>Confirmar Salida</Button></Paper> )}</> ) : ( <Paper p="md" bg="gray.1" ta="center"><Text c="dimmed" size="sm" mb="md">Este animal se encuentra dado de baja.</Text><Button fullWidth variant="outline" color="blue" leftSection={<IconArrowBackUp/>} onClick={restaurarAnimal}>Restaurar a Hacienda Activa</Button></Paper> )}
           </Tabs.Panel>
         </Tabs>
      </Modal>
      <Modal opened={modalLoteOpen} onClose={closeModalLote} title={<Text fw={700} size="lg">Lote: {loteSel?.nombre}</Text>} size="lg" centered zIndex={2000}>
         <Tabs defaultValue="labores" color="lime"><Tabs.List grow mb="md"><Tabs.Tab value="labores">Labores</Tabs.Tab></Tabs.List><Tabs.Panel value="labores"><Paper withBorder p="sm" bg="lime.0" mb="md"><Text size="sm" fw={700} mb="xs">Nueva Labor</Text><Group grow mb="sm"><Select data={['SIEMBRA', 'FUMIGADA', 'COSECHA', 'FERTILIZACION']} value={actividadLote} onChange={setActividadLote} comboboxProps={{ zIndex: 200005 }}/><TextInput placeholder="Cultivo" value={cultivoInput} onChange={(e) => setCultivoInput(e.target.value)} disabled={!['SIEMBRA', 'COSECHA'].includes(actividadLote || '')} /></Group><Textarea placeholder="Detalle..." value={detalleLabor} onChange={(e) => setDetalleLabor(e.target.value)} mb="sm" rows={2}/><Button fullWidth size="xs" onClick={guardarLabor} color="lime" variant="filled">Registrar</Button></Paper><ScrollArea h={300}>{laboresFicha.length === 0 ? <Text c="dimmed" size="sm">Sin labores registradas.</Text> : (<Table striped><Table.Tbody>{laboresFicha.map(labor => (<Table.Tr key={labor.id}><Table.Td><Text size="xs" c="dimmed">{new Date(labor.fecha).toLocaleDateString()}</Text></Table.Td><Table.Td><Text fw={700} size="sm">{labor.actividad}</Text>{labor.cultivo && <Badge size="xs" color="lime">{labor.cultivo}</Badge>}</Table.Td><Table.Td><Text size="sm">{labor.detalle}</Text></Table.Td><Table.Td align="right"><ActionIcon color="red" variant="subtle" size="sm" onClick={() => borrarLabor(labor.id)}><IconTrash size={14}/></ActionIcon></Table.Td></Table.Tr>))}</Table.Tbody></Table>)}</ScrollArea></Tabs.Panel></Tabs>
      </Modal>
    </MantineProvider>
  );
}