import { useState, useEffect, useMemo } from 'react';
import { Title, Paper, Text, Group, Card, SimpleGrid, ThemeIcon, Table, Badge, ActionIcon, ScrollArea, Modal, Stack, TextInput, Select, NumberInput, Button, Tooltip, CloseButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCurrencyDollar, IconTrendingUp, IconTrendingDown, IconPlus, IconTrash, IconReceipt, IconRobot, IconSearch, IconFilter, IconCalendar } from '@tabler/icons-react';
import { supabase } from './supabase';

interface EconomiaProps {
  campoId: string;
}

interface Movimiento {
  id: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  categoria: string;
  detalle: string;
  monto: number;
  esManual: boolean;
}

const formatDate = (dateString: string) => { 
  if (!dateString) return '-'; 
  const parts = dateString.split('T')[0].split('-'); 
  return `${parts[2]}/${parts[1]}/${parts[0]}`; 
};

const getHoyIso = () => { 
  const d = new Date(); 
  const offset = d.getTimezoneOffset(); 
  return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0]; 
};

export default function Economia({ campoId }: EconomiaProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(true);
  
  // Modal State
  const [opened, { open, close }] = useDisclosure(false);
  const [fechaInput, setFechaInput] = useState<string>(getHoyIso());
  const [tipoInput, setTipoInput] = useState<string | null>('EGRESO');
  const [categoriaInput, setCategoriaInput] = useState<string | null>('Infraestructura / Alambrados');
  const [detalleInput, setDetalleInput] = useState('');
  const [montoInput, setMontoInput] = useState<number | ''>('');

  // Filtros State
  const [filtroFecha, setFiltroFecha] = useState<string | null>('este_mes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

  const categorias = [
    'Hacienda (Venta/Compra)', 'Alimentación / Nutrición', 'Sanidad Veterinaria', 
    'Agricultura / Semillas', 'Maquinaria / Combustible', 'Infraestructura / Alambrados', 
    'Sueldos / Honorarios', 'Impuestos / Servicios', 'Otros'
  ];

  useEffect(() => {
    fetchTodosLosMovimientos();
  }, [campoId]);

  async function fetchTodosLosMovimientos() {
    if (!campoId) return;
    setLoadingDatos(true);

    const pCaja = supabase.from('caja').select('*').eq('establecimiento_id', campoId);
    const pEventos = supabase.from('eventos').select('id, fecha_evento, tipo, detalle, resultado, costo, animales(caravana)').eq('establecimiento_id', campoId).gt('costo', 0);
    const pLabores = supabase.from('labores').select('id, fecha, actividad, cultivo, detalle, costo').eq('establecimiento_id', campoId).gt('costo', 0);
    const pLotes = supabase.from('lotes_eventos').select('id, fecha, tipo, detalle, costo').eq('establecimiento_id', campoId).gt('costo', 0);

    const [resCaja, resEventos, resLabores, resLotes] = await Promise.all([pCaja, pEventos, pLabores, pLotes]);

    let todos: Movimiento[] = [];

    if (resCaja.data) {
      todos = [...todos, ...resCaja.data.map(m => ({
        id: m.id, fecha: m.fecha, tipo: m.tipo, categoria: m.categoria, detalle: m.detalle, monto: m.monto, esManual: true
      }))];
    }

    if (resEventos.data) {
      todos = [...todos, ...resEventos.data.map((e: any) => ({
        id: e.id, 
        fecha: e.fecha_evento.split('T')[0], 
        tipo: 'EGRESO' as const, 
        categoria: 'Sanidad Veterinaria', 
        detalle: `Vaca ${e.animales?.caravana || '?'}: ${e.tipo} ${e.detalle ? `- ${e.detalle}` : ''}`.trim(), 
        monto: e.costo, 
        esManual: false
      }))];
    }

    if (resLabores.data) {
      todos = [...todos, ...resLabores.data.map((l: any) => ({
        id: l.id, 
        fecha: l.fecha.split('T')[0], 
        tipo: 'EGRESO' as const, 
        categoria: 'Agricultura / Semillas', 
        detalle: `Lote Agrícola: ${l.actividad} ${l.cultivo ? '('+l.cultivo+')' : ''}`.trim(), 
        monto: l.costo, 
        esManual: false
      }))];
    }

    if (resLotes.data) {
      todos = [...todos, ...resLotes.data.map((le: any) => ({
        id: le.id, 
        fecha: le.fecha.split('T')[0], 
        tipo: 'EGRESO' as const, 
        categoria: 'Alimentación / Nutrición', 
        detalle: `Grupo/Lote: ${le.tipo} ${le.detalle ? `- ${le.detalle}` : ''}`.trim(), 
        monto: le.costo, 
        esManual: false
      }))];
    }

    todos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    setMovimientos(todos);
    setLoadingDatos(false);
  }

  // --- MOTOR DE FILTROS ---
  const movimientosFiltrados = useMemo(() => {
    const hoy = new Date();
    const currentMonth = hoy.getMonth();
    const currentYear = hoy.getFullYear();

    return movimientos.filter(mov => {
      // 1. Filtro de Búsqueda (Texto)
      const matchBusqueda = mov.detalle.toLowerCase().includes(busqueda.toLowerCase()) || 
                            mov.categoria.toLowerCase().includes(busqueda.toLowerCase());
      
      // 2. Filtro de Tipo (Ingreso/Egreso)
      const matchTipo = filtroTipo ? mov.tipo === filtroTipo : true;
      
      // 3. Filtro de Categoría
      const matchCategoria = filtroCategoria ? mov.categoria === filtroCategoria : true;

      // 4. Filtro Maestro de Fecha
      let matchFecha = true;
      if (filtroFecha !== 'siempre') {
        const fechaMov = new Date(mov.fecha + 'T12:00:00'); // Evita desfase horario
        const m = fechaMov.getMonth();
        const y = fechaMov.getFullYear();

        if (filtroFecha === 'este_mes') {
          matchFecha = (m === currentMonth && y === currentYear);
        } else if (filtroFecha === 'mes_pasado') {
          const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          matchFecha = (m === prevMonth && y === prevYear);
        } else if (filtroFecha === 'ultimos_3') {
          const tresMesesAtras = new Date();
          tresMesesAtras.setMonth(hoy.getMonth() - 3);
          matchFecha = fechaMov >= tresMesesAtras;
        } else if (filtroFecha === 'este_ano') {
          matchFecha = y === currentYear;
        }
      }

      return matchBusqueda && matchTipo && matchCategoria && matchFecha;
    });
  }, [movimientos, busqueda, filtroTipo, filtroCategoria, filtroFecha]);

  // Cálculos reactivos basados en lo que está filtrado
  const totalIngresos = movimientosFiltrados.filter(m => m.tipo === 'INGRESO').reduce((acc, curr) => acc + curr.monto, 0);
  const totalEgresos = movimientosFiltrados.filter(m => m.tipo === 'EGRESO').reduce((acc, curr) => acc + curr.monto, 0);
  const saldoNeto = totalIngresos - totalEgresos;

  const hayFiltrosActivos = busqueda !== '' || filtroTipo !== null || filtroCategoria !== null;

  function limpiarFiltrosSecundarios() {
    setBusqueda('');
    setFiltroTipo(null);
    setFiltroCategoria(null);
  }

  async function guardarMovimiento() {
    if (!fechaInput || !tipoInput || !categoriaInput || !detalleInput || montoInput === '' || !campoId) {
      return alert("Completá todos los campos para registrar el movimiento en caja.");
    }
    
    setLoading(true);
    const { error } = await supabase.from('caja').insert([{
      establecimiento_id: campoId,
      fecha: fechaInput,
      tipo: tipoInput,
      categoria: categoriaInput,
      detalle: detalleInput,
      monto: Number(montoInput)
    }]);
    setLoading(false);

    if (!error) {
      setDetalleInput('');
      setMontoInput('');
      close();
      fetchTodosLosMovimientos();
    } else {
      alert("Error guardando el movimiento: " + error.message);
    }
  }

  async function borrarMovimientoManual(id: string) {
    if (!confirm("¿Borrar este movimiento manual de la caja?")) return;
    await supabase.from('caja').delete().eq('id', id);
    fetchTodosLosMovimientos();
  }

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Caja y Finanzas</Title>
        <Group>
          <Select 
            value={filtroFecha} 
            onChange={setFiltroFecha} 
            data={[
              { value: 'este_mes', label: 'Este Mes' },
              { value: 'mes_pasado', label: 'Mes Pasado' },
              { value: 'ultimos_3', label: 'Últimos 3 Meses' },
              { value: 'este_ano', label: 'Este Año' },
              { value: 'siempre', label: 'Histórico (Todo)' },
            ]}
            allowDeselect={false}
            leftSection={<IconCalendar size={16}/>}
            variant="filled"
          />
          <Button leftSection={<IconPlus size={20} />} color="green" onClick={open}>
            Nuevo Movimiento
          </Button>
        </Group>
      </Group>

      {/* DASHBOARD FINANCIERO DINÁMICO */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Card shadow="sm" radius="md" p="md" withBorder>
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon size="xl" radius="md" color="teal" variant="light"><IconTrendingUp /></ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700}>INGRESOS TOTALES</Text>
              <Text fw={700} size="xl" c="teal">${totalIngresos.toLocaleString('es-AR')}</Text>
            </div>
          </Group>
        </Card>
        
        <Card shadow="sm" radius="md" p="md" withBorder>
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon size="xl" radius="md" color="red" variant="light"><IconTrendingDown /></ThemeIcon>
            <div>
              <Text size="xs" c="dimmed" fw={700}>EGRESOS (GASTOS)</Text>
              <Text fw={700} size="xl" c="red">${totalEgresos.toLocaleString('es-AR')}</Text>
            </div>
          </Group>
        </Card>

        <Card shadow="sm" radius="md" p="md" withBorder bg={saldoNeto > 0 ? 'green.0' : saldoNeto < 0 ? 'red.0' : 'gray.0'}>
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon size="xl" radius="md" color={saldoNeto > 0 ? 'green' : saldoNeto < 0 ? 'red' : 'gray'}>
              <IconCurrencyDollar />
            </ThemeIcon>
            <div>
              <Text size="xs" fw={700} c={saldoNeto > 0 ? 'green.9' : saldoNeto < 0 ? 'red.9' : 'gray.7'}>BALANCE DEL PERÍODO</Text>
              <Text fw={900} size="xl" c={saldoNeto > 0 ? 'green.9' : saldoNeto < 0 ? 'red.9' : 'gray.7'}>
                ${saldoNeto.toLocaleString('es-AR')}
              </Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      {/* BARRA DE FILTROS SECUNDARIOS */}
      <Paper p="sm" radius="md" withBorder mb="lg" bg="gray.0">
          <Group grow align="center">
              <TextInput 
                placeholder="Buscar detalle o concepto..." 
                leftSection={<IconSearch size={16}/>} 
                value={busqueda} 
                onChange={(e) => setBusqueda(e.target.value)} 
              />
              <Select 
                placeholder="Tipo de Movimiento" 
                data={[
                  { value: 'INGRESO', label: 'Solo Ingresos' },
                  { value: 'EGRESO', label: 'Solo Egresos' }
                ]} 
                value={filtroTipo} 
                onChange={setFiltroTipo} 
                clearable 
                leftSection={<IconFilter size={16}/>} 
              />
              <Select 
                placeholder="Filtrar por Categoría" 
                data={categorias} 
                value={filtroCategoria} 
                onChange={setFiltroCategoria} 
                clearable 
              />
              {hayFiltrosActivos && (
                <Button variant="outline" color="red" onClick={limpiarFiltrosSecundarios} rightSection={<CloseButton size="sm" component="span" c="red"/>} style={{ maxWidth: 150 }}>
                  Limpiar
                </Button>
              )}
          </Group>
      </Paper>

      {/* LIBRO MAYOR / TABLA */}
      <Paper radius="md" withBorder style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }} h={570}>
        <Group p="md" bg="gray.0" style={{ borderBottom: '1px solid #eee' }}>
            <ThemeIcon variant="light" color="gray"><IconReceipt size={20}/></ThemeIcon>
            <Text fw={700}>Historial de Movimientos</Text>
            <Badge color="gray" variant="outline" ml="auto">{movimientosFiltrados.length} Registros</Badge>
        </Group>
        <ScrollArea style={{ flex: 1 }}>
            <Table striped highlightOnHover>
              <Table.Thead bg="gray.1" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Categoría</Table.Th>
                  <Table.Th>Detalle</Table.Th>
                  <Table.Th ta="right">Ingreso</Table.Th>
                  <Table.Th ta="right">Egreso</Table.Th>
                  <Table.Th w={50}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loadingDatos ? (
                   <Table.Tr>
                     <Table.Td colSpan={6} ta="center" c="dimmed" p="xl">Sincronizando caja con potreros y animales...</Table.Td>
                   </Table.Tr>
                ) : movimientosFiltrados.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6} ta="center" c="dimmed" p="xl">No hay movimientos que coincidan con tus filtros.</Table.Td>
                  </Table.Tr>
                ) : (
                  movimientosFiltrados.map(mov => (
                    <Table.Tr key={`${mov.id}-${mov.esManual ? 'man' : 'auto'}`}>
                      <Table.Td fw={500}><Text size="sm">{formatDate(mov.fecha)}</Text></Table.Td>
                      <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                              {!mov.esManual && (
                                  <Tooltip label="Gasto cargado automáticamente desde el campo" withArrow>
                                      <ThemeIcon size="xs" radius="xl" color="gray" variant="light"><IconRobot size={10}/></ThemeIcon>
                                  </Tooltip>
                              )}
                              <Badge color={mov.tipo === 'INGRESO' ? 'teal' : 'gray'} variant="light">{mov.categoria}</Badge>
                          </Group>
                      </Table.Td>
                      <Table.Td><Text size="sm">{mov.detalle}</Text></Table.Td>
                      <Table.Td ta="right" c="teal" fw={700}>{mov.tipo === 'INGRESO' ? `$${mov.monto.toLocaleString('es-AR')}` : '-'}</Table.Td>
                      <Table.Td ta="right" c="red" fw={700}>{mov.tipo === 'EGRESO' ? `$${mov.monto.toLocaleString('es-AR')}` : '-'}</Table.Td>
                      <Table.Td align="right">
                        {mov.esManual ? (
                            <ActionIcon color="red" variant="subtle" size="sm" onClick={() => borrarMovimientoManual(mov.id)}>
                                <IconTrash size={16} />
                            </ActionIcon>
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

      {/* MODAL NUEVO MOVIMIENTO */}
      <Modal opened={opened} onClose={close} title={<Text fw={700} size="lg">Registrar en Caja</Text>} centered>
        <Stack>
          <Group grow>
            <Select label="Tipo" data={['INGRESO', 'EGRESO']} value={tipoInput} onChange={setTipoInput} allowDeselect={false} />
            <TextInput label="Fecha" type="date" value={fechaInput} onChange={(e) => setFechaInput(e.target.value)} />
          </Group>
          <Select label="Categoría" data={categorias} value={categoriaInput} onChange={setCategoriaInput} searchable />
          <TextInput label="Detalle / Concepto" placeholder="Ej: Compra de 10 rollos alfalfa" value={detalleInput} onChange={(e) => setDetalleInput(e.target.value)} />
          <NumberInput 
            label="Monto ($)" 
            placeholder="0.00" 
            value={montoInput} 
            onChange={(val) => setMontoInput(val === '' ? '' : Number(val))} 
            hideControls 
            leftSection={<IconCurrencyDollar size={16} />} 
          />
          <Button mt="md" color="green" onClick={guardarMovimiento} loading={loading}>
            Guardar Movimiento
          </Button>
        </Stack>
      </Modal>
    </>
  );
}