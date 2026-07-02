import { useState, useMemo } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { Stack, Box, TextInput, Text, Badge, Group, ScrollArea, Paper, Title, Button, Select } from '@mantine/core';
import {
  IconSearch, IconDownload, IconVirus, IconBandage, IconHeartbeat, IconPill, IconCut,
  IconVaccine, IconHandStop, IconHeart, IconBabyCarriage, IconMilk,
  IconScale, IconArrowRight, IconDots, IconArrowsExchange, IconMapPin,
  IconTruckDelivery, IconUsersPlus, IconShoppingCart, IconCurrencyDollar,
  IconCircleX, IconTrash, IconHistoryToggle,
} from '@tabler/icons-react';

interface EventoActividad {
  id: string;
  created_at: string;
  fecha_evento: string;
  tipo: string;
  resultado?: string;
  detalle?: string;
  animales?: { caravana: string } | null;
  datos_extra?: Record<string, unknown>;
}

type Categoria = 'Salud' | 'Sanidad' | 'Reproducción' | 'Manejo' | 'Movimientos' | 'Compras' | 'Ventas' | 'Bajas';

const TIPO_A_CATEGORIA: Record<string, Categoria> = {
  ENFERMEDAD: 'Salud', LESION: 'Salud', CURACION: 'Salud', TRATAMIENTO: 'Salud', RASPAJE: 'Salud',
  VACUNACION: 'Sanidad', CAPADO: 'Sanidad', DESPARASITACION: 'Sanidad', SUPLEMENTACION: 'Sanidad',
  TACTO: 'Reproducción', SERVICIO: 'Reproducción', PARTO: 'Reproducción', DESTETE: 'Reproducción',
  PESAJE: 'Manejo', APARTADO: 'Manejo', OTRO: 'Manejo',
  CAMBIO_LOTE: 'Movimientos', MOVIMIENTO_POTRERO: 'Movimientos', TRASLADO_SALIDA: 'Movimientos',
  COMPRA: 'Compras', TRASLADO_INGRESO: 'Compras',
  VENTA: 'Ventas',
  BAJA: 'Bajas', BORRADO: 'Bajas', RESTAURACION: 'Bajas',
};

const CATEGORIA_COLORS: Record<Categoria, { border: string; bg: string; text: string }> = {
  Salud:       { border: '#E24B4A', bg: '#FCEBEB', text: '#C73B3A' },
  Sanidad:     { border: '#EF9F27', bg: '#FAEEDA', text: '#C47E0C' },
  Reproducción:{ border: '#D4537E', bg: '#FBEAF0', text: '#B03D65' },
  Manejo:      { border: '#378ADD', bg: '#E6F1FB', text: '#2368B0' },
  Movimientos: { border: '#BA7517', bg: '#FFF3E0', text: '#8F5A10' },
  Compras:     { border: '#6471DE', bg: '#EEEFFE', text: '#4C58C8' },
  Ventas:      { border: '#1D9E75', bg: '#E1F5EE', text: '#14785A' },
  Bajas:       { border: '#A32D2D', bg: '#FCEBEB', text: '#A32D2D' },
};

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

const TIPO_A_ICONO: Record<string, IconComponent> = {
  ENFERMEDAD: IconVirus,
  LESION: IconBandage,
  CURACION: IconHeartbeat,
  TRATAMIENTO: IconPill,
  RASPAJE: IconCut,
  VACUNACION: IconVaccine,
  DESPARASITACION: IconVirus,
  SUPLEMENTACION: IconPill,
  CAPADO: IconCut,
  TACTO: IconHandStop,
  SERVICIO: IconHeart,
  PARTO: IconBabyCarriage,
  DESTETE: IconMilk,
  PESAJE: IconScale,
  APARTADO: IconArrowRight,
  OTRO: IconDots,
  CAMBIO_LOTE: IconArrowsExchange,
  MOVIMIENTO_POTRERO: IconMapPin,
  TRASLADO_SALIDA: IconTruckDelivery,
  COMPRA: IconShoppingCart,
  TRASLADO_INGRESO: IconUsersPlus,
  VENTA: IconCurrencyDollar,
  BAJA: IconCircleX,
  BORRADO: IconTrash,
  RESTAURACION: IconHistoryToggle,
};

