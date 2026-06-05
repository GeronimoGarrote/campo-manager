import { useState, useEffect } from 'react';
import { Modal, Stack, TextInput, Group, Select, Switch, Button, Text, SegmentedControl, NumberInput } from '@mantine/core';
import { IconBabyCarriage, IconCalendarEvent, IconCurrencyDollar } from '@tabler/icons-react';
import { supabase } from '../supabase';

interface ModalAltaAnimalProps {
    opened: boolean;
    onClose: () => void;
    campoId: string | null;
    animales: any[];
    onSuccess: () => void;
    datosSuscripcion: any;
}

export default function ModalAltaAnimal({ opened, onClose, campoId, animales, onSuccess, datosSuscripcion }: ModalAltaAnimalProps) {
    const [modoAlta, setModoAlta] = useState<'individual' | 'masivo'>('individual');
    const [loading, setLoading] = useState(false);

    // ── Estado: modo individual ──────────────────────────────────────────────
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

    // ── Estado: modo masivo ──────────────────────────────────────────────────
    const [masivoCantidad, setMasivoCantidad] = useState<number | string>(1);
    const [masivoCategoria, setMasivoCategoria] = useState<string | null>('Ternero');
    const [masivoOrigen, setMasivoOrigen] = useState<string | null>('PROPIO');
    const [masivoPrecio, setMasivoPrecio] = useState<string | number>('');

    const opcionesGestacion = [ { value: '0.5', label: '15 días' }, { value: '1', label: '1 mes' }, { value: '2', label: '2 meses' }, { value: '3', label: '3 meses' }, { value: '4', label: '4 meses' }, { value: '5', label: '5 meses' }, { value: '6', label: '6 meses' }, { value: '7', label: '7 meses' }, { value: '8', label: '8 meses' }, { value: '9', label: '9 meses (A parir)' } ];
    const opcionesEdadEstimada = [ { value: '0', label: 'Recién nacido (0 meses)' }, { value: '6', label: '6 meses (Destete)' }, { value: '12', label: '1 año' }, { value: '24', label: '2 años' } ];

    // Bloquea/desbloquea sexo según categoría (solo afecta modo individual)
    useEffect(() => {
        if (['Vaca', 'Vaquillona'].includes(categoria || '')) { setSexo('H'); setSexoBloqueado(true); }
        else if (['Toro', 'Novillo'].includes(categoria || '')) { setSexo('M'); setSexoBloqueado(true); }
        else { setSexoBloqueado(false); }
    }, [categoria]);

    // Reset completo al abrir el modal
    useEffect(() => {
        if (opened) {
            setModoAlta('individual');
            setCaravana(''); setCategoria('Vaca'); setSexo('H'); setSexoBloqueado(true);
            setOrigenModal('PROPIO'); setPrecioCompra('');
            setNuevoEstadoReproductivo('VACÍA'); setNuevoLactancia(false);
            setNuevoMesesGestacion(null); setEdadEstimada(null);
            setMasivoCantidad(1); setMasivoCategoria('Ternero');
            setMasivoOrigen('PROPIO'); setMasivoPrecio('');
        }
    }, [opened]);

    // ── Generador de códigos SC únicos ───────────────────────────────────────
    // Busca todos los SC-NNN existentes en el array local, toma el máximo y
    // genera n códigos consecutivos desde ahí. Evita colisiones sin queries extra.
    function generarCodigosSC(n: number): string[] {
        const regex = /^SC-(\d+)$/i;
        const nums = animales
            .map(a => { const m = String(a.caravana).match(regex); return m ? parseInt(m[1]) : 0; })
            .filter(v => v > 0);
        const max = nums.length > 0 ? Math.max(...nums) : 0;
        return Array.from({ length: n }, (_, i) => `SC-${String(max + 1 + i).padStart(3, '0')}`);
    }

    // ── FLUJO A: Animal individual ───────────────────────────────────────────
    async function guardarAnimal(cerrarModal: boolean = true) {
        const animalesActivos = animales.filter(a => !['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(a.estado)).length;
        if (datosSuscripcion && animalesActivos >= datosSuscripcion.limite_animales) {
            return alert(`Límite alcanzado...`);
        }
        if (!campoId) return;

        // Si caravana vacía, generar código SC automático
        let caravanaFinal = caravana.trim();
        if (!caravanaFinal) {
            caravanaFinal = generarCodigosSC(1)[0];
        } else {
            const yaExiste = animales.some(a => a.caravana.toLowerCase() === caravanaFinal.toLowerCase() && !['ELIMINADO', 'VENDIDO', 'MUERTO'].includes(a.estado));
            if (yaExiste) return alert("❌ ERROR: Ya existe un animal ACTIVO con esa caravana.");
        }

        setLoading(true);
        const hoyStr = new Date().toISOString().split('T')[0];

        let fechaNac = hoyStr;
        if (edadEstimada) {
            const d = new Date(); d.setMonth(d.getMonth() - parseInt(edadEstimada));
            fechaNac = d.toISOString().split('T')[0];
        }

        let fechaServicioInicial = null;
        if (['Vaca', 'Vaquillona'].includes(categoria || '') && nuevoEstadoReproductivo === 'PREÑADA' && nuevoMesesGestacion) {
            const diasGestacionActual = parseFloat(nuevoMesesGestacion) * 30.4;
            const fServ = new Date();
            fServ.setDate(fServ.getDate() - Math.round(diasGestacionActual));
            fechaServicioInicial = fServ.toISOString().split('T')[0];
        }

        let estadoInicial = 'ACTIVO';
        if (['Vaca', 'Vaquillona'].includes(categoria || '')) {
            estadoInicial = nuevoEstadoReproductivo || 'VACÍA';
            if (nuevoLactancia) { estadoInicial = estadoInicial === 'PREÑADA' ? 'PREÑADA Y LACTANDO' : 'EN LACTANCIA'; }
        }

        const { data: newAnimalData, error } = await supabase.from('animales').insert([{
            caravana: caravanaFinal,
            categoria, sexo,
            estado: estadoInicial,
            condicion: 'SANA',
            origen: origenModal,
            fecha_nacimiento: fechaNac,
            fecha_ingreso: hoyStr,
            fecha_servicio: fechaServicioInicial,
            establecimiento_id: campoId,
            en_transito: false,
        }]).select();

        if (!error && newAnimalData && newAnimalData.length > 0) {
            const animalId = newAnimalData[0].id;

            if (fechaServicioInicial) {
                const diasFaltantes = Math.round(283 - (parseFloat(nuevoMesesGestacion!) * 30.4));
                const fechaParto = new Date();
                fechaParto.setDate(fechaParto.getDate() + diasFaltantes);
                await supabase.from('agenda').insert({
                    establecimiento_id: campoId,
                    fecha_programada: fechaParto.toISOString().split('T')[0],
                    titulo: `Parto: ${caravanaFinal}`,
                    descripcion: `Parto estimado por alta inicial (${nuevoMesesGestacion} meses).`,
                    tipo: 'PARTO_ESTIMADO',
                    animal_id: animalId,
                });
            }

            if (origenModal === 'COMPRADO' && precioCompra) {
                await supabase.from('caja').insert({ establecimiento_id: campoId, fecha: hoyStr, tipo: 'EGRESO', categoria: 'Hacienda (Venta/Compra)', detalle: `Compra animal caravana: ${caravanaFinal}`, monto: Number(precioCompra) });
                await supabase.from('eventos').insert({ animal_id: animalId, fecha_evento: new Date().toISOString(), tipo: 'COMPRA', resultado: 'Animal Comprado', detalle: `Costo: $${precioCompra}`, establecimiento_id: campoId, costo: Number(precioCompra) });
            }

            setCaravana(''); setPrecioCompra(''); setOrigenModal('PROPIO');
            setNuevoEstadoReproductivo('VACÍA'); setNuevoMesesGestacion(null);
            setEdadEstimada(null); setNuevoLactancia(false);
            onSuccess();
            if (cerrarModal) onClose();
        } else if (error) { alert("Error: " + error.message); }
        setLoading(false);
    }

    // ── FLUJO B: Alta masiva sin caravana ────────────────────────────────────
    async function guardarMasivo() {
        const cantidad = Number(masivoCantidad);
        if (!cantidad || cantidad < 1 || !masivoCategoria || !campoId) return;

        const animalesActivos = animales.filter(a => !['VENDIDO', 'MUERTO', 'ELIMINADO'].includes(a.estado)).length;
        if (datosSuscripcion && animalesActivos + cantidad > datosSuscripcion.limite_animales) {
            const disponibles = Math.max(0, datosSuscripcion.limite_animales - animalesActivos);
            return alert(`Límite de suscripción: podés agregar hasta ${disponibles} animal${disponibles !== 1 ? 'es' : ''} más (tenés ${animalesActivos} activos de ${datosSuscripcion.limite_animales}).`);
        }

        // Sexo por categoría (Ternero sin género explícito → M por defecto)
        let sexoMasivo = 'M';
        if (['Vaca', 'Vaquillona', 'Ternera'].includes(masivoCategoria)) sexoMasivo = 'H';

        // Estado inicial: vacas y vaquillas entran como VACÍA, resto ACTIVO
        let estadoMasivo = 'ACTIVO';
        if (['Vaca', 'Vaquillona'].includes(masivoCategoria)) estadoMasivo = 'VACÍA';

        const hoyStr = new Date().toISOString().split('T')[0];
        const codigos = generarCodigosSC(cantidad);

        const inserts = codigos.map(cod => ({
            caravana: cod,
            categoria: masivoCategoria,
            sexo: sexoMasivo,
            estado: estadoMasivo,
            condicion: 'SANA',
            origen: masivoOrigen,
            fecha_ingreso: hoyStr,
            establecimiento_id: campoId,
            en_transito: false,
        }));

        setLoading(true);
        const { error } = await supabase.from('animales').insert(inserts);
        if (error) { setLoading(false); return alert('Error: ' + error.message); }

        if (masivoOrigen === 'COMPRADO' && masivoPrecio) {
            await supabase.from('caja').insert({
                establecimiento_id: campoId,
                fecha: hoyStr,
                tipo: 'EGRESO',
                categoria: 'Hacienda (Venta/Compra)',
                detalle: `Compra de ${cantidad} ${masivoCategoria}${cantidad !== 1 ? 's' : ''} sin caravana`,
                monto: Number(masivoPrecio),
            });
        }

        setLoading(false);
        setMasivoCantidad(1); setMasivoCategoria('Ternero');
        setMasivoOrigen('PROPIO'); setMasivoPrecio('');
        onSuccess();
        onClose();
    }

    const cantidadNum = Number(masivoCantidad) || 0;

    return (
        <Modal opened={opened} onClose={onClose} title={<Text fw={700} size="lg">Alta de Nuevo Animal</Text>} centered>
            <Stack>
                <SegmentedControl
                    value={modoAlta}
                    onChange={(v) => setModoAlta(v as 'individual' | 'masivo')}
                    data={[
                        { value: 'individual', label: 'Animal individual' },
                        { value: 'masivo', label: 'Grupo sin caravana' },
                    ]}
                    fullWidth
                    color="teal"
                />

                {/* ─── MODO INDIVIDUAL ─── */}
                {modoAlta === 'individual' && (
                    <>
                        <TextInput label="Caravana" placeholder="ID del animal" value={caravana} onChange={(e) => setCaravana(e.target.value)} />
                        <Text size="xs" c="dimmed">
                            Podés dejarlo vacío y le asignaremos un código interno automático (SC-001, SC-002...).
                        </Text>
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
                    </>
                )}

                {/* ─── MODO MASIVO ─── */}
                {modoAlta === 'masivo' && (
                    <>
                        <Group grow>
                            <Select
                                label="Categoría"
                                data={['Vaca', 'Vaquillona', 'Ternera', 'Ternero', 'Novillo', 'Toro']}
                                value={masivoCategoria}
                                onChange={setMasivoCategoria}
                                allowDeselect={false}
                            />
                            <NumberInput
                                label="¿Cuántos animales?"
                                min={1}
                                max={500}
                                value={masivoCantidad}
                                onChange={setMasivoCantidad}
                            />
                        </Group>
                        <Select
                            label="Origen"
                            data={['PROPIO', 'COMPRADO']}
                            value={masivoOrigen}
                            onChange={setMasivoOrigen}
                            allowDeselect={false}
                        />
                        {masivoOrigen === 'COMPRADO' && (
                            <TextInput
                                label="Precio total de compra (opcional)"
                                type="number"
                                leftSection={<IconCurrencyDollar size={16}/>}
                                value={masivoPrecio}
                                onChange={(e) => setMasivoPrecio(e.target.value)}
                            />
                        )}
                        <Text size="sm" c="dimmed">
                            Se crearán {cantidadNum} animales con códigos SC-XXX. Podés asignarles caravana después desde la ficha.
                        </Text>
                        <Button fullWidth color="teal" loading={loading} onClick={guardarMasivo}>
                            Crear {cantidadNum} animales
                        </Button>
                    </>
                )}
            </Stack>
        </Modal>
    );
}
