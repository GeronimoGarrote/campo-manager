import { useState } from 'react';
import { Box, Title, Text, Stack, Group, ThemeIcon, Container, Paper, TextInput, PasswordInput, Button, Divider, Alert } from '@mantine/core';
import { IconCheck, IconMail, IconBrandWhatsapp, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import logoRodeo from '../assets/loggoblanco.png'; 

export default function Login({ 
    email, setEmail, 
    password, setPassword, 
    handleLogin, handleSignUp, 
    authLoading, 
    authError, setAuthError,
    authSuccess, setAuthSuccess
}: any) {
    const [isRegister, setIsRegister] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isRegister) {
            handleSignUp(e);
        } else {
            handleLogin(e);
        }
    };

    // Al cambiar de pestaña, limpiamos los mensajes
    const toggleRegisterMode = (mode: boolean) => {
        setIsRegister(mode);
        setAuthError(null);
        setAuthSuccess(null);
    };

    return (
        <Box style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
            
            {/* LADO IZQUIERDO (PC) */}
            <Box visibleFrom="md" style={{ flex: 1, padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: 'white', background: 'linear-gradient(135deg, #20c997 0%, #087f5b 50%, #042b1e 100%)' }}>
                <div>
                    <img src={logoRodeo} alt="RodeoControl Logo" style={{ height: 105, width: 'auto' }} />
                    <Title order={1} mt="xl" style={{ color: 'white', fontSize: '3.5rem', letterSpacing: '-1px' }}>RodeoControl</Title>
                    <Text size="xl" mt="md" fw={500} style={{ color: 'rgba(255,255,255,0.9)', maxWidth: 500 }}>
                        Gestión inteligente, trazabilidad absoluta y control total del rodeo para tus establecimientos ganaderos.
                    </Text>
                    
                    <Stack mt={50} gap="md">
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Manejo y control total del rodeo y potreros</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Trazabilidad completa e historial clínico</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Seguimiento de peso individual y de lote con proyecciones</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Módulo financiero y libro mayor de caja</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Agenda inteligente y alertas de partos</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Fácil de usar e intuitivo</Text></Group>
                    </Stack>
                </div>
                <div>
                    <Text size="sm" style={{ color: 'rgba(255,255,255,0.6)' }}>© {new Date().getFullYear()} RodeoControl. Desarrollado en Argentina.</Text>
                </div>
            </Box>

            {/* LADO DERECHO / MOBILE */}
            <Box 
                className="login-right-side"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
            >
                <style>{`
                    .login-right-side { background-color: #f8f9fa; }
                    .login-bottom-card { background-color: var(--mantine-color-gray-0); }
                    @media (max-width: 62em) {
                        .login-right-side {
                            background: linear-gradient(135deg, #20c997 0%, #087f5b 50%, #042b1e 100%) !important;
                        }
                        .login-bottom-card {
                            background-color: rgba(255, 255, 255, 0.95) !important;
                        }
                    }
                `}</style>

                <Container size={420} w="100%" px={0}>
                    <Stack align="center" mb="xl" mt={-40} hiddenFrom="md" gap="xs">
                        <img src={logoRodeo} alt="RodeoControl Logo" style={{ height: 115, width: 'auto' }} />
                        <Title order={1} c="white" style={{ letterSpacing: '-1px' }}>RodeoControl</Title>
                    </Stack>
                    
                    <Text size="lg" fw={700} ta="center" mb="xs" c={{ base: 'white', md: 'dark' }}>
                        {isRegister ? '¡Probá gratis por 5 días!' : '¡Bienvenido de vuelta!'}
                    </Text>
                    <Text size="sm" ta="center" mb="xl" c={{ base: 'rgba(255,255,255,0.8)', md: 'dimmed' }}>
                        {isRegister ? 'Ingresá un mail y contraseña para empezar' : 'Ingresá tus credenciales para acceder a tu campo'}
                    </Text>

                    {/* ACÁ ESTÁN LAS NOTIFICACIONES INTEGRADAS */}
                    {authError && (
                        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="light" mb="md" withCloseButton onClose={() => setAuthError(null)}>
                            {authError}
                        </Alert>
                    )}

                    {authSuccess && (
                        <Alert icon={<IconInfoCircle size={16} />} title="¡Excelente!" color="blue" variant="light" mb="md" withCloseButton onClose={() => setAuthSuccess(null)}>
                            {authSuccess}
                        </Alert>
                    )}

                    <Paper withBorder shadow="xl" p={30} radius="md">
                        <form onSubmit={handleSubmit}>
                            <TextInput 
                                label="Correo Electrónico" 
                                placeholder="usuario@campo.com" 
                                required 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                leftSection={<IconMail size={16} />}
                            />
                            <PasswordInput 
                                label="Contraseña" 
                                placeholder="Tu contraseña" 
                                required 
                                mt="md" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                            />
                            <Button fullWidth mt="xl" size="md" type="submit" loading={authLoading} color="teal">
                                {isRegister ? 'Crear Cuenta y Probar Gratis' : 'Iniciar Sesión'}
                            </Button>
                        </form>
                    </Paper>

                    <Divider my="xl" label={<Text size="sm" c={{ base: 'white', md: 'dimmed' }}>
                        {isRegister ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}
                    </Text>} labelPosition="center" />
                    
                    <Paper className="login-bottom-card" withBorder p="md" radius="md" ta="center">
                        {isRegister ? (
                            <>
                                <Text size="sm" fw={700} mb="xs">Ingresá a tu campo</Text>
                                <Text size="xs" c="dimmed" mb="md" px="sm">Si ya creaste tu cuenta anteriormente, podés iniciar sesión directamente.</Text>
                                <Button variant="light" color="teal" size="sm" fullWidth onClick={() => toggleRegisterMode(false)}>
                                    Ir a Iniciar Sesión
                                </Button>
                            </>
                        ) : (
                            <>
                                <Text size="sm" fw={700} mb="xs">Prueba Gratuita de 5 Días</Text>
                                <Text size="xs" c="dimmed" mb="md" px="sm">Creá tu cuenta ahora mismo y probá el sistema sin límites por 5 días.</Text>
                                <Button variant="light" color="blue" size="sm" fullWidth onClick={() => toggleRegisterMode(true)}>
                                    Registrarse Gratis
                                </Button>
                            </>
                        )}
                        
                        <Divider my="sm" variant="dashed" />

                        <Text size="xs" c="dimmed" mb="xs">¿Necesitás ayuda con tu cuenta?</Text>
                        <Group justify="center" gap="sm">
                            <Button 
                                component="a" 
                                href="https://wa.me/5492345505575?text=Hola,%20quiero%20solicitar%20info." 
                                target="_blank" 
                                variant="light" 
                                color="teal" 
                                size="xs" 
                                leftSection={<IconBrandWhatsapp size={14} />}
                            >
                                WhatsApp
                            </Button>
                            <Button 
                                component="a" 
                                href="mailto:rodeocontrol.app@gmail.com" 
                                variant="light" 
                                color="blue" 
                                size="xs" 
                                leftSection={<IconMail size={14} />}
                            >
                                Email
                            </Button>
                        </Group>
                    </Paper>
                </Container>
            </Box>
        </Box>
    );
}