import { useState } from 'react';
import { Box, Title, Text, Stack, Group, ThemeIcon, Container, Paper, TextInput, PasswordInput, Button, Divider, Alert, Anchor, Image } from '@mantine/core';
import { IconCheck, IconMail, IconBrandWhatsapp, IconAlertCircle, IconInfoCircle, IconArrowLeft } from '@tabler/icons-react';
import logoRodeo from '../assets/loggo_header.png';

export default function Login({
    email, setEmail,
    password, setPassword,
    handleLogin, handleSignUp, handleForgotPassword,
    authLoading,
    authError, setAuthError,
    authSuccess, setAuthSuccess
}: any) {
    const [isRegister, setIsRegister] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isRegister) {
            handleSignUp(e);
        } else {
            handleLogin(e);
        }
    };

    const toggleRegisterMode = (mode: boolean) => {
        setIsRegister(mode);
        setIsForgotPassword(false);
        setAuthError(null);
        setAuthSuccess(null);
    };

    const enterForgotPassword = () => {
        setForgotEmail(email);
        setIsForgotPassword(true);
        setAuthError(null);
        setAuthSuccess(null);
    };

    const exitForgotPassword = () => {
        setIsForgotPassword(false);
        setAuthError(null);
        setAuthSuccess(null);
    };

    const submitForgotPassword = async () => {
        setForgotLoading(true);
        const { error } = await handleForgotPassword(forgotEmail);
        setForgotLoading(false);
        if (error) {
            setAuthError(error);
        } else {
            setAuthSuccess('¡Listo! Si el correo existe en el sistema, recibirás un link para restablecer tu contraseña. Revisá también la carpeta de Spam.');
            setIsForgotPassword(false);
        }
    };

    return (
        <Box style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
            
            {/* LADO IZQUIERDO (PC) */}
            <Box visibleFrom="md" style={{ flex: 1, padding: '4rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: 'white', background: 'linear-gradient(135deg, #20c997 0%, #087f5b 50%, #042b1e 100%)' }}>
                <div>
                    <Group gap="xl" align="flex-start" mb="xl">
                        <Image src={logoRodeo} alt="RodeoControl Logo" h={112} w="auto" />
                        {/* mt calibrado para que la R arranque a la altura del doblez de la caravana */}
                        <Title order={1} c="white" fw={800} mt={42} style={{ fontSize: '3.2rem', letterSpacing: '-1px' }}>
                            RodeoControl
                        </Title>
                    </Group>
                    <Text size="xl" mt="md" fw={500} style={{ color: 'rgba(255,255,255,0.9)', maxWidth: 500 }}>
                        Gestión inteligente, trazabilidad absoluta y control total del rodeo para tus establecimientos ganaderos.
                    </Text>
                    
                    <Stack mt={50} gap="md">
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Manejo y control total del rodeo y potreros</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Trazabilidad completa e historial clínico</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Seguimiento de peso individual y de lote con proyecciones</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Módulo financiero y libro mayor de caja</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Agenda inteligente y alertas de partos</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Compatible con bastones electrónicos RFID</Text></Group>
                        <Group><ThemeIcon color="teal.7" radius="xl" size="md"><IconCheck size={14}/></ThemeIcon><Text size="md">Equipo multi-usuario: dueño, veterinario y peón</Text></Group>
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
                        {isForgotPassword ? 'Recuperar contraseña' : isRegister ? '¡Probá gratis por 30 días!' : '¡Bienvenido de vuelta!'}
                    </Text>
                    <Text size="sm" ta="center" mb="xl" c={{ base: 'rgba(255,255,255,0.8)', md: 'dimmed' }}>
                        {isForgotPassword ? 'Te enviaremos un link para restablecer tu contraseña' : isRegister ? 'Ingresá un mail y contraseña para empezar' : 'Ingresá tus credenciales para acceder a tu campo'}
                    </Text>

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

                    {isForgotPassword ? (
                        <Paper withBorder shadow="xl" p={30} radius="md">
                            <TextInput
                                label="Correo Electrónico"
                                placeholder="usuario@campo.com"
                                required
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                leftSection={<IconMail size={16} />}
                            />
                            <Button fullWidth mt="xl" size="md" loading={forgotLoading} color="teal" onClick={submitForgotPassword}>
                                Enviar link de recuperación
                            </Button>
                            <Button fullWidth mt="sm" size="sm" variant="subtle" color="gray" leftSection={<IconArrowLeft size={14} />} onClick={exitForgotPassword}>
                                Volver al inicio de sesión
                            </Button>
                        </Paper>
                    ) : (
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
                                {!isRegister && (
                                    <Group justify="flex-end" mt="xs">
                                        <Anchor size="xs" c="dimmed" onClick={enterForgotPassword} style={{ cursor: 'pointer' }}>
                                            ¿Olvidaste tu contraseña?
                                        </Anchor>
                                    </Group>
                                )}
                                <Button fullWidth mt="md" size="md" type="submit" loading={authLoading} color="teal">
                                    {isRegister ? 'Crear Cuenta y Probar Gratis' : 'Iniciar Sesión'}
                                </Button>
                            </form>
                        </Paper>
                    )}

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
                                <Text size="sm" fw={700} mb="xs">Prueba Gratuita de 30 Días</Text>
                                <Text size="xs" c="dimmed" mb="md" px="sm">Creá tu cuenta ahora mismo y probá el sistema sin límites por 30 días.</Text>
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