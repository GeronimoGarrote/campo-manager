import { Box, Title, Text, Stack, Group, ThemeIcon, Container, Paper, TextInput, PasswordInput, Button, Divider } from '@mantine/core';
import { IconCheck, IconMail, IconBrandWhatsapp } from '@tabler/icons-react';
import logoRodeo from '../assets/loggoblanco.png'; 

export default function Login({ email, setEmail, password, setPassword, handleLogin, authLoading }: any) {
    return (
        <Box style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
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
                    <Text size="sm" style={{ color: 'rgba(255,255,255,0.6)' }}>© 2026 RodeoControl. Desarrollado en Argentina.</Text>
                </div>
            </Box>

            <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <Container size={420} w="100%" px={0}>
                    <Group justify="center" mb="md" hiddenFrom="md">
                        <img src={logoRodeo} alt="RodeoControl Logo" style={{ height: 48, width: 'auto' }} />
                    </Group>
                    <Title ta="center" order={2} hiddenFrom="md" c="teal" mb="xs">RodeoControl</Title>
                    
                    <Text size="lg" fw={700} ta="center" mb="xs">¡Bienvenido de vuelta!</Text>
                    <Text size="sm" c="dimmed" ta="center" mb="xl">Ingresá tus credenciales para acceder a tu campo</Text>

                    <Paper withBorder shadow="md" p={30} radius="md">
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
                        <Button fullWidth mt="xl" size="md" onClick={handleLogin} loading={authLoading} color="teal">
                            Iniciar Sesión
                        </Button>
                    </Paper>

                    <Divider my="xl" label="¿No tenés cuenta?" labelPosition="center" />
                    
                    <Paper withBorder bg="gray.0" p="md" radius="md" ta="center">
                        <Text size="sm" fw={700} mb="xs">Solicitá una prueba gratuita de 5 dias o alta de cuenta</Text>
                        <Text size="xs" c="dimmed" mb="md" px="sm">RodeoControl es un sistema de uso cerrado. Contactanos directamente para dar de alta tu establecimiento y configurar el sistema.</Text>
                        
                        <Group justify="center" gap="sm">
                            <Button 
                                component="a" 
                                href="https://wa.me/5492345505575?text=Hola,%20quiero%20solicitar%20info%20para%20registrar%20una%20cuenta%20en%20RodeoControl." 
                                target="_blank" 
                                variant="light" 
                                color="teal" 
                                size="sm" 
                                leftSection={<IconBrandWhatsapp size={16} />}
                            >
                                WhatsApp
                            </Button>
                            <Button 
                                component="a" 
                                href="mailto:rodeocontrol.app@gmail.com?subject=Solicitud%20de%20cuenta&body=Hola,%20quiero%20solicitar%20info%20para%20registrar%20una%20cuenta%20en%20RodeoControl." 
                                variant="light" 
                                color="blue" 
                                size="sm" 
                                leftSection={<IconMail size={16} />}
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