import { useEffect, useState} from 'react';
import {MantineProvider, AppShell, Burger, Group, Title, NavLink, Text, TextInput, Select, Button, Badge, ActionIcon, ScrollArea, Modal, Alert, Stack, Indicator, Popover, Divider, Paper } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArchive, IconActivity, IconTrash, IconTractor, IconCurrencyDollar, IconBuilding, IconHome, IconSettings, IconEdit, IconPlus, IconPlaylistAdd, IconLogout, IconTag, IconCalendarEvent, IconBell, IconCreditCard, IconQuestionMark, IconUsers, IconLink, IconCopy, IconUserMinus } from '@tabler/icons-react';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { Notifications, notifications } from '@mantine/notifications';
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
import AceptarInvitacion from './views/AceptarInvitacion';

// Modales Refactorizados
import ModalAltaAnimal from './components/ModalAltaAnimal';
import OnboardingTour from './components/OnboardingTour';
import HelpDrawer from './components/HelpDrawer';
import ModalFichaVaca from './components/ModalFichaVaca';
import ModalTransferencia from './components/ModalTransferencia';
import ModalGraficoPeso from './components/ModalGraficoPeso';

interface Establecimiento { id: string; nombre: string; renspa?: string; }
interface Animal { id: string; caravana: string; caravana_electronica?: string; categoria: string; sexo: string; estado: string; condicion: string; origen: string; detalle_baja?: string; detalles?: string; destacado?: boolean; fecha_nacimiento?: string; fecha_ingreso?: string; madre_id?: string; castrado?: boolean; establecimiento_id: string; potrero_id?: string; parcela_id?: string; lote_id?: string; toros_servicio_ids?: string[]; en_transito?: boolean; }
interface Evento { id: string; created_at: string; fecha_evento: string; tipo: string; resultado: string; detalle: string; animal_id: string; costo?: number; datos_extra?: any; animales?: { caravana: string } }

