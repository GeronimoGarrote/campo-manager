import { useEffect, useState} from 'react';
import {MantineProvider, AppShell, Burger, Group, Title, NavLink, Text, TextInput, Select, Button, Badge, Textarea, ActionIcon, ScrollArea, Modal, Alert, Stack, Indicator, Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArchive, IconActivity, IconTrash, IconTractor, IconCurrencyDollar, IconBuilding, IconHome, IconSettings, IconEdit, IconPlus, IconPlaylistAdd, IconLogout, IconTag, IconCalendarEvent, IconBell, IconCreditCard} from '@tabler/icons-react';
import '@mantine/core/styles.css';
import { supabase } from './supabase';
import { type Session } from '@supabase/supabase-js';
import logoRodeo from './assets/logo.png'; 

// Vistas
import Login from './views/Login';
import Inicio from './views/Inicio';
import Economia from './views/Economia';
import Masivos from './views/Masivos';
import Agenda from './views/Agenda';
import Lotes from './views/Lotes';
import Agricultura from './views/Agricultura';
import Hacienda from './views/Hacienda';
import Actividad from './views/Actividad';
import Suscripcion from './views/Suscripcion'; 

// Modales Refactorizados
import ModalAltaAnimal from './components/ModalAltaAnimal';
import ModalFichaVaca from './components/ModalFichaVaca';
import ModalTransferencia from './components/ModalTransferencia';
import ModalGraficoPeso from './components/ModalGraficoPeso';

interface Establecimiento { id: string; nombre: string; renspa?: string; }
interface Animal { id: string; caravana: string; categoria: string; sexo: string; estado: string; condicion: string; origen: string; detalle_baja?: string; detalles?: string; destacado?: boolean; fecha_nacimiento?: string; fecha_ingreso?: string; madre_id?: string; castrado?: boolean; establecimiento_id: string; potrero_id?: string; parcela_id?: string; lote_id?: string; toros_servicio_ids?: string[]; en_transito?: boolean; }
interface Evento { id: string; fecha_evento: string; tipo: string; resultado: string; detalle: string; animal_id: string; costo?: number; datos_extra?: any; animales?: { caravana: string } }

