import { useState } from 'react';
import { Modal, Group, Text, Title, ThemeIcon, Stack, Button, Center, Box } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconHome, IconPlus, IconTag, IconPlaylistAdd,
  IconCurrencyDollar, IconTractor, IconQuestionMark, IconCircleCheck,
} from '@tabler/icons-react';

export interface OnboardingTourProps {
  opened: boolean;
  onClose: () => void;
  onCargarPrimerAnimal: () => void;
  userId: string;
}

interface Paso {
  icono: React.ReactNode;
  color: string;
  titulo: string;
  descripcion: string;
}

const PASOS: Paso[] = [
  {
    icono: <IconHome size={40} />,
    color: 'indigo',
    titulo: '¡Bienvenido a RodeoControl!',
    descripcion: 'Tu sistema para gestionar el campo desde el teléfono o la computadora. Con unos pocos toques registrás animales, llevás la caja y controlás toda tu hacienda.',
  },
  {
    icono: <IconPlus size={40} />,
    color: 'teal',
    titulo: 'Hacienda Activa',
    descripcion: 'Acá registrás y gestionás todos tus animales. Cada uno tiene su propia ficha con historial de pesos, eventos de salud, y mucho más.',
  },
  {
    icono: <IconTag size={40} />,
    color: 'grape',
    titulo: 'Lotes y Nutrición',
    descripcion: 'Agrupá animales en lotes para darles seguimiento conjunto. Registrá pesajes grupales, alimentación y seguí la evolución del grupo.',
  },
  {
    icono: <IconPlaylistAdd size={40} />,
    color: 'violet',
    titulo: 'Eventos Masivos',
    descripcion: 'Cuando vacunás o tratás varios animales juntos, hacelo de una sola vez. Seleccionás el grupo y el evento queda registrado en cada ficha.',
  },
  {
    icono: <IconCurrencyDollar size={40} />,
    color: 'green',
    titulo: 'Caja y Economía',
    descripcion: 'Llevá el control de ingresos y gastos del campo. Cada venta o gasto en sanidad se registra solo, sin que tengas que hacer nada extra.',
  },
  {
    icono: <IconTractor size={40} />,
    color: 'lime',
    titulo: 'Potreros y Agricultura',
    descripcion: 'Manejá tus potreros, siembras y cosechas. Registrá qué cultivo tiene cada potrero y todas las labores realizadas.',
  },
  {
    icono: <IconQuestionMark size={40} />,
    color: 'blue',
    titulo: 'Botón de Ayuda',
    descripcion: 'En cualquier momento podés tocar el botón azul con el signo de pregunta, arriba a la derecha. Te muestra ayuda específica para la pantalla en la que estás.',
  },
  {
    icono: <IconCircleCheck size={40} />,
    color: 'teal',
    titulo: '¡Ya estás listo!',
    descripcion: 'Te llevamos a Hacienda Activa para que cargues tu primer animal. Ahí podés elegir cargarlo de a uno, o un grupo entero de una sola vez si todavía no tenés caravanas.',
  },
];

export default function OnboardingTour({ opened, onClose, onCargarPrimerAnimal, userId }: OnboardingTourProps) {
  const [paso, setPaso] = useState(0);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const esFinal = paso === PASOS.length - 1;
  const pasoActual = PASOS[paso];

  const cerrar = () => {
    localStorage.setItem(`rc_tour_done_${userId}`, '1');
    setPaso(0);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={cerrar}
      fullScreen={isMobile ?? false}
      size="lg"
      centered
      withCloseButton={false}
      overlayProps={{ blur: 3 }}
    >
      <Stack gap="xl" py="md" px="xs">

        <Center>
          <Stack align="center" gap="md">
            <ThemeIcon size={90} radius="xl" color={pasoActual.color} variant="light">
              {pasoActual.icono}
            </ThemeIcon>
            <Title order={2} ta="center" style={{ maxWidth: 400 }}>
              {pasoActual.titulo}
            </Title>
          </Stack>
        </Center>

        <Text size="lg" ta="center" c="dimmed" style={{ maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
          {pasoActual.descripcion}
        </Text>

        {/* Dots de progreso */}
        <Center>
          <Group gap={6}>
            {PASOS.map((_, i) => (
              <Box
                key={i}
                style={{
                  width: i === paso ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === paso
                    ? 'var(--mantine-color-blue-6)'
                    : 'var(--mantine-color-gray-3)',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </Group>
        </Center>

        {/* Acción principal en el paso final */}
        {esFinal && (
          <Button
            size="lg"
            color="teal"
            radius="xl"
            fullWidth
            onClick={() => { cerrar(); onCargarPrimerAnimal(); }}
          >
            Cargar mi primer animal
          </Button>
        )}

        {/* Navegación */}
        <Group justify="space-between">
          <Button variant="subtle" color="gray" size="sm" onClick={cerrar}>
            {esFinal ? 'Solo cerrar' : 'Saltear'}
          </Button>
          <Group gap="xs">
            {paso > 0 && (
              <Button variant="light" color="gray" radius="xl" onClick={() => setPaso(p => p - 1)}>
                Anterior
              </Button>
            )}
            {!esFinal && (
              <Button color="blue" radius="xl" onClick={() => setPaso(p => p + 1)}>
                Siguiente
              </Button>
            )}
          </Group>
        </Group>

      </Stack>
    </Modal>
  );
}