const getHoyIso = () => { const d = new Date(); const offset = d.getTimezoneOffset(); return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]; };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Estados para las notificaciones del Login
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const [opened, { toggle }] = useDisclosure(); 
  const [activeSection, setActiveSection] = useState('inicio'); 
  const [bellOpened, setBellOpened] = useState(false);
  
  // Datos Globales
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([]);
  const [rolesPorCampo, setRolesPorCampo] = useState<Record<string, 'DUENO' | 'PEON' | 'VETERINARIO'>>({});
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

  // Modales Internos (Configuración)
  const [modalConfigOpen, { open: openModalConfig, close: closeModalConfig }] = useDisclosure(false);

  // Onboarding y Ayuda
  const [tourOpened, { open: openTour, close: closeTour }] = useDisclosure(false);
  const [helpOpened, { open: openHelp, close: closeHelp }] = useDisclosure(false);
  const [nuevoCampoNombre, setNuevoCampoNombre] = useState('');
  const [nuevoCampoRenspa, setNuevoCampoRenspa] = useState('');

  // Estado de la suscripción agregado
  const [datosSuscripcion, setDatosSuscripcion] = useState<any>(null);

  // Token de invitación (leído una sola vez desde la URL)
  const [invToken, setInvToken] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('token')
  );

  // Estado del equipo del campo (panel dentro de modalConfig)
  const [miembros, setMiembros] = useState<any[]>([]);
  const [invitaciones, setInvitaciones] = useState<any[]>([]);
  const [rolNuevaInvitacion, setRolNuevaInvitacion] = useState('PEON');
  const [linkGenerado, setLinkGenerado] = useState<string | null>(null);
  const [loadingEquipo, setLoadingEquipo] = useState(false);
  const [editandoApodo, setEditandoApodo] = useState<string | null>(null);
  const [apodoInput, setApodoInput] = useState('');

  // Rol del usuario en el campo activo
  const rolActual: 'DUENO' | 'PEON' | 'VETERINARIO' = campoId ? (rolesPorCampo[campoId] ?? 'DUENO') : 'DUENO';

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

  // Registra el acceso actual (captura logins frescos Y sesiones cacheadas/refreshes)
  function registrarPresencia(userId: string) {
    supabase
      .from('user_presencia')
      .upsert({ user_id: userId, ultimo_acceso: new Date().toISOString() }, { onConflict: 'user_id' })
      .then(({ error }) => { if (error) console.error('[registrarPresencia]', error); });
  }

  // Sincronización Inicial
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); if (session) { loadCampos(); registrarPresencia(session.user.id); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); if (session) { loadCampos(); registrarPresencia(session.user.id); } else { setEstablecimientos([]); setCampoId(null); } });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user.id) {
      const done = localStorage.getItem(`rc_tour_done_${session.user.id}`);
      if (!done) openTour();
    }
  }, [session?.user.id]);

  // Si hay token Y sesión activa → procesar invitación sin mostrar AceptarInvitacion
  useEffect(() => {
    if (!session || !invToken) return;
    const token = invToken;
    setInvToken(null);
    window.history.replaceState({}, '', window.location.pathname);
    supabase.rpc('aceptar_invitacion', { p_token: token }).then(({ data }) => {
      if (data?.ok) {
        notifications.show({ title: '¡Bienvenido al campo!', message: `Fuiste agregado como ${data.rol}.`, color: 'teal', autoClose: 5000 });
        loadCampos();
      } else {
        notifications.show({ title: 'Invitación no procesada', message: data?.error || 'Invitación inválida o vencida.', color: 'orange', autoClose: 6000 });
      }
    });
  }, [session, invToken]);

  useEffect(() => {
    if (!campoId || !session) return;
    localStorage.setItem('campoId', campoId);
    fetchSuscripcion();
    fetchAnimales(); fetchPotreros(); fetchParcelas(); fetchLotes(); fetchEventosLotesGlobal(); fetchAgenda();
    if (rolActual === 'DUENO') fetchTransferencias();
    if (activeSection === 'inicio' || activeSection === 'actividad') fetchActividadGlobal();
    setMiembros([]);
    setInvitaciones([]);
    setLinkGenerado(null);
    if (rolActual === 'DUENO') fetchEquipo();
  }, [activeSection, campoId, session]);

  // --- FUNCIONES DE AUTH ---
  async function handleLogin(e?: React.FormEvent) { 
    if (e) e.preventDefault();
    setAuthError(null); setAuthSuccess(null);
    if (!email || !password) return setAuthError("Completá email y contraseña.");
    setAuthLoading(true); 
    const { error } = await supabase.auth.signInWithPassword({ email, password }); 
    setAuthLoading(false); 
    if (error) {
        if (error.message.includes("Email not confirmed")) {
            setAuthError("Por favor, confirmá tu cuenta haciendo clic en el link que te enviamos al correo.");
        } else {
            setAuthError("Credenciales incorrectas. Verificá tu correo y contraseña.");
        }
    }
  }
  
  async function handleSignUp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setAuthError(null); setAuthSuccess(null);
    if (!email || !password) return setAuthError("Completá email y contraseña.");
    setAuthLoading(true);
    
    const { data, error } = await supabase.auth.signUp({ email, password });
    setAuthLoading(false);
    
    if (error) {
        setAuthError(error.message);
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        // TRAMPA ANTI-DUPLICADOS: Si identities viene vacío, el mail ya está registrado.
        setAuthError("Este correo electrónico ya se encuentra registrado. Por favor, iniciá sesión.");
    } else {
        if (data.session === null) {
            setAuthSuccess("¡Cuenta creada exitosamente! Te enviamos un link a tu correo (revisá la carpeta de Spam). Confirmalo para poder ingresar.");
        } else {
            setAuthSuccess("¡Bienvenido! Tu cuenta de prueba fue creada y ya podés comenzar a usar el sistema.");
        }
    }
  }

  async function handleForgotPassword(emailToReset: string) {
    if (!emailToReset) return { error: 'Ingresá tu correo electrónico.' };
    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: window.location.origin,
    });
    if (error) return { error: 'No se pudo enviar el correo. Verificá el email ingresado.' };
    return { error: null };
  }

  async function handleLogout() { await supabase.auth.signOut(); setSession(null); }

  // Funciones de Fetch de Datos
  async function loadCampos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: propios, error: e1 }, { data: membresias, error: e2 }] = await Promise.all([
      supabase.from('establecimientos').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('campo_miembros').select('establecimiento_id, rol').eq('user_id', user.id),
    ]);

    if (e1) { console.error('[loadCampos]', e1); return; }
    if (e2) console.error('[loadCampos] membresías', e2);

    const roles: Record<string, 'DUENO' | 'PEON' | 'VETERINARIO'> = {};
    (propios || []).forEach((e: any) => { roles[e.id] = 'DUENO'; });

    const ajenosIds = (membresias || [])
      .filter((m: any) => !roles[m.establecimiento_id])
      .map((m: any) => m.establecimiento_id);

    let ajenosSinDuplicar: Establecimiento[] = [];
    if (ajenosIds.length > 0) {
      const { data: ajenosData, error: e3 } = await supabase
        .from('establecimientos').select('*').in('id', ajenosIds);
      if (e3) console.error('[loadCampos] ajenos', e3);
      ajenosSinDuplicar = ajenosData || [];
      ajenosSinDuplicar.forEach((e: any) => {
        const m = (membresias || []).find((mb: any) => mb.establecimiento_id === e.id);
        if (m) roles[e.id] = m.rol as 'PEON' | 'VETERINARIO';
      });
    }

    const todos: Establecimiento[] = [...(propios || []), ...ajenosSinDuplicar];
    setRolesPorCampo(roles);

    if (todos.length > 0) {
      setEstablecimientos(todos);
      const guardado = localStorage.getItem('campoId');
      if (guardado && todos.find(c => c.id === guardado)) {
        setCampoId(guardado);
      } else if (!campoId) {
        const primerPropio = (propios || [])[0];
        setCampoId(primerPropio ? primerPropio.id : todos[0].id);
      }
    }
  }
  
  async function fetchSuscripcion() {
      // 1. Verificamos que haya alguien logueado
      if (!session?.user.id) return;

      // 2. Buscamos el plan usando el ID del usuario
      const { data, error } = await supabase
          .from('suscripciones')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

      if (error && error.code !== 'PGRST116') { console.error('[fetchSuscripcion]', error); return; }
      if (data) {
          // --- SANITIZACIÓN ANTI-NaN ---
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
              limite_animales: 100, 
              limite_establecimientos: 1, 
              estado: 'ACTIVO' 
          });
      }
  }
  
  async function fetchAnimales() { if (!campoId) return; const { data, error } = await supabase.from('animales').select('*').eq('establecimiento_id', campoId).neq('estado', 'ELIMINADO').order('created_at', { ascending: false }); if (error) { console.error('[fetchAnimales]', error); return; } setAnimales(data || []); }
  async function fetchPotreros() { if (!campoId) return; const { data, error } = await supabase.from('potreros').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); if (error) { console.error('[fetchPotreros]', error); return; } setPotreros(data || []); }
  async function fetchParcelas() { if (!campoId) return; const { data, error } = await supabase.from('parcelas').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); if (error) { console.error('[fetchParcelas]', error); return; } setParcelas(data || []); }
  async function fetchLotes() { if (!campoId) return; const { data, error } = await supabase.from('lotes').select('*').eq('establecimiento_id', campoId).order('created_at', { ascending: false }); if (error) { console.error('[fetchLotes]', error); return; } setLotes(data || []); }
  
  async function fetchActividadGlobal() { 
      if (!campoId) return; 
      const { data, error } = await supabase.from('eventos').select('*, animales(caravana)').eq('establecimiento_id', campoId).order('fecha_evento', { ascending: false }).order('created_at', { ascending: false });
      if (error) { console.error('[fetchActividadGlobal]', error); return; }

      let eventos = data || [];
      const perdidos = eventos.filter((e: any) => !e.animales).map((e: any) => e.animal_id);

      if (perdidos.length > 0) {
          const { data: nombres, error: errorRpc } = await supabase.rpc('obtener_caravanas_perdidas', { ids: perdidos });
          if (errorRpc) { console.error('[fetchActividadGlobal] rpc', errorRpc); return; }
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

  async function fetchEventosLotesGlobal() { if (!campoId) return; const { data, error } = await supabase.from('lotes_eventos').select('*').eq('establecimiento_id', campoId).order('fecha', { ascending: false }).order('created_at', { ascending: false }); if (error) { console.error('[fetchEventosLotesGlobal]', error); return; } setEventosLotesGlobal(data || []); }
  async function fetchAgenda() { if(!campoId) return; const { data, error } = await supabase.from('agenda').select('*').eq('establecimiento_id', campoId).order('fecha_programada', { ascending: true }); if (error) { console.error('[fetchAgenda]', error); return; } if (data) setAgenda(data); }
  async function fetchTransferencias() { if (!campoId) return; const { data: transData, error } = await supabase.from('transferencias').select('*').eq('campo_destino_id', campoId).eq('estado', 'PENDIENTE'); if (error) { console.error('[fetchTransferencias]', error); return; } setTransferencias(transData || []); }

  // Gestión de Establecimientos con Candado de Suscripción
  async function crearCampo() { 
      if (!nuevoCampoNombre) return; 
      
      const camposPropios = establecimientos.filter(e => rolesPorCampo[e.id] === 'DUENO');
      if (datosSuscripcion && camposPropios.length >= datosSuscripcion.limite_establecimientos) {
          alert(`Límite alcanzado. Tu plan actual solo permite ${datosSuscripcion.limite_establecimientos} establecimiento(s). Por favor, mejorá tu plan para agregar más.`);
          return;
      }

      if (nuevoCampoRenspa) {
          const { data: camposConRenspa } = await supabase.rpc('buscar_campo_por_renspa', { buscar_renspa: nuevoCampoRenspa.trim() });
          if (Array.isArray(camposConRenspa) && camposConRenspa.length > 0) {
              alert(`El RENSPA "${nuevoCampoRenspa}" ya está registrado en el sistema.`);
              return;
          }
      }

      const { error } = await supabase.from('establecimientos').insert([{ nombre: nuevoCampoNombre, renspa: nuevoCampoRenspa, user_id: session?.user.id }]);
      if (error) alert("Error: " + error.message);
      else { setNuevoCampoNombre(''); setNuevoCampoRenspa(''); loadCampos(); }
  }
  
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

  // Funciones de gestión del equipo
  async function fetchEquipo() {
    if (!campoId) return;
    setLoadingEquipo(true);
    const [{ data: m, error: em }, { data: i, error: ei }] = await Promise.all([
      supabase.rpc('obtener_miembros_campo', { p_campo_id: campoId }),
      supabase.from('campo_invitaciones').select('*').eq('establecimiento_id', campoId).eq('usado', false).order('created_at', { ascending: false }),
    ]);
    if (em) console.error('[fetchEquipo] RPC miembros:', em);
    if (ei) console.error('[fetchEquipo] invitaciones:', ei);
    setMiembros(m || []);
    setInvitaciones(i || []);
    setLoadingEquipo(false);
  }

  async function generarInvitacion() {
    if (!campoId || !session) return;
    const token = crypto.randomUUID();
    const { error } = await supabase.from('campo_invitaciones').insert({
      establecimiento_id: campoId,
      rol: rolNuevaInvitacion,
      creado_por: session.user.id,
      token,
    });
    if (error) { console.error('[generarInvitacion]', error); return; }
    setLinkGenerado(`${window.location.origin}?token=${token}`);
    fetchEquipo();
  }

  async function removerMiembro(userId: string) {
    if (!campoId) return;
    await supabase.from('campo_miembros').delete().eq('establecimiento_id', campoId).eq('user_id', userId);
    fetchEquipo();
  }

  async function actualizarApodo(userId: string, nuevoApodo: string) {
    setEditandoApodo(null);
    if (!campoId) return;
    const apodo = nuevoApodo.trim() || null;
    const { error } = await supabase.from('campo_miembros')
      .update({ apodo })
      .eq('establecimiento_id', campoId)
      .eq('user_id', userId);
    if (error) { console.error('[actualizarApodo]', error); return; }
    fetchEquipo();
  }

  async function invalidarInvitacion(id: string) {
    await supabase.from('campo_invitaciones').update({ usado: true }).eq('id', id);
    fetchEquipo();
  }

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

  const hoyFormateado = getHoyIso();
  const tareasPendientesUrgentes = agenda.filter(t => !t.completado && t.fecha_programada < hoyFormateado);
  const tareasParaHoy = agenda.filter(t => !t.completado && t.fecha_programada === hoyFormateado);
  const tareasAtrasadas = agenda.filter(t => !t.completado && t.fecha_programada < hoyFormateado);

  return (
    <MantineProvider>
        <Notifications position="top-right" zIndex={9999} />
        {!session && invToken ? (
            <AceptarInvitacion
                token={invToken}
                onSuccess={() => { setInvToken(null); window.history.replaceState({}, '', window.location.pathname); }}
            />
        ) : !session ? (
            <Login
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                handleLogin={handleLogin} handleSignUp={handleSignUp} handleForgotPassword={handleForgotPassword}
                authLoading={authLoading}
                authError={authError} setAuthError={setAuthError}
                authSuccess={authSuccess} setAuthSuccess={setAuthSuccess}
            />
        ) : (
          <AppShell header={{ height: 60 }} navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
            <AppShell.Header>
              <Group h="100%" px="md" justify="space-between" wrap="nowrap">
                
                {/* GRUPO IZQUIERDO (Logo + Nombre App + Establecimiento) */}
                <Group gap="sm" align="center" style={{ flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    
                    {/* Logo agrandado */}
                    <img src={logoRodeo} alt="RodeoControl Logo" style={{ height: 56, width: 'auto', flexShrink: 0 }} />
                    
                    {/* Nombre de la app: Oculto en celu para dejar espacio */}
                    <Title order={3} visibleFrom="sm" style={{ flexShrink: 0 }}>RodeoControl</Title>
                    
                    {/* Nombre del Establecimiento */}
                    {campoId && establecimientos.length > 0 && (
                        <Group gap="sm" align="center" style={{ flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
                            <Text size="xl" c="dimmed" visibleFrom="sm" style={{ fontWeight: 300, userSelect: 'none', flexShrink: 0 }}>|</Text>
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
                            {rolActual === 'PEON' && <Badge color="orange" size="sm" style={{ flexShrink: 0 }}>Peón</Badge>}
                            {rolActual === 'VETERINARIO' && <Badge color="blue" size="sm" style={{ flexShrink: 0 }}>Veterinario</Badge>}
                        </Group>
                    )}
                </Group>

                {/* GRUPO DERECHO (Ayuda + Notificaciones) */}
                <Group gap="xs" style={{ flexShrink: 0 }}>
                    <ActionIcon variant="light" color="blue" size="lg" radius="xl" onClick={openHelp} title="Ayuda">
                      <IconQuestionMark size={22} />
                    </ActionIcon>
                    {campoId && (
                        <Popover width={300} position="bottom-end" withArrow shadow="md" opened={bellOpened} onChange={setBellOpened}>
                            <Popover.Target>
                                <Indicator disabled={tareasPendientesUrgentes.length === 0 && tareasParaHoy.length === 0 && transferencias.length === 0} color="red" size={15} label={tareasPendientesUrgentes.length + tareasParaHoy.length + transferencias.length} offset={4} zIndex={100}>
                                    <ActionIcon variant="light" color="orange" size="lg" radius="xl" onClick={() => setBellOpened((o) => !o)} disabled={estaVencido}><IconBell size={22} /></ActionIcon>
                                </Indicator>
                            </Popover.Target>
                            <Popover.Dropdown>
                                <Text size="sm" fw={700} mb="xs">Centro de Notificaciones</Text>
                                {rolActual === 'DUENO' && transferencias.length > 0 && (
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
                  {rolActual === 'DUENO' && <NavLink label="Caja / Economía" leftSection={<IconCurrencyDollar size={20}/>} active={activeSection === 'economia'} onClick={() => { setActiveSection('economia'); toggle(); }} color="green" variant="filled" style={{ borderRadius: 8 }} disabled={estaVencido}/>}
                  {/* Mi Plan solo visible para el dueño */}
                  {rolActual === 'DUENO' && <NavLink label="Mi Plan" leftSection={<IconCreditCard size={20}/>} active={activeSection === 'suscripcion'} onClick={() => { setActiveSection('suscripcion'); toggle(); }} color="blue" variant="filled" style={{ borderRadius: 8 }} mt="sm" />}
                  
                  <Text size="xs" fw={700} c="dimmed" mt="xl" mb="sm">REPORTES</Text>
                  <NavLink label="Registro Actividad" leftSection={<IconActivity size={20}/>} active={activeSection === 'actividad'} onClick={() => { setActiveSection('actividad'); toggle(); }} color="blue" variant="filled" style={{ borderRadius: 8 }} disabled={estaVencido}/>
              </ScrollArea>
              
              <AppShell.Section style={{ borderTop: '1px solid #eee', paddingTop: '1rem', marginTop: '1rem' }}>
                  <Text size="xs" fw={700} c="dimmed" mb="xs" ml={4}>ESTABLECIMIENTO</Text>
                  <Group wrap="nowrap" gap="xs" mb="sm">
                      <Select
                        data={[
                          {
                            group: 'Mis campos',
                            items: establecimientos.filter(e => rolesPorCampo[e.id] === 'DUENO').map(e => ({ value: e.id, label: e.nombre }))
                          },
                          {
                            group: 'Campos donde trabajo',
                            items: establecimientos.filter(e => rolesPorCampo[e.id] !== 'DUENO').map(e => ({ value: e.id, label: `${e.nombre}  ·  ${rolesPorCampo[e.id] === 'PEON' ? 'Peón' : 'Veterinario'}` }))
                          }
                        ].filter(g => g.items.length > 0)}
                        value={campoId}
                        onChange={(val) => setCampoId(val)}
                        allowDeselect={false}
                        leftSection={<IconBuilding size={16}/>}
                        variant="filled"
                        style={{ flex: 1 }}
                        comboboxProps={{ zIndex: 1001 }}
                        disabled={estaVencido}
                      />
                      <ActionIcon variant="light" color="gray" size="lg" onClick={() => { openModalConfig(); if (rolActual === 'DUENO') fetchEquipo(); }} title="Gestionar Campos" style={{ width: 36, height: 36 }} disabled={estaVencido}><IconSettings size={20}/></ActionIcon>
                  </Group>
                  <Button fullWidth variant="subtle" color="red" leftSection={<IconLogout size={18}/>} onClick={handleLogout}>Cerrar Sesión</Button>
              </AppShell.Section>
            </AppShell.Navbar>

            <AppShell.Main bg="gray.0">
              {activeSection === 'inicio' && <Inicio animales={animales} agenda={agenda} eventosGlobales={eventosGlobales} setActiveSection={setActiveSection} />}
              {activeSection === 'agenda' && <Agenda campoId={campoId} agenda={agenda} fetchAgenda={fetchAgenda} animales={animales} abrirFichaVaca={abrirFichaVaca} />}
              {(activeSection === 'lotes' || activeSection === 'lote_detalle') && <Lotes campoId={campoId} lotes={lotes} animales={animales} potreros={potreros} parcelas={parcelas} establecimientos={establecimientos} eventosLotesGlobal={eventosLotesGlobal} fetchLotes={fetchLotes} fetchAnimales={fetchEventosLotesGlobal} fetchActividadGlobal={fetchActividadGlobal} abrirFichaVaca={abrirFichaVaca} rolActual={rolActual}/>}
              {activeSection === 'masivos' && <Masivos campoId={campoId} animales={animales} potreros={potreros} parcelas={parcelas} lotes={lotes} establecimientos={establecimientos} datosSuscripcion={datosSuscripcion} fetchAnimales={fetchAnimales} fetchActividadGlobal={fetchActividadGlobal} setActiveSection={setActiveSection} rolActual={rolActual} />}
              {(activeSection === 'hacienda' || activeSection === 'bajas') && <Hacienda animales={animales} potreros={potreros} parcelas={parcelas} lotes={lotes} activeSection={activeSection} abrirFichaVaca={abrirFichaVaca} openModalAlta={openModalAlta} setAnimales={setAnimales} datosSuscripcion={datosSuscripcion} campoId={campoId} fetchAnimales={fetchAnimales} rolActual={rolActual} />}
              {activeSection === 'economia' && campoId && <Economia campoId={campoId} establecimientos={establecimientos} rolActual={rolActual} />}
              {(activeSection === 'agricultura' || activeSection === 'potrero_detalle') && <Agricultura campoId={campoId} potreros={potreros} parcelas={parcelas} animales={animales} fetchPotreros={fetchPotreros} fetchParcelas={fetchParcelas} abrirFichaVaca={abrirFichaVaca} rolActual={rolActual} />}
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
          rolActual={rolActual}
      />

      <ModalTransferencia
        opened={modalTransfOpen}
        onClose={closeModalTransf}
        transfActiva={transfActiva}
        campoId={campoId}
        animales={animales}
        potreros={potreros}
        datosSuscripcion={datosSuscripcion}
        rolActual={rolActual}
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
          datosSuscripcion={datosSuscripcion}
          rolActual={rolActual}
      />

      {/* --- MODALES INTERNOS --- */}
      <Modal
        opened={modalConfigOpen}
        onClose={() => { closeModalConfig(); setLinkGenerado(null); }}
        title={<Text fw={700} size="lg">Configuración del campo</Text>}
        centered
        size="lg"
      >
        {/* Sección: mis establecimientos */}
        <Text size="xs" fw={700} c="dimmed" mb="sm">MIS ESTABLECIMIENTOS</Text>
        <Group align="flex-end" mb="md"><TextInput label="Nuevo Campo" placeholder="Nombre" value={nuevoCampoNombre} onChange={(e) => setNuevoCampoNombre(e.target.value)} style={{flex: 1}}/><TextInput label="Nro RENSPA" placeholder="Opcional" value={nuevoCampoRenspa} onChange={(e) => setNuevoCampoRenspa(e.target.value)} style={{flex: 1}}/><Button onClick={crearCampo} leftSection={<IconPlus size={16}/>}>Crear</Button></Group>
        <Stack mb="md">
          {establecimientos.filter(e => rolesPorCampo[e.id] === 'DUENO').map(e => (
            <Group key={e.id} justify="space-between" p="sm" bg={e.id === campoId ? 'teal.0' : 'gray.0'} style={{borderRadius: 8, cursor: 'pointer'}} onClick={() => { setCampoId(e.id); setLinkGenerado(null); }}>
              <Group><IconBuilding size={18} color="gray"/><div>
                <Text fw={500}>{e.nombre} {e.id === campoId && <Badge color="teal" size="sm" ml="xs">ACTIVO</Badge>}</Text>
                <Text size="sm" c="dimmed">RENSPA: {e.renspa || 'Sin cargar'}</Text>
              </div></Group>
              <Group gap="xs" onClick={(ev) => ev.stopPropagation()}>
                <ActionIcon variant="subtle" color="blue" onClick={() => editarCampo(e.id, e.nombre, e.renspa)}><IconEdit size={16}/></ActionIcon>
                <ActionIcon variant="subtle" color="red" onClick={() => borrarCampo(e.id)}><IconTrash size={16}/></ActionIcon>
              </Group>
            </Group>
          ))}
        </Stack>
        {establecimientos.some(e => rolesPorCampo[e.id] === 'VETERINARIO') && (
          <>
            <Text size="xs" fw={700} c="dimmed" mb="xs">CAMPOS COMO VETERINARIO</Text>
            <Stack mb="md">
              {establecimientos.filter(e => rolesPorCampo[e.id] === 'VETERINARIO').map(e => (
                <Group key={e.id} p="sm" bg={e.id === campoId ? 'violet.0' : 'gray.0'} style={{borderRadius: 8, cursor: 'pointer'}} onClick={() => { setCampoId(e.id); setLinkGenerado(null); }}>
                  <IconBuilding size={18} color="gray"/>
                  <div>
                    <Text fw={500}>{e.nombre} {e.id === campoId && <Badge color="violet" size="sm" ml="xs">ACTIVO</Badge>}</Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </>
        )}
        {establecimientos.some(e => rolesPorCampo[e.id] === 'PEON') && (
          <>
            <Text size="xs" fw={700} c="dimmed" mb="xs">CAMPOS COMO PEÓN</Text>
            <Stack mb="md">
              {establecimientos.filter(e => rolesPorCampo[e.id] === 'PEON').map(e => (
                <Group key={e.id} p="sm" bg={e.id === campoId ? 'orange.0' : 'gray.0'} style={{borderRadius: 8, cursor: 'pointer'}} onClick={() => { setCampoId(e.id); setLinkGenerado(null); }}>
                  <IconBuilding size={18} color="gray"/>
                  <div>
                    <Text fw={500}>{e.nombre} {e.id === campoId && <Badge color="orange" size="sm" ml="xs">ACTIVO</Badge>}</Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </>
        )}

        {/* Sección: equipo — solo visible para el dueño */}
        {rolActual === 'DUENO' && campoId && (
          <>
            {(() => {
              const nombreCampoActivo = establecimientos.find(e => e.id === campoId)?.nombre ?? '';
              return (
                <Divider my="md" label={<Group gap="xs"><IconUsers size={14}/><Text size="xs" fw={700} c="dimmed">EQUIPO — {nombreCampoActivo}</Text></Group>} />
              );
            })()}

            {loadingEquipo ? (
              <Text size="sm" c="dimmed">Cargando equipo...</Text>
            ) : (
              <Stack gap="sm">
                {/* Miembros actuales */}
                {miembros.length > 0 ? (
                  <>
                    <Text size="xs" fw={700} c="dimmed">Miembros</Text>
                    {miembros.map((m: any) => (
                      <Group key={m.user_id} justify="space-between" p="xs" bg="gray.0" style={{borderRadius: 8}} align="flex-start">
                        <div style={{flex: 1, minWidth: 0}}>
                          {editandoApodo === m.user_id ? (
                            <TextInput
                              size="xs"
                              placeholder="Nombre o apodo"
                              value={apodoInput}
                              onChange={(e) => setApodoInput(e.target.value)}
                              onBlur={() => actualizarApodo(m.user_id, apodoInput)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') actualizarApodo(m.user_id, apodoInput);
                                if (e.key === 'Escape') setEditandoApodo(null);
                              }}
                              autoFocus
                              mb={4}
                            />
                          ) : (
                            <Group gap={4} align="center">
                              <Text size="sm" fw={500} style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                {m.apodo || m.email}
                              </Text>
                              <ActionIcon
                                variant="subtle" size="xs" color="gray"
                                title="Editar apodo"
                                onClick={() => { setEditandoApodo(m.user_id); setApodoInput(m.apodo || ''); }}
                              >
                                <IconEdit size={12}/>
                              </ActionIcon>
                            </Group>
                          )}
                          {m.apodo && <Text size="xs" c="dimmed" style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{m.email}</Text>}
                          <Badge size="xs" color={m.rol === 'VETERINARIO' ? 'violet' : 'orange'} mt={2}>
                            {m.rol === 'VETERINARIO' ? 'Veterinario' : 'Peón'}
                          </Badge>
                          <Text size="xs" c="dimmed" mt={2}>
                            {m.ultimo_acceso
                              ? (() => {
                                  const diff = Date.now() - new Date(m.ultimo_acceso).getTime();
                                  const mins = Math.floor(diff / 60000);
                                  if (mins < 60) return `Activo hace ${mins < 2 ? 'un momento' : `${mins} min`}`;
                                  const hs = Math.floor(mins / 60);
                                  if (hs < 24) return `Activo hace ${hs} h`;
                                  const dias = Math.floor(hs / 24);
                                  if (dias < 30) return `Activo hace ${dias} día${dias !== 1 ? 's' : ''}`;
                                  const fecha = new Date(m.ultimo_acceso).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: '2-digit' });
                                  return `Último acceso: ${fecha}`;
                                })()
                              : 'Sin acceso registrado'}
                          </Text>
                        </div>
                        <ActionIcon variant="subtle" color="red" title="Remover miembro" onClick={() => removerMiembro(m.user_id)}>
                          <IconUserMinus size={16}/>
                        </ActionIcon>
                      </Group>
                    ))}
                  </>
                ) : (
                  <Text size="sm" c="dimmed">Todavía no hay miembros en este campo.</Text>
                )}

                {/* Generador de invitación */}
                <Text size="xs" fw={700} c="dimmed" mt="xs">Invitar al equipo</Text>
                <Group gap="xs">
                  <Select
                    data={[{ value: 'PEON', label: 'Peón' }, { value: 'VETERINARIO', label: 'Veterinario' }]}
                    value={rolNuevaInvitacion}
                    onChange={(v) => setRolNuevaInvitacion(v || 'PEON')}
                    style={{ flex: 1 }}
                  />
                  <Button leftSection={<IconLink size={16}/>} onClick={generarInvitacion} color="teal">
                    Generar link
                  </Button>
                </Group>

                {linkGenerado && (
                  <Paper withBorder p="sm" radius="md" bg="teal.0" style={{ borderColor: 'var(--mantine-color-teal-3)' }}>
                    <Text size="xs" fw={700} mb={4}>Link de invitación:</Text>
                    <Text size="xs" ff="monospace" style={{ wordBreak: 'break-all' }} mb="xs">{linkGenerado}</Text>
                    <Group gap="xs" align="center">
                      <Button size="xs" leftSection={<IconCopy size={13}/>} color="teal" onClick={() => navigator.clipboard.writeText(linkGenerado)}>
                        Copiar link
                      </Button>
                      <Text size="xs" c="dimmed">Vence en 7 días. Mandáselo por WhatsApp.</Text>
                    </Group>
                  </Paper>
                )}

                {/* Invitaciones pendientes */}
                {invitaciones.length > 0 && (
                  <>
                    <Text size="xs" fw={700} c="dimmed" mt="xs">Invitaciones pendientes</Text>
                    {invitaciones.map((inv: any) => (
                      <Group key={inv.id} justify="space-between" p="xs" bg="gray.0" style={{borderRadius: 8}}>
                        <div>
                          <Text size="xs" ff="monospace" c="dimmed">…{inv.token.slice(-10)}</Text>
                          <Group gap="xs" mt={2}>
                            <Badge size="xs" color={inv.rol === 'VETERINARIO' ? 'violet' : 'orange'}>{inv.rol}</Badge>
                            <Text size="xs" c="dimmed">Vence: {new Date(inv.expires_at).toLocaleDateString('es-AR')}</Text>
                          </Group>
                        </div>
                        <ActionIcon variant="subtle" color="red" title="Invalidar invitación" onClick={() => invalidarInvitacion(inv.id)}>
                          <IconTrash size={14}/>
                        </ActionIcon>
                      </Group>
                    ))}
                  </>
                )}
              </Stack>
            )}
          </>
        )}
      </Modal>

      <OnboardingTour
        opened={tourOpened}
        onClose={closeTour}
        onCargarPrimerAnimal={openModalAlta}
        userId={session?.user.id ?? ''}
      />
      <HelpDrawer
        opened={helpOpened}
        onClose={closeHelp}
        activeSection={activeSection}
      />

    </MantineProvider>
  );
}