import { useState, useEffect, useMemo } from 'react';
import { Title, Paper, Text, Group, Card, SimpleGrid, ThemeIcon, Table, Badge, ActionIcon, ScrollArea, Modal, Stack, TextInput, Select, NumberInput, Button, Tooltip, CloseButton, Menu, Center, PasswordInput, SegmentedControl, Checkbox } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCurrencyDollar, IconTrendingUp, IconTrendingDown, IconPlus, IconTrash, IconReceipt, IconSearch, IconFilter, IconCalendar, IconTruckDelivery, IconCheck, IconEye, IconEyeOff, IconLock, IconLockOpen, IconInfoCircle, IconPackage } from '@tabler/icons-react';
import { supabase } from '../supabase';

interface Establecimiento { id: string; nombre: string; renspa?: string; }
interface Lote { id: string; nombre: string; }
interface Potrero { id: string; nombre: string; }
interface AnimalBasico { id: string; caravana: string; estado: string; lote_id?: string | null; }

interface EconomiaProps {
  campoId: string;
  establecimientos?: Establecimiento[];
  rolActual?: 'DUENO' | 'PEON' | 'VETERINARIO';
  lotes?: Lote[];
  potreros?: Potrero[];
  animales?: AnimalBasico[];
}

interface Movimiento {
  id: string; fecha: string; timestamp: string;
  tipo: 'INGRESO' | 'EGRESO';
  categoria: string; detalle: string; monto: number;
  esManual: boolean;
  venta_id?: string | null;
  animales_ids?: string[];
  lote_id?: string | null;
  lote_nombre_en_momento?: string | null;
  potrero_id?: string | null;
  potrero_nombre_en_momento?: string | null;
}