const TIPO_LABELS: Record<string, string> = {
  PESAJE: 'Pesaje', ENFERMEDAD: 'Enfermedad', LESION: 'Lesión', CURACION: 'Curación',
  TRATAMIENTO: 'Tratamiento', VACUNACION: 'Vacunación', OTRO: 'Otro', TACTO: 'Tacto',
  SERVICIO: 'Servicio', PARTO: 'Parto', DESTETE: 'Destete', CAPADO: 'Capado',
  RASPAJE: 'Raspaje', APARTADO: 'Apartado', VENTA: 'Venta', BAJA: 'Baja',
  COMPRA: 'Compra', TRASLADO_SALIDA: 'Traslado Salida', TRASLADO_INGRESO: 'Ingreso por Red',
  RESTAURACION: 'Restauración', BORRADO: 'Borrado',
  MOVIMIENTO_POTRERO: 'Mov. Potrero', CAMBIO_LOTE: 'Cambio Lote',
  DESPARASITACION: 'Desparasitación', SUPLEMENTACION: 'Suplementación',
};

const CATEGORIAS: Categoria[] = ['Salud', 'Sanidad', 'Reproducción', 'Manejo', 'Movimientos', 'Compras', 'Ventas', 'Bajas'];

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'todo', label: 'Todo' },
];

const MESES = [
  { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' }, { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL - 2024 + 1 }, (_, i) => {
  const y = String(2024 + i);
  return { value: y, label: y };
});

