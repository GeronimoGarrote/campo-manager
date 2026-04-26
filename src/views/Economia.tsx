import { useState, useEffect, useMemo } from 'react';
import { Title, Paper, Text, Group, Card, SimpleGrid, ThemeIcon, Table, Badge, ActionIcon, ScrollArea, Modal, Stack, TextInput, Select, NumberInput, Button, Tooltip, CloseButton, Menu, Center, PasswordInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCurrencyDollar, IconTrendingUp, IconTrendingDown, IconPlus, IconTrash, IconReceipt, IconSearch, IconFilter, IconCalendar, IconTruckDelivery, IconCheck, IconEye, IconEyeOff, IconLock, IconLockOpen } from '@tabler/icons-react';
import { supabase } from '../supabase';

interface Establecimiento { id: string; nombre: string; renspa?: string; }
interface EconomiaProps { campoId: string; establecimientos?: Establecimiento[]; }
interface Movimiento { id: string; fecha: string; timestamp: string; tipo: 'INGRESO' | 'EGRESO'; categoria: string; detalle: string; monto: number; esManual: boolean; }

// ACÁ ESTÁ EL CAMBIO (slice(-2) al año)
const formatDate = (dateString: string) => { if (!dateString) return '-'; const parts = dateString.split('T')[0].split('-'); return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`; };
const getHoyIso = () => { const d = new Date(); const offset = d.getTimezoneOffset(); return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]; };

export default function Economia({ campoId, establecimientos = [] }: EconomiaProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [saldosOcultos, setSaldosOcultos] = useState(false);
  
  // --- MAGIA EN LA NUBE: SISTEMA DE BLOQUEO DE CAJA ---
  const [isLocked, setIsLocked] = useState(false);
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [modalPinOpen, { open: openModalPin, close: closeModalPin }] = useDisclosure(false);
  const [nuevoPin, setNuevoPin] = useState('');
  const [loadingPin, setLoadingPin] = useState(false);
  // -----------------------------------------------------

  const [opened, { open, close }] = useDisclosure(false);
  const [fechaInput, setFechaInput] = useState<string>(getHoyIso());
  const [tipoInput, setTipoInput] = useState<string | null>('EGRESO');
  const [categoriaInput, setCategoriaInput] = useState<string | null>('Infraestructura / Alambrados');
  const [detalleInput, setDetalleInput] = useState('');
  const [montoInput, setMontoInput] = useState<number | ''>('');
  
  const [campoDestinoInsumo, setCampoDestinoInsumo] = useState<string | null>(null);

  const [filtroFecha, setFiltroFecha] = useState<string | null>('este_mes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

  const categorias = ['Alquileres', 'Alimentación / Nutrición', 'Sanidad Veterinaria', 'Agricultura / Semillas', 'Maquinaria / Combustible', 'Infraestructura / Alambrados', 'Sueldos / Honorarios', 'Impuestos / Servicios', 'Traslado Insumo', 'Otros'];

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
          alert("❌ Clave incorrecta");
      }
  };

  const handleGuardarPin = async () => {
      setLoadingPin(true);
      // Guardamos la clave en la tabla establecimientos, atada a este campo
      const { error } = await supabase.from('establecimientos').update({ pin_caja: nuevoPin || null }).eq('id', campoId);
      setLoadingPin(false);

      if (error) {
          alert("Error al actualizar la clave en la nube: " + error.message);
      } else {
          setSavedPin(nuevoPin || null);
          if (!nuevoPin) setIsLocked(false); // Si la borró, destrabamos al instante
          alert(nuevoPin ? "🔒 Clave configurada. Se pedirá en todos los dispositivos." : "🔓 Clave eliminada para todos.");
          closeModalPin();
      }
  };

  async function fetchTodosLosMovimientos() {
    if (!campoId) return; 
    const pCaja = supabase.from('caja').select('*').eq('establecimiento_id', campoId);
    
    const pEventos = supabase.from('eventos').select('id, fecha_evento, tipo, detalle, resultado, costo, created_at, animales(caravana)')
        .eq('establecimiento_id', campoId)
        .gt('costo', 0)
        .not('tipo', 'in', '("VENTA","COMPRA","TRASLADO_SALIDA","TRASLADO_INGRESO")');
        
    const pLabores = supabase.from('labores').select('id, fecha, actividad, cultivo, detalle, costo, created_at').eq('establecimiento_id', campoId).gt('costo', 0);
    const pLotes = supabase.from('lotes_eventos').select('id, fecha, tipo, detalle, costo, created_at').eq('establecimiento_id', campoId).gt('costo', 0);

    const [resCaja, resEventos, resLabores, resLotes] = await Promise.all([pCaja, pEventos, pLabores, pLotes]);
    let todos: Movimiento[] = [];

    if (resCaja.data) {
      todos = [...todos, ...resCaja.data.map(m => ({
        id: m.id, fecha: m.fecha, timestamp: m.created_at || m.fecha, tipo: m.tipo, categoria: m.categoria, detalle: m.detalle, monto: m.monto, 
        esManual: m.categoria !== 'Hacienda (Venta/Compra)' && !(m.categoria === 'Traslado Insumo' && m.tipo === 'INGRESO')
      }))];
    }
    if (resEventos.data) {
      todos = [...todos, ...resEventos.data.map((e: any) => ({ id: e.id, fecha: e.fecha_evento.split('T')[0], timestamp: e.created_at || e.fecha_evento, tipo: 'EGRESO' as const, categoria: 'Sanidad Veterinaria', detalle: `Vaca ${e.animales?.caravana || '?'}: ${e.tipo} ${e.detalle ? `- ${e.detalle}` : ''}`.trim(), monto: e.costo, esManual: false }))];
    }
    if (resLabores.data) {
      todos = [...todos, ...resLabores.data.map((l: any) => ({ id: l.id, fecha: l.fecha.split('T')[0], timestamp: l.created_at || l.fecha, tipo: 'EGRESO' as const, categoria: 'Agricultura / Semillas', detalle: `Lote Agrícola: ${l.actividad} ${l.cultivo ? '('+l.cultivo+')' : ''}`.trim(), monto: l.costo, esManual: false }))];
    }
    if (resLotes.data) {
      todos = [...todos, ...resLotes.data.map((le: any) => ({ id: le.id, fecha: le.fecha.split('T')[0], timestamp: le.created_at || le.fecha, tipo: 'EGRESO' as const, categoria: 'Alimentación / Nutrición', detalle: `Grupo/Lote: ${le.tipo} ${le.detalle ? `- ${le.detalle}` : ''}`.trim(), monto: le.costo, esManual: false }))];
    }

    todos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setMovimientos(todos); setLoadingDatos(false);
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
    if (!fechaInput || !tipoInput || !categoriaInput || !detalleInput || montoInput === '' || !campoId) return alert("Completá todos los campos para registrar el movimiento en caja.");
    if (tipoInput === 'TRASLADO' && !campoDestinoInsumo) return alert("Seleccioná el establecimiento de destino para el traslado.");

    setLoading(true);
    if (tipoInput === 'TRASLADO') {
        const nombreDestino = establecimientos.find(e => e.id === campoDestinoInsumo)?.nombre || 'Otro Campo';
        const nombreOrigen = establecimientos.find(e => e.id === campoId)?.nombre || 'Origen';
        const egresoOrigen = { establecimiento_id: campoId, fecha: fechaInput, tipo: 'EGRESO', categoria: 'Traslado Insumo', detalle: `A campo ${nombreDestino}: ${detalleInput}`, monto: Number(montoInput) };
        const ingresoDestino = { establecimiento_id: campoDestinoInsumo, fecha: fechaInput, tipo: 'INGRESO', categoria: 'Traslado Insumo', detalle: `Desde campo ${nombreOrigen}: ${detalleInput}`, monto: Number(montoInput) };
        await supabase.from('caja').insert([egresoOrigen, ingresoDestino]);
    } else {
        const { error } = await supabase.from('caja').insert([{ establecimiento_id: campoId, fecha: fechaInput, tipo: tipoInput, categoria: categoriaInput, detalle: detalleInput, monto: Number(montoInput) }]);
        if (error) alert("Error guardando el movimiento: " + error.message);
    }
    
    setLoading(false); setDetalleInput(''); setMontoInput(''); setCampoDestinoInsumo(null); close(); fetchTodosLosMovimientos();
  }

  async function borrarMovimientoManual(mov: Movimiento) {
    if (!confirm("¿Borrar este movimiento manual de la caja?")) return;
    if (mov.categoria === 'Traslado Insumo' && mov.tipo === 'EGRESO') {
        await supabase.from('caja').delete().eq('id', mov.id);
        const baseDetalle = mov.detalle.split(': ')[1] || '';
        if (baseDetalle) await supabase.from('caja').delete().eq('categoria', 'Traslado Insumo').eq('tipo', 'INGRESO').eq('fecha', mov.fecha).eq('monto', mov.monto).like('detalle', `%${baseDetalle}`);
    } else { await supabase.from('caja').delete().eq('id', mov.id); }
    fetchTodosLosMovimientos();
  }

  // --- PANTALLA DE BLOQUEO ---
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
          <Select value={filtroFecha} onChange={setFiltroFecha} data={[ { value: 'este_mes', label: 'Este Mes' }, { value: 'mes_pasado', label: 'Mes Pasado' }, { value: 'ultimos_3', label: 'Últimos 3 Meses' }, { value: 'este_ano', label: 'Este Año' }, { value: 'siempre', label: 'Histórico (Todo)' } ]} allowDeselect={false} leftSection={<IconCalendar size={16}/>} variant="filled" />
          <Menu shadow="md" width={240}>
            <Menu.Target><Button leftSection={<IconPlus size={20} />} color="green">Nuevo Movimiento</Button></Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconReceipt size={14} />} onClick={() => { setTipoInput('EGRESO'); setCategoriaInput('Infraestructura / Alambrados'); open(); }}>Ingreso/Egreso Estándar</Menu.Item>
              <Menu.Item leftSection={<IconTruckDelivery size={14} />} onClick={() => { setTipoInput('TRASLADO'); setCategoriaInput('Traslado Insumo'); open(); }}>Traslado a Otro Campo</Menu.Item>
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
              <TextInput placeholder="Buscar detalle o concepto..." leftSection={<IconSearch size={16}/>} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              <Select placeholder="Tipo de Movimiento" data={[ { value: 'INGRESO', label: 'Solo Ingresos' }, { value: 'EGRESO', label: 'Solo Egresos' } ]} value={filtroTipo} onChange={setFiltroTipo} clearable leftSection={<IconFilter size={16}/>} />
              <Select placeholder="Filtrar por Categoría" data={categorias} value={filtroCategoria} onChange={setFiltroCategoria} clearable />
              {hayFiltrosActivos && (<Button variant="outline" color="red" onClick={limpiarFiltrosSecundarios} rightSection={<CloseButton size="sm" component="span" c="red"/>} style={{ maxWidth: 150 }}>Limpiar</Button>)}
          </Group>
      </Paper>

      <Paper radius="md" withBorder style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }} h={570}>
        <Group p="md" bg="gray.0" style={{ borderBottom: '1px solid #eee' }}>
            <ThemeIcon variant="light" color="gray"><IconReceipt size={20}/></ThemeIcon>
            <Text fw={700}>Historial de Movimientos</Text>
            <Badge color="gray" variant="outline" ml="auto">{movimientosFiltrados.length} Registros</Badge>
        </Group>
        <ScrollArea style={{ flex: 1 }}>
            <Table striped highlightOnHover>
              <Table.Thead bg="gray.1" style={{ position: 'sticky', top: 0, zIndex: 1 }}><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Detalle</Table.Th><Table.Th ta="right">Ingreso</Table.Th><Table.Th ta="right">Egreso</Table.Th><Table.Th w={50}></Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {movimientosFiltrados.length === 0 ? (<Table.Tr><Table.Td colSpan={6} ta="center" c="dimmed" p="xl">No hay movimientos que coincidan con tus filtros.</Table.Td></Table.Tr>) : (
                  movimientosFiltrados.map(mov => (
                    <Table.Tr key={`${mov.id}-${mov.esManual ? 'man' : 'auto'}`}>
                      <Table.Td fw={500}><Text size="sm">{formatDate(mov.fecha)}</Text></Table.Td>
                      <Table.Td>
                          <Group gap="xs" wrap="nowrap"><Badge color={mov.tipo === 'INGRESO' ? 'teal' : 'gray'} variant="light">{mov.categoria}</Badge>
                              {mov.esManual && (<Tooltip label="Cargado manualmente desde la caja" withArrow><Badge size="xs" color="blue" variant="filled">MANUAL</Badge></Tooltip>)}
                          </Group>
                      </Table.Td>
                      <Table.Td><Text size="sm">{mov.detalle}</Text></Table.Td>
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

      {/* MODAL CONFIGURAR CLAVE */}
      <Modal opened={modalPinOpen} onClose={closeModalPin} title={<Text fw={700}>Seguridad de la Caja</Text>} centered>
          <Stack>
              <Text size="sm" c="dimmed">Esta clave bloqueará el acceso a las finanzas a nivel de cuenta. Cualquiera que acceda (incluso desde otro celular) deberá ingresarla. Para quitar la clave, guardá el campo en blanco.</Text>
              <PasswordInput 
                  label="Clave Global de Seguridad" 
                  placeholder="Escribí una clave..." 
                  value={nuevoPin} 
                  onChange={(e) => setNuevoPin(e.target.value)} 
              />
              <Button color={nuevoPin ? "green" : "red"} onClick={handleGuardarPin} loading={loadingPin}>
                  {nuevoPin ? "Guardar Clave" : "Eliminar Clave"}
              </Button>
          </Stack>
      </Modal>

      <Modal opened={opened} onClose={close} title={<Text fw={700} size="lg">{tipoInput === 'TRASLADO' ? 'Traslado a Otro Campo' : 'Registrar en Caja'}</Text>} centered zIndex={2000}>
        <Stack>
          <Group grow>
            <TextInput label="Fecha" type="date" value={fechaInput} onChange={(e) => setFechaInput(e.target.value)} />
            {tipoInput !== 'TRASLADO' && (<Select label="Tipo" data={['INGRESO', 'EGRESO']} value={tipoInput} onChange={setTipoInput} allowDeselect={false} comboboxProps={{ withinPortal: true, zIndex: 10000 }} />)}
          </Group>
          {tipoInput === 'TRASLADO' ? (
              <Select label="Campo Destino" placeholder="Seleccionar establecimiento" data={establecimientos.filter(e => e.id !== campoId).map(e => ({ value: e.id, label: e.nombre }))} value={campoDestinoInsumo} onChange={setCampoDestinoInsumo} comboboxProps={{ withinPortal: true, zIndex: 10000 }} />
          ) : (
              <Select label="Categoría" data={categorias} value={categoriaInput} onChange={setCategoriaInput} searchable comboboxProps={{ withinPortal: true, zIndex: 10000 }} />
          )}
          <TextInput label={tipoInput === 'TRASLADO' ? "Insumos a trasladar" : "Detalle / Concepto"} placeholder={tipoInput === 'TRASLADO' ? "Ej: 2 Rollos de Alfalfa" : "Ej: Compra de vacunas"} value={detalleInput} onChange={(e) => setDetalleInput(e.target.value)} />
          <NumberInput label="Valor Equivalente ($)" placeholder="0.00" value={montoInput} onChange={(val) => setMontoInput(val === '' ? '' : Number(val))} hideControls leftSection={<IconCurrencyDollar size={16} />} />
          <Button mt="md" color={tipoInput === 'TRASLADO' ? "blue" : "green"} onClick={guardarMovimiento} loading={loading} leftSection={tipoInput === 'TRASLADO' ? <IconTruckDelivery size={18} /> : <IconCheck size={18} />}>
            {tipoInput === 'TRASLADO' ? 'Ejecutar Traslado Contable' : 'Guardar Movimiento'}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}