// ACÁ ESTÁ EL CAMBIO (slice(-2) al año)
const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`; };
const getHoyIso = () => { const d = new Date(); const offset = d.getTimezoneOffset(); return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]; };

export default function Economia({ campoId, establecimientos = [], rolActual = 'DUENO', lotes = [], potreros = [], animales = [] }: EconomiaProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [saldosOcultos, setSaldosOcultos] = useState(false);

  // --- SISTEMA DE BLOQUEO DE CAJA ---
  const [isLocked, setIsLocked] = useState(false);
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [modalPinOpen, { open: openModalPin, close: closeModalPin }] = useDisclosure(false);
  const [confirmModal, setConfirmModal] = useState<{ mensaje: string; onConfirm: () => void; color?: string } | null>(null);
  const [nuevoPin, setNuevoPin] = useState('');
  const [loadingPin, setLoadingPin] = useState(false);
  // -----------------------------------

  const [opened, { open, close }] = useDisclosure(false);
  const [ventaModalOpen, { open: openVentaModal, close: closeVentaModal }] = useDisclosure(false);
  const [ventaDetalle, setVentaDetalle] = useState<{
    animales: { caravana: string; categoria: string; sexo: string }[];
    animalesIds?: string[];
    tipo: string;
    destino: string | null;
    monto_total: number;
    titulo?: string;
    loteNombreFallback?: string;
  } | null>(null);

  const [fechaInput, setFechaInput] = useState<string>(getHoyIso());
  const [tipoInput, setTipoInput] = useState<string | null>('EGRESO');
  const [categoriaInput, setCategoriaInput] = useState<string | null>('Infraestructura / Alambrados');
  const [detalleInput, setDetalleInput] = useState('');
  const [montoInput, setMontoInput] = useState<number | ''>('');
  const [campoDestinoInsumo, setCampoDestinoInsumo] = useState<string | null>(null);

  // Campos nuevos: solo para EGRESO
  const [modoMonto, setModoMonto] = useState<'total' | 'unitario'>('total');
  const [precioUnitarioInput, setPrecioUnitarioInput] = useState<number | ''>('');
  const [cantidadInput, setCantidadInput] = useState<number | ''>('');
  const [asignarA, setAsignarA] = useState<string | null>('ninguno');
  const [animalesIdsInput, setAnimalesIdsInput] = useState<string[]>([]);
  const [busquedaAnimales, setBusquedaAnimales] = useState('');
  const [loteIdInput, setLoteIdInput] = useState<string | null>(null);
  const [potreroIdInput, setPotreroIdInput] = useState<string | null>(null);

  const [filtroFecha, setFiltroFecha] = useState<string | null>('este_mes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

  const categorias = ['Alquileres', 'Alimentación / Nutrición', 'Sanidad Veterinaria', 'Agricultura / Semillas', 'Maquinaria / Combustible', 'Infraestructura / Alambrados', 'Sueldos / Honorarios', 'Impuestos / Servicios', 'Traslado Insumo', 'Otros'];

  const montoCalculado =
    modoMonto === 'unitario' && precioUnitarioInput !== '' && cantidadInput !== ''
      ? Number(precioUnitarioInput) * Number(cantidadInput)
      : null;

  const animalesActivos = animales.filter(a => !['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(a.estado));

  function resetCamposEgreso() {
    setModoMonto('total');
    setPrecioUnitarioInput('');
    setCantidadInput('');
    setAsignarA('ninguno');
    setAnimalesIdsInput([]);
    setBusquedaAnimales('');
    setLoteIdInput(null);
    setPotreroIdInput(null);
  }

  function toggleAnimalSeleccionado(id: string) {
    setAnimalesIdsInput(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  useEffect(() => {
    if (campoId) {
      fetchPinSeguridad();
      fetchTodosLosMovimientos();
    }
  }, [campoId]);

  async function fetchPinSeguridad() {
    setLoadingDatos(true);
    const { data, error } = await supabase.from('establecimientos').select('pin_caja').eq('id', campoId).single();
    if (!error && data && data.pin_caja) {
      setSavedPin(data.pin_caja);
      setIsLocked(true);
    } else {
      setSavedPin(null);
      setIsLocked(false);
    }
  }

  const handleUnlock = () => {
    if (pinInput === savedPin) {
      setIsLocked(false);
      setPinInput('');
    } else {
      notifications.show({ title: 'Clave incorrecta', message: 'La clave ingresada no es correcta.', color: 'red' });
    }
  };

  const handleGuardarPin = async () => {
    setLoadingPin(true);
    const { error } = await supabase.from('establecimientos').update({ pin_caja: nuevoPin || null }).eq('id', campoId);
    setLoadingPin(false);
    if (error) {
      notifications.show({ title: 'Error al guardar clave', message: error.message, color: 'red' });
    } else {
      setSavedPin(nuevoPin || null);
      if (!nuevoPin) setIsLocked(false);
      notifications.show({ title: nuevoPin ? 'Clave configurada' : 'Clave eliminada', message: nuevoPin ? 'Se pedirá en todos los dispositivos.' : 'La clave fue eliminada para todos.', color: nuevoPin ? 'teal' : 'gray' });
      closeModalPin();
    }
  };

  async function fetchTodosLosMovimientos() {
    if (!campoId) return;
    const pCaja = supabase
      .from('caja')
      .select('*, venta_id, animales_ids, lote_id, lote_nombre_en_momento, potrero_id, potrero_nombre_en_momento')
      .eq('establecimiento_id', campoId);

    const pEventos = supabase
      .from('eventos')
      .select('id, animal_id, fecha_evento, tipo, detalle, resultado, costo, created_at, datos_extra, animales(caravana)')
      .eq('establecimiento_id', campoId)
      .gt('costo', 0)
      .not('tipo', 'in', '("VENTA","COMPRA","TRASLADO_SALIDA","TRASLADO_INGRESO")');

    const pLabores = supabase
      .from('labores')
      .select('id, fecha, actividad, cultivo, detalle, costo, created_at')
      .eq('establecimiento_id', campoId)
      .gt('costo', 0);

    const pLotes = supabase
      .from('lotes_eventos')
      .select('id, fecha, tipo, detalle, costo, created_at')
      .eq('establecimiento_id', campoId)
      .gt('costo', 0);

    const [resCaja, resEventos, resLabores, resLotes] = await Promise.all([pCaja, pEventos, pLabores, pLotes]);
    let todos: Movimiento[] = [];

    if (resCaja.data) {
      todos = [...todos, ...resCaja.data.map(m => ({
        id: m.id, fecha: m.fecha, timestamp: m.created_at || m.fecha,
        tipo: m.tipo, categoria: m.categoria, detalle: m.detalle, monto: m.monto,
        esManual: m.categoria !== 'Hacienda (Venta/Compra)' && !(m.categoria === 'Traslado Insumo' && m.tipo === 'INGRESO'),
        venta_id: m.venta_id ?? null,
        animales_ids: m.animales_ids ?? [],
        lote_id: m.lote_id ?? null,
        lote_nombre_en_momento: m.lote_nombre_en_momento ?? null,
        potrero_id: m.potrero_id ?? null,
        potrero_nombre_en_momento: m.potrero_nombre_en_momento ?? null,
      }))];
    }
    if (resEventos.data) {
      const sinBatch: any[] = [];
      const conBatch = new Map<string, any[]>();
      for (const e of resEventos.data) {
        const batchId = e.datos_extra?.batch_id;
        if (batchId) {
          if (!conBatch.has(batchId)) conBatch.set(batchId, []);
          conBatch.get(batchId)!.push(e);
        } else {
          sinBatch.push(e);
        }
      }
      todos = [...todos, ...sinBatch.map((e: any) => ({
        id: e.id, fecha: e.fecha_evento.split('T')[0], timestamp: e.created_at || e.fecha_evento,
        tipo: 'EGRESO' as const, categoria: 'Sanidad Veterinaria',
        detalle: `Vaca ${e.animales?.caravana || '?'}: ${e.tipo}${e.detalle ? ` - ${e.detalle}` : ''}`,
        monto: e.costo, esManual: false,
      }))];
      for (const [batchId, eventos] of conBatch) {
        const first = eventos[0];
        const totalCosto = eventos.reduce((acc: number, ev: any) => acc + Number(ev.costo), 0);
        const animalIds = eventos.map((ev: any) => ev.animal_id).filter(Boolean) as string[];
        todos.push({
          id: batchId,
          fecha: first.fecha_evento.split('T')[0],
          timestamp: first.created_at || first.fecha_evento,
          tipo: 'EGRESO' as const,
          categoria: 'Sanidad Veterinaria',
          detalle: `${eventos.length} animales: ${first.tipo}${first.detalle ? ` - ${first.detalle}` : ''}`,
          monto: totalCosto,
          esManual: false,
          animales_ids: animalIds,
        });
      }
    }
    if (resLabores.data) {
      todos = [...todos, ...resLabores.data.map((l: any) => ({
        id: l.id, fecha: l.fecha.split('T')[0], timestamp: l.created_at || l.fecha,
        tipo: 'EGRESO' as const, categoria: 'Agricultura / Semillas',
        detalle: `Lote Agrícola: ${l.actividad} ${l.cultivo ? '(' + l.cultivo + ')' : ''}`.trim(),
        monto: l.costo, esManual: false,
      }))];
    }
    if (resLotes.data) {
      todos = [...todos, ...resLotes.data.map((le: any) => ({
        id: le.id, fecha: le.fecha.split('T')[0], timestamp: le.created_at || le.fecha,
        tipo: 'EGRESO' as const, categoria: 'Alimentación / Nutrición',
        detalle: `Grupo/Lote: ${le.tipo} ${le.detalle ? `- ${le.detalle}` : ''}`.trim(),
        monto: le.costo, esManual: false,
      }))];
    }

    todos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setMovimientos(todos);
    setLoadingDatos(false);
  }

  const movimientosFiltrados = useMemo(() => {
    const hoy = new Date(); const currentMonth = hoy.getMonth(); const currentYear = hoy.getFullYear();
    return movimientos.filter(mov => {
      const matchBusqueda = mov.detalle.toLowerCase().includes(busqueda.toLowerCase()) || mov.categoria.toLowerCase().includes(busqueda.toLowerCase());
      const matchTipo = filtroTipo ? mov.tipo === filtroTipo : true;
      const matchCategoria = filtroCategoria ? mov.categoria === filtroCategoria : true;
      let matchFecha = true;
      if (filtroFecha !== 'siempre') {
        const fechaMov = new Date(mov.fecha + 'T12:00:00'); const m = fechaMov.getMonth(); const y = fechaMov.getFullYear();
        if (filtroFecha === 'este_mes') matchFecha = (m === currentMonth && y === currentYear);
        else if (filtroFecha === 'mes_pasado') { const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1; const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear; matchFecha = (m === prevMonth && y === prevYear); }
        else if (filtroFecha === 'ultimos_3') { const tresMesesAtras = new Date(); tresMesesAtras.setMonth(hoy.getMonth() - 3); matchFecha = fechaMov >= tresMesesAtras; }
        else if (filtroFecha === 'este_ano') matchFecha = y === currentYear;
      }
      return matchBusqueda && matchTipo && matchCategoria && matchFecha;
    });
  }, [movimientos, busqueda, filtroTipo, filtroCategoria, filtroFecha]);

  const totalIngresos = movimientosFiltrados.filter(m => m.tipo === 'INGRESO').reduce((acc, curr) => acc + curr.monto, 0);
  const totalEgresos = movimientosFiltrados.filter(m => m.tipo === 'EGRESO').reduce((acc, curr) => acc + curr.monto, 0);
  const saldoNeto = totalIngresos - totalEgresos;

  const hayFiltrosActivos = busqueda !== '' || filtroTipo !== null || filtroCategoria !== null;
  function limpiarFiltrosSecundarios() { setBusqueda(''); setFiltroTipo(null); setFiltroCategoria(null); }

  async function guardarMovimiento() {
    const montoFinal =
      tipoInput === 'EGRESO' && modoMonto === 'unitario'
        ? (precioUnitarioInput !== '' && cantidadInput !== '' ? Number(precioUnitarioInput) * Number(cantidadInput) : 0)
        : Number(montoInput);

    if (!fechaInput || !tipoInput || !categoriaInput || !detalleInput || !campoId) {
      notifications.show({ title: 'Campos incompletos', message: 'Completá todos los campos para registrar el movimiento.', color: 'red' }); return;
    }
    if (tipoInput === 'EGRESO' && modoMonto === 'total' && montoInput === '') {
      notifications.show({ title: 'Monto requerido', message: 'Ingresá el monto total del movimiento.', color: 'red' }); return;
    }
    if (tipoInput === 'EGRESO' && modoMonto === 'unitario' && (precioUnitarioInput === '' || cantidadInput === '')) {
      notifications.show({ title: 'Datos incompletos', message: 'Ingresá precio unitario y cantidad.', color: 'red' }); return;
    }
    if (tipoInput === 'INGRESO' && montoInput === '') {
      notifications.show({ title: 'Monto requerido', message: 'Ingresá el monto del ingreso.', color: 'red' }); return;
    }
    if (tipoInput === 'TRASLADO' && !campoDestinoInsumo) {
      notifications.show({ title: 'Destino requerido', message: 'Seleccioná el establecimiento de destino para el traslado.', color: 'red' }); return;
    }

    setLoading(true);
    if (tipoInput === 'TRASLADO') {
      const nombreDestino = establecimientos.find(e => e.id === campoDestinoInsumo)?.nombre || 'Otro Campo';
      const nombreOrigen = establecimientos.find(e => e.id === campoId)?.nombre || 'Origen';
      const egresoOrigen = { establecimiento_id: campoId, fecha: fechaInput, tipo: 'EGRESO', categoria: 'Traslado Insumo', detalle: `A campo ${nombreDestino}: ${detalleInput}`, monto: Number(montoInput) };
      const ingresoDestino = { establecimiento_id: campoDestinoInsumo, fecha: fechaInput, tipo: 'INGRESO', categoria: 'Traslado Insumo', detalle: `Desde campo ${nombreOrigen}: ${detalleInput}`, monto: Number(montoInput) };
      await supabase.from('caja').insert([egresoOrigen, ingresoDestino]);
    } else {
      const insertData: Record<string, unknown> = {
        establecimiento_id: campoId,
        fecha: fechaInput,
        tipo: tipoInput,
        categoria: categoriaInput,
        detalle: detalleInput,
        monto: montoFinal,
      };

      if (tipoInput === 'EGRESO') {
        if (modoMonto === 'unitario') {
          insertData.precio_unitario = Number(precioUnitarioInput);
          insertData.cantidad = Number(cantidadInput);
        }
        if (asignarA === 'animales' && animalesIdsInput.length > 0) {
          insertData.animales_ids = animalesIdsInput;
        } else if (asignarA === 'lote' && loteIdInput) {
          insertData.lote_id = loteIdInput;
          insertData.lote_nombre_en_momento = lotes.find(l => l.id === loteIdInput)?.nombre ?? null;
          // Snapshot de animales activos del lote al momento del gasto
          const snapshotIds = animalesActivos
            .filter(a => a.lote_id === loteIdInput)
            .map(a => a.id);
          if (snapshotIds.length > 0) insertData.animales_ids = snapshotIds;
        } else if (asignarA === 'potrero' && potreroIdInput) {
          insertData.potrero_id = potreroIdInput;
          insertData.potrero_nombre_en_momento = potreros.find(p => p.id === potreroIdInput)?.nombre ?? null;
          // Intencionalmente sin animales_ids — gasto de terreno, no por animal
        }
      }

      const { error } = await supabase.from('caja').insert([insertData]);
      if (error) notifications.show({ title: 'Error al guardar', message: error.message, color: 'red' });
    }

    setLoading(false);
    setDetalleInput('');
    setMontoInput('');
    setCampoDestinoInsumo(null);
    resetCamposEgreso();
    close();
    fetchTodosLosMovimientos();
  }

  async function verDetalleVenta(ventaId: string) {
    const { data: venta } = await supabase.from('ventas').select('*').eq('id', ventaId).single();
    if (!venta) return;
    let animalesData: { caravana: string; categoria: string; sexo: string }[] = venta.animales_detalle || [];
    if (animalesData.length === 0) {
      const { data: animalesVendidos } = await supabase.from('animales').select('caravana, categoria, sexo').in('id', venta.animales_ids);
      animalesData = animalesVendidos || [];
    }
    setVentaDetalle({
      animales: animalesData,
      animalesIds: venta.animales_ids ?? [],
      tipo: venta.tipo,
      destino: venta.destino,
      monto_total: venta.monto_total,
    });
    openVentaModal();
  }

  async function verDetalleAnimalesGasto(ids: string[], loteId?: string | null, loteNombreFallback?: string | null) {
    const { data } = await supabase.from('animales').select('caravana, categoria, sexo').in('id', ids);
    const loteName = loteId ? (lotes.find(l => l.id === loteId)?.nombre ?? loteNombreFallback ?? null) : null;
    setVentaDetalle({
      animales: data || [],
      animalesIds: ids,
      tipo: 'GASTO',
      destino: loteName || null,
      monto_total: 0,
      titulo: loteName ? `Animales del lote "${loteName}"` : 'Animales vinculados al gasto',
      loteNombreFallback: loteNombreFallback ?? undefined,
    });
    openVentaModal();
  }

  function borrarMovimientoManual(mov: Movimiento) {
    setConfirmModal({
      mensaje: '¿Borrar este movimiento manual de la caja?',
      color: 'red',
      onConfirm: () => _ejecutarBorradoMovimiento(mov),
    });
  }

  async function _ejecutarBorradoMovimiento(mov: Movimiento) {
    if (mov.categoria === 'Traslado Insumo' && mov.tipo === 'EGRESO') {
      await supabase.from('caja').delete().eq('id', mov.id);
      const baseDetalle = mov.detalle.split(': ')[1] || '';
      if (baseDetalle) await supabase.from('caja').delete().eq('categoria', 'Traslado Insumo').eq('tipo', 'INGRESO').eq('fecha', mov.fecha).eq('monto', mov.monto).like('detalle', `%${baseDetalle}`);
    } else {
      await supabase.from('caja').delete().eq('id', mov.id);
    }
    fetchTodosLosMovimientos();
  }

  // --- PANTALLA DE ACCESO RESTRINGIDO ---
  if (rolActual !== 'DUENO') return (
    <Center h={400}>
      <Stack align="center" gap="md">
        <ThemeIcon size={60} radius="xl" color="gray" variant="light"><IconLock size={30} /></ThemeIcon>
        <Text fw={600} size="lg">Acceso restringido</Text>
        <Text c="dimmed" ta="center" maw={300}>Solo el dueño del campo puede ver la información económica y financiera.</Text>
      </Stack>
    </Center>
  );

  if (loadingDatos) return <Center h={400}><Text c="dimmed">Cargando datos financieros...</Text></Center>;

  if (isLocked) {
    return (
      <Center style={{ height: '70vh' }}>
        <Paper p="xl" radius="md" withBorder ta="center" shadow="md" w={350}>
          <ThemeIcon size={60} radius="xl" color="red" mb="md" variant="light">
            <IconLock size={32} />
          </ThemeIcon>
          <Title order={3} mb="sm">Caja Bloqueada</Title>
          <Text c="dimmed" size="sm" mb="xl">Ingresá la clave de seguridad para acceder a las finanzas del establecimiento.</Text>
          <PasswordInput
            placeholder="Clave de acceso..."
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            mb="md"
            size="md"
          />
          <Button fullWidth color="red" size="md" onClick={handleUnlock}>Desbloquear Caja</Button>
        </Paper>
      </Center>
    );
  }

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Group align="center">
          <Title order={2}>Caja y Finanzas</Title>
          <ActionIcon variant="subtle" color="gray" onClick={() => setSaldosOcultos(!saldosOcultos)} title={saldosOcultos ? "Mostrar saldos" : "Ocultar saldos"}>
            {saldosOcultos ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          </ActionIcon>
          <ActionIcon variant="subtle" color={savedPin ? "red" : "gray"} onClick={() => { setNuevoPin(savedPin || ''); openModalPin(); }} title={savedPin ? "Modificar/Quitar Clave Global" : "Proteger Caja con Clave Global"}>
            {savedPin ? <IconLock size={20} /> : <IconLockOpen size={20} />}
          </ActionIcon>
        </Group>
        <Group>
          <Select value={filtroFecha} onChange={setFiltroFecha} data={[{ value: 'este_mes', label: 'Este Mes' }, { value: 'mes_pasado', label: 'Mes Pasado' }, { value: 'ultimos_3', label: 'Últimos 3 Meses' }, { value: 'este_ano', label: 'Este Año' }, { value: 'siempre', label: 'Histórico (Todo)' }]} allowDeselect={false} leftSection={<IconCalendar size={16} />} variant="filled" />
          <Menu shadow="md" width={240}>
            <Menu.Target><Button leftSection={<IconPlus size={20} />} color="green">Nuevo Movimiento</Button></Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconReceipt size={14} />} onClick={() => { setTipoInput('EGRESO'); setCategoriaInput('Infraestructura / Alambrados'); open(); }}>Ingreso/Egreso Estándar</Menu.Item>
              {rolActual === 'DUENO' && (
                <Menu.Item leftSection={<IconTruckDelivery size={14} />} onClick={() => { setTipoInput('TRASLADO'); setCategoriaInput('Traslado Insumo'); open(); }}>Traslado a Otro Campo</Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Card shadow="sm" radius="md" p="md" withBorder>
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon size="xl" radius="md" color="teal" variant="light"><IconTrendingUp /></ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700}>INGRESOS TOTALES</Text>
              <Text fw={700} size="xl" c="teal">{saldosOcultos ? '***' : `$${totalIngresos.toLocaleString('es-AR')}`}</Text>
            </div>
          </Group>
        </Card>
        <Card shadow="sm" radius="md" p="md" withBorder>
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon size="xl" radius="md" color="red" variant="light"><IconTrendingDown /></ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700}>EGRESOS (GASTOS)</Text>
              <Text fw={700} size="xl" c="red">{saldosOcultos ? '***' : `$${totalEgresos.toLocaleString('es-AR')}`}</Text>
            </div>
          </Group>
        </Card>
        <Card shadow="sm" radius="md" p="md" withBorder bg={saldoNeto > 0 ? 'green.0' : saldoNeto < 0 ? 'red.0' : 'gray.0'}>
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon size="xl" radius="md" color={saldoNeto > 0 ? 'green' : saldoNeto < 0 ? 'red' : 'gray'}><IconCurrencyDollar /></ThemeIcon>
            <div>
              <Text size="xs" fw={700} c={saldoNeto > 0 ? 'green.9' : saldoNeto < 0 ? 'red.9' : 'gray.7'}>BALANCE DEL PERÍODO</Text>
              <Text fw={900} size="xl" c={saldoNeto > 0 ? 'green.9' : saldoNeto < 0 ? 'red.9' : 'gray.7'}>{saldosOcultos ? '***' : `$${saldoNeto.toLocaleString('es-AR')}`}</Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      <Paper p="sm" radius="md" withBorder mb="lg" bg="gray.0">
        <Group grow align="center">
          <TextInput placeholder="Buscar detalle o concepto..." leftSection={<IconSearch size={16} />} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <Select placeholder="Tipo de Movimiento" data={[{ value: 'INGRESO', label: 'Solo Ingresos' }, { value: 'EGRESO', label: 'Solo Egresos' }]} value={filtroTipo} onChange={setFiltroTipo} clearable leftSection={<IconFilter size={16} />} />
          <Select placeholder="Filtrar por Categoría" data={categorias} value={filtroCategoria} onChange={setFiltroCategoria} clearable />
          {hayFiltrosActivos && (<Button variant="outline" color="red" onClick={limpiarFiltrosSecundarios} rightSection={<CloseButton size="sm" component="span" c="red" />} style={{ maxWidth: 150 }}>Limpiar</Button>)}
        </Group>
      </Paper>

      <Paper radius="md" withBorder style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }} h={570}>
        <Group p="md" bg="gray.0" style={{ borderBottom: '1px solid #eee' }}>
          <ThemeIcon variant="light" color="gray"><IconReceipt size={20} /></ThemeIcon>
          <Text fw={700}>Historial de Movimientos</Text>
          <Badge color="gray" variant="outline" ml="auto">{movimientosFiltrados.length} Registros</Badge>
        </Group>
        <ScrollArea style={{ flex: 1 }}>
          <Table striped highlightOnHover>
            <Table.Thead bg="gray.1" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Detalle</Table.Th><Table.Th ta="right">Ingreso</Table.Th><Table.Th ta="right">Egreso</Table.Th><Table.Th w={50}></Table.Th></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {movimientosFiltrados.length === 0 ? (
                <Table.Tr><Table.Td colSpan={6} ta="center" c="dimmed" p="xl">No hay movimientos que coincidan con tus filtros.</Table.Td></Table.Tr>
              ) : (
                movimientosFiltrados.map(mov => (
                  <Table.Tr key={`${mov.id}-${mov.esManual ? 'man' : 'auto'}`}>
                    <Table.Td fw={500}><Text size="sm">{formatDate(mov.fecha)}</Text></Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Badge color={mov.tipo === 'INGRESO' ? 'teal' : 'gray'} variant="light">{mov.categoria}</Badge>
                        {mov.esManual && (<Tooltip label="Cargado manualmente desde la caja" withArrow><Badge size="xs" color="blue" variant="filled">MANUAL</Badge></Tooltip>)}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm">{mov.detalle}</Text>
                        {mov.venta_id && (
                          <ActionIcon variant="subtle" color="blue" size="xs" onClick={() => verDetalleVenta(mov.venta_id!)}>
                            <IconInfoCircle size={14} />
                          </ActionIcon>
                        )}
                        {!mov.venta_id && mov.animales_ids && mov.animales_ids.length > 0 && (
                          <Tooltip
                            label={mov.lote_id ? `Ver animales del lote "${lotes.find(l => l.id === mov.lote_id)?.nombre || mov.lote_nombre_en_momento || ''}"` : 'Ver animales vinculados'}
                            withArrow
                          >
                            <ActionIcon variant="subtle" color="violet" size="xs" onClick={() => verDetalleAnimalesGasto(mov.animales_ids!, mov.lote_id, mov.lote_nombre_en_momento)}>
                              <IconInfoCircle size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {mov.potrero_id && (!mov.animales_ids || mov.animales_ids.length === 0) && (
                          <Text size="xs" c="dimmed">· {potreros.find(p => p.id === mov.potrero_id)?.nombre || mov.potrero_nombre_en_momento || ''}</Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right" c="teal" fw={700}>{mov.tipo === 'INGRESO' ? `$${mov.monto.toLocaleString('es-AR')}` : '-'}</Table.Td>
                    <Table.Td ta="right" c="red" fw={700}>{mov.tipo === 'EGRESO' ? `$${mov.monto.toLocaleString('es-AR')}` : '-'}</Table.Td>
                    <Table.Td align="right">
                      {mov.esManual ? (
                        <ActionIcon color="red" variant="subtle" size="sm" onClick={() => borrarMovimientoManual(mov)}><IconTrash size={16} /></ActionIcon>
                      ) : (
                        <Tooltip label="Este movimiento es automático. Para borrarlo o editarlo, andá a la ficha del animal o potrero correspondiente." withArrow position="left" maw={250} multiline>
                          <IconTrash size={16} color="#e9ecef" style={{ cursor: 'not-allowed' }} />
                        </Tooltip>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* MODAL CONFIRMACIÓN */}
      <Modal opened={!!confirmModal} onClose={() => setConfirmModal(null)} title={<Text fw={700}>Confirmar acción</Text>} centered size="sm">
        <Stack>
          <Text>{confirmModal?.mensaje}</Text>
          <Group grow mt="sm">
            <Button variant="default" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            <Button color={confirmModal?.color || 'red'} onClick={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>Confirmar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* MODAL CONFIGURAR CLAVE */}
      <Modal opened={modalPinOpen} onClose={closeModalPin} title={<Text fw={700}>Seguridad de la Caja</Text>} centered>
        <Stack>
          <Text size="sm" c="dimmed">Esta clave bloqueará el acceso a las finanzas a nivel de cuenta. Cualquiera que acceda (incluso desde otro celular) deberá ingresarla. Para quitar la clave, guardá el campo en blanco.</Text>
          <PasswordInput label="Clave Global de Seguridad" placeholder="Escribí una clave..." value={nuevoPin} onChange={(e) => setNuevoPin(e.target.value)} />
          <Button color={nuevoPin ? "green" : "red"} onClick={handleGuardarPin} loading={loadingPin}>
            {nuevoPin ? "Guardar Clave" : "Eliminar Clave"}
          </Button>
        </Stack>
      </Modal>

      {/* MODAL DETALLE ANIMALES (ventas + gastos vinculados) */}
      <Modal
        opened={ventaModalOpen}
        onClose={closeVentaModal}
        title={<Text fw={700}>{ventaDetalle?.titulo || (ventaDetalle?.tipo === 'COMPRA_RED' ? 'Animales comprados' : 'Animales vendidos')}</Text>}
        centered
      >
        {ventaDetalle && (() => {
          const loteDelModal = (() => {
            const ids = ventaDetalle.animalesIds;
            if (!ids?.length) return null;
            const loteIds = ids.map(id => animales.find(a => a.id === id)?.lote_id ?? null);
            if (loteIds.some(lid => !lid)) return null;
            const unique = [...new Set(loteIds)];
            if (unique.length !== 1) return null;
            const found = lotes.find(l => l.id === unique[0]);
            if (found) return found;
            if (ventaDetalle.loteNombreFallback) return { id: unique[0] as string, nombre: ventaDetalle.loteNombreFallback };
            return null;
          })();
          return (
          <Stack>
            <Group>
              {ventaDetalle.tipo !== 'GASTO' && <Badge color="teal">{ventaDetalle.tipo}</Badge>}
              {ventaDetalle.destino && <Text size="sm" c="dimmed">{ventaDetalle.destino}</Text>}
            </Group>
            <Text size="sm" fw={500}>
              {ventaDetalle.animales.length} animales{ventaDetalle.tipo !== 'GASTO' ? ` · Total: $${ventaDetalle.monto_total.toLocaleString('es-AR')}` : ''}
            </Text>
            {loteDelModal && (
              <Badge color="violet" variant="light" leftSection={<IconPackage size={12} />}>
                Lote: {loteDelModal.nombre}
              </Badge>
            )}
            <ScrollArea h={300}>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Caravana</Table.Th>
                    <Table.Th>Categoría</Table.Th>
                    <Table.Th>Sexo</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {ventaDetalle.animales.map((a, i) => (
                    <Table.Tr key={i}>
                      <Table.Td fw={700}>{a.caravana}</Table.Td>
                      <Table.Td>{a.categoria}</Table.Td>
                      <Table.Td>{a.sexo === 'M' ? 'Macho' : 'Hembra'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
          );
        })()}
      </Modal>

      {/* MODAL REGISTRAR MOVIMIENTO */}
      <Modal
        opened={opened}
        onClose={() => { close(); setDetalleInput(''); setMontoInput(''); setCampoDestinoInsumo(null); resetCamposEgreso(); }}
        title={<Text fw={700} size="lg">{tipoInput === 'TRASLADO' ? 'Traslado a Otro Campo' : 'Registrar en Caja'}</Text>}
        centered
        zIndex={2000}
      >
        <Stack>
          <Group grow>
            <TextInput label="Fecha" type="date" value={fechaInput} onChange={(e) => setFechaInput(e.target.value)} />
            {tipoInput !== 'TRASLADO' && (
              <Select
                label="Tipo"
                data={['INGRESO', 'EGRESO']}
                value={tipoInput}
                onChange={(v) => { setTipoInput(v); resetCamposEgreso(); setMontoInput(''); }}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true, zIndex: 10000 }}
              />
            )}
          </Group>

          {tipoInput === 'TRASLADO' ? (
            <Select
              label="Campo Destino"
              placeholder="Seleccionar establecimiento"
              data={establecimientos.filter(e => e.id !== campoId).map(e => ({ value: e.id, label: e.nombre }))}
              value={campoDestinoInsumo}
              onChange={setCampoDestinoInsumo}
              comboboxProps={{ withinPortal: true, zIndex: 10000 }}
            />
          ) : (
            <Select
              label="Categoría"
              data={categorias}
              value={categoriaInput}
              onChange={setCategoriaInput}
              searchable
              comboboxProps={{ withinPortal: true, zIndex: 10000 }}
            />
          )}

          <TextInput
            label={tipoInput === 'TRASLADO' ? "Insumos a trasladar" : "Detalle / Concepto"}
            placeholder={tipoInput === 'TRASLADO' ? "Ej: 2 Rollos de Alfalfa" : "Ej: Compra de vacunas"}
            value={detalleInput}
            onChange={(e) => setDetalleInput(e.target.value)}
          />

          {tipoInput === 'EGRESO' ? (
            <>
              <div>
                <Text size="sm" fw={500} mb={4}>Modo de carga del monto</Text>
                <SegmentedControl
                  value={modoMonto}
                  onChange={(v) => { setModoMonto(v as 'total' | 'unitario'); setMontoInput(''); setPrecioUnitarioInput(''); setCantidadInput(''); }}
                  data={[{ value: 'total', label: 'Monto total' }, { value: 'unitario', label: 'Precio unitario × cantidad' }]}
                  fullWidth
                />
              </div>

              {modoMonto === 'total' ? (
                <NumberInput
                  label="Monto Total ($)"
                  placeholder="0.00"
                  value={montoInput}
                  onChange={(val) => setMontoInput(val === '' ? '' : Number(val))}
                  hideControls
                  leftSection={<IconCurrencyDollar size={16} />}
                />
              ) : (
                <Stack gap="xs">
                  <Group grow>
                    <NumberInput
                      label="Precio unitario ($)"
                      placeholder="0.00"
                      value={precioUnitarioInput}
                      onChange={(val) => setPrecioUnitarioInput(val === '' ? '' : Number(val))}
                      hideControls
                      leftSection={<IconCurrencyDollar size={16} />}
                    />
                    <NumberInput
                      label="Cantidad"
                      placeholder="1"
                      value={cantidadInput}
                      onChange={(val) => setCantidadInput(val === '' ? '' : Number(val))}
                      hideControls
                    />
                  </Group>
                  {montoCalculado !== null && (
                    <Text size="sm" c="dimmed">
                      Total: <Text span fw={700} c="dark">${montoCalculado.toLocaleString('es-AR')}</Text>
                    </Text>
                  )}
                </Stack>
              )}

              <Select
                label="Asignar a (opcional)"
                data={[
                  { value: 'ninguno', label: 'Ninguno' },
                  { value: 'animales', label: 'Animal(es) específico(s)' },
                  { value: 'lote', label: 'Lote' },
                  { value: 'potrero', label: 'Potrero' },
                ]}
                value={asignarA}
                onChange={(v) => { setAsignarA(v); setAnimalesIdsInput([]); setLoteIdInput(null); setPotreroIdInput(null); }}
                comboboxProps={{ withinPortal: true, zIndex: 10000 }}
              />

              {asignarA === 'animales' && (() => {
                const animalesOrdenados = [...animalesActivos].sort((a, b) =>
                  a.caravana.localeCompare(b.caravana, 'es', { numeric: true })
                );
                const animalesFiltrados = animalesOrdenados.filter(a =>
                  a.caravana.toLowerCase().includes(busquedaAnimales.toLowerCase())
                );
                return (
                  <Stack gap="xs">
                    <Group justify="space-between" align="center">
                      <Text size="sm" fw={500}>Animales</Text>
                      {animalesIdsInput.length > 0 && (
                        <Badge variant="light" color="violet">{animalesIdsInput.length} seleccionados</Badge>
                      )}
                    </Group>
                    <TextInput
                      placeholder="Buscar por caravana..."
                      value={busquedaAnimales}
                      onChange={(e) => setBusquedaAnimales(e.target.value)}
                      leftSection={<IconSearch size={14} />}
                      size="xs"
                    />
                    <ScrollArea h={200} style={{ border: '1px solid #dee2e6', borderRadius: 6 }}>
                      <Stack gap={0} p={4}>
                        {animalesFiltrados.length === 0 ? (
                          <Text size="xs" c="dimmed" ta="center" py={8}>Sin resultados</Text>
                        ) : animalesFiltrados.map(animal => (
                          <Group
                            key={animal.id}
                            gap="xs"
                            py={5}
                            px={6}
                            style={{ cursor: 'pointer', borderRadius: 4 }}
                            onClick={() => toggleAnimalSeleccionado(animal.id)}
                            bg={animalesIdsInput.includes(animal.id) ? 'violet.0' : undefined}
                          >
                            <Checkbox
                              checked={animalesIdsInput.includes(animal.id)}
                              onChange={() => {}}
                              size="xs"
                              readOnly
                              color="violet"
                            />
                            <Text size="sm" fw={600}>{animal.caravana}</Text>
                            <Text size="xs" c="dimmed">{animal.categoria}</Text>
                          </Group>
                        ))}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                );
              })()}
              {asignarA === 'lote' && (
                <Select
                  label="Lote"
                  placeholder="Seleccionar lote..."
                  searchable
                  data={lotes.map(l => ({ value: l.id, label: l.nombre }))}
                  value={loteIdInput}
                  onChange={setLoteIdInput}
                  comboboxProps={{ withinPortal: true, zIndex: 10000 }}
                />
              )}
              {asignarA === 'potrero' && (
                <Select
                  label="Potrero"
                  placeholder="Seleccionar potrero..."
                  searchable
                  data={potreros.map(p => ({ value: p.id, label: p.nombre }))}
                  value={potreroIdInput}
                  onChange={setPotreroIdInput}
                  comboboxProps={{ withinPortal: true, zIndex: 10000 }}
                />
              )}
            </>
          ) : (
            <NumberInput
              label="Valor Equivalente ($)"
              placeholder="0.00"
              value={montoInput}
              onChange={(val) => setMontoInput(val === '' ? '' : Number(val))}
              hideControls
              leftSection={<IconCurrencyDollar size={16} />}
            />
          )}

          <Button
            mt="md"
            color={tipoInput === 'TRASLADO' ? "blue" : "green"}
            onClick={guardarMovimiento}
            loading={loading}
            leftSection={tipoInput === 'TRASLADO' ? <IconTruckDelivery size={18} /> : <IconCheck size={18} />}
          >
            {tipoInput === 'TRASLADO' ? 'Ejecutar Traslado Contable' : 'Guardar Movimiento'}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