const formatHora = (iso: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const formatFechaGrupo = (fechaIso: string): string => {
  if (!fechaIso) return 'Sin fecha';
  const hoy = new Date();
  const hoyStr = hoy.toISOString().split('T')[0];
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const ayerStr = ayer.toISOString().split('T')[0];
  const fecha = fechaIso.split('T')[0];
  if (fecha === hoyStr) return 'Hoy';
  if (fecha === ayerStr) return 'Ayer';
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y.slice(-2)}`;
};

export default function Actividad({ eventosGlobales }: { eventosGlobales: EventoActividad[] }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [busqueda, setBusqueda] = useState('');
  const [filtrosActivos, setFiltrosActivos] = useState<Set<Categoria>>(new Set());
  const [periodoActivo, setPeriodoActivo] = useState<Periodo | null>('todo');
  const [filtroMes, setFiltroMes] = useState<string | null>(null);
  const [filtroAnio, setFiltroAnio] = useState<string | null>(null);

  const toggleFiltro = (cat: Categoria) => {
    setFiltrosActivos(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const seleccionarPeriodo = (p: Periodo) => {
    setPeriodoActivo(p);
    setFiltroMes(null);
    setFiltroAnio(null);
  };

  const seleccionarMes = (v: string | null) => {
    setFiltroMes(v);
    setPeriodoActivo(null);
  };

  const seleccionarAnio = (v: string | null) => {
    setFiltroAnio(v);
    setPeriodoActivo(null);
  };

  const eventosFiltrados = useMemo(() => {
    const search = busqueda.toLowerCase().trim();

    const offsetMs = new Date().getTimezoneOffset() * 60000;
    const hoyStr = new Date(Date.now() - offsetMs).toISOString().split('T')[0];
    const hace6diasStr = new Date(Date.now() - offsetMs - 6 * 86400000).toISOString().split('T')[0];
    const now = new Date();
    const mesHoy = now.getMonth() + 1;
    const anioHoy = now.getFullYear();

    return [...eventosGlobales]
      .sort((a, b) => {
        const fa = a.fecha_evento?.split('T')[0] ?? '';
        const fb = b.fecha_evento?.split('T')[0] ?? '';
        if (fb !== fa) return fb.localeCompare(fa);
        return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      })
      .filter(ev => {
        const coincideTexto = !search ||
          ev.animales?.caravana?.toLowerCase().includes(search) ||
          ev.animales?.caravana_electronica?.toLowerCase().includes(search) ||
          ev.tipo.toLowerCase().includes(search) ||
          ev.detalle?.toLowerCase().includes(search) ||
          ev.resultado?.toLowerCase().includes(search);

        const cat = TIPO_A_CATEGORIA[ev.tipo];
        const coincideCategoria = filtrosActivos.size === 0 || (!!cat && filtrosActivos.has(cat));

        const fecha = ev.fecha_evento?.split('T')[0] ?? '';
        const [fy, fm] = fecha ? fecha.split('-').map(Number) : [0, 0];
        let coincideFecha = true;
        if (periodoActivo === 'hoy') {
          coincideFecha = fecha === hoyStr;
        } else if (periodoActivo === 'semana') {
          coincideFecha = fecha >= hace6diasStr && fecha <= hoyStr;
        } else if (periodoActivo === 'mes') {
          coincideFecha = fm === mesHoy && fy === anioHoy;
        } else if (periodoActivo === null) {
          if (filtroMes && filtroAnio) coincideFecha = fm === Number(filtroMes) && fy === Number(filtroAnio);
          else if (filtroMes) coincideFecha = fm === Number(filtroMes);
          else if (filtroAnio) coincideFecha = fy === Number(filtroAnio);
        }

        return coincideTexto && coincideCategoria && coincideFecha;
      });
  }, [eventosGlobales, busqueda, filtrosActivos, periodoActivo, filtroMes, filtroAnio]);

  const grupos = useMemo(() => {
    const map = new Map<string, EventoActividad[]>();
    for (const ev of eventosFiltrados) {
      const clave = ev.fecha_evento?.split('T')[0] ?? 'sin-fecha';
      if (!map.has(clave)) map.set(clave, []);
      map.get(clave)!.push(ev);
    }
    return Array.from(map.entries());
  }, [eventosFiltrados]);

  const exportarCSV = () => {
    if (eventosFiltrados.length === 0) return;
    const cabeceras = ['Fecha', 'Hora', 'Categoría', 'Caravana', 'Tipo', 'Resultado', 'Detalle', 'Info Adicional'];
    const filas = eventosFiltrados.map(ev => {
      const cat = TIPO_A_CATEGORIA[ev.tipo] ?? '-';
      const label = TIPO_LABELS[ev.tipo] ?? ev.tipo;
      const infoParts: string[] = [];
      if (ev.datos_extra?.potrero_destino) {
        const pd = ev.datos_extra.parcela_destino;
        infoParts.push(pd ? `Destino: ${ev.datos_extra.potrero_destino} (${pd})` : `Destino: ${ev.datos_extra.potrero_destino}`);
      }
      if (ev.tipo !== 'CAMBIO_LOTE' && ev.datos_extra?.lote_destino) infoParts.push(`Grupo: ${ev.datos_extra.lote_destino}`);
      if (ev.datos_extra?.toros_caravanas) infoParts.push(`Toro/s: ${ev.datos_extra.toros_caravanas}`);
      return [
        ev.fecha_evento?.split('T')[0] ?? '-',
        formatHora(ev.created_at),
        cat,
        ev.animales?.caravana ?? '-',
        label,
        ev.resultado ?? '-',
        ev.detalle ?? '-',
        infoParts.join(' | '),
      ];
    });
    const csv = [cabeceras.join(';'), ...filas.map(f => f.join(';'))].join('\n');
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Actividad_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group gap="xs" align="center">
          <Title order={3}>Registros de Actividad</Title>
          <Badge size="xl" circle color="blue" variant="filled">{eventosFiltrados.length}</Badge>
        </Group>
        <Group gap="xs" mr={{ base: 0, md: 'md' }}>
          <Button
            variant="outline"
            color="blue"
            leftSection={<IconDownload size={18} />}
            onClick={exportarCSV}
            disabled={eventosFiltrados.length === 0}
            px={{ base: 'xs', sm: 'md' }}
          >
            <Text visibleFrom="sm" fw={600}>Excel</Text>
          </Button>
        </Group>
      </Group>

      <Paper withBorder bg="gray.0" p="sm" radius="md">
        <Stack gap="xs">
          {/* Fila 1: búsqueda + chips de período + selects */}
          {!!isMobile ? (
            <Stack gap="xs">
              <TextInput
                leftSection={<IconSearch size={16} />}
                placeholder="Buscar..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <Group gap="xs" wrap="wrap">
                {PERIODOS.map(p => {
                  const active = periodoActivo === p.value;
                  return (
                    <Badge
                      key={p.value}
                      variant={active ? 'filled' : 'outline'}
                      style={{
                        cursor: 'pointer',
                        flexShrink: 0,
                        backgroundColor: active ? '#228be6' : 'transparent',
                        color: active ? '#fff' : '#228be6',
                        borderColor: '#228be6',
                        userSelect: 'none',
                      }}
                      onClick={() => seleccionarPeriodo(p.value)}
                    >
                      {p.label}
                    </Badge>
                  );
                })}
              </Group>
              <Group grow>
                <Select
                  placeholder="Mes"
                  data={MESES}
                  value={filtroMes}
                  onChange={seleccionarMes}
                  clearable
                />
                <Select
                  placeholder="Año"
                  data={ANIOS}
                  value={filtroAnio}
                  onChange={seleccionarAnio}
                  clearable
                />
              </Group>
            </Stack>
          ) : (
            <Group gap="xs" wrap="wrap" align="center">
              <TextInput
                leftSection={<IconSearch size={16} />}
                placeholder="Buscar..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ flex: 1, minWidth: 180 }}
              />
              <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                {PERIODOS.map(p => {
                  const active = periodoActivo === p.value;
                  return (
                    <Badge
                      key={p.value}
                      variant={active ? 'filled' : 'outline'}
                      style={{
                        cursor: 'pointer',
                        flexShrink: 0,
                        backgroundColor: active ? '#228be6' : 'transparent',
                        color: active ? '#fff' : '#228be6',
                        borderColor: '#228be6',
                        userSelect: 'none',
                      }}
                      onClick={() => seleccionarPeriodo(p.value)}
                    >
                      {p.label}
                    </Badge>
                  );
                })}
              </Group>
              <Select
                placeholder="Mes"
                data={MESES}
                value={filtroMes}
                onChange={seleccionarMes}
                clearable
                style={{ width: 130, flexShrink: 0 }}
              />
              <Select
                placeholder="Año"
                data={ANIOS}
                value={filtroAnio}
                onChange={seleccionarAnio}
                clearable
                style={{ width: 100, flexShrink: 0 }}
              />
            </Group>
          )}

          {/* Fila 2: chips de categoría */}
          {!!isMobile ? (
            <Group gap="xs" wrap="wrap">
              <Text size="sm" fw={600} c="dimmed" style={{ flexShrink: 0 }}>Categorías:</Text>
              {CATEGORIAS.map(cat => {
                const active = filtrosActivos.has(cat);
                const c = CATEGORIA_COLORS[cat];
                return (
                  <Badge
                    key={cat}
                    variant={active ? 'filled' : 'outline'}
                    style={{
                      cursor: 'pointer',
                      flexShrink: 0,
                      borderColor: c.border,
                      backgroundColor: active ? c.border : 'transparent',
                      color: active ? '#fff' : c.text,
                      userSelect: 'none',
                    }}
                    onClick={() => toggleFiltro(cat)}
                  >
                    {cat}
                  </Badge>
                );
              })}
            </Group>
          ) : (
            <ScrollArea scrollbarSize={4} offsetScrollbars={false}>
              <Group gap="xs" wrap="nowrap" pb={2}>
                <Text size="sm" fw={600} c="dimmed" style={{ flexShrink: 0 }}>Categorías:</Text>
                {CATEGORIAS.map(cat => {
                  const active = filtrosActivos.has(cat);
                  const c = CATEGORIA_COLORS[cat];
                  return (
                    <Badge
                      key={cat}
                      variant={active ? 'filled' : 'outline'}
                      style={{
                        cursor: 'pointer',
                        flexShrink: 0,
                        borderColor: c.border,
                        backgroundColor: active ? c.border : 'transparent',
                        color: active ? '#fff' : c.text,
                        userSelect: 'none',
                      }}
                      onClick={() => toggleFiltro(cat)}
                    >
                      {cat}
                    </Badge>
                  );
                })}
              </Group>
            </ScrollArea>
          )}
        </Stack>
      </Paper>

      {grupos.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl" size="sm">Sin actividad registrada</Text>
      ) : (
        grupos.map(([fecha, eventos]) => (
          <Stack key={fecha} gap="xs">
            <Text
              size="xs"
              fw={700}
              c="dimmed"
              tt="uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              {formatFechaGrupo(fecha)}
            </Text>

            {eventos.map(ev => {
              const cat = TIPO_A_CATEGORIA[ev.tipo] as Categoria | undefined;
              const c = cat ? CATEGORIA_COLORS[cat] : { border: '#868e96', bg: '#f1f3f5', text: '#868e96' };
              const Icono: IconComponent = TIPO_A_ICONO[ev.tipo] ?? IconDots;
              const label = TIPO_LABELS[ev.tipo] ?? ev.tipo;

              const infoParts: string[] = [];
              if (ev.datos_extra?.potrero_destino) {
                const pd = ev.datos_extra.parcela_destino;
                infoParts.push(pd
                  ? `Destino: ${ev.datos_extra.potrero_destino} (${pd})`
                  : `Destino: ${ev.datos_extra.potrero_destino}`
                );
              }
              if (ev.tipo !== 'CAMBIO_LOTE' && ev.datos_extra?.lote_destino) {
                infoParts.push(`Grupo: ${ev.datos_extra.lote_destino}`);
              }
              if (ev.datos_extra?.toros_caravanas) {
                infoParts.push(`Toro/s: ${ev.datos_extra.toros_caravanas}`);
              }

              const textoSecundario = [ev.detalle, ...infoParts].filter(Boolean).join(' · ');

              return (
                <Box
                  key={ev.id}
                  style={{
                    borderLeft: `3px solid ${c.border}`,
                    borderRadius: 6,
                    backgroundColor: '#fff',
                    padding: '10px 12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <Group align="flex-start" gap="sm" wrap="nowrap">
                    <Box
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: c.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icono size={18} color={c.border} />
                    </Box>

                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                        <Group gap={6} align="center" wrap="wrap">
                          {ev.animales?.caravana && (
                            <Text fw={700} size="sm" ff={ev.animales.caravana_electronica && ev.animales.caravana === ev.animales.caravana_electronica ? 'monospace' : undefined}>{ev.animales.caravana_electronica && ev.animales.caravana === ev.animales.caravana_electronica ? `…${ev.animales.caravana.slice(-4)}` : ev.animales.caravana}</Text>
                          )}
                          <Badge
                            size="xs"
                            style={{
                              backgroundColor: c.bg,
                              color: c.text,
                              border: 'none',
                            }}
                          >
                            {label}
                          </Badge>
                        </Group>
                        <Text
                          size="xs"
                          c="dimmed"
                          visibleFrom="xs"
                          style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          {formatHora(ev.created_at)}
                        </Text>
                      </Group>

                      {ev.resultado && (
                        <Text size="sm" fw={500} mt={2}>{ev.resultado}</Text>
                      )}

                      {textoSecundario && (
                        <Text size="xs" c="dimmed" mt={2}>{textoSecundario}</Text>
                      )}
                    </Box>
                  </Group>
                </Box>
              );
            })}
          </Stack>
        ))
      )}
    </Stack>
  );
}
