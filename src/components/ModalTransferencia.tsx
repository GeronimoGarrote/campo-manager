import { useState, useEffect } from 'react';
import { Modal, Stack, Alert, Text, ScrollArea, Table, Badge, TextInput, Select, Group, Button } from '@mantine/core';
import { IconTruckDelivery } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '../supabase';

interface ModalTransferenciaProps {
    opened: boolean;
    onClose: () => void;
    transfActiva: any;
    campoId: string | null;
    animales: any[];
    potreros: any[];
    onSuccess: () => void;
    datosSuscripcion: any;
    rolActual?: 'DUENO' | 'PEON' | 'VETERINARIO';
}

export default function ModalTransferencia({ opened, onClose, transfActiva, campoId, animales, potreros, onSuccess, datosSuscripcion, rolActual = 'DUENO' }: ModalTransferenciaProps) {
    const [loading, setLoading] = useState(false);
    const [animalesEntrantes, setAnimalesEntrantes] = useState<any[]>([]);
    const [nuevasCaravanasMap, setNuevasCaravanasMap] = useState<Record<string, string>>({});
    const [transfPotreroId, setTransfPotreroId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ mensaje: string; onConfirm: () => void } | null>(null);

    useEffect(() => {
        if (opened && transfActiva) {
            cargarAnimales();
        } else {
            setAnimalesEntrantes([]);
            setNuevasCaravanasMap({});
            setTransfPotreroId(null);
        }
    }, [opened, transfActiva]);

    async function cargarAnimales() {
        setLoading(true);
        const { data } = await supabase.rpc('obtener_animales_transferencia', {
            p_transfer_id: transfActiva.id,
            p_campo_destino: campoId
        });
        if (data) setAnimalesEntrantes(data);
        setLoading(false);
    }

    async function aceptarTransferencia() {
        if (!transfActiva || !campoId) return;

        const animalesActivos = animales.filter(a => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO').length;
        const cantidadEntrante = transfActiva.animales_ids.length;

        if (datosSuscripcion && (animalesActivos + cantidadEntrante) > datosSuscripcion.limite_animales) {
            notifications.show({ title: 'Límite excedido', message: `Tenés ${animalesActivos} animales y querés ingresar ${cantidadEntrante}. Tu plan permite hasta ${datosSuscripcion.limite_animales}. Mejorá tu suscripción.`, color: 'red' });
            return;
        }

        const hayErrores = animalesEntrantes.some(a => {
            const val = nuevasCaravanasMap[a.id] ?? a.caravana;
            return animales.some(localA => localA.caravana.toLowerCase() === val.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(localA.estado));
        });
        if (hayErrores) { notifications.show({ title: 'Caravanas duplicadas', message: 'Corregí las caravanas duplicadas antes de aceptar.', color: 'red' }); return; }

        setLoading(true);

        const payloadCaravanas = animalesEntrantes.map(a => ({
            id: a.id,
            caravana: nuevasCaravanasMap[a.id] !== undefined ? nuevasCaravanasMap[a.id] : a.caravana
        }));

        const { error } = await supabase.rpc('aceptar_transferencia', {
            p_transfer_id: transfActiva.id,
            p_campo_destino: campoId,
            p_nuevas_caravanas: payloadCaravanas,
            p_potrero_id: transfPotreroId || null
        });

        if (error) {
            notifications.show({ title: 'Error al procesar', message: error.message, color: 'red' });
        } else {
            onSuccess();
            onClose();
        }
        setLoading(false);
    }

    function rechazarTransferencia() {
        if (!transfActiva) return;
        setConfirmModal({
            mensaje: '¿Rechazar la transferencia? Los animales volverán al campo de origen.',
            onConfirm: async () => {
                setLoading(true);
                const { error } = await supabase.rpc('rechazar_transferencia', {
                    p_transfer_id: transfActiva.id,
                    p_campo_destino: campoId
                });
                if (error) {
                    notifications.show({ title: 'Error al rechazar', message: error.message, color: 'red' });
                } else {
                    onSuccess();
                    onClose();
                }
                setLoading(false);
            },
        });
    }

    if (!transfActiva) return null;

    return (
        <>
        <Modal opened={!!confirmModal} onClose={() => setConfirmModal(null)} title={<Text fw={700}>Confirmar acción</Text>} centered size="sm" zIndex={3000}>
            <Stack>
                <Text>{confirmModal?.mensaje}</Text>
                <Group grow mt="sm">
                    <Button variant="default" onClick={() => setConfirmModal(null)}>Cancelar</Button>
                    <Button color="red" onClick={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>Confirmar</Button>
                </Group>
            </Stack>
        </Modal>
        <Modal opened={opened} onClose={onClose} title={<Text fw={700} size="lg">Hacienda Entrante por Red</Text>} centered size="xl">
            <Stack>
                <Alert color="blue" icon={<IconTruckDelivery size={16}/>}>
                    Estás recibiendo <Text span fw={700}>{transfActiva.animales_ids.length} animal(es)</Text> de <Text span fw={700}>{transfActiva.origen_nombre}</Text>.
                    {rolActual === 'DUENO' && (
                        <><br/>Monto a descontar de caja: <Text span fw={700} c="red">${transfActiva.precio_total?.toLocaleString('es-AR') ?? 0}</Text></>
                    )}
                </Alert>

                {loading && animalesEntrantes.length === 0 ? (
                    <Text c="dimmed" ta="center" py="xl">Cargando animales...</Text>
                ) : (
                    <ScrollArea h={300} type="always" offsetScrollbars>
                        <Table striped>
                            <Table.Thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'white' }}>
                                <Table.Tr>
                                    <Table.Th>Caravana</Table.Th>
                                    <Table.Th>Categoría</Table.Th>
                                    <Table.Th>Sexo</Table.Th>
                                    <Table.Th>Estado</Table.Th>
                                    <Table.Th>Nueva Caravana (opcional)</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {animalesEntrantes.map(a => {
                                    const nuevaCarav = nuevasCaravanasMap[a.id] ?? a.caravana;
                                    const existe = animales.some(localA => localA.caravana.toLowerCase() === nuevaCarav.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(localA.estado));

                                    return (
                                        <Table.Tr key={a.id}>
                                            <Table.Td><Badge color="gray">{a.caravana}</Badge></Table.Td>
                                            <Table.Td>{a.categoria}</Table.Td>
                                            <Table.Td>{a.sexo === 'M' ? 'Macho' : 'Hembra'}</Table.Td>
                                            <Table.Td><Badge size="sm" color="blue" variant="light">{a.estado}</Badge></Table.Td>
                                            <Table.Td>
                                                <TextInput
                                                    size="xs"
                                                    value={nuevasCaravanasMap[a.id] !== undefined ? nuevasCaravanasMap[a.id] : a.caravana}
                                                    onChange={(e) => setNuevasCaravanasMap({...nuevasCaravanasMap, [a.id]: e.target.value})}
                                                    error={existe ? "Ya existe en tu campo" : null}
                                                />
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}

                <Select label="Asignar a Potrero" placeholder="Opcional" data={potreros.map(p => ({value: p.id, label: p.nombre}))} value={transfPotreroId} onChange={setTransfPotreroId} clearable />
                {rolActual === 'DUENO' ? (
                    <Group grow mt="md">
                        <Button color="red" variant="outline" onClick={rechazarTransferencia} disabled={loading}>Rechazar</Button>
                        <Button color="teal" onClick={aceptarTransferencia} loading={loading}>Aceptar y Pagar</Button>
                    </Group>
                ) : (
                    <Alert color="orange" mt="md">Solo el dueño del campo puede aceptar o rechazar transferencias.</Alert>
                )}
            </Stack>
        </Modal>
        </>
    );
}
