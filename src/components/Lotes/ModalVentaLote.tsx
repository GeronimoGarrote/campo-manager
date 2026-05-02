import { useState, useEffect } from 'react';
import { Modal, Stack, Alert, TextInput, Select, Group, NumberInput, Paper, Text, Button, Title } from '@mantine/core';
import { IconInfoCircle, IconCurrencyDollar } from '@tabler/icons-react';
import { supabase } from '../../supabase';

const getLocalDateForInput = (date: Date | null) => { if (!date) return ''; const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; };

export default function ModalVentaLote({ opened, onClose, loteSel, animalesEnEsteLote, campoId, statsGraficoLote, onVentaExitosa }: any) {
    const [ventaPrecioUnitario, setVentaPrecioUnitario] = useState<number | ''>('');
    const [ventaPrecioTotal, setVentaPrecioTotal] = useState<number | ''>('');
    const [ventaFecha, setVentaFecha] = useState<Date | null>(new Date());
    const [ventaComprador, setVentaComprador] = useState('');
    const [ventaMetodo, setVentaMetodo] = useState<string | null>('TOTAL');
    const [ventaKilosTotales, setVentaKilosTotales] = useState<number | ''>('');
    const [loadingVenta, setLoadingVenta] = useState(false);

    useEffect(() => {
        if (ventaMetodo === 'KILO' && ventaPrecioUnitario && ventaKilosTotales) {
            setVentaPrecioTotal(Number(ventaPrecioUnitario) * Number(ventaKilosTotales));
        } else if (ventaMetodo === 'BULTO' && ventaPrecioUnitario && animalesEnEsteLote) {
            setVentaPrecioTotal(Number(ventaPrecioUnitario) * animalesEnEsteLote.length);
        }
    }, [ventaMetodo, ventaPrecioUnitario, ventaKilosTotales, animalesEnEsteLote]);

    async function ejecutarVentaLote() {
        if (!ventaPrecioTotal || !ventaFecha || !campoId || animalesEnEsteLote.length === 0) return alert("Faltan datos para la venta.");
        setLoadingVenta(true);
        
        const fechaIso = ventaFecha.toISOString().split('T')[0];
        const idsAnimales = animalesEnEsteLote.map((a: any) => a.id);

        // 1. SUMAR COSTOS TOTALES DEL LOTE ANTES DE BORRARLO
        const { data: eventosCostos } = await supabase
            .from('lotes_eventos')
            .select('costo')
            .eq('lote_id', loteSel.id);
        
        const sumatoriaCostos = eventosCostos?.reduce((acc, curr) => acc + (Number(curr.costo) || 0), 0) || 0;
        
        const nuevoHistorico = {
            establecimiento_id: campoId, 
            lote_id: null, 
            nombre_lote: loteSel.nombre, 
            cantidad_animales: animalesEnEsteLote.length,
            peso_inicial: statsGraficoLote.totalInicio || statsGraficoLote.inicio || 0, 
            peso_final: statsGraficoLote.totalActual || statsGraficoLote.actual || 0, 
            ganancia_promedio: statsGraficoLote.ganancia || 0, 
            adpv: statsGraficoLote.adpv || '0', 
            dias_ciclo: statsGraficoLote.dias || 0,
            vendido: true, 
            ingreso_total: ventaPrecioTotal, // Se sigue guardando en la BDD para el dueño
            costo_total: sumatoriaCostos,    // Guardamos la inversión total
            fecha_cierre: fechaIso,
            animales_ids: idsAnimales 
        };

        const { error } = await supabase.from('lotes_historicos').insert([nuevoHistorico]);

        if (!error) {
            await supabase.from('animales').update({ estado: 'VENDIDO', lote_id: null }).in('id', idsAnimales);
            
            const eventosVenta = idsAnimales.map((id: string) => ({ animal_id: id, tipo: 'VENTA', fecha_evento: new Date().toISOString(), resultado: 'VENDIDO', detalle: `Vendido con lote: ${loteSel.nombre}. Comprador: ${ventaComprador || 'S/D'}`, establecimiento_id: campoId }));
            await supabase.from('eventos').insert(eventosVenta);
            
            // 4. Ingreso en Caja (Aquí es donde queda el registro financiero privado)
            await supabase.from('caja').insert([{ establecimiento_id: campoId, fecha: fechaIso, tipo: 'INGRESO', categoria: 'Venta Hacienda', detalle: `Venta Lote Completo: ${loteSel.nombre} (${animalesEnEsteLote.length} cabezas). Comprador: ${ventaComprador}`, monto: ventaPrecioTotal }]);

            // ELIMINAMOS EL LOTE Y SUS EVENTOS
            await supabase.from('lotes_eventos').delete().eq('lote_id', loteSel.id);
            await supabase.from('lotes').delete().eq('id', loteSel.id);

            onVentaExitosa(); 
            alert("¡Lote VENDIDO con éxito! El movimiento se registró en Caja.");
        } else {
            alert("Error: " + error.message);
        }
        setLoadingVenta(false);
    }

    return (
        <Modal opened={opened} onClose={onClose} title={<Title order={3}>Vender Lote: {loteSel.nombre}</Title>} size="lg" centered>
            <Stack>
                <Alert color="green" icon={<IconInfoCircle/>} mb="sm">Se registrará la salida de los animales y el ingreso de dinero en el libro de Caja.</Alert>
                <TextInput label="Comprador / Destino" placeholder="Ej: Frigorífico Rioplatense" value={ventaComprador} onChange={(e: any) => setVentaComprador(e.target.value)} />
                <TextInput label="Fecha de Venta" type="date" value={getLocalDateForInput(ventaFecha)} onChange={(e: any) => setVentaFecha(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} />
                <Select label="Método de Precio" data={[{value:'TOTAL', label:'Monto Total Fijo'}, {value:'KILO', label:'Precio por Kilo'}, {value:'BULTO', label:'Precio por Cabeza (Bulto)'}]} value={ventaMetodo} onChange={(v: string | null) => setVentaMetodo((v as any) || 'TOTAL')} />
                
                {ventaMetodo === 'KILO' && (<Group grow><NumberInput label="Precio por Kg ($)" leftSection={<IconCurrencyDollar size={16}/>} value={ventaPrecioUnitario} onChange={(v: string | number) => setVentaPrecioUnitario(Number(v))} hideControls/><NumberInput label="Kilos Totales Pesados" value={ventaKilosTotales} onChange={(v: string | number) => setVentaKilosTotales(Number(v))} hideControls/></Group>)}
                {ventaMetodo === 'BULTO' && (<NumberInput label="Precio por Cabeza ($)" description={`Total: ${animalesEnEsteLote.length} cabezas`} leftSection={<IconCurrencyDollar size={16}/>} value={ventaPrecioUnitario} onChange={(v: string | number) => setVentaPrecioUnitario(Number(v))} hideControls/>)}
                
                <Paper withBorder p="md" bg="gray.0" mt="sm">
                    <Group justify="space-between"><Text fw={700}>INGRESO TOTAL EN CAJA:</Text><NumberInput value={ventaPrecioTotal} onChange={(v: string | number) => setVentaPrecioTotal(Number(v))} hideControls leftSection={<IconCurrencyDollar size={16}/>} variant="filled" size="md" fw={700} w={150} disabled={ventaMetodo !== 'TOTAL'}/></Group>
                </Paper>
                
                <Group grow mt="lg"><Button variant="default" onClick={onClose}>Cancelar</Button><Button color="green" onClick={ejecutarVentaLote} loading={loadingVenta}>Confirmar Venta y Archivar</Button></Group>
            </Stack>
        </Modal>
    );
}