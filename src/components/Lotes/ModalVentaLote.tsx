import { useState, useEffect } from 'react';
import { Modal, Stack, Alert, TextInput, Select, Group, NumberInput, Paper, Text, Button, Title, Switch } from '@mantine/core';
import { IconInfoCircle, IconCurrencyDollar, IconTruckDelivery } from '@tabler/icons-react';
import { supabase } from '../../supabase';

const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };

export default function ModalVentaLote({ opened, onClose, loteSel, animalesEnEsteLote, campoId, establecimientos, statsGraficoLote, onVentaExitosa }: any) {
    const [ventaPrecioUnitario, setVentaPrecioUnitario] = useState<number | ''>('');
    const [ventaPrecioTotal, setVentaPrecioTotal] = useState<number | ''>('');
    const [ventaFecha, setVentaFecha] = useState<Date | null>(new Date());
    const [ventaComprador, setVentaComprador] = useState('');
    const [ventaMetodo, setVentaMetodo] = useState<string | null>('TOTAL');
    const [ventaKilosTotales, setVentaKilosTotales] = useState<number | ''>('');
    const [esVentaRed, setEsVentaRed] = useState(false);
    const [renspaDestino, setRenspaDestino] = useState('');
    const [loadingVenta, setLoadingVenta] = useState(false);

    useEffect(() => {
        if (ventaMetodo === 'KILO' && ventaPrecioUnitario && ventaKilosTotales) {
            setVentaPrecioTotal(Number(ventaPrecioUnitario) * Number(ventaKilosTotales));
        } else if (ventaMetodo === 'BULTO' && ventaPrecioUnitario && animalesEnEsteLote) {
            setVentaPrecioTotal(Number(ventaPrecioUnitario) * animalesEnEsteLote.length);
        }
    }, [ventaMetodo, ventaPrecioUnitario, ventaKilosTotales, animalesEnEsteLote]);

    function resetForm() {
        setVentaPrecioUnitario('');
        setVentaPrecioTotal('');
        setVentaFecha(new Date());
        setVentaComprador('');
        setVentaMetodo('TOTAL');
        setVentaKilosTotales('');
        setEsVentaRed(false);
        setRenspaDestino('');
    }

    async function ejecutarVentaLote() {
        if (!ventaPrecioTotal || !ventaFecha || !campoId || animalesEnEsteLote.length === 0) return alert("Faltan datos para la venta.");
        setLoadingVenta(true);

        const fechaIso = ventaFecha.toISOString().split('T')[0];
        const idsAnimales = animalesEnEsteLote.map((a: any) => a.id);

        const { data: eventosCostos } = await supabase
            .from('lotes_eventos')
            .select('costo')
            .eq('lote_id', loteSel.id);
        const sumatoriaCostos = eventosCostos?.reduce((acc: number, curr: any) => acc + (Number(curr.costo) || 0), 0) || 0;

        const nuevoHistorico = {
            establecimiento_id: campoId,
            lote_id: loteSel.id,
            nombre_lote: loteSel.nombre,
            cantidad_animales: animalesEnEsteLote.length,
            peso_inicial: statsGraficoLote.totalInicio || statsGraficoLote.inicio || 0,
            peso_final: statsGraficoLote.totalActual || statsGraficoLote.actual || 0,
            ganancia_promedio: statsGraficoLote.ganancia || 0,
            adpv: statsGraficoLote.adpv || '0',
            dias_ciclo: statsGraficoLote.dias || 0,
            vendido: true,
            ingreso_total: ventaPrecioTotal,
            costo_total: sumatoriaCostos,
            fecha_cierre: fechaIso,
            animales_ids: idsAnimales
        };

        if (esVentaRed) {
            if (!renspaDestino.trim()) { setLoadingVenta(false); return alert("Ingresá el RENSPA del comprador."); }

            const { data, error: rpcErr } = await supabase.rpc('buscar_campo_por_renspa', { buscar_renspa: renspaDestino.trim() }).single();
            const dest = data as any;
            if (rpcErr || !dest) { setLoadingVenta(false); return alert("No se encontró ningún campo con ese RENSPA."); }
            if (dest.id === campoId) { setLoadingVenta(false); return alert("No podés transferirte a vos mismo."); }

            const nombreOrigen = establecimientos?.find((e: any) => e.id === campoId)?.nombre || 'Campo Desconocido';

            const { error: errTransf } = await supabase.from('transferencias').insert({
                campo_origen_id: campoId,
                campo_destino_id: dest.id,
                animales_ids: idsAnimales,
                precio_total: ventaPrecioTotal,
                detalles: `Venta lote ${loteSel.nombre} (${animalesEnEsteLote.length} animales)`,
                origen_nombre: nombreOrigen,
                estado: 'PENDIENTE'
            });
            if (errTransf) { setLoadingVenta(false); return alert("Error al crear la transferencia: " + errTransf.message); }

            const { data: ventaData } = await supabase.from('ventas').insert([{
                establecimiento_id: campoId,
                fecha: fechaIso,
                tipo: 'LOTE',
                destino: dest.nombre,
                comprador: dest.nombre,
                modalidad: ventaMetodo,
                monto_total: ventaPrecioTotal,
                kilos_totales: ventaMetodo === 'KILO' ? ventaKilosTotales : null,
                animales_ids: idsAnimales
            }]).select('id').single();

            if (Number(ventaPrecioTotal) > 0) {
                await supabase.from('caja').insert([{
                    establecimiento_id: campoId,
                    fecha: fechaIso,
                    tipo: 'INGRESO',
                    categoria: 'Hacienda (Venta/Compra)',
                    detalle: `Venta Red - Lote: ${loteSel.nombre} → ${dest.nombre} (${animalesEnEsteLote.length} cabezas)`,
                    monto: ventaPrecioTotal,
                    venta_id: ventaData?.id ?? null
                }]);
            }

            await supabase.from('animales').update({ en_transito: true, lote_id: null, detalle_baja: `En tránsito a: ${dest.nombre}` }).in('id', idsAnimales);

            const eventosVenta = idsAnimales.map((id: string) => ({
                animal_id: id,
                tipo: 'VENTA',
                fecha_evento: new Date().toISOString(),
                resultado: 'EN TRÁNSITO',
                detalle: `Vendido con lote: ${loteSel.nombre} → ${dest.nombre}. En tránsito.`,
                establecimiento_id: campoId
            }));
            await supabase.from('eventos').insert(eventosVenta);

            await supabase.from('lotes_historicos').insert([nuevoHistorico]);
            await supabase.from('lotes_eventos').delete().eq('lote_id', loteSel.id);
            await supabase.from('lotes').delete().eq('id', loteSel.id);

            resetForm();
            onVentaExitosa();
            alert(`¡Lote enviado a ${dest.nombre}! Los animales quedan EN TRÁNSITO hasta que el comprador acepte. El movimiento se registró en Caja.`);
        } else {
            const { error } = await supabase.from('lotes_historicos').insert([nuevoHistorico]);
            if (error) { setLoadingVenta(false); return alert("Error: " + error.message); }

            await supabase.from('animales').update({ estado: 'VENDIDO', lote_id: null }).in('id', idsAnimales);

            const eventosVenta = idsAnimales.map((id: string) => ({
                animal_id: id,
                tipo: 'VENTA',
                fecha_evento: new Date().toISOString(),
                resultado: 'VENDIDO',
                detalle: `Vendido con lote: ${loteSel.nombre}. Comprador: ${ventaComprador || 'S/D'}`,
                establecimiento_id: campoId
            }));
            await supabase.from('eventos').insert(eventosVenta);

            const { data: ventaData } = await supabase.from('ventas').insert([{
                establecimiento_id: campoId,
                fecha: fechaIso,
                tipo: 'LOTE',
                destino: ventaComprador || null,
                comprador: ventaComprador || null,
                monto_total: ventaPrecioTotal,
                animales_ids: idsAnimales
            }]).select('id').single();

            await supabase.from('caja').insert([{
                establecimiento_id: campoId,
                fecha: fechaIso,
                tipo: 'INGRESO',
                categoria: 'Venta Hacienda',
                detalle: `Venta Lote Completo: ${loteSel.nombre} (${animalesEnEsteLote.length} cabezas). Comprador: ${ventaComprador}`,
                monto: ventaPrecioTotal,
                venta_id: ventaData?.id ?? null
            }]);

            await supabase.from('lotes_eventos').delete().eq('lote_id', loteSel.id);
            await supabase.from('lotes').delete().eq('id', loteSel.id);

            resetForm();
            onVentaExitosa();
            alert("¡Lote VENDIDO con éxito! El movimiento se registró en Caja.");
        }

        setLoadingVenta(false);
    }

    return (
        <Modal opened={opened} onClose={onClose} title={<Title order={3}>Vender Lote: {loteSel.nombre}</Title>} size="lg" centered>
            <Stack>
                <Alert color="green" icon={<IconInfoCircle/>} mb="sm">Se registrará la salida de los animales y el ingreso de dinero en el libro de Caja.</Alert>

                <Group justify="space-between" p="xs" bg="blue.0" style={{ borderRadius: 8, border: '1px solid #74c0fc' }}>
                    <Text size="sm" fw={600} c="blue.9">Vender a usuario de RodeoControl</Text>
                    <Switch checked={esVentaRed} onChange={(e) => setEsVentaRed(e.currentTarget.checked)} color="blue" />
                </Group>

                {esVentaRed && (
                    <Alert color="blue" icon={<IconTruckDelivery size={16}/>} variant="light">
                        <b>Importante:</b> Los animales quedarán "EN TRÁNSITO". Si el comprador rechaza la transferencia, volverán a tu campo como animales activos (sin lote).
                    </Alert>
                )}

                {esVentaRed ? (
                    <TextInput
                        label="RENSPA del Comprador"
                        placeholder="Ej: 01.002.0.00000/00"
                        required
                        value={renspaDestino}
                        onChange={(e) => setRenspaDestino(e.target.value)}
                    />
                ) : (
                    <TextInput label="Comprador / Destino" placeholder="Ej: Frigorífico Rioplatense" value={ventaComprador} onChange={(e: any) => setVentaComprador(e.target.value)} />
                )}

                <TextInput label="Fecha de Venta" type="date" value={getLocalDateForInput(ventaFecha)} onChange={(e: any) => setVentaFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} />
                <Select label="Método de Precio" data={[{value:'TOTAL', label:'Monto Total Fijo'}, {value:'KILO', label:'Precio por Kilo'}, {value:'BULTO', label:'Precio por Cabeza (Bulto)'}]} value={ventaMetodo} onChange={(v: string | null) => setVentaMetodo((v as any) || 'TOTAL')} />

                {ventaMetodo === 'KILO' && (<Group grow><NumberInput label="Precio por Kg ($)" leftSection={<IconCurrencyDollar size={16}/>} value={ventaPrecioUnitario} onChange={(v: string | number) => setVentaPrecioUnitario(Number(v))} hideControls/><NumberInput label="Kilos Totales Pesados" value={ventaKilosTotales} onChange={(v: string | number) => setVentaKilosTotales(Number(v))} hideControls/></Group>)}
                {ventaMetodo === 'BULTO' && (<NumberInput label="Precio por Cabeza ($)" description={`Total: ${animalesEnEsteLote.length} cabezas`} leftSection={<IconCurrencyDollar size={16}/>} value={ventaPrecioUnitario} onChange={(v: string | number) => setVentaPrecioUnitario(Number(v))} hideControls/>)}

                <Paper withBorder p="md" bg="gray.0" mt="sm">
                    <Group justify="space-between"><Text fw={700}>INGRESO TOTAL EN CAJA:</Text><NumberInput value={ventaPrecioTotal} onChange={(v: string | number) => setVentaPrecioTotal(Number(v))} hideControls leftSection={<IconCurrencyDollar size={16}/>} variant="filled" size="md" fw={700} w={150} disabled={ventaMetodo !== 'TOTAL'}/></Group>
                </Paper>

                <Group grow mt="lg">
                    <Button variant="default" onClick={onClose}>Cancelar</Button>
                    <Button color="green" onClick={ejecutarVentaLote} loading={loadingVenta}>
                        {esVentaRed ? 'Confirmar y Enviar a Red' : 'Confirmar Venta y Archivar'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
