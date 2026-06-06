import { useState, useEffect } from 'react';
import { Box, Container, Paper, Title, Text, TextInput, PasswordInput, Button, Badge, Stack, ThemeIcon, Alert, Loader, Center, SegmentedControl, Group } from '@mantine/core';
import { IconCheck, IconAlertCircle, IconMail } from '@tabler/icons-react';
import { supabase } from '../supabase';
import logoRodeo from '../assets/loggoblanco.png';

interface AceptarInvitacionProps {
  token: string;
  onSuccess: () => void;
}

type Estado = 'cargando' | 'listo' | 'error' | 'exito';

export default function AceptarInvitacion({ token, onSuccess }: AceptarInvitacionProps) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensaje, setMensaje] = useState('');
  const [rolObtenido, setRolObtenido] = useState<string | null>(null);
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setEstado('error');
      setMensaje('Link inválido. No se encontró el token de invitación.');
      return;
    }
    // Check if already has a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        aceptarConSesion();
      } else {
        setEstado('listo');
      }
    });
  }, []);

  async function aceptarConSesion() {
    setEstado('cargando');
    const { data, error } = await supabase.rpc('aceptar_invitacion', { p_token: token });
    if (error) { setEstado('error'); setMensaje(error.message); return; }
    if (!data?.ok) { setEstado('error'); setMensaje(data?.error || 'Error desconocido'); return; }
    setRolObtenido(data.rol);
    setEstado('exito');
  }

  async function handleAuthYAceptar() {
    if (!email || !password) { setMensaje('Completá email y contraseña.'); return; }
    setLoading(true);
    setMensaje('');

    if (modo === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        setMensaje(error.message.includes('Invalid') ? 'Credenciales incorrectas.' : error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setLoading(false); setMensaje(error.message); return; }
      if (data.session === null) {
        setLoading(false);
        setEstado('error');
        setMensaje('¡Cuenta creada! Confirmá tu email y volvé a abrir este link para unirte al campo.');
        return;
      }
    }

    await aceptarConSesion();
    setLoading(false);
  }

  function irAlCampo() {
    window.history.replaceState({}, '', window.location.pathname);
    onSuccess();
  }

  function irAlInicio() {
    window.history.replaceState({}, '', window.location.pathname);
    window.location.reload();
  }

  const rolLabel = rolObtenido === 'PEON' ? 'Peón' : rolObtenido === 'VETERINARIO' ? 'Veterinario' : (rolObtenido ?? '');

  return (
    <Box style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #20c997 0%, #087f5b 50%, #042b1e 100%)' }}>
      <Container size={420} w="100%" px="md">
        <Stack align="center" mb="xl" gap="xs">
          <img src={logoRodeo} alt="RodeoControl" style={{ height: 90, width: 'auto' }} />
          <Title order={2} c="white" style={{ letterSpacing: '-0.5px' }}>RodeoControl</Title>
        </Stack>

        {estado === 'cargando' && (
          <Paper withBorder shadow="xl" p={40} radius="md">
            <Center>
              <Stack align="center" gap="md">
                <Loader color="teal" size="lg" />
                <Text c="dimmed">Verificando invitación...</Text>
              </Stack>
            </Center>
          </Paper>
        )}

        {estado === 'error' && (
          <Paper withBorder shadow="xl" p={30} radius="md">
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="No pudimos procesar la invitación" mb="lg">
              {mensaje}
            </Alert>
            <Button fullWidth variant="light" color="gray" onClick={irAlInicio}>
              Ir al inicio
            </Button>
          </Paper>
        )}

        {estado === 'listo' && (
          <Paper withBorder shadow="xl" p={30} radius="md">
            <Stack gap="md">
              <div>
                <Title order={3} ta="center">Te invitaron a RodeoControl</Title>
                <Text size="sm" c="dimmed" ta="center" mt={4}>
                  Ingresá o creá tu cuenta para unirte al campo
                </Text>
              </div>

              <SegmentedControl
                fullWidth
                value={modo}
                onChange={(v) => { setModo(v as 'login' | 'registro'); setMensaje(''); }}
                data={[{ label: 'Tengo cuenta', value: 'login' }, { label: 'Crear cuenta', value: 'registro' }]}
              />

              {mensaje && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" withCloseButton onClose={() => setMensaje('')}>
                  {mensaje}
                </Alert>
              )}

              <TextInput
                label="Correo Electrónico"
                placeholder="usuario@campo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftSection={<IconMail size={16} />}
              />
              <PasswordInput
                label="Contraseña"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAuthYAceptar(); }}
              />
              <Button fullWidth color="teal" size="md" loading={loading} onClick={handleAuthYAceptar}>
                {modo === 'login' ? 'Ingresar y unirme al campo' : 'Registrarme y unirme al campo'}
              </Button>
            </Stack>
          </Paper>
        )}

        {estado === 'exito' && (
          <Paper withBorder shadow="xl" p={40} radius="md">
            <Stack align="center" gap="md">
              <ThemeIcon size={80} radius="xl" color="teal" variant="filled">
                <IconCheck size={40} />
              </ThemeIcon>
              <Title order={3} ta="center">¡Ya sos parte del campo!</Title>
              {rolObtenido && (
                <>
                  <Text size="sm" c="dimmed" ta="center">
                    Fuiste agregado como:
                  </Text>
                  <Badge size="lg" color={rolObtenido === 'VETERINARIO' ? 'violet' : 'orange'} variant="filled">
                    {rolLabel}
                  </Badge>
                </>
              )}
              <Button fullWidth color="teal" size="md" mt="sm" onClick={irAlCampo}>
                Ir al campo
              </Button>
            </Stack>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
