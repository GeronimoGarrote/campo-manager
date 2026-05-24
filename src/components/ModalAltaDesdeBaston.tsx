import { useState, useEffect } from 'react';
import { Modal, Stack, TextInput, Group, Select, Switch, Button, Text, Alert, Badge } from '@mantine/core';
import { IconBabyCarriage, IconCalendarEvent, IconCurrencyDollar, IconScan, IconInfoCircle } from '@tabler/icons-react';
import { supabase } from '../supabase';

interface Props {
    opened: boolean;
    onClose: () => void;
    caravanaElectronica: string;
    campoId: string | null;
    animales: any[];
    datosSuscripcion: any;
    onSuccess: (newAnimalId: string) => void;
}

export default function ModalAltaDesdeBaston({
    opened, onClose, caravanaElectronica, campoId, animales, datosSuscripcion, onSuccess,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [caravana, setCaravana] = useState('');
    const [categoria, setCategoria] = useState<string | null>('Vaca');
    const [sexo, setSexo] = useState<string | null>('H');
    const [sexoBloqueado, setSexoBloqueado] = useState(true);
    const [origen, setOrigen] = useState<string | null>('PROPIO');
    const [precioCompra, setPrecioCompra] = useState('');
    const [estadoReproductivo, setEstadoReproductivo] = useState<string | null>('VACÍA');
    const [lactancia, setLactancia] = useState(false);
    const [mesesGestacion, setMesesGestacion] = useState<string | null>(null);
    const [edadEstimada, setEdadEstimada] = useState<string | null>(null);

    const opcionesGestacion = [
        { value: '0.5', label: '15 días' }, { value: '1', label: '1 mes' },
        { value: '2', label: '2 meses' }, { value: '3', label: '3 meses' },
        { value: '4', label: '4 meses' }, { value: '5', label: '5 meses' },
        { value: '6', label: '6 meses' }, { value: '7', label: '7 meses' },
        { value: '8', label: '8 meses' }, { value: '9', label: '9 meses (A parir)' },
    ];
    const opcionesEdad = [
        { value: '0', label: 'Recién nacido' }, { value: '6', label: '6 meses (Destete)' },
        { value: '12', label: '1 año' }, { value: '24', label: '2 años' },
    ];

    useEffect(() => {
        if (['Vaca', 'Vaquillona'].includes(categoria || '')) { setSexo('H'); setSexoBloqueado(true); }
        else if (['Toro', 'Novillo'].includes(categoria || '')) { setSexo('M'); setSexoBloqueado(true); }
        else { setSexoBloqueado(false); }
    }, [categoria]);

    // Reset al abrir
    useEffect(() => {
        if (opened) {
            setCaravana(''); setCategoria('Vaca'); setSexo('H'); setOrigen('PROPIO');
            setPrecioCompra(''); setEstadoReproductivo('VACÍA'); setLactancia(false);
            setMesesGestacion(null); setEdadEstimada(null);
        }
    }, [opened]);

    async function guardar() {
        const animalesActivos = animales.filter(
            a => a.estado !== 'VENDIDO' && a.estado !== 'MUERTO' && a.estado !== 'ELIMINADO'
        ).length;

        if (datosSuscripcion && animalesActivos >= datosSuscripcion.limite_animales) {
            alert(`Límite de tu plan alcanzado (${datosSuscripcion.limite_animales} animales). Mejorá tu plan para agregar más.`);
            return;
        }

        if (!caravana.trim() || !campoId) {
            alert('La caravana visual es obligatoria.');
            return;
        }

        const yaExiste = animales.some(
            a => a.caravana.toLowerCase() === caravana.trim().toLowerCase()
                && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(a.estado)
        );
        if (yaExiste) { alert('Ya existe un animal activo con esa caravana visual.'); return; }

        setLoading(true);
        const hoyStr = new Date().toISOString().split('T')[0];

        let fechaNac = hoyStr;
        if (edadEstimada) {
            const d = new Date();
            d.setMonth(d.getMonth() - parseInt(edadEstimada));
            fechaNac = d.toISOString().split('T')[0];
        }

        let fechaServicio = null;
        if (['Vaca', 'Vaquillona'].includes(categoria || '') && estadoReproductivo === 'PREÑADA' && mesesGestacion) {
            const fServ = new Date();
            fServ.setDate(fServ.getDate() - Math.round(parseFloat(mesesGestacion) * 30.4));
            fechaServicio = fServ.toISOString().split('T')[0];
        }

        let estadoInicial = 'ACTIVO';
        if (['Vaca', 'Vaquillona'].includes(categoria || '')) {
            estadoInicial = estadoReproductivo || 'VACÍA';
            if (lactancia) estadoInicial = estadoInicial === 'PREÑADA' ? 'PREÑADA Y LACTANDO' : 'EN LACTANCIA';
        }

        const { data, error } = await supabase.from('animales').insert([{
            caravana: caravana.trim(),
            caravana_electronica: caravanaElectronica.trim(),
            categoria,
            sexo,
            estado: estadoInicial,
            condicion: 'SANA',
            origen,
            fecha_nacimiento: fechaNac,
            fecha_ingreso: hoyStr,
            fecha_servicio: fechaServicio,
            establecimiento_id: campoId,
            en_transito: false,
        }]).select();

        if (error) { alert('Error: ' + error.message); setLoading(false); return; }

        const animalId = data![0].id;

        if (fechaServicio && mesesGestacion) {
            const diasFaltantes = Math.round(283 - parseFloat(mesesGestacion) * 30.4);
            const fechaParto = new Date();
            fechaParto.setDate(fechaParto.getDate() + diasFaltantes);
            await supabase.from('agenda').insert({
                establecimiento_id: campoId,
                fecha_programada: fechaParto.toISOString().split('T')[0],
                titulo: `Parto: ${caravana.trim()}`,
                descripcion: `Parto estimado por alta desde bastón.`,
                tipo: 'PARTO_ESTIMADO',
                animal_id: animalId,
            });
        }

        if (origen === 'COMPRADO' && precioCompra) {
            await supabase.from('caja').insert({
                establecimiento_id: campoId, fecha: hoyStr,
                tipo: 'EGRESO', categoria: 'Hacienda (Venta/Compra)',
                detalle: `Compra animal caravana: ${caravana.trim()}`, monto: Number(precioCompra),
            });
        }

        setLoading(false);
        onSuccess(animalId);
        onClose();
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Group gap="xs"><IconScan size={20} /><Text fw={700} size="lg">Registrar Animal Escaneado</Text></Group>}
            centered
            size="md"
        >
            <Stack>
                <Alert icon={<IconInfoCircle size="1rem" />} color="teal" variant="light">
                    <Text size="sm">EID escaneado:</Text>
                    <Badge color="teal" size="lg" mt={4} style={{ fontFamily: 'monospace' }}>{caravanaElectronica}</Badge>
                </Alert>

                <TextInput
                    label="Caravana Visual (Caravana plástica)"
                    placeholder="Ej: 1045"
                    required
                    value={caravana}
                    onChange={(e) => setCaravana(e.target.value)}
                    description="El número visible en la oreja del animal"
                />

                <Group grow align="flex-start">
                    <Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={categoria} onChange={setCategoria} allowDeselect={false} />
                    <Select label="Sexo" data={['H', 'M']} value={sexo} onChange={setSexo} disabled={sexoBloqueado} allowDeselect={false} />
                </Group>

                {['Vaca', 'Vaquillona'].includes(categoria || '') && (
                    <>
                        <Group grow align="flex-start">
                            <Select label="Estado Reproductivo" data={['VACÍA', 'PREÑADA']} value={estadoReproductivo} onChange={setEstadoReproductivo} allowDeselect={false} />
                            {estadoReproductivo === 'PREÑADA' && (
                                <Select label="Gestación" placeholder="Opcional" data={opcionesGestacion} value={mesesGestacion} onChange={setMesesGestacion} clearable leftSection={<IconBabyCarriage size={16} />} />
                            )}
                        </Group>
                        <Switch size="md" onLabel="EN LACTANCIA" offLabel="SIN CRÍA" label="¿Está criando un ternero?" checked={lactancia} onChange={(e) => setLactancia(e.currentTarget.checked)} color="grape" />
                    </>
                )}

                <Group grow align="flex-start">
                    <Select label="Origen" data={['PROPIO', 'COMPRADO']} value={origen} onChange={setOrigen} allowDeselect={false} />
                    <Select label="Edad Estimada" placeholder="Opcional" data={opcionesEdad} value={edadEstimada} onChange={setEdadEstimada} clearable leftSection={<IconCalendarEvent size={16} />} />
                </Group>

                {origen === 'COMPRADO' && (
                    <TextInput label="Precio de Compra ($)" type="number" leftSection={<IconCurrencyDollar size={16} />} value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />
                )}

                <Group grow mt="md">
                    <Button variant="default" onClick={onClose}>Cancelar</Button>
                    <Button color="teal" loading={loading} onClick={guardar} leftSection={<IconScan size={16} />}>
                        Registrar y Seleccionar
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
