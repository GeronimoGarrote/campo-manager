import { Drawer, Text, Title, List, ThemeIcon, Stack, Divider, Anchor } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';

export interface HelpDrawerProps {
  opened: boolean;
  onClose: () => void;
  activeSection: string;
}

interface SeccionAyuda {
  titulo: string;
  descripcion: string;
  items: string[];
}

const AYUDA: Record<string, SeccionAyuda> = {
  inicio: {
    titulo: 'Inicio / Resumen',
    descripcion: 'Un pantallazo general de todo lo que pasa en tu campo.',
    items: [
      'Ves la cantidad de animales por categoría.',
      'Las tareas de la agenda que están pendientes o atrasadas.',
      'Los últimos eventos registrados en la hacienda.',
      'Accesos rápidos a las secciones que más usás.',
    ],
  },
  hacienda: {
    titulo: 'Hacienda Activa',
    descripcion: 'Acá manejás todos los animales del campo.',
    items: [
      'Tocá el botón "+" para dar de alta un animal nuevo.',
      'Tocá cualquier animal para abrir su ficha completa.',
      'En la ficha podés registrar pesos, eventos y tratamientos.',
      'Usá los filtros para buscar por categoría o estado.',
      'Los animales vendidos o muertos pasan a "Archivo / Bajas".',
    ],
  },
  lotes: {
    titulo: 'Lotes y Nutrición',
    descripcion: 'Agrupá animales para darles seguimiento conjunto.',
    items: [
      'Creá un lote y asignale los animales que querés.',
      'Registrá pesajes y eventos para todos de una sola vez.',
      'Cuando cerrás un lote, pasa al Historial automáticamente.',
      'Podés ver la evolución de peso y las ganancias del lote.',
    ],
  },
  lote_detalle: {
    titulo: 'Detalle del Lote',
    descripcion: 'Estás viendo el detalle de un lote activo.',
    items: [
      'Agregá o quitá animales del lote cuando necesites.',
      'Registrá eventos (pesaje, sanidad, etc.) para todo el grupo.',
      'Cerrá el lote cuando los animales sean vendidos o redistribuidos.',
    ],
  },
  masivos: {
    titulo: 'Eventos Masivos',
    descripcion: 'Realizá una acción para muchos animales a la vez.',
    items: [
      'Elegí el tipo de evento: vacuna, palpación, venta, etc.',
      'Seleccioná los animales uno por uno o por grupo/lote.',
      'El evento queda registrado en la ficha de cada animal.',
      'Las ventas también se suman automáticamente a la Caja.',
    ],
  },
  economia: {
    titulo: 'Caja y Economía',
    descripcion: 'Controlá todos los movimientos de dinero del campo.',
    items: [
      'Las ventas y gastos de sanidad se registran solos.',
      'Podés agregar cualquier ingreso o egreso a mano.',
      'Filtrá por fecha o categoría para revisar los gastos.',
      'El PIN de bloqueo protege esta sección de miradas ajenas.',
    ],
  },
  agricultura: {
    titulo: 'Potreros y Agricultura',
    descripcion: 'Manejá la parte agrícola del campo.',
    items: [
      'Creá potreros y asignales parcelas si necesitás subdividir.',
      'Registrá siembras, fumigadas y cosechas.',
      'Ves qué cultivo tiene cada potrero y en qué estado está.',
      'Los animales pueden estar asignados a un potrero.',
    ],
  },
  potrero_detalle: {
    titulo: 'Detalle del Potrero',
    descripcion: 'Estás viendo el detalle de un potrero específico.',
    items: [
      'Registrá labores: siembra, fumigada, cosecha y más.',
      'Ves el historial completo de actividades de este potrero.',
      'Creá y gestioná parcelas dentro del potrero.',
    ],
  },
  agenda: {
    titulo: 'Agenda / Tareas',
    descripcion: 'Organizá las tareas pendientes del campo para no olvidarte de nada.',
    items: [
      'Creá tareas con fecha: revisiones, tratamientos, servicios.',
      'Las tareas vencidas aparecen en la campanita de alertas.',
      'Marcá las tareas como hechas cuando las completes.',
      'Podés vincular una tarea a un animal específico.',
    ],
  },
  actividad: {
    titulo: 'Registro de Actividad',
    descripcion: 'El historial completo de todo lo que pasó en el campo.',
    items: [
      'Todos los eventos de todos los animales en orden cronológico.',
      'Filtrá por tipo de evento o rango de fechas.',
      'Útil para auditorías, inspecciones o revisiones de manejo.',
    ],
  },
};

const AYUDA_DEFAULT: SeccionAyuda = {
  titulo: 'Ayuda general',
  descripcion: 'Navegá por las secciones del sistema usando el menú lateral.',
  items: [
    'Cada sección tiene su propia ayuda contextual.',
    'Si tenés dudas, contactanos por email.',
  ],
};

export default function HelpDrawer({ opened, onClose, activeSection }: HelpDrawerProps) {
  const seccion = AYUDA[activeSection] ?? AYUDA_DEFAULT;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={<Text fw={700} size="lg">Ayuda</Text>}
      position="right"
      size="sm"
    >
      <Stack gap="md">
        <div>
          <Title order={3}>{seccion.titulo}</Title>
          <Text c="dimmed" mt="xs" size="sm" style={{ lineHeight: 1.6 }}>
            {seccion.descripcion}
          </Text>
        </div>

        <Divider />

        <List
          spacing="sm"
          size="sm"
          icon={
            <ThemeIcon color="teal" size={20} radius="xl">
              <IconCheck size={12} />
            </ThemeIcon>
          }
        >
          {seccion.items.map((item, i) => (
            <List.Item key={i}>{item}</List.Item>
          ))}
        </List>

        <Divider mt="lg" />

        <Stack gap={4} align="center">
          <Text size="xs" c="dimmed">¿Necesitás más ayuda?</Text>
          <Anchor
            href="mailto:rodeocontrol.app@gmail.com?subject=Consulta%20de%20soporte%20-%20RodeoControl&body=Hola%2C%20tengo%20una%20consulta%20sobre%20RodeoControl%3A%0A%0A%5BDescrib%C3%AD%20tu%20problema%20o%20pregunta%20ac%C3%A1%5D%0A%0AGracias."
            size="sm"
            fw={700}
            ta="center"
          >
            Contactá al soporte — hacé clic acá
          </Anchor>
        </Stack>
      </Stack>
    </Drawer>
  );
}
