import { useState, useEffect } from 'react';
import { Modal, TextInput, Button, Stack, Text, Center, ThemeIcon, Group } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '../supabase';

import VistaLotesActivos from '../components/Lotes/VistaLotesActivos';
import VistaHistorial from '../components/Lotes/VistaHistorial';
import VistaDetalleLote from '../components/Lotes/VistaDetalleLote';
import VistaDetalleHistorico from '../components/Lotes/VistaDetalleHistorico';

export default function Lotes({ campoId, lotes, animales, potreros, parcelas, establecimientos, eventosLotesGlobal, fetchLotes, fetchAnimales, fetchEventosLotesGlobal, fetchActividadGlobal, abrirFichaVaca, rolActual = 'DUENO', loteIdAAbrir, onLoteAbierto, onIrAMasivosConLote }: any) {
    // ESTADOS DE NAVEGACIÓN
    const [loteSel, setLoteSel] = useState<any | null>(null);
    const [mostrandoHistorial, setMostrandoHistorial] = useState(false);
    const [historialSel, setHistorialSel] = useState<any | null>(null); 
    
    // ESTADOS DE CREACIÓN
    const [modalLoteOpen, setModalLoteOpen] = useState(false);
    const [nuevoLoteNombre, setNuevoLoteNombre] = useState('');
    const [loading, setLoading] = useState(false);
    const [todosLosHistoricos, setTodosLosHistoricos] = useState<any[]>([]);
    const [confirmModal, setConfirmModal] = useState<{ mensaje: string; onConfirm: () => void; color?: string } | null>(null);

    useEffect(() => {
        if (campoId) fetchHistoricosGlobal();
    }, [campoId]);

    useEffect(() => {
        if (!loteIdAAbrir) return;
        const lote = lotes.find((l: any) => l.id === loteIdAAbrir);
        if (lote) setLoteSel(lote);
        onLoteAbierto?.();
    }, [loteIdAAbrir]);

    async function fetchHistoricosGlobal() {
        const { data } = await supabase.from('lotes_historicos').select('*').eq('establecimiento_id', campoId).order('fecha_cierre', { ascending: false });
        setTodosLosHistoricos(data || []);
    }

    async function checkNombreDuplicado(nombre: string, ignoreId?: string) {
        const nameToCheck = nombre.trim().toLowerCase();
        const existeActivo = lotes.some((l: any) => l.nombre.toLowerCase() === nameToCheck && l.id !== ignoreId);
        const existePasado = todosLosHistoricos.some((l: any) => l.nombre_lote.toLowerCase() === nameToCheck);
        return existeActivo || existePasado;
    }

    async function crearLoteGrupo() {
        if (!nuevoLoteNombre || !campoId) return;
        setLoading(true);
        if (await checkNombreDuplicado(nuevoLoteNombre)) {
            notifications.show({ title: 'Nombre duplicado', message: 'Ya existe un lote (activo o cerrado) con ese nombre. Elegí uno distinto.', color: 'orange' });
            setLoading(false); return;
        }

        const { error } = await supabase.from('lotes').insert([{ nombre: nuevoLoteNombre, establecimiento_id: campoId }]);
        if (error) {
            notifications.show({ title: 'Error al crear lote', message: error.message, color: 'red' });
        } else {
            setNuevoLoteNombre('');
            fetchLotes();
            setModalLoteOpen(false);
        }
        setLoading(false);
    }

    // --- ACÁ ESTÁ LA FUNCIÓN QUE FALTABA ---
    function borrarLoteHistorico(id: string) {
        setConfirmModal({
            mensaje: '¿Eliminar este registro histórico? Esta acción no se puede deshacer.',
            color: 'red',
            onConfirm: async () => {
                const { error } = await supabase.from('lotes_historicos').delete().eq('id', id);
                if (!error) {
                    fetchHistoricosGlobal();
                } else {
                    notifications.show({ title: 'Error al borrar', message: error.message, color: 'red' });
                }
            },
        });
    }

    // --- RENDERIZADO CONDICIONAL DE VISTAS ---

    if (historialSel) {
        return (
            <VistaDetalleHistorico 
                historialSel={historialSel} 
                onVolver={() => setHistorialSel(null)} 
                abrirFichaVaca={abrirFichaVaca} 
            />
        );
    }

    if (mostrandoHistorial) {
        return (
            <VistaHistorial 
                todosLosHistoricos={todosLosHistoricos} 
                onVolver={() => setMostrandoHistorial(false)} 
                onBorrarHistorial={borrarLoteHistorico} // AHORA SÍ LE PASAMOS LA FUNCIÓN CORRECTA
                onAbrirHistorico={(hist: any) => setHistorialSel(hist)} 
                campoId={campoId} 
            />
        );
    }

    if (loteSel) {
        return (
            <VistaDetalleLote
                loteSel={loteSel}
                onVolver={() => setLoteSel(null)}
                onLoteModificado={(loteActualizado: any) => setLoteSel(loteActualizado)}
                campoId={campoId}
                lotes={lotes}
                animales={animales}
                potreros={potreros}
                parcelas={parcelas}
                establecimientos={establecimientos}
                fetchLotes={fetchLotes}
                fetchAnimales={fetchAnimales}
                fetchEventosLotesGlobal={fetchEventosLotesGlobal}
                fetchActividadGlobal={fetchActividadGlobal}
                fetchHistoricosGlobal={fetchHistoricosGlobal}
                abrirFichaVaca={abrirFichaVaca}
                checkNombreDuplicado={checkNombreDuplicado}
                onIrAMasivosConLote={onIrAMasivosConLote}
            />
        );
    }

    return (
        <>
            <Modal opened={!!confirmModal} onClose={() => setConfirmModal(null)} title={<Text fw={700}>Confirmar acción</Text>} centered size="sm">
                <Stack>
                    <Text>{confirmModal?.mensaje}</Text>
                    <Group grow mt="sm">
                        <Button variant="default" onClick={() => setConfirmModal(null)}>Cancelar</Button>
                        <Button color={confirmModal?.color || 'red'} onClick={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>Confirmar</Button>
                    </Group>
                </Stack>
            </Modal>

            <VistaLotesActivos
                lotes={lotes} 
                animales={animales} 
                eventosLotesGlobal={eventosLotesGlobal} 
                onAbrirHistorial={() => setMostrandoHistorial(true)} 
                onNuevoLote={() => setModalLoteOpen(true)} 
                onAbrirLote={(lote: any) => setLoteSel(lote)} 
            />
            
            <Modal opened={modalLoteOpen} onClose={() => setModalLoteOpen(false)} title={<Text fw={700} size="lg">Nuevo Lote</Text>} centered>
                <Stack>
                    <TextInput label="Nombre del Lote (Grupo)" placeholder="Ej: Recría 2026" value={nuevoLoteNombre} onChange={(e: any) => setNuevoLoteNombre(e.target.value)} />
                    <Button onClick={crearLoteGrupo} loading={loading} color="grape" fullWidth mt="md">Crear Lote</Button>
                </Stack>
            </Modal>
        </>
    );
}