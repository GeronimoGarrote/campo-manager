import { useState, useEffect } from 'react';
import { Modal, Text, Select, Alert, SimpleGrid, Paper } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabase';

interface ModalGraficoPesoProps {
    opened: boolean;
    onClose: () => void;
    animales: any[];
    animalIdInicial: string | null;
}

const formatDate = (dateString: string) => { 
    if (!dateString) return '-'; 
    const parts = dateString.split('T')[0].split('-'); 
    return `${parts[2]}/${parts[1]}/${parts[0]}`; 
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{data.fecha}</p>
                <p style={{ margin: 0, color: '#12b886', fontWeight: 'bold', marginTop: '4px' }}>Peso: {data.peso} kg</p>
                {data.gananciaIntervalo !== null && data.gananciaIntervalo !== undefined && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #eee' }}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#868e96', textTransform: 'uppercase' }}>Rendimiento parcial:</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: data.gananciaIntervalo >= 0 ? '#228be6' : '#fa5252' }}>{data.gananciaIntervalo > 0 ? '+' : ''}{data.gananciaIntervalo} kg</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#7950f2' }}>{data.adpvIntervalo} kg/día</p>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export default function ModalGraficoPeso({ opened, onClose, animales, animalIdInicial }: ModalGraficoPesoProps) {
    const [graficoAnimalId, setGraficoAnimalId] = useState<string | null>(null);
    const [datosGrafico, setDatosGrafico] = useState<any[]>([]);
    const [statsGrafico, setStatsGrafico] = useState({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' });
    const [loadingGrafico, setLoadingGrafico] = useState(false);

    // Sincroniza el ID inicial cuando se abre el modal
    useEffect(() => {
        if (opened && animalIdInicial) {
            setGraficoAnimalId(animalIdInicial);
        }
    }, [opened, animalIdInicial]);

    useEffect(() => {
        async function cargarDatosGrafico() {
            if (!graficoAnimalId) return; 
            setLoadingGrafico(true);
            const { data } = await supabase.from('eventos')
                .select('*')
                .eq('animal_id', graficoAnimalId)
                .eq('tipo', 'PESAJE')
                .order('fecha_evento', { ascending: true });
            
            if (data) {
                const pesajesValidos = data.map(p => { 
                    const pesoNum = parseFloat(p.resultado.replace(/[^0-9.]/g, '')); 
                    return { fecha: formatDate(p.fecha_evento), rawDate: new Date(p.fecha_evento), peso: isNaN(pesoNum) ? 0 : pesoNum, nombre: 'Peso' }; 
                }).filter(p => p.peso > 0);
                
                const finalData = pesajesValidos.map((p, index) => {
                    if (index === 0) return { ...p, gananciaIntervalo: null, adpvIntervalo: null };
                    const prev = pesajesValidos[index - 1]; 
                    const ganancia = p.peso - prev.peso; 
                    const diffTime = Math.abs(p.rawDate.getTime() - prev.rawDate.getTime()); 
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return { ...p, gananciaIntervalo: ganancia, adpvIntervalo: diffDays > 0 ? (ganancia / diffDays).toFixed(3) : '0' };
                });
                
                setDatosGrafico(finalData);
                
                if (finalData.length > 1) {
                    const inicio = finalData[0]; const fin = finalData[finalData.length - 1]; 
                    const gananciaTotal = fin.peso - inicio.peso; 
                    const diffTime = Math.abs(fin.rawDate.getTime() - inicio.rawDate.getTime()); 
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    setStatsGrafico({ inicio: inicio.peso, actual: fin.peso, ganancia: gananciaTotal, dias: diffDays, adpv: diffDays > 0 ? (gananciaTotal / diffDays).toFixed(3) : '0' });
                } else if (finalData.length === 1) { 
                    setStatsGrafico({ inicio: finalData[0].peso, actual: finalData[0].peso, ganancia: 0, dias: 0, adpv: '0' }); 
                } else { 
                    setStatsGrafico({ inicio: 0, actual: 0, ganancia: 0, dias: 0, adpv: '0' }); 
                }
            }
            setLoadingGrafico(false);
        }
        
        cargarDatosGrafico();
    }, [graficoAnimalId]);

    const handleClose = () => {
        setGraficoAnimalId(null);
        setDatosGrafico([]);
        onClose();
    };

    return (
        <Modal opened={opened} onClose={handleClose} title={<Text fw={700} size="lg">Evolución de Peso</Text>} size="lg" centered zIndex={3000}>
            <Select 
                label="Caravana a graficar" 
                placeholder="Buscar Caravana" 
                searchable 
                data={animales.map(a => ({ value: a.id, label: `Caravana: ${a.caravana} (${a.categoria})` }))} 
                value={graficoAnimalId} 
                onChange={setGraficoAnimalId} 
                comboboxProps={{ zIndex: 3005 }} 
                mb="md" 
            />
            {loadingGrafico ? (
                <Text ta="center" c="dimmed" my="xl">Cargando datos...</Text>
            ) : datosGrafico.length > 0 ? (
                <>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={datosGrafico} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="fecha" />
                                <YAxis domain={['auto', 'auto']} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="peso" name="Peso" stroke="#82ca9d" strokeWidth={3} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <SimpleGrid cols={3} mt="lg">
                        <Paper withBorder p="xs" ta="center">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Peso Inicial</Text>
                            <Text fw={700} size="lg">{statsGrafico.inicio} kg</Text>
                        </Paper>
                        <Paper withBorder p="xs" ta="center">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Ganancia Total</Text>
                            <Text fw={700} size="lg" c={statsGrafico.ganancia > 0 ? 'teal' : 'red'}>{statsGrafico.ganancia > 0 ? '+' : ''}{statsGrafico.ganancia} kg</Text>
                        </Paper>
                        <Paper withBorder p="xs" ta="center">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">ADPV Promedio</Text>
                            <Text fw={700} size="lg" c="blue">{statsGrafico.adpv} kg/día</Text>
                        </Paper>
                    </SimpleGrid>
                </>
            ) : (
                <Alert color="blue" title="Sin datos">Este animal no tiene registros de peso.</Alert>
            )}
        </Modal>
    );
}