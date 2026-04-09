import { useState, useEffect } from 'react';
import { Modal, Stack, TextInput, Group, Select, Switch, Button, Text } from '@mantine/core';
import { IconBabyCarriage, IconCalendarEvent, IconCurrencyDollar } from '@tabler/icons-react';
import { supabase } from '../supabase';

interface ModalAltaAnimalProps {
    opened: boolean;
    onClose: () => void;
    campoId: string | null;
    animales: any[];
    onSuccess: () => void;
}

export default function ModalAltaAnimal({ opened, onClose, campoId, animales, onSuccess }: ModalAltaAnimalProps) {
    const [loading, setLoading] = useState(false);
    const [caravana, setCaravana] = useState('');
    const [categoria, setCategoria] = useState<string | null>('Vaca');
    const [sexo, setSexo] = useState<string | null>('H');
    const [sexoBloqueado, setSexoBloqueado] = useState(true);
    const [origenModal, setOrigenModal] = useState<string | null>('PROPIO');
    const [precioCompra, setPrecioCompra] = useState<string | number>('');
    const [nuevoEstadoReproductivo, setNuevoEstadoReproductivo] = useState<string | null>('VACÍA');
    const [nuevoLactancia, setNuevoLactancia] = useState(false); 
    const [nuevoMesesGestacion, setNuevoMesesGestacion] = useState<string | null>(null);
    const [edadEstimada, setEdadEstimada] = useState<string | null>(null);

    const opcionesGestacion = [ { value: '0.5', label: '15 días' }, { value: '1', label: '1 mes' }, { value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }, { value: '9', label: '9 meses (A parir)' } ];
    const opcionesEdadEstimada = [ { value: '0', label: 'Recién nacido (0 meses)' }, { value: '6', label: '6 meses (Destete)' }, { value: '12', label: '1 año' }, { value: '24', label: '2 años' } ];

    useEffect(() => {
        if (['Vaca', 'Vaquillona'].includes(categoria || '')) { setSexo('H'); setSexoBloqueado(true); } 
        else if (['Toro', 'Novillo'].includes(categoria || '')) { setSexo('M'); setSexoBloqueado(true); } 
        else { setSexoBloqueado(false); }
    }, [categoria]);

    async function guardarAnimal(cerrarModal: boolean = true) {
        if (!caravana || !campoId) return;
        if (origenModal === 'COMPRADO' && !precioCompra) return alert("Ingresá el precio de compra.");
        
        const yaExiste = animales.some(a => a.caravana.toLowerCase() === caravana.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(a.estado));
        if (yaExiste) return alert("❌ ERROR: Ya existe un animal ACTIVO con esa caravana.");
        
        setLoading(true); const hoy = new Date().toISOString().split('T')[0];
        let fechaNac = hoy; 
        if (edadEstimada) { const d = new Date(); d.setMonth(d.getMonth() - parseInt(edadEstimada)); fechaNac = d.toISOString().split('T')[0]; }
        
        let estadoInicial = 'ACTIVO'; 
        if (['Vaca', 'Vaquillona'].includes(categoria || '')) { 
            estadoInicial = nuevoEstadoReproductivo || 'VACÍA'; 
            if (nuevoLactancia) { estadoInicial = estadoInicial === 'PREÑADA' ? 'PREÑADA Y LACTANDO' : 'EN LACTANCIA'; }
        }
        
        const { data: newAnimalData, error } = await supabase.from('animales').insert([{ caravana, categoria, sexo, estado: estadoInicial, condicion: 'SANA', origen: origenModal, fecha_nacimiento: fechaNac, fecha_ingreso: hoy, establecimiento_id: campoId, en_transito: false }]).select();
        
        if (!error && newAnimalData && newAnimalData.length > 0) {
            const animalId = newAnimalData[0].id;
            if (origenModal === 'COMPRADO' && precioCompra) {
                await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: hoy, tipo: 'EGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Compra animal caravana: ${caravana}`, monto: Number(precioCompra) });
                await supabase.from('eventos').insert({ animal_id: animalId, fecha_evento: new Date().toISOString(), tipo: 'COMPRA', resultado: 'Animal Comprado', detalle: `Costo: $${precioCompra}`, establecimiento_id: campoId, costo: Number(precioCompra) });
            }
            setCaravana(''); setPrecioCompra(''); setOrigenModal('PROPIO'); setNuevoEstadoReproductivo('VACÍA'); setNuevoMesesGestacion(null); setEdadEstimada(null); setNuevoLactancia(false); 
            onSuccess();
            if (cerrarModal) onClose(); 
        } else if (error) { alert("Error: " + error.message); }
        setLoading(false); 
    }

    return (
        <Modal opened={opened} onClose={onClose} title={<Text fw={700} size="lg">Alta de Nuevo Animal</Text>} centered>
            <Stack>
                <TextInput label="Caravana" placeholder="ID del animal" value={caravana} onChange={(e) => setCaravana(e.target.value)} />
                <Group grow mt="sm">
                    <Select label="Categoría" data={['Vaca', 'Vaquillona', 'Ternero', 'Novillo', 'Toro']} value={categoria} onChange={setCategoria} />
                    <Select label="Sexo" data={['H', 'M']} value={sexo} onChange={setSexo} disabled={sexoBloqueado} />
                </Group>
                
                {['Vaca', 'Vaquillona'].includes(categoria || '') && (
                    <>
                    <Group grow mt="sm" align="flex-start">
                        <Select label="Estado Reproductivo" data={['VACÍA', 'PREÑADA']} value={nuevoEstadoReproductivo} onChange={setNuevoEstadoReproductivo} allowDeselect={false} />
                        {nuevoEstadoReproductivo === 'PREÑADA' && <Select label="Gestación" placeholder="Opcional" data={opcionesGestacion} value={nuevoMesesGestacion} onChange={setNuevoMesesGestacion} clearable leftSection={<IconBabyCarriage size={16}/>}/>}
                    </Group>
                    <Switch mt="sm" size="md" onLabel="EN LACTANCIA" offLabel="SIN CRÍA" label="¿Está criando a un ternero?" checked={nuevoLactancia} onChange={(e) => setNuevoLactancia(e.currentTarget.checked)} color="grape" />
                    </>
                )}

                <Group grow mt="sm" align="flex-start">
                    <Select label="Origen" data={['PROPIO', 'COMPRADO']} value={origenModal} onChange={setOrigenModal} allowDeselect={false} />
                    <Select label="Edad Estimada" placeholder="Opcional" data={opcionesEdadEstimada} value={edadEstimada} onChange={setEdadEstimada} clearable leftSection={<IconCalendarEvent size={16}/>} />
                </Group>
                {origenModal === 'COMPRADO' && <TextInput mt="sm" label="Precio de Compra ($)" type="number" leftSection={<IconCurrencyDollar size={16}/>} value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />}
                
                <Group grow mt="xl">
                    <Button onClick={() => guardarAnimal(false)} loading={loading} color="teal" variant="outline">Guardar y agregar otro</Button>
                    <Button onClick={() => guardarAnimal(true)} loading={loading} color="teal">Guardar y cerrar</Button>
                </Group>
            </Stack>
        </Modal>
    );
}