import { useState, useEffect } from 'react';
import { Title, Paper, Text, Group, Card, SimpleGrid, ThemeIcon, Table, Badge, ActionIcon, ScrollArea, Modal, Stack, TextInput, Select, NumberInput, Button, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCurrencyDollar, IconTrendingUp, IconTrendingDown, IconPlus, IconTrash, IconReceipt, IconRobot } from '@tabler/icons-react';
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
  esManual: boolean; // Para saber si le mostramos el tachito de basura acá o no
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

  const categorias = [
    'Hacienda (Venta/Compra)', 'Alimentación / Nutrición', 'Sanidad Veterinaria', 
    'Agricultura / Semillas', 'Maquinaria / Combustible', 'Infraestructura / Alambrados', 
    'Sueldos / Honorarios', 'Impuestos / Servicios', 'Otros'
  ];

  // Al cargar la vista, chupamos datos de TODOS lados
  useEffect(() => {
    fetchTodosLosMovimientos();
  }, [campoId]);

  async function fetchTodosLosMovimientos() {
    if (!campoId) return;
    setLoadingDatos(true);

    // 1. Buscamos los movimientos manuales de la Caja
    const pCaja = supabase.from('caja').select('*').eq('establecimiento_id', campoId);
    
    // 2. Buscamos los Eventos de las vacas que hayan tenido costo
    const pEventos = supabase.from('eventos').select('id, fecha_evento, tipo, detalle, resultado, costo, animales(caravana)').eq('establecimiento_id', campoId).gt('costo', 0);
    
    // 3. Buscamos los gastos de Labores Agrícolas
    const pLabores = supabase.from('labores').select('id, fecha, actividad, cultivo, detalle, costo').eq('establecimiento_id', campoId).gt('costo', 0);
    
    // 4. Buscamos los gastos de Nutrición/Lotes
    const pLotes = supabase.from('lotes_eventos').select('id, fecha, tipo, detalle, costo').eq('establecimiento_id', campoId).gt('costo', 0);

    // Ejecutamos las 4 búsquedas a la vez para que sea rapidísimo
    const [resCaja, resEventos, resLabores, resLotes] = await Promise.all([pCaja, pEventos, pLabores, pLotes]);

    let todos: Movimiento[] = [];

    // Mapeamos Caja (Manuales)
    if (resCaja.data) {
      todos = [...todos, ...resCaja.data.map(m => ({
        id: m.id, fecha: m.fecha, tipo: m.tipo, categoria: m.categoria, detalle: m.detalle, monto: m.monto, esManual: true
      }))];
    }

    // Mapeamos Eventos Vacas (Automáticos)
    if (resEventos.data) {
      todos = [...todos, ...resEventos.data.map((e: any) => ({
        id: e.id, 
        fecha: e.fecha_evento.split('T')[0], 
        tipo: 'EGRESO' as const, // Asumimos que los costos de eventos son egresos por ahora
        categoria: 'Sanidad Veterinaria', 
        detalle: `Vaca ${e.animales?.caravana || '?'}: ${e.tipo} ${e.detalle ? `- ${e.detalle}` : ''}`.trim(), 
        monto: e.costo, 
        esManual: false
      }))];
    }

    // Mapeamos Labores Agricultura (Automáticos)
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

    // Mapeamos Eventos Lotes Ganaderos (Automáticos)
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

    // Ordenamos la ensalada de datos por fecha (del más nuevo al más viejo)
    todos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    setMovimientos(todos);
    setLoadingDatos(false);
  }

  // Cálculos rápidos
  const totalIngresos = movimientos.filter(m => m.tipo === 'INGRESO').reduce((acc, curr) => acc + curr.monto, 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'EGRESO').reduce((acc, curr) => acc + curr.monto, 0);
  const saldoNeto = totalIngresos - totalEgresos;

  // Guardar nuevo movimiento manual
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
        <Button leftSection={<IconPlus size={20} />} color="green" onClick={open}>
          Nuevo Movimiento
        </Button>
      </Group>

      {/* DASHBOARD FINANCIERO */}
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

        <Card shadow="sm" radius="md" p="md" withBorder bg={saldoNeto >= 0 ? 'green.0' : 'red.0'}>
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon size="xl" radius="md" color={saldoNeto >= 0 ? 'green' : 'red'}><IconCurrencyDollar /></ThemeIcon>
            <div>
              <Text size="xs" fw={700} c={saldoNeto >= 0 ? 'green.9' : 'red.9'}>SALDO NETO</Text>
              <Text fw={900} size="xl" c={saldoNeto >= 0 ? 'green.9' : 'red.9'}>
                ${saldoNeto.toLocaleString('es-AR')}
              </Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      {/* LIBRO MAYOR / TABLA */}
      <Paper radius="md" withBorder style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }} h={550}>
        <Group p="md" bg="gray.0" style={{ borderBottom: '1px solid #eee' }}>
            <ThemeIcon variant="light" color="gray"><IconReceipt size={20}/></ThemeIcon>
            <Text fw={700}>Historial de Movimientos</Text>
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
                ) : movimientos.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6} ta="center" c="dimmed" p="xl">No hay movimientos registrados en la caja.</Table.Td>
                  </Table.Tr>
                ) : (
                  movimientos.map(mov => (
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