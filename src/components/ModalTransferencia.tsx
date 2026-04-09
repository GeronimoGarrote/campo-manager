import { useState, useEffect } from 'react';
import { Modal, Stack, Alert, Text, ScrollArea, Table, Badge, TextInput, Select, Group, Button } from '@mantine/core';
import { IconTruckDelivery } from '@tabler/icons-react';
import { supabase } from '../supabase';

interface ModalTransferenciaProps {
    opened: boolean;
    onClose: () => void;
    transfActiva: any;
    campoId: string | null;
    animales: any[];
    potreros: any[];
    onSuccess: () => void;
}

export default function ModalTransferencia({ opened, onClose, transfActiva, campoId, animales, potreros, onSuccess }: ModalTransferenciaProps) {
    const [loading, setLoading] = useState(false);
    const [animalesEntrantes, setAnimalesEntrantes] = useState<any[]>([]);
    const [nuevasCaravanasMap, setNuevasCaravanasMap] = useState<Record<string, string>>({});
    const [transfPotreroId, setTransfPotreroId] = useState<string | null>(null);

    // Cuando se abre el modal y hay una transferencia activa, cargamos los animales de esa transferencia
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
        const { data } = await supabase.rpc('obtener_animales_transferencia', { p_ids: transfActiva.animales_ids });
        if (data) setAnimalesEntrantes(data);
        setLoading(false);
    }

    async function aceptarTransferencia() {
        if (!transfActiva || !campoId) return;
        
        const hayErrores = animalesEntrantes.some(a => {
            const val = nuevasCaravanasMap[a.id] ?? a.caravana;
            return animales.some(localA => localA.caravana.toLowerCase() === val.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(localA.estado));
        });
        if (hayErrores) return alert("Por favor corregí las caravanas duplicadas antes de aceptar.");

        setLoading(true);
        
        const payloadCaravanas = animalesEntrantes.map(a => ({
            id: a.id,
            caravana: nuevasCaravanasMap[a.id] !== undefined ? nuevasCaravanasMap[a.id] : a.caravana
        }));

        const { error } = await supabase.rpc('aceptar_transferencia', {
            p_transfer_id: transfActiva.id,
            p_campo_destino: campoId,
            p_potrero_destino: transfPotreroId || null,
            p_nuevas_caravanas: payloadCaravanas
        });

        if (error) {
            alert("Error al procesar el ingreso: " + error.message);
        } else {
            onSuccess();
            onClose();
        }
        setLoading(false);
    }

    async function rechazarTransferencia() {
        if (!transfActiva || !confirm("¿Rechazar transferencia? Los animales volverán al campo de origen.")) return;
        setLoading(true);
        
        const { error } = await supabase.rpc('rechazar_transferencia', { 
            p_transfer_id: transfActiva.id 
        });

        if (error) {
            alert("Error al rechazar: " + error.message);
        } else {
            onSuccess();
            onClose();
        }
        setLoading(false);
    }

    if (!transfActiva) return null;

    return (
        <Modal opened={opened} onClose={onClose} title={<Text fw={700} size="lg">Hacienda Entrante por Red</Text>} centered size="xl">
            <Stack>
                <Alert color="blue" icon={<IconTruckDelivery size={16}/>}>
                    Estás recibiendo <Text span fw={700}>{transfActiva.animales_ids.length} animal(es)</Text> de <Text span fw={700}>{transfActiva.origen_nombre}</Text>.<br/>
                    Monto a descontar de caja: <Text span fw={700} c="green">${transfActiva.precio_total}</Text>
                </Alert>
                
                {loading && animalesEntrantes.length === 0 ? ( <Text c="dimmed" ta="center" py="xl">Cargando animales...</Text> ) : (
                    <ScrollArea h={300} type="always" offsetScrollbars>
                        <Table striped>
                            <Table.Thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'white' }}>
                                <Table.Tr><Table.Th>Caravana Origen</Table.Th><Table.Th>Categoría</Table.Th><Table.Th>Asignar Nueva Caravana (Opcional)</Table.Th></Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {animalesEntrantes.map(a => {
                                    const nuevaCarav = nuevasCaravanasMap[a.id] ?? a.caravana;
                                    const existe = animales.some(localA => localA.caravana.toLowerCase() === nuevaCarav.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(localA.estado));
                                    
                                    return (
                                        <Table.Tr key={a.id}>
                                            <Table.Td><Badge color="gray">{a.caravana}</Badge></Table.Td>
                                            <Table.Td>{a.categoria}</Table.Td>
                                            <Table.Td>
                                                <TextInput 
                                                    size="xs" 
                                                    value={nuevasCaravanasMap[a.id] !== undefined ? nuevasCaravanasMap[a.id] : a.caravana} 
                                                    onChange={(e) => setNuevasCaravanasMap({...nuevasCaravanasMap, [a.id]: e.target.value})}
                                                    error={existe ? "Ya existe en tu campo" : null}
                                                />
                                            </Table.Td>
                                        </Table.Tr>
                                    )
                                })}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}

                <Select label="Asignar a Potrero" placeholder="Opcional" data={potreros.map(p => ({value: p.id, label: p.nombre}))} value={transfPotreroId} onChange={setTransfPotreroId} clearable />
                <Group grow mt="md">
                    <Button color="red" variant="outline" onClick={rechazarTransferencia} disabled={loading}>Rechazar</Button>
                    <Button color="teal" onClick={aceptarTransferencia} loading={loading}>Aceptar y Pagar</Button>
                </Group>
            </Stack>
        </Modal>
    );
}