const getHoyIso = () => { const d = new Date(); const offset = d.getTimezoneOffset(); return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]; };
const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [opened, { toggle }] = useDisclosure(); 
  const [activeSection, setActiveSection] = useState('inicio'); 
  const [bellOpened, setBellOpened] = useState(false);
  
  // Datos Globales
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [campoId, setCampoId] = useState<string | null>(null);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [potreros, setPotreros] = useState<any[]>([]);
  const [parcelas, setParcelas] = useState<any[]>([]); 
  const [lotes, setLotes] = useState<any[]>([]);
  const [eventosGlobales, setEventosGlobales] = useState<Evento[]>([]);
  const [eventosLotesGlobal, setEventosLotesGlobal] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [transferencias, setTransferencias] = useState<any[]>([]);

  // Controladores de Modales Extraídos
  const [modalAltaOpen, { open: openModalAlta, close: closeModalAlta }] = useDisclosure(false);
  
  const [modalVacaOpen, { open: openModalVaca, close: closeModalVaca }] = useDisclosure(false);
  const [animalSelId, setAnimalSelId] = useState<string | null>(null);
  
  const [modalTransfOpen, { open: openModalTransf, close: closeModalTransf }] = useDisclosure(false);
  const [transfActiva, setTransfActiva] = useState<any>(null);
  
  const [modalGraficoOpen, { open: openModalGrafico, close: closeModalGrafico }] = useDisclosure(false);
  const [graficoAnimalId, setGraficoAnimalId] = useState<string | null>(null);

  // Modales Internos (Configuración y Edición rápida de eventos)
  const [modalConfigOpen, { open: openModalConfig, close: closeModalConfig }] = useDisclosure(false); 
  const [nuevoCampoNombre, setNuevoCampoNombre] = useState('');
  const [nuevoCampoRenspa, setNuevoCampoRenspa] = useState('');
  
  const [modalEditEventOpen, { open: openModalEditEvent, close: closeModalEditEvent }] = useDisclosure(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventDate, setEditingEventDate] = useState<Date | null>(new Date());
  const [editingEventRes, setEditingEventRes] = useState('');
  const [editingEventDet, setEditingEventDet] = useState('');

  // Estado de la suscripción agregado
  const [datosSuscripcion, setDatosSuscripcion] = useState<any>(null);

  // --- LÓGICA DE BLOQUEO (SOFT LOCK) ---
  const estaVencido = datosSuscripcion?.fecha_vencimiento 
      ? new Date(datosSuscripcion.fecha_vencimiento + 'T23:59:59') < new Date() 
      : false;

  useEffect(() => {
      // Si está vencido y trata de ir a otra sección, lo forzamos a la pantalla de pago
      if (estaVencido && activeSection !== 'suscripcion') {
          setActiveSection('suscripcion');
      }
  }, [estaVencido, activeSection]);
  // -------------------------------------

  // Sincronización Inicial
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) loadCampos(); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) loadCampos(); else { setEstablecimientos([]); setCampoId(null); } });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!campoId || !session) return;
    localStorage.setItem('campoId', campoId); 
    fetchSuscripcion();
    fetchAnimales(); fetchPotreros(); fetchParcelas(); fetchLotes(); fetchEventosLotesGlobal(); fetchAgenda(); fetchTransferencias();
    if (activeSection === 'inicio' || activeSection === 'actividad') fetchActividadGlobal();
  }, [activeSection, campoId, session]); 

  // Funciones de Autenticación
  async function handleLogin() { setAuthLoading(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); setAuthLoading(false); if (error) alert("Error: " + error.message); }
  async function handleLogout() { await supabase.auth.signOut(); setSession(null); }

  // Funciones de Fetch de Datos
  async function loadCampos() { const { data } = await supabase.from('establecimientos').select('*').order('created_at'); if (data && data.length > 0) { setEstablecimientos(data); const guardado = localStorage.getItem('campoId'); if (guardado && data.find(c => c.id === guardado)) setCampoId(guardado); else if (!campoId) setCampoId(data[0].id); } }
  
  async function fetchSuscripcion() {
      // 1. Verificamos que haya alguien logueado
      if (!session?.user.id) return;

      // 2. Buscamos el plan usando el ID del usuario
      const { data } = await supabase
          .from('suscripciones')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

      if (data) {
          // --- SANITIZACIÓN ANTI-NaN ---
          // Forzamos a que siempre sean números válidos antes de mandarlos a los hijos
          const dataLimpia = {
              ...data,
              limite_animales: Number(data.limite_animales) || 100,
              limite_establecimientos: Number(data.limite_establecimientos) || 1
          };
          setDatosSuscripcion(dataLimpia);
      } else {
          // Default si aún no tiene registro en la tabla
          setDatosSuscripcion({ 
              plan_nombre: 'BASICO', 
              limite_animales: 100, // Lo bajo a 100 por defecto como el plan básico real
              limite_establecimientos: 1, 
              estado: 'ACTIVO' 
          });
      }
  }
  
  async function fetchAnimales() { if (!campoId) return; const { data } = await supabase.from('animales').select('*').eq('establecimiento_id', campoId).neq('estado', 'ELIMINADO').order('created_at', { ascending: false }); setAnimales(data || []); }
  async function fetchPotreros() { if (!campoId) return; const { data } = await supabase.from('potreros').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setPotreros(data || []); }
  async function fetchParcelas() { if (!campoId) return; const { data } = await supabase.from('parcelas').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setParcelas(data || []); }
  async function fetchLotes() { if (!campoId) return; const { data } = await supabase.from('lotes').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); setLotes(data || []); }
  
  async function fetchActividadGlobal() { 
      if (!campoId) return; 
      const { data } = await supabase.from('eventos').select('*, animales(caravana)').eq('establecimiento_id', campoId).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false }); 
      
      let eventos = data || [];
      const perdidos = eventos.filter((e: any) => !e.animales).map((e: any) => e.animal_id);
      
      if (perdidos.length > 0) {
          const { data: nombres } = await supabase.rpc('obtener_caravanas_perdidas', { ids: perdidos });
          eventos = eventos.map((ev: any) => {
              if (!ev.animales) {
                  const match = nombres?.find((n: any) => n.id === ev.animal_id);
                  const caravanaFija = ev.datos_extra?.caravana_origen || (match ? match.caravana : 'Baja');
                  return { ...ev, animales: { caravana: caravanaFija } };
              }
              return ev;
          });
      }
      setEventosGlobales(eventos as any); 
  }

  async function fetchEventosLotesGlobal() { if (!campoId) return; const { data } = await supabase.from('lotes_eventos').select('*').eq('establecimiento_id', campoId).order('fecha', { ascending: false }); setEventosLotesGlobal(data || []); }
  async function fetchAgenda() { if(!campoId) return; const { data } = await supabase.from('agenda').select('*').eq('establecimiento_id', campoId).order('fecha_programada', { ascending: true }); if (data) setAgenda(data); }
  async function fetchTransferencias() { if (!campoId) return; const { data: transData } = await supabase.from('transferencias').select('*').eq('campo_destino_id', campoId).eq('estado', 'PENDIENTE'); setTransferencias(transData || []); }

  // Gestión de Establecimientos con Candado de Suscripción
  async function crearCampo() { 
      if (!nuevoCampoNombre) return; 
      
      if (datosSuscripcion && establecimientos.length >= datosSuscripcion.limite_establecimientos) {
          alert(`Límite alcanzado. Tu plan actual solo permite ${datosSuscripcion.limite_establecimientos} establecimiento(s). Por favor, mejorá tu plan para agregar más.`);
          return;
      }

      const { error } = await supabase.from('establecimientos').insert([{ nombre: nuevoCampoNombre, renspa: nuevoCampoRenspa, user_id: session?.user.id }]); 
      if (error) alert("Error: " + error.message); 
      else { setNuevoCampoNombre(''); setNuevoCampoRenspa(''); loadCampos(); } 
  }
  
  // --- FUNCIÓN BORRAR CAMPO MEJORADA ---
  async function borrarCampo(id: string) { 
      const confirmacion = prompt("⚠️ PELIGRO EXTREMO ⚠️\nEstás por borrar este campo y TODAS sus vacas, eventos, caja y potreros para siempre. Esta acción NO se puede deshacer.\n\nEscribí la palabra ELIMINAR en mayúsculas para confirmar:");
      
      if (confirmacion !== "ELIMINAR") {
          if (confirmacion !== null) alert("Acción cancelada. La palabra de seguridad no coincide.");
          return;
      }

      const { error } = await supabase.from('establecimientos').delete().eq('id', id); 
      
      if (error) {
          console.error("Falla en Supabase:", error);
          alert("Error real: " + error.message + "\nDetalles: " + error.details); 
      } else { 
          alert("Establecimiento y todos sus datos eliminados correctamente.");
          if (id === campoId) { 
              const restantes = establecimientos.filter(e => e.id !== id); 
              if (restantes.length > 0) setCampoId(restantes[0].id); 
              else window.location.reload(); 
          } 
          loadCampos(); 
      } 
  }

  async function editarCampo(id: string, nombreActual: string, renspaActual?: string) { const nuevoNombre = prompt("Nuevo nombre del establecimiento:", nombreActual); if (nuevoNombre === null) return; const nuevoRenspa = prompt("Número de RENSPA:", renspaActual || ''); if (nuevoRenspa === null) return; await supabase.from('establecimientos').update({ nombre: nuevoNombre, renspa: nuevoRenspa }).eq('id', id); loadCampos(); }

  // Handlers para abrir modales específicos
  const abrirFichaVaca = (animal: Animal) => {
    setAnimalSelId(animal.id);
    openModalVaca();
  };

  const abrirModalTransferencia = (transf: any) => {
    setTransfActiva(transf);
    openModalTransf();
    setBellOpened(false);
  };

  const handleAbrirGrafico = (id: string) => {
    setGraficoAnimalId(id);
    openModalGrafico();
  };

  // Edición rápida de Eventos (Desde la ficha)
  function iniciarEdicionEvento(ev: Evento) { setEditingEventId(ev.id); const partes = ev.fecha_evento.split('T')[0].split('-'); setEditingEventDate(new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]), 12, 0, 0)); setEditingEventRes(ev.resultado); setEditingEventDet(ev.detalle || ''); openModalEditEvent(); }
  async function guardarEdicionEvento() { if(!editingEventId || !editingEventDate) return; await supabase.from('eventos').update({ fecha_evento: editingEventDate.toISOString(), resultado: editingEventRes, detalle: editingEventDet }).eq('id', editingEventId); closeModalEditEvent(); fetchActividadGlobal(); } 

  const hoyFormateado = getHoyIso();
  const tareasPendientesUrgentes = agenda.filter(t => !t.completado && t.fecha_programada < hoyFormateado);
  const tareasParaHoy = agenda.filter(t => !t.completado && t.fecha_programada === hoyFormateado);
  const tareasAtrasadas = agenda.filter(t => !t.completado && t.fecha_programada < hoyFormateado);

  return (
    <MantineProvider>
        {!session ? (
            <Login email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleLogin={handleLogin} authLoading={authLoading} />
        ) : (
          <AppShell header={{ height: 60 }} navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
            <AppShell.Header>
              <Group h="100%" px="md" justify="space-between" wrap="nowrap">
                
                {/* GRUPO IZQUIERDO (Logo + Nombre App + Establecimiento) */}
                <Group gap="sm" align="center" style={{ flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    
                    {/* Logo agrandado (pasó a height: 46) */}
                    <img src={logoRodeo} alt="RodeoControl Logo" style={{ height: 56, width: 'auto', flexShrink: 0 }} />
                    
                    {/* Nombre de la app: Oculto en celu para dejar espacio */}
                    <Title order={3} visibleFrom="sm" style={{ flexShrink: 0 }}>RodeoControl</Title>
                    
                    {/* Nombre del Establecimiento: Restaurado al estilo original, pero fluido para mobile */}
                    {campoId && establecimientos.length > 0 && (
                        <Group gap="sm" align="center" style={{ flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
                            <Text size="xl" c="dimmed" visibleFrom="sm" style={{ fontWeight: 300, userSelect: 'none', flexShrink: 0 }}>|</Text>
                            {/* Vuelve a ser un Title order={4} como querías, con truncate para que no rompa */}
                            <Title 
                                order={4} 
                                c="dimmed" 
                                fw={500} 
                                style={{ 
                                    flex: 1, 
                                    whiteSpace: 'nowrap', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis' 
                                }}
                            >
                                {establecimientos.find(e => e.id === campoId)?.nombre || ''}
                            </Title>
                        </Group>
                    )}
                </Group>

                {/* GRUPO DERECHO (Notificaciones) */}
                <Group style={{ flexShrink: 0 }}>
                    {campoId && (
                        <Popover width={300} position="bottom-end" withArrow shadow="md" opened={bellOpened} onChange={setBellOpened}>
                            <Popover.Target>
                                <Indicator disabled={tareasPendientesUrgentes.length === 0 && tareasParaHoy.length === 0 && transferencias.length === 0} color="red" size={15} label={tareasPendientesUrgentes.length + tareasParaHoy.length + transferencias.length} offset={4} zIndex={100}>
                                    <ActionIcon variant="light" color="orange" size="lg" radius="xl" onClick={() => setBellOpened((o) => !o)} disabled={estaVencido}><IconBell size={22} /></ActionIcon>
                                </Indicator>
                            </Popover.Target>
                            <Popover.Dropdown>
                                <Text size="sm" fw={700} mb="xs">Centro de Notificaciones</Text>
                                {transferencias.length > 0 && (
                                    <Alert color="blue" mb="sm" title="¡Hacienda Entrante!" p="xs">
                                        Tenés {transferencias.length} transferencia(s) pendiente(s).
                                        <Button size="xs" mt="xs" fullWidth color="blue" onClick={() => abrirModalTransferencia(transferencias[0])}>Revisar Ingresos</Button>
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
                  {/* Navegación deshabilitada si está vencido */}
                  <NavLink label="Inicio / Resumen" leftSection={<IconHome size={20}/>} active={activeSection === 'inicio'} onClick={() => { setActiveSection('inicio'); toggle(); }} color="indigo" variant="filled" mb="md" style={{ borderRadius: 8 }} disabled={estaVencido}/>
                  <Text size="xs" fw={700} c="dimmed" mb="sm" mt="md">GANADERÍA</Text>
                  <NavLink label="Hacienda Activa" leftSection={<IconPlus size={20}/>} active={activeSection === 'hacienda'} onClick={() => { setActiveSection('hacienda'); toggle(); }} color="teal" variant="filled" style={{ borderRadius: 8 }} disabled={estaVencido}/>
                  <NavLink label="Lotes y Nutrición" leftSection={<IconTag size={20}/>} active={activeSection === 'lotes' || activeSection === 'lote_detalle'} onClick={() => { setActiveSection('lotes'); toggle(); }} color="grape" variant="filled" style={{ borderRadius: 8 }} disabled={estaVencido}/>
                  <NavLink label="Agenda / Tareas" leftSection={<IconCalendarEvent size={20}/>} active={activeSection === 'agenda'} onClick={() => { setActiveSection('agenda'); toggle(); }} color="orange" variant="filled" style={{ borderRadius: 8 }} disabled={estaVencido}/>
                  <NavLink label="Eventos Masivos" leftSection={<IconPlaylistAdd size={20}/>} active={activeSection === 'masivos'} onClick={() => { setActiveSection('masivos'); toggle(); }} color="violet" variant="filled" style={{ borderRadius: 8 }} disabled={estaVencido}/>
                  <NavLink label="Archivo / Bajas" leftSection={<IconArchive size={20}/>} active={activeSection === 'bajas'} onClick={() => { setActiveSection('bajas'); toggle(); }} color="red" variant="light" style={{ borderRadius: 8 }} disabled={estaVencido}/>
                  <Text size="xs" fw={700} c="dimmed" mt="xl" mb="sm">AGRICULTURA</Text>
                  <NavLink label="Potreros y Siembra" leftSection={<IconTractor size={20}/>} active={activeSection === 'agricultura' || activeSection === 'potrero_detalle'} onClick={() => { setActiveSection('agricultura'); toggle(); }} color="lime" variant="filled" style={{ borderRadius: 8 }} disabled={estaVencido}/>
                  <Text size="xs" fw={700} c="dimmed" mt="xl" mb="sm">ADMINISTRACIÓN</Text>
                  <NavLink label="Caja / Economía" leftSection={<IconCurrencyDollar size={20}/>} active={activeSection === 'economia'} onClick={() => { setActiveSection('economia'); toggle(); }} color="green" variant="filled" style={{ borderRadius: 8 }} disabled={estaVencido}/>
                  
                  {/* Este NavLink SIEMPRE queda habilitado para que puedan entrar a pagar */}
                  <NavLink label="Mi Plan" leftSection={<IconCreditCard size={20}/>} active={activeSection === 'suscripcion'} onClick={() => { setActiveSection('suscripcion'); toggle(); }} color="blue" variant="filled" style={{ borderRadius: 8 }} mt="sm" />
                  
                  <Text size="xs" fw={700} c="dimmed" mt="xl" mb="sm">REPORTES</Text>
                  <NavLink label="Registro Actividad" leftSection={<IconActivity size={20}/>} active={activeSection === 'actividad'} onClick={() => { setActiveSection('actividad'); toggle(); }} color="blue" variant="filled" style={{ borderRadius: 8 }} disabled={estaVencido}/>
              </ScrollArea>
              
              <AppShell.Section style={{ borderTop: '1px solid #eee', paddingTop: '1rem', marginTop: '1rem' }}>
                  <Text size="xs" fw={700} c="dimmed" mb="xs" ml={4}>ESTABLECIMIENTO</Text>
                  <Group wrap="nowrap" gap="xs" mb="sm">
                      <Select data={establecimientos.map(e => ({ value: e.id, label: e.nombre }))} value={campoId} onChange={(val) => setCampoId(val)} allowDeselect={false} leftSection={<IconBuilding size={16}/>} variant="filled" style={{ flex: 1 }} comboboxProps={{ zIndex: 1001 }} disabled={estaVencido}/>
                      <ActionIcon variant="light" color="gray" size="lg" onClick={openModalConfig} title="Gestionar Campos" style={{ width: 36, height: 36 }} disabled={estaVencido}><IconSettings size={20}/></ActionIcon>
                  </Group>
                  <Button fullWidth variant="subtle" color="red" leftSection={<IconLogout size={18}/>} onClick={handleLogout}>Cerrar Sesión</Button>
              </AppShell.Section>
            </AppShell.Navbar>

            <AppShell.Main bg="gray.0">
              {activeSection === 'inicio' && <Inicio animales={animales} agenda={agenda} eventosGlobales={eventosGlobales} setActiveSection={setActiveSection} />}
              {activeSection === 'agenda' && <Agenda campoId={campoId} agenda={agenda} fetchAgenda={fetchAgenda} />}
              {(activeSection === 'lotes' || activeSection === 'lote_detalle') && <Lotes campoId={campoId} lotes={lotes} animales={animales} potreros={potreros} parcelas={parcelas} eventosLotesGlobal={eventosLotesGlobal} fetchLotes={fetchLotes} fetchAnimales={fetchEventosLotesGlobal} fetchActividadGlobal={fetchActividadGlobal} abrirFichaVaca={abrirFichaVaca}/>}
              {activeSection === 'masivos' && <Masivos campoId={campoId} animales={animales} potreros={potreros} parcelas={parcelas} lotes={lotes} establecimientos={establecimientos} fetchAnimales={fetchAnimales} fetchActividadGlobal={fetchActividadGlobal} setActiveSection={setActiveSection} />}
              {(activeSection === 'hacienda' || activeSection === 'bajas') && <Hacienda animales={animales} potreros={potreros} parcelas={parcelas} lotes={lotes} activeSection={activeSection} abrirFichaVaca={abrirFichaVaca} openModalAlta={openModalAlta} setAnimales={setAnimales}/>}
              {activeSection === 'economia' && campoId && <Economia campoId={campoId} establecimientos={establecimientos} />}
              {(activeSection === 'agricultura' || activeSection === 'potrero_detalle') && <Agricultura campoId={campoId} potreros={potreros} parcelas={parcelas} animales={animales} fetchPotreros={fetchPotreros} fetchParcelas={fetchParcelas} abrirFichaVaca={abrirFichaVaca} />}
              {activeSection === 'actividad' && <Actividad eventosGlobales={eventosGlobales} />}
              
              {activeSection === 'suscripcion' && (
                  <Suscripcion 
                      animalesTotales={animales.filter(a => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO').length} 
                      establecimientosTotales={establecimientos.length} 
                      datosSuscripcion={datosSuscripcion} 
                  />
              )}
            </AppShell.Main>
          </AppShell>
        )}

      {/* --- MODALES EXTERNOS REFACTORIZADOS --- */}
      <ModalAltaAnimal 
          opened={modalAltaOpen} 
          onClose={closeModalAlta} 
          campoId={campoId} 
          animales={animales} 
          datosSuscripcion={datosSuscripcion}
          onSuccess={() => { fetchAnimales(); fetchAgenda(); fetchActividadGlobal(); }} 
      />

      <ModalTransferencia 
        opened={modalTransfOpen} 
        onClose={closeModalTransf} 
        transfActiva={transfActiva}
        campoId={campoId}
        animales={animales}
        potreros={potreros}
        datosSuscripcion={datosSuscripcion}
        onSuccess={() => { fetchTransferencias(); fetchAnimales(); fetchActividadGlobal(); fetchAgenda(); }}
      />

      <ModalGraficoPeso 
          opened={modalGraficoOpen} 
          onClose={closeModalGrafico} 
          animales={animales} 
          animalIdInicial={graficoAnimalId} 
      />

      <ModalFichaVaca 
          opened={modalVacaOpen} 
          onClose={closeModalVaca} 
          animalSelId={animalSelId}
          setAnimalSelId={setAnimalSelId}
          campoId={campoId} 
          animales={animales} 
          potreros={potreros} 
          parcelas={parcelas} 
          lotes={lotes} 
          establecimientos={establecimientos} 
          onUpdate={() => { fetchAnimales(); fetchActividadGlobal(); fetchAgenda(); }} 
          abrirGraficoPeso={handleAbrirGrafico}
          iniciarEdicionEvento={iniciarEdicionEvento}
          datosSuscripcion={datosSuscripcion}
      />

      {/* --- MODALES INTERNOS --- */}
      <Modal opened={modalEditEventOpen} onClose={closeModalEditEvent} title={<Text fw={700}>Editar Evento</Text>} centered zIndex={3000}>
          <Stack><TextInput label="Fecha" type="date" value={getLocalDateForInput(editingEventDate)} onChange={(e) => setEditingEventDate(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}/><TextInput label="Resultado" value={editingEventRes} onChange={(e) => setEditingEventRes(e.target.value)}/><Textarea label="Detalle" value={editingEventDet} onChange={(e) => setEditingEventDet(e.target.value)}/><Button onClick={guardarEdicionEvento} fullWidth mt="md">Guardar Cambios</Button></Stack>
      </Modal>
      
      <Modal opened={modalConfigOpen} onClose={closeModalConfig} title={<Text fw={700} size="lg">Mis Establecimientos</Text>} centered size="lg">
         <Group align="flex-end" mb="lg"><TextInput label="Nuevo Campo" placeholder="Nombre" value={nuevoCampoNombre} onChange={(e) => setNuevoCampoNombre(e.target.value)} style={{flex: 1}}/><TextInput label="Nro RENSPA" placeholder="Opcional" value={nuevoCampoRenspa} onChange={(e) => setNuevoCampoRenspa(e.target.value)} style={{flex: 1}}/><Button onClick={crearCampo} leftSection={<IconPlus size={16}/>}>Crear</Button></Group>
         <Stack>{establecimientos.map(e => (<Group key={e.id} justify="space-between" p="sm" bg="gray.0" style={{borderRadius: 8}}><Group><IconBuilding size={18} color="gray"/><div><Text fw={500}>{e.nombre} {e.id === campoId && <Badge color="teal" size="sm" ml="xs">ACTIVO</Badge>}</Text><Text size="sm" c="dimmed">RENSPA: {e.renspa || 'Sin cargar'}</Text></div></Group><Group gap="xs"><ActionIcon variant="subtle" color="blue" onClick={() => editarCampo(e.id, e.nombre, e.renspa)}><IconEdit size={16}/></ActionIcon><ActionIcon variant="subtle" color="red" onClick={() => borrarCampo(e.id)}><IconTrash size={16}/></ActionIcon></Group></Group>))}</Stack>
      </Modal>

    </MantineProvider>
  );
}